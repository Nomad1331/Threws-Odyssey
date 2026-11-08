import urllib.request
import json
import time

url = "http://127.0.0.1:8000/api/v1/translate-audio"
wav_path = r"I:\Career\Threws Hackathon\frontend\public\audio\yt_nihss_sample.wav"

with open(wav_path, "rb") as f:
    audio_bytes = f.read()

boundary = "----VoiceBridgeBoundaryXYZ"
body = bytearray()
body.extend(f"--{boundary}\r\n".encode())
body.extend(b'Content-Disposition: form-data; name="file"; filename="yt_nihss_sample.wav"\r\n')
body.extend(b"Content-Type: audio/wav\r\n\r\n")
body.extend(audio_bytes)
body.extend(f"\r\n--{boundary}--\r\n".encode())

req = urllib.request.Request(url, data=bytes(body), method="POST")
req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

print("Sending 0:50 - 1:09 YouTube audio slice to live VoiceBridge backend API...")
t0 = time.perf_counter()
try:
    with urllib.request.urlopen(req, timeout=60) as response:
        elapsed = int((time.perf_counter() - t0) * 1000)
        data = json.loads(response.read().decode())
        print("=" * 60)
        print("LIVE VOICEBRIDGE INFERENCE RESULT FOR YOUTUBE CLIP")
        print("=" * 60)
        print(f"Video URL:         https://www.youtube.com/watch?v=W1xhYBNn5n8")
        print(f"Timestamp:         0:50 - 1:09 (19.0 seconds)")
        print(f"Title:             13. NIHSS: Dysarthria")
        print(f"Transcribed Text:  \"{data.get('transcription')}\"")
        conf = data.get('confidence_score')
        conf_str = f"{conf * 100:.1f}%" if conf is not None else "N/A"
        print(f"Confidence Score:  {conf_str} (token-level softmax probability)")
        print(f"Backend Latency:   {data.get('processing_time_ms')} ms")
        print(f"Roundtrip Latency: {elapsed} ms")
        print("=" * 60)
except Exception as e:
    print(f"Request failed: {e}")
