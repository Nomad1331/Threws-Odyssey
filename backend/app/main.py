import os
import time
import tempfile
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from soundfile import LibsndfileError

try:
    from app.inference import load_model, transcribe_audio
except ImportError:
    from backend.app.inference import load_model, transcribe_audio

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("voicebridge-backend")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing VoiceBridge Whisper Tiny INT8 engine on CPU...")
    load_model()
    logger.info("VoiceBridge Whisper model loaded and ready for inference.")
    yield
    logger.info("Shutting down VoiceBridge service...")

app = FastAPI(
    title="VoiceBridge ASR Service",
    description="Assistive Speech Transcription Service • SIES Graduate School of Technology",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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
    confidence_score: float | None
    processing_time_ms: int

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint to verify backend service readiness."""
    return HealthResponse(
        status="healthy",
        service="VoiceBridge ASR Service",
        engine="whisper-tiny-int8",
    )

@app.post("/api/v1/translate-audio", response_model=TranscriptionResponse)
async def translate_audio(file: UploadFile = File(...)):
    """
    Ingests an audio recording (.webm, .wav, .ogg, .mp3),
    processes it through the CPU-optimized Whisper-tiny INT8 model,
    and returns transcribed text with confidence score and latency.
    """
    start_time = time.perf_counter()

    filename = file.filename or "audio.webm"
    ext = os.path.splitext(filename)[1].lower()
    if not ext:
        ext = ".webm"

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    temp_path = temp_file.name
    temp_file.close()

    try:
        content = await file.read(10 * 1024 * 1024 + 1)
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Audio file exceeds the 10 MB limit.")
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded audio file is empty.")

        with open(temp_path, "wb") as audio_file:
            audio_file.write(content)

        # Run CPU INT8 Whisper inference
        full_text, confidence = transcribe_audio(temp_path)

        elapsed_ms = int(round((time.perf_counter() - start_time) * 1000))

        logger.info(f"Transcribed '{filename}' in {elapsed_ms}ms -> '{full_text}'")

        return TranscriptionResponse(
            transcription=full_text,
            confidence_score=confidence,
            processing_time_ms=elapsed_ms,
        )

    except HTTPException:
        raise
    except (OSError, ValueError, RuntimeError, EOFError, LibsndfileError) as e:
        logger.error(f"Inference error during audio translation: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Audio processing error: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except OSError as err:
                logger.warning(f"Failed to remove temp file {temp_path}: {err}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
