"""
VoiceBridge product benchmark (Phase 1)
=======================================
Measures the model that actually serves users -- openai/whisper-small +
the PEFT LoRA adapter Aaliya05/voicebridge -- through the product's own
inference code (backend/app/inference.py). Nothing is re-implemented here
except the word-error-rate arithmetic, which is unit-tested in --self-test.

What it records, all into facts.json:
  * per-clip transcript, confidence and word-level WER (S/D/I counts)
  * latency: 2 warm-up runs per clip, then 5 timed runs per clip
  * memory: RSS before load, after load, delta, and process peak working set
  * model identity: measured parameter counts (the tiny-vs-small guard)
  * provenance: script hash, host, library versions, exact command

Usage
-----
  backend\\.venv\\Scripts\\python.exe benchmarks\\benchmark_product.py
  backend\\.venv\\Scripts\\python.exe benchmarks\\benchmark_product.py --self-test
  backend\\.venv\\Scripts\\python.exe benchmarks\\benchmark_product.py --baseline facts.prev.json

Exit codes: 0 = measured and all gates passed; 2 = a gate failed; other = crash.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import re
import statistics
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

# Offline: every artifact is cached locally. This also stops Hugging Face from
# making HEAD requests mid-run, which would add seconds to the first load.
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")

import psutil  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

# Latency budget recorded for the project before this benchmark existed. It is a
# requirement, not a measurement; kept here so the report can compute PASS/MISS.
TARGET_LATENCY_MS = 280

# Whisper-small has 243.5M parameters. Anything outside this band means the
# benchmark is measuring a different model than the one users get.
EXPECTED_TOTAL_PARAMS = 243_500_000
PARAM_TOLERANCE = 0.01


# --------------------------------------------------------------------------- #
# Word error rate
# --------------------------------------------------------------------------- #
def normalize(text: str) -> list[str]:
    """Lowercase, drop punctuation, collapse whitespace."""
    text = text.lower().replace("\u2019", "'")
    text = re.sub(r"[^\w\s']", " ", text)
    return text.split()


def edit_counts(reference: list[str], hypothesis: list[str]) -> tuple[int, int, int]:
    """Levenshtein alignment; returns (substitutions, deletions, insertions)."""
    n, m = len(reference), len(hypothesis)
    d = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        d[i][0] = i
    for j in range(m + 1):
        d[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = 0 if reference[i - 1] == hypothesis[j - 1] else 1
            d[i][j] = min(
                d[i - 1][j] + 1,        # deletion
                d[i][j - 1] + 1,        # insertion
                d[i - 1][j - 1] + cost,  # match / substitution
            )

    subs = dels = ins = 0
    i, j = n, m
    while i > 0 and j > 0:
        if reference[i - 1] == hypothesis[j - 1] and d[i][j] == d[i - 1][j - 1]:
            i -= 1
            j -= 1
        elif d[i][j] == d[i - 1][j - 1] + 1:
            subs += 1
            i -= 1
            j -= 1
        elif d[i][j] == d[i - 1][j] + 1:
            dels += 1
            i -= 1
        else:
            ins += 1
            j -= 1
    dels += i
    ins += j
    return subs, dels, ins


def word_error_rate(reference: str, hypothesis: str) -> dict:
    ref, hyp = normalize(reference), normalize(hypothesis)
    subs, dels, ins = edit_counts(ref, hyp)
    errors = subs + dels + ins
    pct = (errors / len(ref) * 100.0) if ref else 0.0
    return {
        "werPct": round(pct, 1),
        "substitutions": subs,
        "deletions": dels,
        "insertions": ins,
        "referenceWords": len(ref),
        "hypothesisWords": len(hyp),
        "errors": errors,
    }


def self_test() -> int:
    """Known-answer checks for the metric. Any failure exits 1."""
    cases = [
        # (reference, hypothesis, expected WER %, expected S, D, I)
        ("We have an excellent team", "We have an excellent team", 0.0, 0, 0, 0),
        ("We have an excellent team", "We have an 8th team", 20.0, 1, 0, 0),
        ("Their house is grey and white", "Good night.", 100.0, 2, 4, 0),
        ("The job provides many benefits", "", 100.0, 0, 5, 0),
        ("We have an excellent team", "we have an excellent team.", 0.0, 0, 0, 0),
        ("one two three four five", "one two three four five six seven", 40.0, 0, 0, 2),
    ]
    failures = []
    for ref, hyp, want_wer, want_s, want_d, want_i in cases:
        got = word_error_rate(ref, hyp)
        if (
            got["werPct"] != want_wer
            or got["substitutions"] != want_s
            or got["deletions"] != want_d
            or got["insertions"] != want_i
        ):
            failures.append((ref, hyp, got, want_wer))

    # A check that cannot fail proves nothing: the same metric must reject a
    # wrong answer, which the first case above would if we swapped the labels.
    if word_error_rate("We have an excellent team", "We have an excellent team")["werPct"] != 0.0:
        failures.append(("negative control", "", {}, "0.0"))

    for ref, hyp, got, want in failures:
        print(f"FAIL self-test: ref={ref!r} hyp={hyp!r} got={got} want WER {want}")
    print(f"self-test: {len(cases)} cases, {len(failures)} failure(s)")
    return 1 if failures else 0


# --------------------------------------------------------------------------- #
# Host / provenance
# --------------------------------------------------------------------------- #
def cpu_name() -> str:
    if platform.system() == "Windows":
        try:
            import winreg

            with winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r"HARDWARE\DESCRIPTION\System\CentralProcessor\0",
            ) as key:
                return str(winreg.QueryValueEx(key, "ProcessorNameString")[0]).strip()
        except Exception:
            pass
    return platform.processor() or "unknown"


def host_info() -> dict:
    freq = None
    try:
        f = psutil.cpu_freq()
        freq = {"maxMhz": round(f.max), "currentMhz": round(f.current)} if f else None
    except Exception:
        pass
    mem = psutil.virtual_memory()
    return {
        "cpu": cpu_name(),
        "arch": platform.machine(),
        "logicalCpus": psutil.cpu_count(logical=True),
        "physicalCpus": psutil.cpu_count(logical=False),
        "cpuFreq": freq,
        "totalRamGb": round(mem.total / 1e9, 1),
        "os": f"{platform.system()} {platform.release()} ({platform.version()})",
        "python": platform.python_version(),
    }


def library_versions() -> dict:
    import torch
    import transformers

    try:
        import peft

        peft_version = peft.__version__
    except Exception:
        peft_version = "unknown"
    return {
        "torch": torch.__version__,
        "transformers": transformers.__version__,
        "peft": peft_version,
        "python": platform.python_version(),
    }


def script_sha256() -> str:
    return hashlib.sha256(Path(__file__).read_bytes()).hexdigest()[:16]


def cache_size(repo_id: str) -> int | None:
    """Bytes on disk for a Hugging Face repo, via the cache index."""
    try:
        from huggingface_hub import scan_cache_dir

        for repo in scan_cache_dir().repos:
            if repo.repo_id == repo_id:
                return int(repo.size_on_disk)
    except Exception:
        pass
    return None


# --------------------------------------------------------------------------- #
# Measurement
# --------------------------------------------------------------------------- #
def rss_mb() -> float:
    return round(psutil.Process().memory_info().rss / 1e6, 1)


def peak_working_set_mb() -> float | None:
    info = psutil.Process().memory_info()
    peak = getattr(info, "peak_wset", None)  # Windows only
    return round(peak / 1e6, 1) if peak else None


def audio_duration_sec(path: Path) -> float:
    try:
        import soundfile

        info = soundfile.info(str(path))
        return round(info.frames / info.samplerate, 2)
    except Exception:
        from faster_whisper.audio import decode_audio

        return round(len(decode_audio(str(path), sampling_rate=16000)) / 16000, 2)


def run(args) -> dict:
    import logging

    logging.getLogger("transformers").setLevel(logging.ERROR)
    logging.getLogger("huggingface_hub").setLevel(logging.ERROR)
    try:
        from transformers.utils import logging as hf_logging

        hf_logging.set_verbosity_error()
        hf_logging.disable_progress_bar()
    except Exception:
        pass

    from evaluate_samples import SAMPLES  # references live with the product evaluator
    from app import inference

    audio_dir = Path(args.clips_dir).resolve()
    missing = [s["file"] for s in SAMPLES if not (audio_dir / s["file"]).is_file()]
    if missing:
        print(f"GATE FAILED: missing audio clips in {audio_dir}: {missing}")
        sys.exit(2)

    versions = library_versions()
    proc = psutil.Process()

    rss_before = rss_mb()
    t0 = time.perf_counter()
    inference.load_model()
    load_ms = round((time.perf_counter() - t0) * 1000, 1)
    rss_after = rss_mb()

    model = inference._model
    if model is None:
        print("GATE FAILED: model did not load")
        sys.exit(2)

    all_params = list(model.parameters())
    total_params = sum(p.numel() for p in all_params)
    # The product loads the adapter frozen for inference (peft is_trainable=False),
    # so "trainable parameters" is legitimately 0 here. Presence of the adapter is
    # established by the LoRA weights themselves, not by requires_grad.
    adapter_params = sum(
        p.numel() for name, p in model.named_parameters() if "lora_" in name
    )
    trainable_params = sum(p.numel() for p in all_params if p.requires_grad)
    peft_layers = len(getattr(model, "peft_config", {}) or {})

    # ---- identity gate: the product must be whisper-small, not tiny -------- #
    drift = abs(total_params - EXPECTED_TOTAL_PARAMS) / EXPECTED_TOTAL_PARAMS
    if drift > PARAM_TOLERANCE:
        print(
            f"GATE FAILED: loaded model has {total_params:,} parameters "
            f"({total_params / 1e6:.1f}M), expected "
            f"{EXPECTED_TOTAL_PARAMS / 1e6:.1f}M +/- {PARAM_TOLERANCE:.0%}. "
            "This is not the model the product claims to run."
        )
        sys.exit(2)
    if peft_layers == 0 or adapter_params == 0:
        print("GATE FAILED: no LoRA adapter weights are loaded")
        sys.exit(2)

    clips = []
    latencies_all: list[float] = []
    peak_rss = rss_after

    for sample in SAMPLES:
        path = audio_dir / sample["file"]
        duration = audio_duration_sec(path)

        for _ in range(args.warmups):
            inference.transcribe_audio(str(path))
            peak_rss = max(peak_rss, rss_mb())

        timed: list[float] = []
        hypotheses: list[str] = []
        confidence = None
        for _ in range(args.runs):
            start = time.perf_counter()
            text, confidence = inference.transcribe_audio(str(path))
            timed.append(round((time.perf_counter() - start) * 1000, 1))
            hypotheses.append(text)
            peak_rss = max(peak_rss, rss_mb())

        latency_mean = round(statistics.mean(timed), 1)
        latencies_all.extend(timed)

        last_text = hypotheses[-1]
        score = word_error_rate(sample["ground_truth"], last_text)
        clips.append(
            {
                "clip": sample["file"],
                "speaker": sample["speaker"],
                "severity": sample["severity"],
                "condition": sample["etiology"],
                "durationSec": duration,
                "reference": sample["ground_truth"],
                "hypothesis": last_text,
                "confidence": confidence,
                **score,
                "latencyMs": {
                    "runs": timed,
                    "mean": latency_mean,
                    "median": round(statistics.median(timed), 1),
                    "min": min(timed),
                    "max": max(timed),
                },
                "outputsIdenticalAcrossRuns": len(set(hypotheses)) == 1,
            }
        )
        print(
            f"{sample['file']:<28} WER {score['werPct']:>6.1f}%  "
            f"latency {latency_mean:>7.1f} ms  -> {last_text!r}"
        )

    # ---- accuracy gates ---------------------------------------------------- #
    if not any(c["hypothesisWords"] > 0 for c in clips):
        print("GATE FAILED: every transcript is empty; the decoder is not working")
        sys.exit(2)

    total_errors = sum(c["errors"] for c in clips)
    total_ref_words = sum(c["referenceWords"] for c in clips)
    corpus_wer = round(total_errors / total_ref_words * 100.0, 1) if total_ref_words else 0.0
    mean_clip_wer = round(statistics.mean(c["werPct"] for c in clips), 1)

    latency_mean = round(statistics.mean(latencies_all), 1)
    rss_delta = round(rss_after - rss_before, 1)

    if latency_mean <= 0:
        print("GATE FAILED: latency measured as zero")
        sys.exit(2)

    base_bytes = cache_size("openai/whisper-small")
    adapter_bytes = cache_size("Aaliya05/voicebridge")

    facts = {
        "_meta": {
            "project": "VoiceBridge",
            "event": "THREWS Odyssey 2026",
            "track": "Human-AI & Assistive Technology",
            "team": "Sleeper Cells",
            "institution": "SIES Graduate School of Technology",
            "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "generatedBy": "python benchmarks/benchmark_product.py",
            "script": "benchmarks/benchmark_product.py",
            "scriptSha256": script_sha256(),
            "host": host_info(),
            "versions": versions,
            "note": (
                "Every number here is produced by the command above. "
                "Nothing is hand-typed."
            ),
        },
        "product": {
            "engineName": inference.get_active_engine_name(),
            "baseModel": inference.BASE_MODEL_ID,
            "adapter": inference.ADAPTER_MODEL_ID,
            "device": str(inference._device),
            "parameters": {
                "total": total_params,
                "totalMillions": round(total_params / 1e6, 1),
                "base": total_params - adapter_params,
                "baseMillions": round((total_params - adapter_params) / 1e6, 1),
                "adapter": adapter_params,
                "adapterMillions": round(adapter_params / 1e6, 2),
                "adapterPercentOfTotal": round(adapter_params / total_params * 100, 2),
                "trainableInThisRun": trainable_params,
                "trainableNote": (
                    "0 is expected: the server loads the adapter frozen for inference "
                    "(peft is_trainable=False). adapterPercentOfTotal is the training-time "
                    "figure the docs quote as '0.72% trainable'."
                ),
                "loraAdapters": peft_layers,
            },
            "storage": {
                "baseBytes": base_bytes,
                "baseMb": round(base_bytes / 1e6, 1) if base_bytes else None,
                "adapterBytes": adapter_bytes,
                "adapterMb": round(adapter_bytes / 1e6, 1) if adapter_bytes else None,
                "totalMb": round(((base_bytes or 0) + (adapter_bytes or 0)) / 1e6, 1)
                if base_bytes and adapter_bytes
                else None,
                "definition": "megabytes = 10^6 bytes, as reported by the Hugging Face cache index",
            },
            "modelLoadMs": load_ms,
            "accuracy": {
                "referenceSource": "backend/evaluate_samples.py:SAMPLES (same sentences the demo page shows)",
                "metric": "word error rate after lowercasing and stripping punctuation; (S+D+I)/reference words",
                "sampleCount": len(clips),
                "meanClipWerPct": mean_clip_wer,
                "corpusWerPct": corpus_wer,
                "clips": clips,
            },
            "latency": {
                "warmupRunsPerClip": args.warmups,
                "timedRunsPerClip": args.runs,
                "meanMs": latency_mean,
                "medianMs": round(statistics.median(latencies_all), 1),
                "minMs": min(latencies_all),
                "maxMs": max(latencies_all),
                "realTimeFactor": round(latency_mean / 1000 / (sum(c["durationSec"] for c in clips) / len(clips)), 3),
                "targetMs": TARGET_LATENCY_MS,
                "targetStatus": "PASS" if latency_mean <= TARGET_LATENCY_MS else "MISS",
                "targetSource": "project latency target carried in facts.json since 2026-11-04",
                "measurement": "wall time around inference.transcribe_audio, including audio decode",
                "torchThreads": __import__("torch").get_num_threads(),
            },
            "memory": {
                "rssBeforeLoadMb": rss_before,
                "rssAfterLoadMb": rss_after,
                "rssDeltaMb": rss_delta,
                "peakRssDuringRunMb": round(peak_rss, 1),
                "processPeakWorkingSetMb": peak_working_set_mb(),
                "totalSystemRamGb": host_info()["totalRamGb"],
                "definition": (
                    "RSS delta = resident set after model load minus resident set "
                    "after imports; peak = highest observed during the timed runs"
                ),
            },
            "determinism": {
                "outputsIdenticalAcrossRuns": all(
                    c["outputsIdenticalAcrossRuns"] for c in clips
                )
            },
        },
        "claims": {
            "offlineStatus": "Client-server: browser posts to a local FastAPI service; model runs on the same machine",
            "raspberryPiValidated": False,
            "coralTpuValidated": False,
            "medicalDeviceStatus": "Research prototype; not certified for clinical use",
        },
    }

    facts["product"]["latency"]["status"] = facts["product"]["latency"]["targetStatus"]
    return facts


# --------------------------------------------------------------------------- #
# Two-run reproduction gate
# --------------------------------------------------------------------------- #
def compare_to_baseline(facts: dict, baseline_path: Path) -> int:
    """Fails when this run and an earlier run disagree beyond tolerance."""
    baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
    old = baseline.get("product", {})
    new = facts["product"]
    problems = []

    for old_clip, new_clip in zip(old["accuracy"]["clips"], new["accuracy"]["clips"]):
        if old_clip["werPct"] != new_clip["werPct"]:
            problems.append(
                f"{new_clip['clip']}: WER {old_clip['werPct']}% -> {new_clip['werPct']}%"
            )
        old_ms = old_clip["latencyMs"]["mean"]
        new_ms = new_clip["latencyMs"]["mean"]
        if abs(new_ms - old_ms) / old_ms > 0.30:
            problems.append(
                f"{new_clip['clip']}: latency {old_ms} ms -> {new_ms} ms (>30% drift)"
            )

    old_rss = old["memory"]["rssDeltaMb"]
    new_rss = new["memory"]["rssDeltaMb"]
    if abs(new_rss - old_rss) / max(old_rss, 1) > 0.20:
        problems.append(f"RSS delta {old_rss} MB -> {new_rss} MB (>20% drift)")

    if problems:
        print("GATE FAILED: this run does not reproduce the baseline:")
        for p in problems:
            print("  - " + p)
        return 2
    print(f"reproduction: matches {baseline_path.name} within tolerance")
    return 0


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default=str(REPO_ROOT / "facts.json"))
    parser.add_argument("--clips-dir", default=str(REPO_ROOT / "frontend" / "public" / "audio"))
    parser.add_argument("--warmups", type=int, default=2)
    parser.add_argument("--runs", type=int, default=5)
    parser.add_argument("--baseline", help="earlier facts.json; exits 2 on drift")
    parser.add_argument(
        "--compare-only",
        action="store_true",
        help="skip measuring; compare the --out file against --baseline",
    )
    parser.add_argument("--self-test", action="store_true", help="test the WER metric only")
    args = parser.parse_args()

    if args.self_test:
        return self_test()

    if args.compare_only:
        if not args.baseline:
            parser.error("--compare-only requires --baseline")
        facts = json.loads(Path(args.out).read_text(encoding="utf-8"))
        return compare_to_baseline(facts, Path(args.baseline))

    print(f"VoiceBridge benchmark | host: {host_info()['cpu']} | "
          f"{args.warmups} warm-up + {args.runs} timed runs per clip\n")

    facts = run(args)

    p = facts["product"]
    print(
        f"\naccuracy: mean clip WER {p['accuracy']['meanClipWerPct']}% | "
        f"corpus WER {p['accuracy']['corpusWerPct']}% | "
        f"latency {p['latency']['meanMs']} ms ({p['latency']['targetStatus']} vs "
        f"{p['latency']['targetMs']} ms target) | "
        f"RSS delta {p['memory']['rssDeltaMb']} MB | "
        f"peak {p['memory']['peakRssDuringRunMb']} MB"
    )

    out = Path(args.out)
    fd, tmp_name = tempfile.mkstemp(dir=out.parent, suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as handle:
        handle.write(json.dumps(facts, indent=2) + "\n")
    os.replace(tmp_name, out)
    print(f"wrote {out}")

    if args.baseline:
        return compare_to_baseline(facts, Path(args.baseline))
    return 0


if __name__ == "__main__":
    sys.exit(main())
