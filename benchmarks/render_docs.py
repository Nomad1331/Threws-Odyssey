"""
Render judge-facing benchmark numbers from facts.json.

Every number in the generated blocks below is read from facts.json; none is
typed into the document by hand. Run this after any benchmark run:

    backend\\Scripts\\python.exe benchmarks\\render_docs.py

`benchmarks/claims_check.py` fails when a document's block no longer matches
what this script would render, which is what catches a hand-edited number.
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
    """Thousands separator, no trailing .0."""
    if value is None:
        return "n/a"
    return f"{value:,.0f}" if float(value).is_integer() else f"{value:,.1f}"


def render_readme_accuracy(facts: dict) -> str:
    product = facts["product"]
    clips = product["accuracy"]["clips"]
    rows = []
    for clip in clips:
        rows.append(
            f"| {clip['severity']} | {clip['speaker']} | {clip['condition']} | "
            f"**{_pct(clip['werPct'])}** | "
            f"“{clip['reference']}” → “{clip['hypothesis']}” |"
        )
    return "\n".join(
        [
            "### Accuracy on the three TORGO demo clips",
            "",
            f"Word error rate on the exact clips the demo page plays, measured {facts['_meta']['generatedAt'][:10]}.",
            "",
            "| Severity | Speaker | Condition | WER | Demo reference → model output |",
            "| :--- | :--- | :--- | ---: | :--- |",
            *rows,
            f"| **Mean of clips** | | | **{_pct(product['accuracy']['meanClipWerPct'])}** | "
            f"corpus WER **{_pct(product['accuracy']['corpusWerPct'])}** across "
            f"{product['accuracy']['sampleCount']} clips |",
            "",
            "“Mean of clips” averages the three percentages; “corpus WER” counts every edit "
            "over every reference word. Both are reported because they answer different questions.",
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
            f"{params['adapterMillions']}M ({params['adapterPercentOfTotal']}%) | — | "
            "the model the server runs |",
            f"| Disk | {storage['totalMb']} MB "
            f"({storage['baseMb']} MB base + {storage['adapterMb']} MB adapter) | — | — |",
            f"| Memory added when the model loads (RSS) | {_num(memory['rssDeltaMb'])} MB | — | — |",
            f"| Peak process memory | {_num(memory['peakRssDuringRunMb'])} MB | — | — |",
            f"| Latency per sentence | {_num(latency['meanMs'])} ms mean "
            f"({_num(latency['medianMs'])} ms median, "
            f"{_num(latency['minMs'])}–{_num(latency['maxMs'])} ms range) | "
            f"{latency['targetMs']} ms | **{status}, {ratio:.1f}× over** |",
            f"| Real-time factor | {latency['realTimeFactor']} | below 1.0 | "
            "processes faster than playback |",
            "",
            "“Memory added” is resident memory after loading the model minus resident memory "
            "after imports; “peak” is the highest observed during the timed runs. Latency is "
            "wall time around `transcribe_audio`, including audio decode.",
        ]
    )


def render_edge_product(facts: dict) -> str:
    product = facts["product"]
    clips = product["accuracy"]["clips"]
    latency = product["latency"]
    memory = product["memory"]
    storage = product["storage"]
    params = product["parameters"]
    host = facts["_meta"]["host"]
    versions = facts["_meta"]["versions"]

    rows = []
    for clip in clips:
        rows.append(
            f"| `{clip['clip']}` | {clip['severity']} | {clip['condition']} | "
            f"{clip['durationSec']} s | “{clip['reference']}” | “{clip['hypothesis']}” | "
            f"**{_pct(clip['werPct'])}** | {clip['substitutions']} / {clip['deletions']} / "
            f"{clip['insertions']} | {_num(clip['latencyMs']['mean'])} ms |"
        )

    return "\n".join(
        [
            "## 1. Product benchmark — whisper-small + LoRA (the shipped engine)",
            "",
            f"Measured {facts['_meta']['generatedAt'][:10]} by "
            "`python benchmarks/benchmark_product.py`. This is the only "
            "section of this file that describes the product.",
            "",
            "### Environment",
            "",
            f"* **CPU:** {host['cpu']} ({host['physicalCpus']} cores / {host['logicalCpus']} threads)",
            f"* **RAM:** {host['totalRamGb']} GB",
            f"* **OS:** {host['os']}",
            f"* **Device:** {product['device']} (no GPU used)",
            f"* **PyTorch:** {versions['torch']} · **Transformers:** {versions['transformers']} · "
            f"**PEFT:** {versions['peft']} · **Python:** {versions['python']}",
            f"* **Model:** {product['baseModel']} ({params['totalMillions']}M parameters) + "
            f"{product['adapter']} LoRA ({params['adapterMillions']}M, "
            f"{params['adapterPercentOfTotal']}%)",
            f"* **Disk:** {storage['totalMb']} MB total "
            f"({storage['baseMb']} MB base + {storage['adapterMb']} MB adapter)",
            f"* **Model load time:** {_num(product['modelLoadMs'])} ms",
            "",
            "### Accuracy (word error rate)",
            "",
            "| Clip | Severity | Condition | Duration | Reference | Model output | WER | S / D / I | Latency |",
            "| :--- | :--- | :--- | ---: | :--- | :--- | ---: | :---: | ---: |",
            *rows,
            "| "
            + " | ".join(
                [
                    "**Totals**",
                    f"**{product['accuracy']['sampleCount']} clips**",
                    "",
                    "",
                    "",
                    "",
                    f"**mean {_pct(product['accuracy']['meanClipWerPct'])}**",
                    "",
                    f"**{_num(latency['meanMs'])} ms**",
                ]
            )
            + " |",
            "",
            f"* **Mean of clip WERs:** {_pct(product['accuracy']['meanClipWerPct'])}",
            f"* **Corpus WER (all edits ÷ all reference words):** {_pct(product['accuracy']['corpusWerPct'])}",
            "* **S / D / I:** substitutions / deletions / insertions.",
            "",
            "### Latency",
            "",
            f"* **Protocol:** {latency['warmupRunsPerClip']} warm-up runs per clip, then "
            f"{latency['timedRunsPerClip']} timed runs.",
            f"* **Mean:** {_num(latency['meanMs'])} ms · **median:** {_num(latency['medianMs'])} ms · "
            f"**range:** {_num(latency['minMs'])}–{_num(latency['maxMs'])} ms",
            f"* **Real-time factor:** {latency['realTimeFactor']}",
            f"* **Target:** {latency['targetMs']} ms → **{latency['targetStatus']}** "
            f"({latency['meanMs'] / latency['targetMs']:.1f}× the target)",
            f"* **Measurement point:** {latency['measurement']}",
            "",
            "### Memory",
            "",
            f"* **RSS before model load:** {_num(memory['rssBeforeLoadMb'])} MB",
            f"* **RSS after model load:** {_num(memory['rssAfterLoadMb'])} MB",
            f"* **RSS delta:** **{_num(memory['rssDeltaMb'])} MB**",
            f"* **Peak RSS during timed runs:** {_num(memory['peakRssDuringRunMb'])} MB",
            f"* **Peak working set (OS counter):** {_num(memory['processPeakWorkingSetMb'])} MB",
            "",
            "### Interpretation",
            "",
            "* Mild dysarthric speech is transcribed correctly on the demo clip.",
            "* Moderate speech is only partially usable: half the words are wrong.",
            "* Severe speech is **not** usable; it is reported as a known limit, not hidden.",
            "* The latency target is missed by a wide margin. This is a CPU-only PyTorch "
            f"implementation of a {params['totalMillions']}M-parameter model; it is not a "
            "real-time system.",
            f"* Only {product['accuracy']['sampleCount']} clips from "
            f"{len({clip['speaker'] for clip in clips})} speakers were measured. These results "
            "are preliminary and are not a clinical claim.",
            "",
            "### Reproduce",
            "",
            "```",
            "python benchmarks/benchmark_product.py",
            "```",
            "",
            "The script loads the product engine, writes `facts.json`, refuses to run if the "
            "loaded model is not whisper-small by parameter count, and supports "
            "`--baseline facts.json` to prove two runs agree.",
        ]
    )


def render_competitive_telemetry(facts: dict) -> str:
    product = facts["product"]
    host = facts["_meta"]["host"]
    latency = product["latency"]
    memory = product["memory"]
    storage = product["storage"]
    params = product["parameters"]
    clips = product["accuracy"]["clips"]
    clip_lines = [
        f"  * {clip['speaker']} ({clip['condition']}): **{_pct(clip['werPct'])} WER** — "
        f"“{clip['reference']}” → “{clip['hypothesis']}”"
        for clip in clips
    ]
    return "\n".join(
        [
            "All metrics below come from `facts.json`, written by `benchmarks/benchmark_product.py`.",
            "",
            f"* **Host:** {host['cpu']} ({host['physicalCpus']} cores), {host['os']}, CPU-only",
            f"* **Model:** {product['baseModel']} ({params['totalMillions']}M parameters) + "
            f"LoRA ({params['adapterMillions']}M, {params['adapterPercentOfTotal']}%)",
            f"* **Disk:** {storage['totalMb']} MB "
            f"({storage['baseMb']} MB base + {storage['adapterMb']} MB adapter)",
            f"* **Memory:** {_num(memory['rssDeltaMb'])} MB RSS delta at load; "
            f"{_num(memory['peakRssDuringRunMb'])} MB peak",
            f"* **Latency:** {_num(latency['meanMs'])} ms mean per sentence "
            f"(RTF {latency['realTimeFactor']}); target {latency['targetMs']} ms → "
            f"**{latency['targetStatus']}**",
            "* **Accuracy:**",
            *clip_lines,
            f"  * **Mean of clips:** {_pct(product['accuracy']['meanClipWerPct'])} · "
            f"**corpus WER:** {_pct(product['accuracy']['corpusWerPct'])}",
        ]
    )


def render_datasets_accuracy(facts: dict) -> str:
    clips = facts["product"]["accuracy"]["clips"]
    rows = []
    for clip in clips:
        confidence = (
            f"{clip['confidence'] * 100:.1f}%" if clip.get("confidence") is not None else "n/a"
        )
        rows.append(
            f"| `{clip['clip']}` | {clip['speaker']} ({clip['condition']}) | "
            f"{clip['durationSec']} s | “{clip['reference']}” | “{clip['hypothesis']}” | "
            f"**{_pct(clip['werPct'])}** | {confidence} |"
        )
    return "\n".join(
        [
            "| Sample file | Speaker (condition) | Duration | Reference | Model output | WER | Confidence |",
            "| :--- | :--- | ---: | :--- | :--- | ---: | ---: |",
            *rows,
        ]
    )


RENDERERS = {
    "readme-accuracy": render_readme_accuracy,
    "readme-performance": render_readme_performance,
    "edge-product": render_edge_product,
    "competitive-telemetry": render_competitive_telemetry,
    "datasets-accuracy": render_datasets_accuracy,
}

# Which files hold which generated blocks.
TARGETS = {
    REPO_ROOT / "README.md": ["readme-accuracy", "readme-performance"],
    REPO_ROOT / "docs" / "EDGE_AI_BENCHMARK_RESULTS.md": ["edge-product"],
    REPO_ROOT / "docs" / "COMPETITIVE_ANALYSIS.md": ["competitive-telemetry"],
    REPO_ROOT / "docs" / "DATASETS_AND_PROOF.md": ["datasets-accuracy"],
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
