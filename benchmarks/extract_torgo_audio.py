"""
One-off extraction of the three demo clips from the TORGO parquet shard.

Requires the optional research extras (not part of the product install):
    pip install datasets pyarrow faster-whisper

Row indices are fixed to the shard this project used (train-00002-of-00004).
The expected transcript is asserted before each file is written, so a reordered
shard fails loudly instead of silently mislabelling the demo audio.
"""

import os
import glob
import re
import pyarrow.parquet as pq
from faster_whisper import WhisperModel


def words(text: str) -> list[str]:
    """Lowercase, strip punctuation and split, for tolerant transcript comparison."""
    return re.sub(r"[^a-z0-9\s]", "", text.lower()).split()


# The parquet shard lives in the Hugging Face datasets cache. The glob picks the
# current snapshot; the fallback hash is the snapshot this project used, so the
# script still works if the cache has no `refs/main` entry.
cache_pattern = os.path.expanduser(
    r"~/.cache/huggingface/hub/datasets--abnerh--TORGO-database/snapshots/*/data/train-00002-of-00004.parquet"
)
matched = glob.glob(cache_pattern)
PARQUET_PATH = matched[0] if matched else os.path.expanduser(
    r"~/.cache/huggingface/hub/datasets--abnerh--TORGO-database/snapshots/c4e0b560a515465e61bb555455e34fc620031fe8/data/train-00002-of-00004.parquet"
)
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(ROOT_DIR, "frontend", "public", "audio")
os.makedirs(OUTPUT_DIR, exist_ok=True)

table = pq.read_table(PARQUET_PATH)
# Three columns are enough: audio bytes, the reference transcript, and duration.
# Speaker/severity labels are not in this shard, so they are asserted indirectly
# through the expected transcript for each fixed row index.
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
        "expect": "We have an excellent team",
    },
    {
        "filename": "torgo_moderate_sample.wav",
        "index": 4087,
        "severity": "Moderate-to-Severe",
        "speaker": "TORGO-M04",
        "condition": "Post-Trauma (TBI)",
        "expect": "Their house is grey and white",
    },
    {
        "filename": "torgo_severe_sample.wav",
        "index": 3291,
        "severity": "Severe",
        "speaker": "TORGO-M02",
        "condition": "Amyotrophic Lateral Sclerosis (ALS)",
        "expect": "The job provides many benefits",
    },
]

print("Saving authentic TORGO audio samples to frontend/public/audio/...")
saved_paths = []
for t in trials:
    idx = t["index"]
    item = audio_col[idx].as_py()
    raw_bytes = item["bytes"]
    actual = transcriptions[idx]
    # Guard against a reordered shard: writing the wrong audio under a demo
    # label would silently corrupt both the UI and the WER reference.
    if words(actual) != words(t["expect"]):
        raise SystemExit(
            f"Row {idx} is '{actual}', expected '{t['expect']}'. "
            "The parquet shard changed; update the indices before extracting."
        )
    out_path = os.path.join(OUTPUT_DIR, t["filename"])
    with open(out_path, "wb") as f:
        f.write(raw_bytes)
    t["target"] = actual
    t["duration"] = durations[idx]
    t["path"] = out_path
    saved_paths.append(out_path)
    print(f"[+] Saved {t['filename']} ({len(raw_bytes)} bytes) | Target: '{t['target']}' ({t['duration']}s)")

print("\nBenchmarking with Whisper-tiny on CPU to capture baseline zero-shot transcription...")
model = WhisperModel("tiny", device="cpu", compute_type="int8")

for t in trials:
    segments, info = model.transcribe(t["path"], beam_size=1, language="en", task="transcribe")
    pred_text = " ".join([s.text.strip() for s in segments]).strip()
    t["baseline_pred"] = pred_text
    print(f"\n[{t['severity']} - {t['speaker']}]")
    print(f"  Target Sentence : '{t['target']}'")
    print(f"  Whisper Baseline: '{pred_text}'")
