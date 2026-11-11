"""
VoiceBridge — TORGO three-speaker adaptation (Kaggle GPU).

Status: adopted in v1.22.0. Continued Aaliya05/voicebridge on 443 other
utterances from M02/M04/M05, excluding the 11 demo-sentence rows. Demo WER:
0.0% / 16.7% / 0.0%. Speaker-dependent, not general; see CHANGELOG v1.22.0.

This is speaker-dependent adaptation, not a general ASR claim. It continues
training Aaliya05/voicebridge on the *other* utterances from the three demo
speakers (M02, M04, M05), while excluding every row whose reference text is one
of the three demo sentences. The exact demo clips therefore cannot be learned
from their own transcript.

Run on Kaggle GPU. Output: /kaggle/working/voicebridge-torgo-three (adapter).
The adapter is evaluated locally on the three demo WAVs after download.
"""

import io
import os
import re
import subprocess
import sys
import traceback

WORK = "/kaggle/working"
OUT = os.path.join(WORK, "voicebridge-torgo-three")
BASE = "openai/whisper-small"
CURRENT = "Aaliya05/voicebridge"
DATASET = "abnerh/TORGO-database"
SHARDS = [f"data/train-0000{i}-of-00004.parquet" for i in range(4)]
TARGET_SPEAKERS = {"M02", "M04", "M05"}
DEMO_LINES = {
    "we have an excellent team",
    "their house is grey and white",
    "the job provides many benefits",
}
MAX_TRAIN = 1200


def install():
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "-q",
         "peft==0.21.2", "datasets", "accelerate", "soundfile"],
        check=True,
    )
    subprocess.run(
        [sys.executable, "-m", "pip", "uninstall", "-y", "torchao"],
        check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def norm(text):
    return " ".join(re.sub(r"[^a-z0-9\s]", "", (text or "").lower()).split())


def load_rows():
    import pyarrow as pa
    import pyarrow.parquet as pq
    from huggingface_hub import hf_hub_download

    tables = []
    for shard in SHARDS:
        tables.append(pq.read_table(hf_hub_download(DATASET, shard, repo_type="dataset")))
    table = pa.concat_tables(tables)
    print("total rows", table.num_rows, flush=True)

    rows, skipped_demo, skipped_other = [], 0, 0
    for item, transcript, status, duration in zip(
        table["audio"].to_pylist(),
        table["transcription"].to_pylist(),
        table["speech_status"].to_pylist(),
        table["duration"].to_pylist(),
    ):
        if status != "dysarthria" or not transcript or not duration:
            skipped_other += 1
            continue
        if duration < 1.0 or duration > 30.0 or len(norm(transcript).split()) < 4:
            skipped_other += 1
            continue
        speaker = os.path.basename((item.get("path") or "")).split("_")[0]
        if speaker not in TARGET_SPEAKERS:
            skipped_other += 1
            continue
        if norm(transcript) in DEMO_LINES:
            skipped_demo += 1
            continue
        rows.append({"speaker": speaker, "transcript": transcript, "bytes": item["bytes"]})

    print("training rows", len(rows), "| demo rows excluded", skipped_demo,
          "| other skipped", skipped_other, flush=True)
    print("per speaker", {s: sum(1 for r in rows if r["speaker"] == s)
                           for s in sorted(TARGET_SPEAKERS)}, flush=True)
    return rows


def decode(raw):
    import numpy as np
    import soundfile as sf
    from scipy.signal import resample_poly

    audio, rate = sf.read(io.BytesIO(raw), dtype="float32", always_2d=False)
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    if rate != 16000:
        audio = resample_poly(audio, 16000, rate).astype("float32")
    return np.asarray(audio, dtype="float32")


def main():
    install()
    import numpy as np
    import torch
    from datasets import Dataset
    from peft import PeftModel
    from transformers import (
        Seq2SeqTrainer,
        Seq2SeqTrainingArguments,
        WhisperForConditionalGeneration,
        WhisperProcessor,
    )

    print("torch", torch.__version__, "cuda", torch.cuda.is_available(), flush=True)
    if not torch.cuda.is_available():
        raise SystemExit("No GPU")
    print("gpu", torch.cuda.get_device_name(0), flush=True)

    rows = load_rows()
    if len(rows) < 50:
        raise SystemExit(f"Only {len(rows)} rows; refusing")
    rows = rows[:MAX_TRAIN]

    processor = WhisperProcessor.from_pretrained(BASE)
    features, labels = [], []
    for row in rows:
        audio = decode(row["bytes"])
        features.append(
            np.asarray(
                processor.feature_extractor(audio, sampling_rate=16000).input_features[0],
                dtype="float32",
            )
        )
        labels.append(processor.tokenizer(row["transcript"]).input_ids[:448])
    dataset = Dataset.from_dict({"input_features": features, "labels": labels})

    class Collator:
        def __call__(self, batch):
            input_features = torch.tensor(
                [b["input_features"] for b in batch], dtype=torch.float32
            )
            padded = processor.tokenizer.pad(
                {"input_ids": [b["labels"] for b in batch]},
                return_tensors="pt", padding=True,
            )
            labels_tensor = padded["input_ids"].masked_fill(
                padded["input_ids"] == processor.tokenizer.pad_token_id, -100
            )
            return {"input_features": input_features, "labels": labels_tensor}

    base = WhisperForConditionalGeneration.from_pretrained(BASE)
    model = PeftModel.from_pretrained(base, CURRENT, is_trainable=True)
    model.config.use_cache = False
    model.gradient_checkpointing_enable()
    model.enable_input_require_grads()
    model.print_trainable_parameters()

    # PEFT's wrapper duplicates input_ids under Transformers 5; train the
    # LoRA-injected base and save through the PEFT model.
    arguments = Seq2SeqTrainingArguments(
        output_dir=os.path.join(WORK, "checkpoints"),
        per_device_train_batch_size=8,
        gradient_accumulation_steps=2,
        learning_rate=1e-4,
        warmup_steps=20,
        num_train_epochs=2,
        weight_decay=0.01,
        max_grad_norm=1.0,
        fp16=True,
        logging_steps=10,
        save_strategy="no",
        report_to="none",
        remove_unused_columns=False,
        dataloader_num_workers=2,
        label_names=["labels"],
    )
    trainer_kwargs = dict(
        model=model.base_model.model,
        args=arguments,
        train_dataset=dataset,
        data_collator=Collator(),
    )
    try:
        trainer = Seq2SeqTrainer(processing_class=processor, **trainer_kwargs)
    except TypeError:
        trainer = Seq2SeqTrainer(tokenizer=processor.tokenizer, **trainer_kwargs)
    trainer.train()

    os.makedirs(OUT, exist_ok=True)
    model.save_pretrained(OUT)
    print("saved", OUT, flush=True)


if __name__ == "__main__":
    os.makedirs(WORK, exist_ok=True)
    try:
        main()
    except Exception:
        traceback.print_exc()
        raise
