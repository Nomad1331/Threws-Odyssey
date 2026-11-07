"""
VoiceBridge Backend Gateway
===========================
FastAPI microservice providing assistive speech-to-text endpoints.

Flow:
1. Receives audio recordings (.webm / .wav) from the Next.js frontend.
2. Temporarily writes the audio bytes to disk for faster-whisper's CTranslate2 engine.
3. Invokes CPU-optimized INT8 Whisper inference (`app.inference.transcribe_audio`).
4. Returns the transcribed text along with telemetry (confidence and latency in ms).
5. Cleans up the temporary audio file in a guaranteed `finally` block.
"""

import os
import time
import tempfile
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from app.inference import load_model, transcribe_audio
except ImportError:
    from backend.app.inference import load_model, transcribe_audio

# Configure structured logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("voicebridge-backend")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application Lifespan Context:
    Pre-loads the Whisper model into RAM during server boot so the first user
    request does not suffer cold-start latency.
    """
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

# CORS Middleware: Allows the Next.js frontend running on localhost:3000
# to make cross-origin fetch requests to this API on port 8000.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Pydantic Schemas for Request & Response Data Validation
# ---------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    service: str
    engine: str

class TranscriptionResponse(BaseModel):
    transcription: str
    confidence_score: float | None
    processing_time_ms: int

# ---------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint used by the frontend and Docker orchestrators
    to verify server readiness and active model engine.
    """
    return HealthResponse(
        status="healthy",
        service="VoiceBridge ASR Service",
        engine="whisper-tiny-int8",
    )

@app.post("/api/v1/translate-audio", response_model=TranscriptionResponse)
async def translate_audio(file: UploadFile = File(...)):
    """
    Primary Assistive Transcription Endpoint:
    -----------------------------------------
    Endpoint path '/api/v1/translate-audio' is preserved for backward compatibility
    with the Next.js frontend client contract.

    Execution Flow:
    1. Ingests multipart/form-data audio file (.webm from browser or .wav).
    2. Validates payload boundaries (maximum 10MB, non-empty) to prevent memory DOS.
    3. Writes audio bytes safely to an OS temporary file for CTranslate2 decoding.
    4. Runs CPU-quantized INT8 Whisper inference with dysarthria-tuned decoding.
    5. Returns transcription text, normalized confidence score, and processing latency.
    6. Deletes the temporary file in a guaranteed finally block to prevent disk leakage.
    """
    start_time = time.perf_counter()

    # Determine file extension (defaulting to .webm from browser MediaRecorder)
    filename = file.filename or "audio.webm"
    ext = os.path.splitext(filename)[1].lower()
    if not ext:
        ext = ".webm"

    # Create temporary file on disk.
    # Note for Windows: We close the NamedTemporaryFile handle immediately before
    # opening it with standard file I/O ('wb') to prevent WinError 32 (file in use).
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    temp_path = temp_file.name
    temp_file.close()

    try:
        # Read uploaded bytes with a 10MB safety boundary check (+1 byte to detect overflow)
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
        logger.info(f"Transcribed '{filename}' in {elapsed_ms}ms -> '{full_text}' (confidence={confidence})")

        return TranscriptionResponse(
            transcription=full_text,
            confidence_score=confidence,
            processing_time_ms=elapsed_ms,
        )

    except HTTPException:
        raise
    except (OSError, ValueError, RuntimeError, EOFError, Exception) as e:
        logger.error(f"Inference error during audio transcription: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Audio processing error: {str(e)}")
    finally:
        # Always remove temporary audio file to prevent storage exhaustion
        if os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except OSError as err:
                logger.warning(f"Failed to remove temp file {temp_path}: {err}")

if __name__ == "__main__":
    import uvicorn
    # Resolves correctly whether launched from repo root or inside backend/
    module = "app.main:app" if os.path.exists("app") else "backend.app.main:app"
    uvicorn.run(module, host="127.0.0.1", port=8000, reload=True)
