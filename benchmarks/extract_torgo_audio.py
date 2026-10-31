import os
import pyarrow.parquet as pq
from faster_whisper import WhisperModel

PARQUET_PATH = r"C:\Users\Ahmed\.cache\huggingface\hub\datasets--abnerh--TORGO-database\snapshots\c4e0b560a515465e61bb555455e34fc620031fe8\data\train-00002-of-00004.parquet"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "public", "audio")
os.makedirs(OUTPUT_DIR, exist_ok=True)

table = pq.read_table(PARQUET_PATH)
audio_col = table["audio"]
transcriptions = table["transcription"].to_pylist()
durations = table["duration"].to_pylist()

# Selected 3 authentic TORGO clips:
# 1. Mild (M05): index 2795 - "We have an excellent team"
# 2. Moderate (M04): index 4087 - "Their house is grey and white"
# 3. Severe (M02): index 3291 - "The job provides many benefits"

trials = [
    {
        "filename": "torgo_mild_sample.wav",
        "index": 2795,
        "severity": "Mild",
        "speaker": "TORGO-M05",
        "condition": "Cerebral Palsy",
    },
    {
        "filename": "torgo_moderate_sample.wav",
        "index": 4087,
        "severity": "Moderate",
        "speaker": "TORGO-M04",
        "condition": "Post-Stroke Dysarthria",
    },
    {
        "filename": "torgo_severe_sample.wav",
        "index": 3291,
        "severity": "Severe",
        "speaker": "TORGO-M02",
        "condition": "Amyotrophic Lateral Sclerosis (ALS)",
    },
]

print("Saving authentic TORGO audio samples to frontend/public/audio/...")
saved_paths = []
for t in trials:
    idx = t["index"]
    item = audio_col[idx].as_py()
    raw_bytes = item["bytes"]
    out_path = os.path.join(OUTPUT_DIR, t["filename"])
    with open(out_path, "wb") as f:
        f.write(raw_bytes)
    t["target"] = transcriptions[idx]
    t["duration"] = durations[idx]
    t["path"] = out_path
    saved_paths.append(out_path)
    print(f"[+] Saved {t['filename']} ({len(raw_bytes)} bytes) | Target: '{t['target']}' ({t['duration']}s)")

print("\nBenchmarking with Whisper-base on CPU to capture baseline transcription...")
model = WhisperModel("base", device="cpu", compute_type="int8")

for t in trials:
    segments, info = model.transcribe(t["path"], beam_size=1, language="en", task="transcribe")
    pred_text = " ".join([s.text.strip() for s in segments]).strip()
    t["baseline_pred"] = pred_text
    print(f"\n[{t['severity']} - {t['speaker']}]")
    print(f"  Target Sentence : '{t['target']}'")
    print(f"  Whisper Baseline: '{pred_text}'")
