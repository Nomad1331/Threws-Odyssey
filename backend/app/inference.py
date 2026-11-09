"""
VoiceBridge Clinical Acoustic Inference Engine
==============================================
Assistive Speech-to-Text Engine fine-tuned specifically for dysarthric speech patterns.

Architecture:
- Base Acoustic Model: openai/whisper-small (243.5M parameters)
- Fine-Tuned PEFT LoRA Adapter: Aaliya05/voicebridge (r=16, alpha=32)
- Evaluated on University of Toronto TORGO dysarthria corpus.
- Step-level Softmax Confidence: Generates authentic, normalized token probabilities [0.0 - 1.0].
- Native Audio Ingestion: PyAV decoding for direct handling of .webm, .wav, .mp4, .aac, .ogg.

No inferior fallback modes: VoiceBridge runs strictly on the fine-tuned clinical model.
"""

from __future__ import annotations

import glob
import logging
import os
import threading
from typing import Optional, Tuple

ENGINE_NAME = "whisper-small-lora"
BASE_MODEL_ID = os.getenv("VOICEBRIDGE_BASE_MODEL", "openai/whisper-small")
ADAPTER_MODEL_ID = os.getenv("VOICEBRIDGE_ADAPTER_MODEL", "Aaliya05/voicebridge")


def _hf_cache_has(repo_id: str, weight_file: str) -> bool:
    """True only when the actual weight file exists in a cached snapshot."""
    base = os.getenv("HF_HOME") or os.path.join(
        os.path.expanduser("~"), ".cache", "huggingface"
    )
    pattern = os.path.join(
        base,
        "hub",
        "models--" + repo_id.replace("/", "--"),
        "snapshots",
        "*",
        weight_file,
    )
    return bool(glob.glob(pattern))


# If both weight files are already cached, no download is needed. Force offline mode
# so startup does not depend on reaching huggingface.co (observed: four Hub requests
# per launch). A partial cache is not treated as ready; it can still download.
if (
    os.getenv("HF_HUB_OFFLINE") is None
    and _hf_cache_has(BASE_MODEL_ID, "model.safetensors")
    and _hf_cache_has(ADAPTER_MODEL_ID, "adapter_model.safetensors")
):
    os.environ["HF_HUB_OFFLINE"] = "1"

import av  # noqa: E402
import gc  # noqa: E402
import numpy as np  # noqa: E402
import torch  # noqa: E402
from peft import PeftModel  # noqa: E402
from transformers import WhisperProcessor, WhisperForConditionalGeneration  # noqa: E402

logger = logging.getLogger("voicebridge-inference")
HF_TOKEN = os.getenv("HF_TOKEN")

# Whisper processes 30-second windows and silently truncates anything longer.
# The product rejects longer recordings instead of returning a partial transcript.
MAX_AUDIO_SECONDS = 30.0

# Whisper invents words on silence (a 3 s silent clip decodes to "you"). Near-digital
# silence is rejected before inference instead of being presented as speech.
# Calibration on the demo clips: peaks 0.49-0.74; digital silence is 0.0.
SILENCE_PEAK_THRESHOLD = 0.002


class AudioTooLongError(ValueError):
    """Raised when a recording exceeds the model's 30-second input window."""


_processor: Optional[WhisperProcessor] = None
_model: Optional[PeftModel] = None
_device: str = "cuda" if torch.cuda.is_available() else "cpu"

# Serialises the first load so two concurrent requests cannot each allocate the
# model, and so no request can observe a half-initialised global.
_load_lock = threading.Lock()


def get_active_engine_name() -> str:
    """Returns the identifier of the active transcription engine."""
    return ENGINE_NAME


def load_model() -> None:
    """
    Initializes and caches the fine-tuned Whisper-Small LoRA clinical model.
    Called during FastAPI lifespan startup; also safe under concurrent first use.
    """
    global _processor, _model
    if _model is not None and _processor is not None:
        return

    with _load_lock:
        # Re-check inside the lock: another thread may have finished the load.
        if _model is not None and _processor is not None:
            return

        logger.info(
            f"Loading Clinical Acoustic Engine: base={BASE_MODEL_ID}, "
            f"adapter={ADAPTER_MODEL_ID} on {_device}..."
        )

        processor = WhisperProcessor.from_pretrained(BASE_MODEL_ID)
        base = WhisperForConditionalGeneration.from_pretrained(BASE_MODEL_ID)
        model = PeftModel.from_pretrained(base, ADAPTER_MODEL_ID, token=HF_TOKEN)
        model.to(_device)
        model.eval()

        # Publish only fully-initialised objects, processor first so a reader
        # that sees a model also sees its processor.
        _processor = processor
        _model = model

    logger.info(f"VoiceBridge Clinical LoRA engine successfully initialized on {_device}.")


def probe_duration_s(audio_path: str) -> Optional[float]:
    """
    Read the container duration without decoding the whole file.

    Decoding first would let a small, highly compressed upload expand into a very
    long PCM buffer before the 30-second check runs. When the container does not
    report a duration, transcribe_audio falls back to checking after decode.
    """
    try:
        with av.open(audio_path) as container:
            if container.duration:
                return container.duration / av.time_base
    except Exception:
        return None
    return None


def decode_audio_pyav(audio_path: str, sampling_rate: int = 16000) -> np.ndarray:
    """
    Decode any container PyAV supports to mono float32 at `sampling_rate`.

    This replaces faster_whisper.audio.decode_audio, which passes
    `metadata_errors="ignore"` to av.open; PyAV 19 removed that keyword, so every
    decode failed with a metadata_errors TypeError on a fresh install. Output is
    sample-identical to the old wrapper on WAV and WebM/Opus (max diff 0.0).
    """
    resampler = av.AudioResampler(format="s16", layout="mono", rate=sampling_rate)
    chunks: list[np.ndarray] = []
    with av.open(audio_path, mode="r") as container:
        for frame in container.decode(audio=0):
            for resampled in resampler.resample(frame):
                chunks.append(resampled.to_ndarray())
        for resampled in resampler.resample(None):
            chunks.append(resampled.to_ndarray())

    # PyAV keeps resampler objects alive otherwise (faster-whisper #390).
    del resampler
    gc.collect()

    if not chunks:
        return np.zeros(0, dtype=np.float32)
    raw = np.concatenate([chunk.reshape(-1) for chunk in chunks])
    return raw.astype(np.float32) / 32768.0


def transcribe_audio(audio_path: str) -> Tuple[str, Optional[float]]:
    """
    Transcribes an audio file (.webm, .wav, .mp4, .aac, .ogg) using the fine-tuned
    Whisper-Small LoRA clinical acoustic model.

    Parameters:
        audio_path: Local filepath to the audio recording.

    Returns:
        tuple[str, float | None]:
            - transcription: Decoded text transcription.
            - confidence: Normalized token softmax confidence score between 0.0 and 1.0 (or None).
    """
    if not os.path.isfile(audio_path):
        raise FileNotFoundError(f"Audio file does not exist: {audio_path}")

    if _model is None or _processor is None:
        load_model()

    model, processor = _model, _processor
    if model is None or processor is None:
        raise RuntimeError("Clinical LoRA engine could not be initialized.")

    # Reject over-long audio before decoding when the container reports its length.
    known_duration = probe_duration_s(audio_path)
    if known_duration is not None and known_duration > MAX_AUDIO_SECONDS:
        raise AudioTooLongError(
            f"Recording is {known_duration:.2f} s; the model accepts at most "
            f"{MAX_AUDIO_SECONDS:.0f} s. Please record a shorter phrase."
        )

    # High-performance PyAV decoding: WebM, WAV, MP4, AAC, OGG to 16 kHz mono float32
    audio_array = decode_audio_pyav(audio_path, sampling_rate=16000)

    # Fallback for containers that do not publish a duration: check after decode.
    duration_s = len(audio_array) / 16000.0
    if duration_s > MAX_AUDIO_SECONDS:
        raise AudioTooLongError(
            f"Recording is {duration_s:.2f} s; the model accepts at most "
            f"{MAX_AUDIO_SECONDS:.0f} s. Please record a shorter phrase."
        )

    peak = float(np.abs(audio_array).max()) if len(audio_array) else 0.0
    if peak < SILENCE_PEAK_THRESHOLD:
        logger.info("Near-silent recording rejected before inference (peak %.5f).", peak)
        return "", None

    inputs = processor(audio_array, sampling_rate=16000, return_tensors="pt")
    input_features = inputs.input_features.to(_device)

    with torch.inference_mode():
        out = model.generate(
            input_features=input_features,
            language="en",
            task="transcribe",
            max_new_tokens=128,
            return_dict_in_generate=True,
            output_scores=True,
        )

    transcription = processor.batch_decode(out.sequences, skip_special_tokens=True)[0].strip()

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
