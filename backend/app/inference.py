"""
VoiceBridge CPU Inference Engine
--------------------------------
Executes INT8 quantized Whisper on CPU using faster-whisper (CTranslate2).
Lightweight runtime: runs locally without GPU or heavy dependencies.
"""

import os
import math
import logging
from faster_whisper import WhisperModel

logger = logging.getLogger("voicebridge-inference")

# Global model handle
_model: WhisperModel | None = None


def load_model() -> None:
    """
    Initializes the quantized INT8 Whisper engine on CPU.
    Loads on startup into memory.
    """
    global _model
    if _model is not None:
        return

    logger.info("Loading VoiceBridge quantized INT8 acoustic engine (tiny.en on CPU)...")
    _model = WhisperModel(
        "tiny.en",
        device="cpu",
        compute_type="int8",
        cpu_threads=4
    )
    logger.info("VoiceBridge INT8 acoustic engine successfully loaded.")


def transcribe_audio(audio_path: str) -> tuple[str, float | None]:
    """
    Transcribes an audio file (.wav, .webm, .ogg) using the INT8 engine.
    
    Returns:
        (transcription_text, confidence_score)
    """
    if _model is None:
        load_model()

    if _model is None:
        raise RuntimeError("Acoustic engine could not be initialized.")

    # Run greedy beam_size=1 decoding optimized for edge CPU throughput
    segments, info = _model.transcribe(
        audio_path,
        beam_size=1,
        language="en",
        temperature=0.0,
        vad_filter=False,                  # Do not clip dysarthric low-energy phonemes
        no_speech_threshold=0.55,           # Prevent hallucination loops during speech pauses
        compression_ratio_threshold=2.4,   # Suppress repetitive token loops
    )

    text_parts = [segment.text.strip() for segment in segments if segment.text.strip()]
    transcription = " ".join(text_parts).strip()

    # Extract logprob confidence if available
    confidence: float | None = None
    if info and hasattr(info, "avg_logprob") and info.avg_logprob is not None:
        try:
            confidence = round(min(max(math.exp(info.avg_logprob), 0.0), 1.0), 3)
        except (OverflowError, ValueError):
            confidence = None

    return transcription, confidence
