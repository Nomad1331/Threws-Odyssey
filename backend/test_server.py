import sys
import os
import io
import wave
import math
import struct
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app

def generate_test_wav(duration: float = 1.0) -> bytes:
    """Generates a 16kHz mono 440Hz sine wave in standard WAV format."""
    buf = io.BytesIO()
    sample_rate = 16000
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
    print("VOICEBRIDGE FASTAPI BACKEND: FULL TEST SUITE VERIFICATION")
    print("=" * 60)

    # Use TestClient with lifespan context (pre-warms the Whisper INT8 engine)
    with TestClient(app) as client:
        # 1. Test /health endpoint
        print("\n[Test 1] Testing GET /health ...")
        resp = client.get("/health")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        print(f" -> Response: {data}")
        assert data["status"] == "healthy"
        assert data["service"] == "VoiceBridge ASR Service"
        assert data["engine"] == "whisper-tiny-int8"
        print(" [PASS] GET /health endpoint verified.")

        # 2. Test /api/v1/translate-audio endpoint with valid 16kHz WAV
        print("\n[Test 2] Testing POST /api/v1/translate-audio with valid 16kHz WAV ...")
        wav_bytes = generate_test_wav(1.0)
        files = {"file": ("test_tone.wav", wav_bytes, "audio/wav")}
        
        post_resp = client.post("/api/v1/translate-audio", files=files)
        assert post_resp.status_code == 200, f"Expected 200, got {post_resp.status_code}: {post_resp.text}"
        post_data = post_resp.json()
        print(f" -> Response: {post_data}")
        assert "transcription" in post_data
        assert "confidence_score" in post_data
        assert "processing_time_ms" in post_data
        assert isinstance(post_data["processing_time_ms"], int)
        print(" [PASS] POST /api/v1/translate-audio standard inference verified.")

        # 3. Test empty file rejection (HTTP 400)
        print("\n[Test 3] Testing empty audio file rejection ...")
        empty_files = {"file": ("empty.wav", b"", "audio/wav")}
        empty_resp = client.post("/api/v1/translate-audio", files=empty_files)
        assert empty_resp.status_code == 400, f"Expected 400, got {empty_resp.status_code}"
        print(f" -> Rejected empty file as expected: {empty_resp.json()}")
        print(" [PASS] Empty file boundary validated.")

        # 4. Test oversized file rejection (HTTP 413)
        print("\n[Test 4] Testing oversized payload rejection (>10MB) ...")
        oversized_bytes = b"0" * (10 * 1024 * 1024 + 100)
        oversized_files = {"file": ("giant.wav", oversized_bytes, "audio/wav")}
        oversized_resp = client.post("/api/v1/translate-audio", files=oversized_files)
        assert oversized_resp.status_code == 413, f"Expected 413, got {oversized_resp.status_code}"
        print(f" -> Rejected oversized file as expected: {oversized_resp.json()}")
        print(" [PASS] 10MB DoS boundary validated.")

        # 5. Test corrupt non-audio bytes handling (HTTP 400)
        print("\n[Test 5] Testing corrupt audio handling ...")
        corrupt_files = {"file": ("corrupt.webm", b"NOT AN AUDIO FILE GARBAGE DATA", "audio/webm")}
        corrupt_resp = client.post("/api/v1/translate-audio", files=corrupt_files)
        assert corrupt_resp.status_code == 400, f"Expected 400, got {corrupt_resp.status_code}"
        print(f" -> Handled corrupt audio gracefully: {corrupt_resp.json()}")
        print(" [PASS] Corrupt audio resilience validated.")

    print("\n" + "=" * 60)
    print("ALL 5 BACKEND VERIFICATION TESTS PASSED WITH ZERO ERRORS.")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
