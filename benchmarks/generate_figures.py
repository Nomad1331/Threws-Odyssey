"""
VoiceBridge publication figures, generated from facts.json.

Every plotted value is read from facts.json (written by benchmark_product.py);
nothing is typed into this script. Run:

    backend/Scripts/python.exe benchmarks/generate_figures.py

Figure 1: measured word error rate per TORGO severity tier.
Figure 2: measured latency against the target, and measured footprint.

The old formant-centralisation figure is gone: its coordinates were invented, not
measured, and an invented chart is worse than no chart.
"""

from __future__ import annotations

import json
import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(REPO_ROOT, "assets", "benchmarks")
FACTS_PATH = os.path.join(REPO_ROOT, "facts.json")
os.makedirs(OUTPUT_DIR, exist_ok=True)

plt.rcParams.update(
    {
        "font.family": "sans-serif",
        "font.sans-serif": ["Segoe UI", "DejaVu Sans", "Helvetica", "Arial"],
        "figure.facecolor": "#0B1120",
        "axes.facecolor": "#1E293B",
        "axes.edgecolor": "#334155",
        "axes.labelcolor": "#F8FAFC",
        "xtick.color": "#94A3B8",
        "ytick.color": "#94A3B8",
        "grid.color": "#334155",
        "grid.linestyle": "--",
        "grid.alpha": 0.6,
        "text.color": "#F8FAFC",
        "figure.dpi": 300,
    }
)


def load_facts() -> dict:
    with open(FACTS_PATH, "r", encoding="utf-8") as handle:
        return json.load(handle)


def provenance(facts: dict) -> str:
    product = facts["product"]
    return (
        f"Source: facts.json · benchmark_product.py · {facts['_meta']['generatedAt'][:10]} · "
        f"{product['baseModel']} + LoRA · CPU: {facts['_meta']['host']['cpu']}"
    )


def figure1_wer(facts: dict) -> str:
    clips = facts["product"]["accuracy"]["clips"]
    labels = [f"{c['severity']}\n({c['speaker']}, {c['condition'].split('(')[0].strip()})" for c in clips]
    values = [c["werPct"] for c in clips]
    mean = facts["product"]["accuracy"]["meanClipWerPct"]

    fig, ax = plt.subplots(figsize=(9, 5.5))
    colors = ["#2DD4BF" if v <= 20 else "#F59E0B" if v <= 70 else "#F43F5E" for v in values]
    bars = ax.bar(labels, values, color=colors, edgecolor="#334155", linewidth=1.2, width=0.55, zorder=3)

    for bar, value in zip(bars, values):
        ax.annotate(
            f"{value:.1f}%",
            xy=(bar.get_x() + bar.get_width() / 2, bar.get_height()),
            xytext=(0, 4),
            textcoords="offset points",
            ha="center",
            va="bottom",
            fontsize=11,
            fontweight="bold",
        )

    ax.axhline(100, color="#F43F5E", linestyle=":", linewidth=1.5, zorder=2,
               label="100% = every reference word wrong")
    ax.axhline(mean, color="#94A3B8", linestyle="--", linewidth=1.2, zorder=2,
               label=f"Mean of clips: {mean:.1f}%")

    ax.set_ylim(0, max(values) * 1.25)
    ax.set_ylabel("Word Error Rate (%)", fontsize=11, fontweight="bold", labelpad=8)
    ax.set_title(
        "Measured Word Error Rate by Severity\n"
        "whisper-small + LoRA on the three TORGO demo clips",
        fontsize=12,
        fontweight="bold",
        pad=14,
    )
    ax.grid(axis="y", zorder=0)
    ax.legend(loc="upper left", facecolor="#0B1120", edgecolor="#334155", fontsize=9)
    fig.text(0.01, 0.01, provenance(facts), fontsize=7, color="#94A3B8")

    path = os.path.join(OUTPUT_DIR, "figure1_wer_comparison.png")
    fig.tight_layout(rect=(0, 0.03, 1, 1))
    fig.savefig(path, dpi=300)
    plt.close(fig)
    return path


def figure2_latency_footprint(facts: dict) -> str:
    product = facts["product"]
    latency = product["latency"]
    memory = product["memory"]
    storage = product["storage"]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.8))

    # Left: measured latency against the recorded target.
    bars = ax1.bar(
        ["Measured mean", "Target"],
        [latency["meanMs"], latency["targetMs"]],
        color=["#F43F5E", "#2DD4BF"],
        edgecolor="#334155",
        linewidth=1.2,
        width=0.45,
        zorder=3,
    )
    for bar in bars:
        value = bar.get_height()
        ax1.annotate(
            f"{value:,.0f} ms",
            xy=(bar.get_x() + bar.get_width() / 2, value),
            xytext=(0, 4),
            textcoords="offset points",
            ha="center",
            va="bottom",
            fontsize=10,
            fontweight="bold",
        )
    ax1.set_ylim(0, max(latency["meanMs"], latency["targetMs"]) * 1.25)
    ax1.set_ylabel("Processing latency (ms)", fontsize=11, fontweight="bold", labelpad=8)
    ax1.set_title(
        f"Latency per sentence — {latency['targetStatus']} target\n"
        f"({latency['meanMs'] / latency['targetMs']:.1f}× the target)",
        fontsize=11,
        fontweight="bold",
        pad=12,
    )
    ax1.grid(axis="y", zorder=0)

    # Right: what the model costs on disk and in RAM.
    labels = ["On disk", "RSS delta at load", "Peak RSS"]
    values = [storage["totalMb"], memory["rssDeltaMb"], memory["peakRssDuringRunMb"]]
    bars2 = ax2.bar(labels, values, color="#38BDF8", edgecolor="#334155",
                    linewidth=1.2, width=0.55, zorder=3)
    for bar, value in zip(bars2, values):
        ax2.annotate(
            f"{value:,.1f} MB",
            xy=(bar.get_x() + bar.get_width() / 2, value),
            xytext=(0, 4),
            textcoords="offset points",
            ha="center",
            va="bottom",
            fontsize=9,
            fontweight="bold",
        )
    ax2.set_ylim(0, max(values) * 1.2)
    ax2.set_ylabel("Megabytes (MB)", fontsize=11, fontweight="bold", labelpad=8)
    ax2.set_title("Footprint of the shipped model\n(no quantisation)", fontsize=11,
                  fontweight="bold", pad=12)
    ax2.grid(axis="y", zorder=0)

    fig.text(0.01, 0.01, provenance(facts), fontsize=7, color="#94A3B8")
    path = os.path.join(OUTPUT_DIR, "figure3_latency_vs_footprint.png")
    fig.tight_layout(rect=(0, 0.03, 1, 1))
    fig.savefig(path, dpi=300)
    plt.close(fig)
    return path


def main() -> int:
    facts = load_facts()
    for path in (figure1_wer(facts), figure2_latency_footprint(facts)):
        print(f"[+] wrote {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
