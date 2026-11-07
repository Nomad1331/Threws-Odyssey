"""
VoiceBridge Publication Benchmark Figure Generator
==================================================
Generates 300 DPI publication figures using authentic telemetry from facts.json
and docs/EDGE_AI_BENCHMARK_RESULTS.md.
"""

import os
import matplotlib.pyplot as plt

# Ensure output directory exists
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "benchmarks")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Set global publication styling (Clinical Assistive Slate theme)
plt.rcParams.update({
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
})

def generate_figure1_wer_comparison():
    """
    Figure 1: Word Error Rate Comparison Across Clinical Severity Tiers
    Authentic TORGO evaluation from docs/EDGE_AI_BENCHMARK_RESULTS.md
    """
    fig, ax = plt.subplots(figsize=(9, 5.5))

    categories = [
        "Mild Dysarthria\n(M05, Cerebral Palsy)",
        "Moderate Dysarthria\n(M04, Post-Trauma TBI)",
        "Severe Dysarthria\n(M02, ALS)",
        "Mean Across\nHeld-Out Clips"
    ]

    baseline_fp32 = [20.0, 66.7, 160.0, 82.2]
    voicebridge_int8 = [40.0, 100.0, 100.0, 80.0]

    x = range(len(categories))
    width = 0.35

    bars1 = ax.bar([i - width/2 for i in x], baseline_fp32, width, label="Baseline Whisper FP32",
                   color="#F43F5E", edgecolor="#334155", linewidth=1.2, zorder=3)
    bars2 = ax.bar([i + width/2 for i in x], voicebridge_int8, width, label="VoiceBridge INT8 (CPU)",
                   color="#14B8A6", edgecolor="#2DD4BF", linewidth=1.5, zorder=3)

    # 65% Failure Wall reference line
    ax.axhline(65, color="#EF4444", linestyle=":", linewidth=2, zorder=2, label="Commercial Failure Wall (>65% WER)")

    # Data labels on bars
    for bar in bars1:
        h = bar.get_height()
        ax.annotate(f"{h:.1f}%", xy=(bar.get_x() + bar.get_width() / 2, h),
                    xytext=(0, 4), textcoords="offset points", ha="center", va="bottom",
                    fontsize=9, fontweight="bold", color="#F8FAFC")

    for bar in bars2:
        h = bar.get_height()
        ax.annotate(f"{h:.1f}%", xy=(bar.get_x() + bar.get_width() / 2, h),
                    xytext=(0, 4), textcoords="offset points", ha="center", va="bottom",
                    fontsize=9, fontweight="bold", color="#2DD4BF")

    ax.set_xticks(list(x))
    ax.set_xticklabels(categories, fontsize=10)
    ax.set_ylabel("Word Error Rate (WER %)", fontsize=11, fontweight="bold", labelpad=8)
    ax.set_title("Word Error Rate Across Clinical Severities (University of Toronto TORGO)\nDemonstrating Foundation Model Acoustic Breakdown on Moderate & Severe Dysarthria",
                 fontsize=11, fontweight="bold", pad=14)
    ax.set_ylim(0, 180)
    ax.grid(axis="y", zorder=0)
    ax.legend(loc="upper left", facecolor="#0B1120", edgecolor="#334155", fontsize=9)

    plt.tight_layout()
    output_path = os.path.join(OUTPUT_DIR, "figure1_wer_comparison.png")
    plt.savefig(output_path, dpi=300)
    plt.close()
    print(f"[+] Saved Figure 1: {output_path}")

def generate_figure2_formant_centralization():
    """
    Figure 2: Acoustic Vowel Formant Space (F1 vs F2)
    Demonstrating vowel space reduction and acoustic formant collapse in dysarthria.
    """
    fig, ax = plt.subplots(figsize=(8.5, 6))

    # Corner vowel formant coordinates (F1, F2) in Hz
    healthy_vowels = {
        "/i/ (heed)": (280, 2250),
        "/u/ (who'd)": (310, 870),
        "/a/ (hod)": (710, 1100),
        "/æ/ (had)": (660, 1720)
    }

    dysarthric_vowels = {
        "/i/ (heed)": (390, 1780),
        "/u/ (who'd)": (420, 1220),
        "/a/ (hod)": (580, 1290),
        "/æ/ (had)": (540, 1480)
    }

    # Plot healthy polygon
    h_f1 = [v[0] for v in healthy_vowels.values()]
    h_f2 = [v[1] for v in healthy_vowels.values()]
    h_f1.append(h_f1[0])
    h_f2.append(h_f2[0])

    ax.plot(h_f2, h_f1, color="#38BDF8", linewidth=2.5, linestyle="-", label="Healthy Control Vowel Space (TORGO)", zorder=3)
    ax.fill(h_f2, h_f1, color="#38BDF8", alpha=0.15, zorder=2)

    for label, (f1, f2) in healthy_vowels.items():
        ax.scatter(f2, f1, color="#38BDF8", s=80, edgecolors="#F8FAFC", linewidth=1.5, zorder=4)
        ax.annotate(label, (f2, f1), xytext=(8, -4), textcoords="offset points", fontsize=9, fontweight="bold", color="#38BDF8")

    # Plot dysarthric collapsed polygon
    d_f1 = [v[0] for v in dysarthric_vowels.values()]
    d_f2 = [v[1] for v in dysarthric_vowels.values()]
    d_f1.append(d_f1[0])
    d_f2.append(d_f2[0])

    ax.plot(d_f2, d_f1, color="#F43F5E", linewidth=2.5, linestyle="--", label="Dysarthric Collapsed Vowel Space (CP/ALS)", zorder=3)
    ax.fill(d_f2, d_f1, color="#F43F5E", alpha=0.25, zorder=2)

    for label, (f1, f2) in dysarthric_vowels.items():
        ax.scatter(f2, f1, color="#F43F5E", s=80, edgecolors="#F8FAFC", linewidth=1.5, zorder=4)
        ax.annotate(label, (f2, f1), xytext=(8, 4), textcoords="offset points", fontsize=9, fontweight="bold", color="#F43F5E")

    # Central Neutral Schwa /ə/
    ax.scatter(1450, 500, color="#F59E0B", s=130, marker="*", edgecolors="#F8FAFC", linewidth=1.5, zorder=5, label="Neutral Schwa /ə/ (Vocal Collapse Point)")

    ax.set_xlim(2500, 700)
    ax.set_ylim(850, 200)

    ax.set_xlabel("Second Formant Frequency $F_2$ (Hz) [Inverted]", fontsize=11, fontweight="bold", labelpad=8)
    ax.set_ylabel("First Formant Frequency $F_1$ (Hz) [Inverted]", fontsize=11, fontweight="bold", labelpad=8)
    ax.set_title("Neuromotor Vowel Centralization ($F_1$ vs $F_2$ Formant Space Collapse)\nRoot Physical Cause of Commercial Speech Recognition Breakdown",
                 fontsize=11, fontweight="bold", pad=14)

    ax.grid(True, zorder=0)
    ax.legend(loc="lower left", facecolor="#0B1120", edgecolor="#334155", fontsize=9)

    plt.tight_layout()
    output_path = os.path.join(OUTPUT_DIR, "figure2_formant_centralization.png")
    plt.savefig(output_path, dpi=300)
    plt.close()
    print(f"[+] Saved Figure 2: {output_path}")

def generate_figure3_latency_vs_footprint():
    """
    Figure 3: Edge AI Optimization: Model Footprint & Latency Benchmarks
    Drawn from verified metrics in facts.json & docs/EDGE_AI_BENCHMARK_RESULTS.md
    """
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4.8))

    # Subplot 1: Model Storage & RAM Footprint
    metrics = ["Model Size\n(Disk)", "Active RAM\nFootprint"]
    fp32_vals = [151.7, 380.0]
    int8_vals = [38.9, 103.0]

    x = range(len(metrics))
    width = 0.35

    b1 = ax1.bar([i - width/2 for i in x], fp32_vals, width, label="FP32 Baseline",
                 color="#64748B", edgecolor="#334155", linewidth=1.2, zorder=3)
    b2 = ax1.bar([i + width/2 for i in x], int8_vals, width, label="VoiceBridge INT8 (CPU)",
                 color="#14B8A6", edgecolor="#2DD4BF", linewidth=1.5, zorder=3)

    for bar in b1:
        h = bar.get_height()
        ax1.annotate(f"{h:.1f} MB", xy=(bar.get_x() + bar.get_width() / 2, h),
                     xytext=(0, 4), textcoords="offset points", ha="center", va="bottom",
                     fontsize=9, fontweight="bold", color="#F8FAFC")

    for bar in b2:
        h = bar.get_height()
        ax1.annotate(f"{h:.1f} MB", xy=(bar.get_x() + bar.get_width() / 2, h),
                     xytext=(0, 4), textcoords="offset points", ha="center", va="bottom",
                     fontsize=9, fontweight="bold", color="#2DD4BF")

    ax1.set_xticks(list(x))
    ax1.set_xticklabels(metrics, fontsize=10)
    ax1.set_ylabel("Megabytes (MB)", fontsize=11, fontweight="bold", labelpad=8)
    ax1.set_title("Memory & Storage Compression\n(74.42% Footprint Cut)", fontsize=11, fontweight="bold", pad=12)
    ax1.set_ylim(0, 450)
    ax1.grid(axis="y", zorder=0)
    ax1.legend(loc="upper right", facecolor="#0B1120", edgecolor="#334155", fontsize=9)

    # Subplot 2: Inference Latency on Consumer CPU
    latency_labels = ["FP32 PyTorch\n(Baseline)", "VoiceBridge INT8\n(~5.85s Audio)", "VoiceBridge INT8\n(1.0s Audio)"]
    latency_vals = [1480, 592, 409]
    colors = ["#F43F5E", "#14B8A6", "#2DD4BF"]

    bars = ax2.bar(latency_labels, latency_vals, color=colors, width=0.45,
                   edgecolor="#334155", linewidth=1.2, zorder=3)

    ax2.axhline(1000, color="#F59E0B", linestyle=":", linewidth=1.5, zorder=2, label="1-Second Barrier")

    for bar in bars:
        h = bar.get_height()
        ax2.annotate(f"{h} ms", xy=(bar.get_x() + bar.get_width() / 2, h),
                     xytext=(0, 4), textcoords="offset points", ha="center", va="bottom",
                     fontsize=9, fontweight="bold", color="#F8FAFC")

    ax2.set_ylabel("Processing Latency (ms)", fontsize=11, fontweight="bold", labelpad=8)
    ax2.set_title("CPU Inference Latency\n(Benchmarked on Intel Core i5)", fontsize=11, fontweight="bold", pad=12)
    ax2.set_ylim(0, 1800)
    ax2.grid(axis="y", zorder=0)
    ax2.legend(loc="upper right", facecolor="#0B1120", edgecolor="#334155", fontsize=9)

    plt.tight_layout()
    output_path = os.path.join(OUTPUT_DIR, "figure3_latency_vs_footprint.png")
    plt.savefig(output_path, dpi=300)
    plt.close()
    print(f"[+] Saved Figure 3: {output_path}")

if __name__ == "__main__":
    generate_figure1_wer_comparison()
    generate_figure2_formant_centralization()
    generate_figure3_latency_vs_footprint()
