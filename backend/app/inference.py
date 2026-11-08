"""
VoiceBridge Acoustic Inference Engine
=====================================
Multi-Tier Assistive Speech-to-Text Engine supporting:

1. Clinical Acoustic Adaptation Mode (Default: "whisper-small-lora"):
   - Base Model: openai/whisper-small (243.5M parameters)
   - Fine-Tuned PEFT LoRA Adapter: Aaliya05/voicebridge (r=16, alpha=32)
   - Evaluated on University of Toronto TORGO dysarthria corpus.
   - Computes normalized token-level softmax confidence scores.

2. Edge AI Deployment Mode (Fallback / Low-Resource: "whisper-tiny-int8"):
   - faster-whisper (CTranslate2) running INT8 quantization on CPU.
   - Sub-second latency for resource-constrained client environments.

Configured dynamically via the `VOICEBRIDGE_ENGINE` environment variable.
"""

from __future__ import annotations

import os
import math
import logging
from typing import Tuple, Optional

logger = logging.getLogger("voicebridge-inference")

# Engine selection: "whisper-small-lora" (default) or "whisper-tiny-int8"
ACTIVE_ENGINE = os.getenv("VOICEBRIDGE_ENGINE", "whisper-small-lora").strip().lower()
BASE_MODEL_ID = os.getenv("VOICEBRIDGE_BASE_MODEL", "openai/whisper-small")
ADAPTER_MODEL_ID = os.getenv("VOICEBRIDGE_ADAPTER_MODEL", "Aaliya05/voicebridge")
HF_TOKEN = os.getenv("HF_TOKEN")

# Global handles
_processor = None
_pytorch_model = None
_ct2_model = None
_device = "cpu"


def get_active_engine_name() -> str:
    """Returns the identifier of the active transcription engine."""
    return ACTIVE_ENGINE


def _load_clinical_lora_engine() -> None:
    """Loads the fine-tuned Whisper-Small LoRA clinical model using PyTorch and PEFT."""
    global _processor, _pytorch_model, _device
    if _pytorch_model is not None:
        return

    import torch
    from transformers import WhisperProcessor, WhisperForConditionalGeneration
    from peft import PeftModel

    _device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Loading Clinical Acoustic Engine: base={BASE_MODEL_ID}, adapter={ADAPTER_MODEL_ID} on {_device}...")

    _processor = WhisperProcessor.from_pretrained(BASE_MODEL_ID)
    base = WhisperForConditionalGeneration.from_pretrained(BASE_MODEL_ID)
    _pytorch_model = PeftModel.from_pretrained(base, ADAPTER_MODEL_ID, token=HF_TOKEN)
    _pytorch_model.to(_device)
    _pytorch_model.eval()
    logger.info(f"VoiceBridge Clinical LoRA engine successfully initialized on {_device}.")


def _load_edge_int8_engine() -> None:
    """Loads the lightweight INT8 CTranslate2 engine for low-latency Edge AI execution."""
    global _ct2_model
    if _ct2_model is not None:
        return

    from faster_whisper import WhisperModel

    threads = min(4, os.cpu_count() or 4)
    logger.info(f"Loading Edge AI INT8 Engine (tiny.en on {threads} CPU threads)...")
    try:
        _ct2_model = WhisperModel(
            "tiny.en",
            device="cpu",
            compute_type="int8",
            cpu_threads=threads,
            local_files_only=True,
        )
        logger.info("Edge AI INT8 engine loaded from local cache.")
    except Exception:
        logger.info("Local cache missing. Downloading faster-whisper-tiny.en...")
        _ct2_model = WhisperModel(
            "tiny.en",
            device="cpu",
            compute_type="int8",
            cpu_threads=threads,
            local_files_only=False,
        )
        logger.info("Edge AI INT8 engine downloaded and ready.")


def load_model() -> None:
    """Pre-warms the active transcription engine during FastAPI server startup."""
    if ACTIVE_ENGINE == "whisper-small-lora":
        try:
            _load_clinical_lora_engine()
        except Exception as e:
            logger.warning(f"Failed to initialize Clinical LoRA engine ({e}). Falling back to Edge AI INT8 engine.")
            _load_edge_int8_engine()
    else:
        _load_edge_int8_engine()


def _transcribe_clinical_lora(audio_path: str) -> Tuple[str, Optional[float]]:
    """Inference path using the fine-tuned whisper-small LoRA model."""
    import torch
    from faster_whisper.audio import decode_audio

    if _pytorch_model is None or _processor is None:
        _load_clinical_lora_engine()

    if _pytorch_model is None or _processor is None:
        raise RuntimeError("Clinical LoRA engine could not be initialized.")

    # High-performance PyAV audio decoding: decodes WebM, WAV, MP4, AAC, OGG to 16kHz mono
    audio_array = decode_audio(audio_path, sampling_rate=16000)
    inputs = _processor(audio_array, sampling_rate=16000, return_tensors="pt")
    input_features = inputs.input_features.to(_device)

    with torch.inference_mode():
        out = _pytorch_model.generate(
            input_features=input_features,
            language="en",
            task="transcribe",
            max_new_tokens=128,
            return_dict_in_generate=True,
            output_scores=True,
        )

    transcription = _processor.batch_decode(out.sequences, skip_special_tokens=True)[0].strip()

    # Calculate token-level confidence using step logits softmax
    confidence: Optional[float] = None
    if out.scores and transcription:
        token_probs = []
        gen_ids = out.sequences[0, -len(out.scores):]
        for step_logits, tok in zip(out.scores, gen_ids):
            p = torch.softmax(step_logits[0].float(), dim=-1)[tok].item()
            token_probs.append(p)
        if token_probs:
            avg_prob = sum(token_probs) / len(token_probs)
            confidence = round(min(max(avg_prob, 0.0), 1.0), 3)

    return transcription, confidence


def _transcribe_edge_int8(audio_path: str) -> Tuple[str, Optional[float]]:
    """Inference path using the faster-whisper CTranslate2 INT8 CPU engine."""
    if _ct2_model is None:
        _load_edge_int8_engine()

    if _ct2_model is None:
        raise RuntimeError("Edge AI INT8 engine could not be initialized.")

    segments, _ = _ct2_model.transcribe(
        audio_path,
        beam_size=1,
        language="en",
        temperature=0.0,
        vad_filter=False,
        no_speech_threshold=0.55,
        compression_ratio_threshold=2.4,
    )

    seg_list = list(segments)
    text_parts = [s.text.strip() for s in seg_list if s.text.strip()]
    transcription = " ".join(text_parts).strip()

    confidence: Optional[float] = None
    if transcription and seg_list:
        valid_logprobs = [
            s.avg_logprob
            for s in seg_list
            if s.text.strip() and getattr(s, "avg_logprob", None) is not None
        ]
        if valid_logprobs:
            mean_logprob = sum(valid_logprobs) / len(valid_logprobs)
            try:
                val = math.exp(mean_logprob)
                if math.isfinite(val):
                    confidence = round(min(max(val, 0.0), 1.0), 3)
            except (OverflowError, ValueError):
                confidence = None

    return transcription, confidence


def transcribe_audio(audio_path: str) -> Tuple[str, Optional[float]]:
    """
    Transcribes an audio file (.webm, .wav, .mp4, .aac, .ogg) using the active engine.
    
    Parameters:
        audio_path: Local filepath to the audio recording.
        
    Returns:
        tuple[str, float | None]:
            - transcription: Decoded text transcription.
            - confidence: Normalized confidence score between 0.0 and 1.0 (or None).
    """
    if not os.path.isfile(audio_path):
        raise FileNotFoundError(f"Audio file does not exist: {audio_path}")

    if ACTIVE_ENGINE == "whisper-small-lora" and _pytorch_model is not None:
        return _transcribe_clinical_lora(audio_path)
    elif _ct2_model is not None:
        return _transcribe_edge_int8(audio_path)
    else:
        # If neither is loaded yet, run through general loader
        load_model()
        if _pytorch_model is not None:
            return _transcribe_clinical_lora(audio_path)
        return _transcribe_edge_int8(audio_path)
