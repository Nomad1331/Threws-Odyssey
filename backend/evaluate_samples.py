"""
VoiceBridge Clinical Model Live Evaluator
=========================================
Runs the fine-tuned Whisper-Small LoRA clinical model directly on authentic TORGO
patient recordings from frontend/public/audio/ and reports real-time metrics:
- Ground Truth vs. Decoded Transcription
- Normalized Confidence Score (token-level softmax)
- Processing Latency (ms)
"""

import os
import sys
import time

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.inference import load_model, transcribe_audio, get_active_engine_name

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO_DIR = os.path.join(REPO_ROOT, "frontend", "public", "audio")

SAMPLES = [
    {
        "file": "torgo_mild_sample.wav",
        "speaker": "TORGO-M05",
        "severity": "Mild",
        "etiology": "Cerebral Palsy",
        "ground_truth": "We have an excellent team",
    },
    {
        "file": "torgo_moderate_sample.wav",
        "speaker": "TORGO-M04",
        "severity": "Moderate-to-Severe",
        "etiology": "Post-Trauma (TBI)",
        "ground_truth": "Their house is grey and white",
    },
    {
        "file": "torgo_severe_sample.wav",
        "speaker": "TORGO-M02",
        "severity": "Severe",
        "etiology": "Amyotrophic Lateral Sclerosis (ALS)",
        "ground_truth": "The job provides many benefits",
    },
]


def run_evaluation():
    print("=" * 70)
    print("VOICEBRIDGE LIVE CLINICAL MODEL EVALUATION")
    print("=" * 70)
    print(f"Active Engine: {get_active_engine_name()}")
    print("Pre-warming clinical LoRA model in memory...")

    t0 = time.perf_counter()
    load_model()
    load_time = round((time.perf_counter() - t0), 2)
    print(f"Model ready (loaded in {load_time}s).\n")

    evaluated = 0
    for i, s in enumerate(SAMPLES, 1):
        path = os.path.join(AUDIO_DIR, s["file"])
        if not os.path.exists(path):
            print(f"[{i}/3] Skipping {s['file']} (file not found)")
            continue
        evaluated += 1

        start = time.perf_counter()
        text, confidence = transcribe_audio(path)
        latency_ms = int(round((time.perf_counter() - start) * 1000))

        conf_str = f"{confidence * 100:.1f}%" if confidence is not None else "N/A"

        print("-" * 70)
        print(f"Sample {i}: {s['speaker']} | {s['severity']} | {s['etiology']}")
        print(f"File:         {s['file']}")
        print(f"Ground Truth: \"{s['ground_truth']}\"")
        print(f"Decoded Text: \"{text}\"")
        print(f"Confidence:   {conf_str} (token-level softmax probability)")
        print(f"Latency:      {latency_ms} ms")

    if evaluated == 0:
        print("=" * 70)
        print(f"NO SAMPLES EVALUATED: none of the {len(SAMPLES)} clips exist in {AUDIO_DIR}.")
        print("=" * 70)
        raise SystemExit(1)

    print("=" * 70)
    print(f"EVALUATION COMPLETE - {evaluated}/{len(SAMPLES)} clips transcribed by real model inference.")
    print("=" * 70)


if __name__ == "__main__":
    run_evaluation()
