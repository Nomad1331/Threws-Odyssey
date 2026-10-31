import os
import time
import tempfile
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend.app.inference import load_model, transcribe_audio

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("voicebridge-backend")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing VoiceBridge Whisper Tiny + LoRA...")
    load_model()
    logger.info("VoiceBridge model initialized and ready.")
    yield
    logger.info("Shutting down VoiceBridge ASR Gateway...")

app = FastAPI(
    title="VoiceBridge ASR Gateway",
    description="Low-Latency Dysarthric Speech Reconstruction Microservice • THREWS Odyssey 2026",
    version="0.2.3",
    lifespan=lifespan,
)

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic response models
class HealthResponse(BaseModel):
    status: str
    service: str
    engine: str

class TranscriptionResponse(BaseModel):
    transcription: str
    confidence_score: float
    processing_time_ms: int
    engine: str

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for container and gateway monitoring."""
    return HealthResponse(
        status="healthy",
        service="VoiceBridge ASR Gateway",
        engine="whisper-tiny-lora",
    )

@app.post("/api/v1/translate-audio", response_model=TranscriptionResponse)
async def translate_audio(file: UploadFile = File(...)):
    """
    Ingests an audio stream (.webm, .wav, .ogg, .mp3),
    processes it through the CPU-optimized Whisper-tiny model,
    and returns reconstructed text with telemetry metrics.
    """
    start_time = time.perf_counter()

    # Determine file extension from uploaded filename or default to .webm
    filename = file.filename or "audio.webm"
    ext = os.path.splitext(filename)[1].lower()
    if not ext:
        ext = ".webm"

    # Save audio stream to temporary file for PyAV / faster-whisper decoder
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    temp_path = temp_file.name

    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded audio file is empty")

        temp_file.write(content)
        temp_file.flush()
        temp_file.close()

        # Run VoiceBridge Whisper Tiny + LoRA inference
        full_text = transcribe_audio(temp_path)

        # Confidence score is not currently calculated
        confidence = 0.0

        elapsed_ms = int(round((time.perf_counter() - start_time) * 1000))

        logger.info(
            f"Processed '{filename}' in {elapsed_ms}ms -> '{full_text}'"
        )

        return TranscriptionResponse(
            transcription=full_text,
            confidence_score=confidence,
            processing_time_ms=elapsed_ms,
            engine="whisper-tiny-lora",
)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Inference error during audio translation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Audio translation failed: {str(e)}")
    finally:
        # Clean up temporary audio file
        if os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except OSError as err:
                logger.warning(f"Failed to remove temp file {temp_path}: {err}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
