
import os
import torch
import librosa

from peft import PeftModel
from transformers import WhisperProcessor, WhisperForConditionalGeneration

BASE_MODEL = "openai/whisper-tiny"
ADAPTER_MODEL = os.getenv("VOICEBRIDGE_ADAPTER_MODEL", "Aaliya05/voicebridge")

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

processor = None
model = None


def load_model():
    global processor, model

    print("Loading Whisper Tiny processor...")
    processor = WhisperProcessor.from_pretrained(BASE_MODEL)

    print("Loading Whisper Tiny base model...")
    base_model = WhisperForConditionalGeneration.from_pretrained(BASE_MODEL)

    print("Loading VoiceBridge LoRA adapter...")
    model = PeftModel.from_pretrained(base_model, ADAPTER_MODEL)

    model.to(DEVICE)
    model.eval()

    model.generation_config.language = "english"
    model.generation_config.task = "transcribe"

    print(f"VoiceBridge model ready on {DEVICE}")


def transcribe_audio(audio_path: str) -> str:
    if model is None or processor is None:
        raise RuntimeError("VoiceBridge model has not been loaded.")

    audio, _ = librosa.load(audio_path, sr=16000, mono=True)

    inputs = processor(
        audio,
        sampling_rate=16000,
        return_tensors="pt"
    )

    input_features = inputs.input_features.to(DEVICE)

    with torch.inference_mode():
        predicted_ids = model.generate(
            input_features=input_features,
            max_new_tokens=128
        )

    transcription = processor.batch_decode(
        predicted_ids,
        skip_special_tokens=True
    )[0]

    return transcription.strip()
