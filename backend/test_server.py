import sys
import os
import io
import wave
import math
import struct
import asyncio
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app

def generate_test_wav() -> bytes:
    """Generates a 1-second 16kHz mono 440Hz sine wave in WAV format."""
    buf = io.BytesIO()
    sample_rate = 16000
    duration = 1.0
    frequency = 440.0
    num_samples = int(sample_rate * duration)

    with wave.open(buf, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        
        frames = bytearray()
        for i in range(num_samples):
            value = int(32767.0 * 0.5 * math.sin(2.0 * math.pi * frequency * (i / sample_rate)))
            frames.extend(struct.pack('<h', value))
            
        wav.writeframes(frames)
    
    return buf.getvalue()

def run_tests():
    print("=" * 60)
    print("VOICEBRIDGE FASTAPI BACKEND: TEST SUITE VERIFICATION")
    print("=" * 60)

    # Use TestClient with lifespan context
    with TestClient(app) as client:
        # 1. Test /health endpoint
        print("\n[Test 1] Testing GET /health ...")
        resp = client.get("/health")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        print(f" -> Response: {data}")
        assert data["status"] == "healthy"
        assert data["service"] == "VoiceBridge ASR Gateway"
        assert data["engine"] == "whisper-tiny"
        print(" [PASS] GET /health endpoint verified.")

        # 2. Test /api/v1/translate-audio endpoint with generated audio
        print("\n[Test 2] Testing POST /api/v1/translate-audio with 16kHz WAV ...")
        wav_bytes = generate_test_wav()
        files = {"file": ("test_tone.wav", wav_bytes, "audio/wav")}
        
        post_resp = client.post("/api/v1/translate-audio", files=files)
        assert post_resp.status_code == 200, f"Expected 200, got {post_resp.status_code}: {post_resp.text}"
        post_data = post_resp.json()
        print(f" -> Response: {post_data}")
        assert "transcription" in post_data
        assert "confidence_score" in post_data
        assert "processing_time_ms" in post_data
        assert post_data["engine"] == "whisper-tiny-cpu"
        print(" [PASS] POST /api/v1/translate-audio endpoint verified.")

    print("\n" + "=" * 60)
    print("ALL TESTS PASSED WITH ZERO ERRORS.")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
