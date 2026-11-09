"""
Guard the numbers in judge-facing documents.

Three checks, each able to fail:

1. GENERATED BLOCKS -- every file/block listed in TARGETS must contain exactly
   what benchmarks/render_docs.py would render from facts.json. Hand-editing a
   number inside a block makes this exit 1.
2. RETIRED NUMBERS -- figures that belonged to the whisper-tiny INT8 experiment
   (or to superseded versions of this project) must not appear unless they sit
   inside a region explicitly marked as historical.
3. UNGOVERNED NUMBERS -- in README.md and the product benchmark doc, a value in
   % / ms / MB / GB outside a generated or historical block has no command
   behind it and fails.

Usage:
    backend\\Scripts\\python.exe benchmarks\\claims_check.py
Exit codes: 0 = clean, 1 = a document disagrees with facts.json.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import render_docs  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
FACTS = REPO_ROOT / "facts.json"

HISTORICAL_BEGIN = "<!-- claims-check:historical -->"
HISTORICAL_END = "<!-- /claims-check:historical -->"

JUDGE_FACING = [
    REPO_ROOT / "README.md",
    REPO_ROOT / "LIMITS.md",
    REPO_ROOT / "docs" / "EDGE_AI_BENCHMARK_RESULTS.md",
    REPO_ROOT / "docs" / "COMPETITIVE_ANALYSIS.md",
    REPO_ROOT / "docs" / "SYSTEM_WALKTHROUGH.md",
    REPO_ROOT / "docs" / "DATASETS_AND_PROOF.md",
]

# Values from the whisper-tiny INT8 study or from superseded claims. They may
# only appear inside a historical region.
RETIRED = [
    (r"151\.7\s?MB", "whisper-tiny FP32 size"),
    (r"38\.9\s?MB", "whisper-tiny INT8 size"),
    (r"1,?480\s?ms", "whisper-tiny FP32 latency"),
    (r"74\.42\s?%?", "whisper-tiny storage reduction"),
    (r"404\.49", "whisper-tiny ONNX package size"),
    (r"103\.45", "whisper-tiny ONNX package size"),
    (r"139\.4", "whisper-tiny ONNX session RSS delta"),
    (r"592(\.0)?\s?ms", "whisper-tiny INT8 latency"),
    (r"103\s?MB", "ONNX file size presented as memory"),
    (r"0\.1013", "whisper-tiny real-time factor"),
    (r"82\.2\s?%", "whisper-tiny zero-shot mean WER"),
    (r"80\.0\s?%", "whisper-tiny INT8 mean WER"),
]

MEASURE = re.compile(r"(?<![\w.])\d[\d,]*(?:\.\d+)?\s?(?:%|ms|MB|GB)\b")

# Files where every measured value must be inside a generated block.
STRICT = {
    REPO_ROOT / "README.md",
    REPO_ROOT / "LIMITS.md",
    REPO_ROOT / "docs" / "EDGE_AI_BENCHMARK_RESULTS.md",
}


def strip_region(text: str, begin: str, end: str) -> str:
    """Remove a marked region so its content is not scanned as prose."""
    pattern = re.compile(re.escape(begin) + r".*?" + re.escape(end), re.S)
    return pattern.sub("\n", text)


def block_body(text: str, name: str) -> str | None:
    """Return the text between a generated block's markers, or None if absent."""
    begin, end = render_docs.BEGIN.format(name=name), render_docs.END.format(name=name)
    if begin not in text or end not in text:
        return None
    start = text.index(begin) + len(begin)
    stop = text.index(end, start)
    return text[start:stop]


def normalise(body: str) -> list[str]:
    """Compare blocks line-by-line while ignoring trailing whitespace and newlines."""
    return [line.rstrip() for line in body.strip("\n").splitlines()]


def script_hash() -> str:
    """Hash of the benchmark script that is supposed to have written facts.json."""
    return hashlib.sha256(
        (REPO_ROOT / "benchmarks" / "benchmark_product.py").read_bytes()
    ).hexdigest()[:16]


def main() -> int:
    """Run provenance, generated-block and retired-number checks."""
    parser = argparse.ArgumentParser(description="Check documented numbers against facts.json")
    parser.add_argument("--facts", default=str(FACTS), help="facts file to validate")
    parser.add_argument(
        "--provenance-only",
        action="store_true",
        help="only verify that facts.json was written by the current benchmark script",
    )
    args = parser.parse_args()

    # Windows consoles default to cp1252, which cannot print the quotes and
    # arrows that appear in rendered blocks.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    facts = json.loads(Path(args.facts).read_text(encoding="utf-8"))
    failures: list[str] = []

    recorded = facts.get("_meta", {}).get("scriptSha256")
    actual = script_hash()
    if recorded != actual:
        failures.append(
            f"facts.json provenance: scriptSha256 {recorded!r} does not match the current "
            f"benchmarks/benchmark_product.py ({actual!r}). Rerun the benchmark."
        )

    sources = facts.get("_meta", {}).get("sourceHashes") or {}
    if not sources:
        failures.append("facts.json has no sourceHashes; rerun the benchmark.")
    for relative_path, recorded_hash in sources.items():
        source = REPO_ROOT / relative_path
        if not source.is_file():
            failures.append(f"facts.json references a missing source file: {relative_path}")
            continue
        current_hash = hashlib.sha256(source.read_bytes()).hexdigest()[:16]
        if current_hash != recorded_hash:
            failures.append(
                f"source changed since the benchmark: {relative_path} "
                f"({recorded_hash!r} -> {current_hash!r}). Rerun the benchmark."
            )

    if args.provenance_only:
        if failures:
            for failure in failures:
                print("  FAIL " + failure)
            return 1
        print(
            f"provenance: facts.json matches benchmark_product.py ({actual}) and "
            f"{len(sources)} source files"
        )
        return 0

    # 1. Generated blocks must equal a fresh render.
    for path, names in render_docs.TARGETS.items():
        text = path.read_text(encoding="utf-8")
        for name in names:
            actual = block_body(text, name)
            if actual is None:
                failures.append(f"{path.name}: missing markers for '{name}'")
                continue
            expected = render_docs.RENDERERS[name](facts)
            if normalise(actual) != normalise(expected):
                first = next(
                    (
                        f"line {i + 1}: document has {a!r}, facts render {b!r}"
                        for i, (a, b) in enumerate(
                            zip(normalise(actual), normalise(expected))
                        )
                        if a != b
                    ),
                    "block lengths differ",
                )
                failures.append(
                    f"{path.name}: generated block '{name}' is stale or hand-edited ({first})"
                )

    # 2 + 3. Scan judge-facing documents outside generated and historical text.
    for path in JUDGE_FACING:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        scan = text
        for name in render_docs.TARGETS.get(path, []):
            begin = render_docs.BEGIN.format(name=name)
            if begin in scan:
                scan = strip_region(scan, begin, render_docs.END.format(name=name))
        scan = strip_region(scan, HISTORICAL_BEGIN, HISTORICAL_END)

        for lineno, line in enumerate(scan.splitlines(), 1):
            for pattern, why in RETIRED:
                if re.search(pattern, line, re.IGNORECASE):
                    failures.append(
                        f"{path.name}: retired number '{why}' at line {lineno}: {line.strip()[:100]}"
                    )
            if path in STRICT:
                for match in MEASURE.finditer(line):
                    failures.append(
                        f"{path.name}: ungoverned measurement '{match.group(0)}' at line {lineno}: "
                        f"{line.strip()[:100]}"
                    )

    if failures:
        print(f"claims-check: {len(failures)} problem(s)\n")
        for failure in failures:
            print("  FAIL " + failure)
        print(
            "\nFix by running benchmarks/render_docs.py, moving the figure into a "
            "generated block, or deleting it."
        )
        return 1

    print(
        f"claims-check: OK — {len(render_docs.TARGETS)} files match facts.json, "
        f"{len(JUDGE_FACING)} documents free of retired numbers."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
