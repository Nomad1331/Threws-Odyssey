"""
VoiceBridge Backend Gateway
===========================
FastAPI microservice providing assistive speech-to-text endpoints.

Flow:
1. Receives audio recordings (.webm / .wav) from the Next.js frontend.
2. Validates in-memory boundaries (<=10MB, non-empty, safe audio extension) with zero disk I/O on invalid requests.
3. Temporarily writes valid audio bytes to disk for PyAV audio decoding and inference.
4. Offloads clinical LoRA acoustic inference to a worker thread (`asyncio.to_thread`) to keep the main event loop non-blocking.
5. Returns the transcribed text along with telemetry (confidence score and latency in ms).
6. Cleans up the temporary audio file in a guaranteed `finally` block.
"""

from __future__ import annotations

import os
import time
import asyncio
import tempfile
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from app.inference import (
        AudioTooLongError,
        get_active_engine_name,
        load_model,
        transcribe_audio,
    )
except ImportError:
    from backend.app.inference import (
        AudioTooLongError,
        get_active_engine_name,
        load_model,
        transcribe_audio,
    )

# Whitelist of permissible audio extensions to prevent creating executable suffixes in %TEMP%
ALLOWED_AUDIO_EXTENSIONS = {".webm", ".wav", ".ogg", ".mp3", ".m4a", ".mp4", ".aac", ".flac"}

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
    active_engine = get_active_engine_name()
    logger.info(f"Initializing VoiceBridge acoustic engine ({active_engine})...")
    load_model()
    logger.info(f"VoiceBridge acoustic engine ({active_engine}) loaded and ready for inference.")
    yield
    logger.info("Shutting down VoiceBridge service...")

app = FastAPI(
    title="VoiceBridge ASR Service",
    description="Assistive Speech Transcription Service • SIES Graduate School of Technology",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: only the local frontend origins are trusted by default. The browser client
# does not send cookies, so credentials stay off. For a tablet/mobile demo over LAN,
# list the exact origins in VOICEBRIDGE_ALLOWED_ORIGINS (comma-separated); do not
# widen this to "any private-range address".
_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
_ALLOWED_ORIGINS += [
    origin.strip()
    for origin in os.getenv("VOICEBRIDGE_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=False,
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
        engine=get_active_engine_name(),
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
    2. Validates payload boundaries (maximum 10MB, non-empty) BEFORE disk I/O to prevent memory DOS.
    3. Writes audio bytes safely to an OS temporary file for PyAV audio decoding.
    4. Runs fine-tuned Whisper-Small LoRA clinical acoustic inference with dysarthria-adapted decoding.
    5. Returns transcription text, normalized confidence score, and processing latency.
    6. Guaranteed cleanup of both OS temporary file and Starlette spool handle in finally block.
    """
    start_time = time.perf_counter()
    temp_path: str | None = None

    try:
        # 1. Read and validate payload boundaries in-memory BEFORE touching disk
        content = await file.read(10 * 1024 * 1024 + 1)
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Audio file exceeds the 10 MB limit.")
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded audio file is empty.")

        # 2. Determine file extension, enforcing allowed audio extensions to prevent arbitrary suffixes.
        # Sanitize filename against path/log injection
        raw_filename = file.filename or "audio.webm"
        clean_filename = os.path.basename(raw_filename).replace("\r", "").replace("\n", "")
        ext = os.path.splitext(clean_filename)[1].lower()
        if ext not in ALLOWED_AUDIO_EXTENSIONS:
            ext = ".webm"

        # 3. Create temporary file on disk for PyAV audio decoding.
        # Note for Windows: We close the NamedTemporaryFile handle immediately before
        # opening it with standard file I/O ('wb') to prevent WinError 32 (file in use).
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        temp_path = temp_file.name
        temp_file.close()

        with open(temp_path, "wb") as audio_file:
            audio_file.write(content)

        # Offload synchronous clinical LoRA inference to a worker thread so the
        # asyncio event loop remains non-blocking for /health checks and concurrent traffic.
        full_text, confidence = await asyncio.to_thread(transcribe_audio, temp_path)

        elapsed_ms = int(round((time.perf_counter() - start_time) * 1000))
        # Do not write the transcript itself (patient speech) to logs.
        logger.info(
            f"Transcribed '{clean_filename}' in {elapsed_ms}ms "
            f"({len(full_text)} chars, confidence={confidence})"
        )

        return TranscriptionResponse(
            transcription=full_text,
            confidence_score=confidence,
            processing_time_ms=elapsed_ms,
        )

    except HTTPException:
        raise
    except AudioTooLongError as e:
        # The client can fix this: record a shorter phrase.
        logger.warning(f"Rejected over-long audio: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    except ValueError as e:
        # PyAV/FFmpeg decode failures subclass ValueError: the client sent bad audio.
        logger.warning(f"Rejected undecodable audio: {e}")
        raise HTTPException(
            status_code=400,
            detail="Audio could not be decoded. Please try a different recording.",
        )
    except Exception:
        # Model, device or memory failure: not the client's fault, and the details
        # (paths, cache locations, tensor shapes) stay in the server log.
        logger.exception("Internal inference failure during transcription")
        raise HTTPException(
            status_code=500,
            detail="Internal transcription error. Please try again.",
        )
    finally:
        # Release Starlette upload spool file descriptor
        await file.close()

        # Always remove temporary audio file to prevent storage exhaustion
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except OSError as err:
                logger.warning(f"Failed to remove temp file {temp_path}: {err}")

if __name__ == "__main__":
    import uvicorn
    # Resolves correctly whether launched from repo root or inside backend/
    module = "app.main:app" if os.path.exists("app") else "backend.app.main:app"
    uvicorn.run(module, host="127.0.0.1", port=8000, reload=True)
