"""
Render judge-facing benchmark numbers from facts.json.

Only README.md and REPORT.md are generated targets now. Every value in a
generated block comes from facts.json; benchmarks/claims_check.py compares the
block against a fresh render and fails on drift.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
FACTS = REPO_ROOT / "facts.json"

BEGIN = "<!-- BEGIN:generated:{name} -->"
END = "<!-- END:generated:{name} -->"


def _pct(value: float) -> str:
    return f"{value:.1f}%"


def _num(value: float | None) -> str:
    if value is None:
        return "n/a"
    return f"{value:,.0f}" if float(value).is_integer() else f"{value:,.1f}"


def render_readme_accuracy(facts: dict) -> str:
    product = facts["product"]
    clips = product["accuracy"]["clips"]
    rows = [
        f"| {clip['severity']} | {clip['speaker']} | {clip['condition']} | "
        f"**{_pct(clip['werPct'])}** | "
        f"\"{clip['reference']}\" -> \"{clip['hypothesis']}\" |"
        for clip in clips
    ]
    return "\n".join(
        [
            "### Accuracy on the three TORGO demo clips",
            "",
            f"Word error rate on the exact clips the demo page plays, measured "
            f"{facts['_meta']['generatedAt'][:10]}.",
            "",
            "| Severity | Speaker | Condition | WER | Demo reference -> model output |",
            "| :--- | :--- | :--- | ---: | :--- |",
            *rows,
            f"| **Mean of clips** | | | **{_pct(product['accuracy']['meanClipWerPct'])}** | "
            f"corpus WER **{_pct(product['accuracy']['corpusWerPct'])}** across "
            f"{product['accuracy']['sampleCount']} clips |",
            "",
            "\"Mean of clips\" averages the three percentages; \"corpus WER\" counts every "
            "edit over every reference word. Both are reported because they answer different "
            "questions.",
        ]
    )


def render_readme_performance(facts: dict) -> str:
    product = facts["product"]
    latency = product["latency"]
    memory = product["memory"]
    storage = product["storage"]
    params = product["parameters"]
    host = facts["_meta"]["host"]
    ratio = latency["meanMs"] / latency["targetMs"]
    status = "MISS" if latency["targetStatus"] == "MISS" else "PASS"
    return "\n".join(
        [
            "### Speed, memory and size",
            "",
            f"Measured {facts['_meta']['generatedAt'][:10]} on {host['cpu']} "
            f"({host['physicalCpus']} cores / {host['logicalCpus']} threads, "
            f"{host['totalRamGb']} GB RAM), {host['os']}, CPU-only, "
            f"PyTorch {facts['_meta']['versions']['torch']}.",
            "",
            "| Metric | Measured | Target | Verdict |",
            "| :--- | ---: | ---: | :--- |",
            f"| Model | whisper-small {params['totalMillions']}M parameters + LoRA "
            f"{params['adapterMillions']}M ({params['adapterPercentOfTotal']}%) | - | "
            "the model the server runs |",
            f"| Disk | {storage['totalMb']} MB "
            f"({storage['baseMb']} MB base + {storage['adapterMb']} MB adapter) | - | - |",
            f"| Memory added when the model loads (RSS) | {_num(memory['rssDeltaMb'])} MB | - | - |",
            f"| Peak process memory | {_num(memory['peakRssDuringRunMb'])} MB | - | - |",
            f"| Latency per sentence | {_num(latency['meanMs'])} ms mean "
            f"({_num(latency['medianMs'])} ms median, "
            f"{_num(latency['minMs'])}-{_num(latency['maxMs'])} ms range) | "
            f"{latency['targetMs']} ms | **{status}, {ratio:.1f}x over** |",
            f"| Real-time factor | {latency['realTimeFactor']} | below 1.0 | "
            "processing beats playback; the response still takes seconds |",
            "",
            "\"Memory added\" is resident memory after loading the model minus resident memory "
            "after imports; \"peak\" is the highest observed during the timed runs. Latency is "
            "wall time around `transcribe_audio`, including audio decode.",
        ]
    )


def render_report_results(facts: dict) -> str:
    product = facts["product"]
    clips = product["accuracy"]["clips"]
    rows = []
    for clip in clips:
        confidence = (
            f"{clip['confidence'] * 100:.1f}%"
            if clip.get("confidence") is not None
            else "n/a"
        )
        rows.append(
            f"| {clip['severity']} | {clip['speaker']} | {clip['condition']} | "
            f"**{_pct(clip['werPct'])}** | {confidence} | "
            f"{_num(clip['latencyMs']['mean'])} ms | \"{clip['hypothesis']}\" |"
        )
    return "\n".join(
        [
            "| Severity | Speaker | Condition | WER | Avg. token prob. | Latency | Model output |",
            "| :--- | :--- | :--- | ---: | ---: | ---: | :--- |",
            *rows,
            f"| **Mean / corpus** | | | **{_pct(product['accuracy']['meanClipWerPct'])}** mean; "
            f"**{_pct(product['accuracy']['corpusWerPct'])}** corpus | | "
            f"**{_num(product['latency']['meanMs'])} ms** | "
            f"{product['accuracy']['sampleCount']} clips |",
            "",
            "WER is computed after lowercasing and stripping punctuation; corpus WER counts "
            "every edit over every reference word. Confidence is average token probability, "
            "not accuracy.",
        ]
    )


def render_limits(facts: dict) -> str:
    product = facts["product"]
    latency = product["latency"]
    memory = product["memory"]
    storage = product["storage"]
    speakers = len({clip["speaker"] for clip in product["accuracy"]["clips"]})
    clips = product["accuracy"]["clips"]
    accuracy = ", ".join(
        f"{clip['severity'].lower()} **{_pct(clip['werPct'])}**" for clip in clips
    )
    return "\n".join(
        [
            f"- **Accuracy:** {accuracy} word error rate on the "
            f"{product['accuracy']['sampleCount']} demo clips ({speakers} speakers). "
            f"Mean of clips {_pct(product['accuracy']['meanClipWerPct'])}; corpus WER "
            f"{_pct(product['accuracy']['corpusWerPct'])}.",
            f"- **Latency:** {_num(latency['meanMs'])} ms mean per sentence against a "
            f"{latency['targetMs']} ms target - **{latency['targetStatus']}**.",
            f"- **Memory:** {_num(memory['rssDeltaMb'])} MB RSS delta at load; "
            f"{_num(memory['peakRssDuringRunMb'])} MB peak. **Disk:** "
            f"{storage['totalMb']} MB.",
            f"- **Model:** {product['baseModel']} + LoRA, {product['device']} only; "
            "no GPU, Raspberry Pi or Coral Edge TPU validation.",
            f"- **Sample size:** {product['accuracy']['sampleCount']} clips from "
            f"{speakers} speakers. Preliminary; not a clinical result.",
        ]
    )


RENDERERS = {
    "readme-accuracy": render_readme_accuracy,
    "readme-performance": render_readme_performance,
    "report-results": render_report_results,
    "report-performance": render_readme_performance,
    "report-limits": render_limits,
}

TARGETS = {
    REPO_ROOT / "README.md": ["readme-accuracy", "readme-performance"],
    REPO_ROOT / "REPORT.md": ["report-results", "report-performance", "report-limits"],
}


def replace_block(text: str, name: str, body: str) -> str:
    begin, end = BEGIN.format(name=name), END.format(name=name)
    pattern = re.compile(re.escape(begin) + r".*?" + re.escape(end), re.S)
    if not pattern.search(text):
        raise SystemExit(f"markers for '{name}' not found")
    replacement = begin + "\n" + body.rstrip() + "\n" + end
    return pattern.sub(lambda match: replacement, text)


def main() -> int:
    facts = json.loads(FACTS.read_text(encoding="utf-8"))
    for path, names in TARGETS.items():
        text = path.read_text(encoding="utf-8")
        for name in names:
            text = replace_block(text, name, RENDERERS[name](facts))
        path.write_text(text, encoding="utf-8")
        print(f"rendered {path.relative_to(REPO_ROOT)}: {', '.join(names)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
