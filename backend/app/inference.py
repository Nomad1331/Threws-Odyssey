import os
import torch
import librosa

from peft import PeftModel
from transformers import WhisperProcessor, WhisperForConditionalGeneration

BASE_MODEL = "openai/whisper-small"  # adapter isi base par bana hai
ADAPTER_MODEL = os.getenv("VOICEBRIDGE_ADAPTER_MODEL", "Aaliya05/voicebridge")
HF_TOKEN = os.getenv("HF_TOKEN")  # sirf Private repo ke liye chahiye

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

processor = None
model = None


def load_model():
    global processor, model

    print("Loading Whisper Small processor...")
    processor = WhisperProcessor.from_pretrained(BASE_MODEL)

    print("Loading Whisper Small base model...")
    base_model = WhisperForConditionalGeneration.from_pretrained(BASE_MODEL)

    print("Loading VoiceBridge LoRA adapter...")
    model = PeftModel.from_pretrained(base_model, ADAPTER_MODEL, token=HF_TOKEN)

    model.to(DEVICE)
    model.eval()

    print(f"VoiceBridge model ready on {DEVICE}")


def transcribe_audio(audio_path: str):
    if model is None or processor is None:
        load_model()

    audio, _ = librosa.load(audio_path, sr=16000, mono=True)
    inputs = processor(audio, sampling_rate=16000, return_tensors="pt")
    input_features = inputs.input_features.to(DEVICE)

    with torch.inference_mode():
        out = model.generate(
            input_features=input_features,
            language="en",
            task="transcribe",
            max_new_tokens=128,
            return_dict_in_generate=True,
            output_scores=True,
        )

    text = processor.batch_decode(out.sequences, skip_special_tokens=True)[0].strip()

    # Har generated token ki probability nikalo, phir average lo
    token_probs = []
    gen_ids = out.sequences[0, -len(out.scores):]
    for step_logits, tok in zip(out.scores, gen_ids):
        p = torch.softmax(step_logits[0].float(), dim=-1)[tok].item()
        token_probs.append(p)

    confidence = round(sum(token_probs) / len(token_probs), 3) if token_probs else None
    return text, confidence