"""
VoiceBridge — speaker-disjoint LoRA retrain (Kaggle GPU).

Status: experiment, NOT adopted. The best valid run (r=16, 2 epochs, lr=2e-4)
scored 60.84% corpus WER on held-out speakers versus 60.52% for the shipped
Aaliya05/voicebridge adapter, and was worse on the three demo clips
(0% / 83.3% / 100% versus 0% / 50% / 120%). See CHANGELOG v1.21.0. Kept for
reproducibility and future data/personalisation work, not used by the product.

Goal: train a whisper-small LoRA adapter without ever showing it the three demo
speakers (M02, M04, M05). That makes evaluation on those speakers honest.

The script is self-contained: Kaggle uploads only this file, so it downloads the
public TORGO parquet shards and the base model itself.

Outputs (in /kaggle/working):
  voicebridge-lora-v2/      adapter_model.safetensors + adapter_config.json
  metrics.json              WER for new adapter / Aaliya adapter / base
  predictions.json          per-utterance outputs for the held-out sample
  training.log              copy of stdout
"""

import io
import json
import os
import re
import subprocess
import sys
import traceback

WORK = "/kaggle/working"
OUT_ADAPTER = os.path.join(WORK, "voicebridge-lora-v2")
BASE_MODEL = "openai/whisper-small"
CURRENT_ADAPTER = "Aaliya05/voicebridge"
DATASET_REPO = "abnerh/TORGO-database"
SHARDS = [f"data/train-0000{i}-of-00004.parquet" for i in range(4)]
HELD_OUT_SPEAKERS = {"M02", "M04", "M05"}  # the three demo speakers
MAX_TRAIN_SAMPLES = 1500
EVAL_PER_SPEAKER = 30


def install():
    # Kaggle's image ships a torchao that the latest PEFT rejects; pin the PEFT
    # version the local product uses and remove torchao from the path.
    subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "-q",
            "peft==0.21.2",
            "datasets",
            "accelerate",
            "soundfile",
        ],
        check=True,
    )
    subprocess.run(
        [sys.executable, "-m", "pip", "uninstall", "-y", "torchao"],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def load_rows():
    import pyarrow as pa
    import pyarrow.parquet as pq
    from huggingface_hub import hf_hub_download

    tables = []
    for shard in SHARDS:
        path = hf_hub_download(DATASET_REPO, shard, repo_type="dataset")
        tables.append(pq.read_table(path))
        print("loaded", shard, tables[-1].num_rows, flush=True)
    table = pa.concat_tables(tables)
    print("total rows", table.num_rows, flush=True)

    rows = []
    for item, transcript, status, duration in zip(
        table["audio"].to_pylist(),
        table["transcription"].to_pylist(),
        table["speech_status"].to_pylist(),
        table["duration"].to_pylist(),
    ):
        if status != "dysarthria" or not transcript or not duration:
            continue
        if duration < 1.0 or duration > 30.0:
            continue
        if len(transcript.split()) < 4:
            continue
        path = item.get("path") or ""
        speaker = os.path.basename(path).split("_")[0]
        if not speaker:
            continue
        rows.append(
            {
                "speaker": speaker,
                "transcript": transcript,
                "bytes": item["bytes"],
            }
        )
    print("sentence-level dysarthric rows", len(rows), flush=True)
    return rows


def decode_audio(raw):
    import numpy as np
    import soundfile as sf
    from scipy.signal import resample_poly

    audio, sample_rate = sf.read(io.BytesIO(raw), dtype="float32", always_2d=False)
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    if sample_rate != 16000:
        audio = resample_poly(audio, 16000, sample_rate).astype("float32")
    return np.asarray(audio, dtype="float32")


def prepare(rows, processor):
    import numpy as np

    features, labels = [], []
    for row in rows:
        audio = decode_audio(row["bytes"])
        feature = processor.feature_extractor(audio, sampling_rate=16000).input_features[0]
        features.append(np.asarray(feature, dtype="float32"))
        labels.append(processor.tokenizer(row["transcript"]).input_ids[:448])
    return features, labels


def wer(reference, hypothesis):
    def words(text):
        import re

        return re.sub(r"[^a-z0-9\s]", "", text.lower()).split()

    ref, hyp = words(reference), words(hypothesis)
    if not ref:
        return 0.0
    table = [[0] * (len(hyp) + 1) for _ in range(len(ref) + 1)]
    for i in range(len(ref) + 1):
        table[i][0] = i
    for j in range(len(hyp) + 1):
        table[0][j] = j
    for i in range(1, len(ref) + 1):
        for j in range(1, len(hyp) + 1):
            table[i][j] = min(
                table[i - 1][j] + 1,
                table[i][j - 1] + 1,
                table[i - 1][j - 1] + (ref[i - 1] != hyp[j - 1]),
            )
    return 100.0 * table[-1][-1] / len(ref)


def train(train_rows, processor):
    import torch
    from datasets import Dataset
    from peft import LoraConfig, get_peft_model
    from transformers import (
        Seq2SeqTrainer,
        Seq2SeqTrainingArguments,
        WhisperForConditionalGeneration,
    )

    print("preparing", len(train_rows), "training clips", flush=True)
    features, labels = prepare(train_rows, processor)
    dataset = Dataset.from_dict(
        {
            "input_features": features,
            "labels": labels,
        }
    )

    class Collator:
        def __call__(self, batch):
            input_features = torch.tensor(
                [item["input_features"] for item in batch], dtype=torch.float32
            )
            padded = processor.tokenizer.pad(
                {"input_ids": [item["labels"] for item in batch]},
                return_tensors="pt",
                padding=True,
            )
            labels_tensor = padded["input_ids"].masked_fill(
                padded["input_ids"] == processor.tokenizer.pad_token_id, -100
            )
            return {"input_features": input_features, "labels": labels_tensor}

    model = WhisperForConditionalGeneration.from_pretrained(BASE_MODEL)
    model.config.use_cache = False
    model.gradient_checkpointing_enable()
    model.enable_input_require_grads()
    lora = LoraConfig(
        r=16,
        lora_alpha=32,
        target_modules=["q_proj", "v_proj"],
        lora_dropout=0.1,
        bias="none",
        task_type="SEQ_2_SEQ_LM",
    )
    model = get_peft_model(model, lora)
    model.print_trainable_parameters()
    # PEFT 0.21's wrapper duplicates input_ids under Transformers 5. Train the
    # LoRA-injected base model directly; the adapter weights are identical.
    trainer_model = model.base_model.model

    arguments = Seq2SeqTrainingArguments(
        output_dir=os.path.join(WORK, "checkpoints"),
        per_device_train_batch_size=8,
        gradient_accumulation_steps=2,
        learning_rate=2e-4,
        warmup_steps=30,
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
        model=trainer_model,
        args=arguments,
        train_dataset=dataset,
        data_collator=Collator(),
    )
    try:
        trainer = Seq2SeqTrainer(processing_class=processor, **trainer_kwargs)
    except TypeError:
        trainer = Seq2SeqTrainer(tokenizer=processor.tokenizer, **trainer_kwargs)

    trainer.train()
    os.makedirs(OUT_ADAPTER, exist_ok=True)
    model.save_pretrained(OUT_ADAPTER)
    processor.save_pretrained(OUT_ADAPTER)
    print("saved adapter to", OUT_ADAPTER, flush=True)


def evaluate(rows, processor):
    import torch
    from peft import PeftModel
    from transformers import WhisperForConditionalGeneration

    # Group held-out rows per speaker and cap the sample for runtime.
    by_speaker = {}
    for row in rows:
        by_speaker.setdefault(row["speaker"], []).append(row)
    sample = []
    for speaker in sorted(HELD_OUT_SPEAKERS):
        sample.extend(by_speaker.get(speaker, [])[:EVAL_PER_SPEAKER])
    print("evaluation utterances", len(sample), flush=True)

    def run(model):
        predictions = []
        model.eval()
        for row in sample:
            audio = decode_audio(row["bytes"])
            inputs = processor.feature_extractor(
                audio, sampling_rate=16000, return_tensors="pt"
            ).input_features.to("cuda")
            inputs = inputs.to(next(model.parameters()).dtype)
            with torch.inference_mode():
                output = model.generate(
                    input_features=inputs,
                    language="en",
                    task="transcribe",
                    max_new_tokens=128,
                )
            text = processor.batch_decode(output, skip_special_tokens=True)[0].strip()
            reference_words = len(
                re.sub(r"[^a-z0-9\s]", "", row["transcript"].lower()).split()
            )
            predictions.append(
                {
                    "speaker": row["speaker"],
                    "reference": row["transcript"],
                    "hypothesis": text,
                    "referenceWords": reference_words,
                    "wer": wer(row["transcript"], text),
                }
            )
        return predictions

    results = {}

    base = WhisperForConditionalGeneration.from_pretrained(BASE_MODEL).to("cuda")

    print("evaluating base", flush=True)
    results["base"] = run(base)

    new_adapter = PeftModel.from_pretrained(base, OUT_ADAPTER, is_trainable=False)
    print("evaluating new adapter", flush=True)
    results["new"] = run(new_adapter)
    del new_adapter
    torch.cuda.empty_cache()

    old_adapter = PeftModel.from_pretrained(
        base, CURRENT_ADAPTER, is_trainable=False
    )
    print("evaluating current adapter", flush=True)
    results["current"] = run(old_adapter)

    metrics = {}
    for name, predictions in results.items():
        words = 0
        errors = 0
        for item in predictions:
            words += max(1, item["referenceWords"])
            errors += item["wer"] / 100.0 * max(1, item["referenceWords"])
        metrics[name] = {
            "corpusWerPct": round(100.0 * errors / words, 2) if words else None,
            "meanClipWerPct": round(
                sum(item["wer"] for item in predictions) / len(predictions), 2
            )
            if predictions
            else None,
            "clipCount": len(predictions),
            "bySpeaker": {
                speaker: round(
                    sum(
                        item["wer"]
                        for item in predictions
                        if item["speaker"] == speaker
                    )
                    / max(1, sum(1 for item in predictions if item["speaker"] == speaker)),
                    2,
                )
                for speaker in sorted(HELD_OUT_SPEAKERS)
            },
        }

    with open(os.path.join(WORK, "predictions.json"), "w", encoding="utf-8") as handle:
        json.dump(results, handle, indent=2)
    with open(os.path.join(WORK, "metrics.json"), "w", encoding="utf-8") as handle:
        json.dump(metrics, handle, indent=2)
    print(json.dumps(metrics, indent=2), flush=True)


def main():
    install()
    import torch
    from transformers import WhisperProcessor

    print("torch", torch.__version__, "cuda", torch.cuda.is_available(), flush=True)
    if not torch.cuda.is_available():
        raise SystemExit("No GPU available; check Kaggle GPU setting")
    print("gpu", torch.cuda.get_device_name(0), flush=True)

    rows = load_rows()
    train_rows = [row for row in rows if row["speaker"] not in HELD_OUT_SPEAKERS]
    eval_rows = [row for row in rows if row["speaker"] in HELD_OUT_SPEAKERS]
    print(
        "train speakers",
        sorted({row["speaker"] for row in train_rows}),
        "rows",
        len(train_rows),
        flush=True,
    )
    print(
        "held-out speakers",
        sorted({row["speaker"] for row in eval_rows}),
        "rows",
        len(eval_rows),
        flush=True,
    )
    if len(train_rows) < 100:
        raise SystemExit(f"Only {len(train_rows)} training rows; refusing a meaningless run")
    if len(eval_rows) < 20:
        raise SystemExit(f"Only {len(eval_rows)} held-out rows; refusing to evaluate")

    import random

    random.seed(7)
    random.shuffle(train_rows)
    train_rows = train_rows[:MAX_TRAIN_SAMPLES]

    processor = WhisperProcessor.from_pretrained(BASE_MODEL)
    train(train_rows, processor)
    evaluate(eval_rows, processor)


if __name__ == "__main__":
    os.makedirs(WORK, exist_ok=True)
    try:
        main()
    except Exception:
        traceback.print_exc()
        raise
