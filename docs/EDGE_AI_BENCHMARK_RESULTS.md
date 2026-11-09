# 📊 VoiceBridge Benchmark Report

> **Two experiments, one file — read the headings.**
>
> **Section 1** measures **the product**: `whisper-small` + the LoRA adapter, through the
> shipped PyTorch path. These are the numbers to quote.
>
> **Section 2** is a **historical side study** on `whisper-tiny` INT8 ONNX. It is kept for
> the record, it was **not re-executed** for this submission, and it says nothing about the
> product's speed, size or accuracy. Do not quote its figures as VoiceBridge's.

---

<!-- BEGIN:generated:edge-product -->
## 1. Product benchmark — whisper-small + LoRA (the shipped engine)

Measured 2026-11-09 by `python benchmarks/benchmark_product.py`. This is the only section of this file that describes the product.

### Environment

* **CPU:** Intel(R) Core(TM) i5-14400F (10 cores / 16 threads)
* **RAM:** 137.3 GB
* **OS:** Windows 11 (10.0.26300)
* **Device:** cpu (no GPU used)
* **PyTorch:** 2.15.0+cpu · **Transformers:** 5.22.2 · **PEFT:** 0.21.2 · **Python:** 3.12.9
* **Model:** openai/whisper-small (243.5M parameters) + Aaliya05/voicebridge LoRA (1.77M, 0.73%)
* **Disk:** 978.5 MB total (971.4 MB base + 7.1 MB adapter)
* **Model load time:** 1,339 ms

### Accuracy (word error rate)

| Clip | Severity | Condition | Duration | Reference | Model output | WER | S / D / I | Latency |
| :--- | :--- | :--- | ---: | :--- | :--- | ---: | :---: | ---: |
| `torgo_mild_sample.wav` | Mild | Cerebral Palsy | 5.69 s | “We have an excellent team” | “We have an excellent team” | **0.0%** | 0 / 0 / 0 | 1,566.2 ms |
| `torgo_moderate_sample.wav` | Moderate-to-Severe | Post-Trauma (TBI) | 5.87 s | “Their house is grey and white” | “then there's the grey and white” | **50.0%** | 3 / 0 / 0 | 1,733.4 ms |
| `torgo_severe_sample.wav` | Severe | Amyotrophic Lateral Sclerosis (ALS) | 6.0 s | “The job provides many benefits” | “Get the apple by Fimasy Bezzi bit” | **120.0%** | 4 / 0 / 2 | 1,860.8 ms |
| **Totals** | **3 clips** |  |  |  |  | **mean 56.7%** |  | **1,720.1 ms** |

* **Mean of clip WERs:** 56.7%
* **Corpus WER (all edits ÷ all reference words):** 56.2%
* **S / D / I:** substitutions / deletions / insertions.

### Latency

* **Protocol:** 2 warm-up runs per clip, then 5 timed runs.
* **Mean:** 1,720.1 ms · **median:** 1,725.4 ms · **range:** 1,526.5–1,908.2 ms
* **Real-time factor:** 0.294
* **Target:** 280 ms → **MISS** (6.1× the target)
* **Measurement point:** wall time around inference.transcribe_audio, including audio decode

### Memory

* **RSS before model load:** 380.3 MB
* **RSS after model load:** 1,401.6 MB
* **RSS delta:** **1,021.3 MB**
* **Peak RSS during timed runs:** 1,748.1 MB
* **Peak working set (OS counter):** 1,767.9 MB

### Interpretation

* Mild dysarthric speech is transcribed correctly on the demo clip.
* Moderate speech is only partially usable: half the words are wrong.
* Severe speech is **not** usable; it is reported as a known limit, not hidden.
* The latency target is missed by a wide margin. This is a CPU-only PyTorch implementation of a 243.5M-parameter model; it is not a real-time system.
* Only 3 clips from 3 speakers were measured. These results are preliminary and are not a clinical claim.

### Reproduce

```
python benchmarks/benchmark_product.py
```

The script loads the product engine, writes `facts.json`, refuses to run if the loaded model is not whisper-small by parameter count, and supports `--baseline facts.json` to prove two runs agree.
<!-- END:generated:edge-product -->

---

<!-- claims-check:historical -->
## 2. Historical side study — whisper-tiny INT8 ONNX (not the product)

**Author:** Moulika Sanyal (Edge AI Optimization & ONNX Quantization Lead)
**Date:** November 4, 2026
**Original branch:** `moulika/voicebridge-onnx-int8`
**Status:** historical, not re-executed for this submission. These figures describe an
experiment on `openai/whisper-tiny` (39M parameters), a model the product does **not** run.
They are retained so the work is not lost, and they are excluded from every product claim.

### 2.1 Environment & Hardware Specification

* **Operating System:** Ubuntu Linux (`x86_64`)
* **Processor:** 13th Gen Intel(R) Core(TM) i5-1334U (10 cores / 12 threads, AVX2 + VNNI support)
* **Python Environment:** Python `3.12.3` (`.venv`)
* **Key Package Versions:**
  * `torch`: `2.15.0+cpu`
  * `transformers`: `4.57.6`
  * `peft`: `0.21.2`
  * `optimum`: `2.1.0` (`optimum-onnx`: `0.1.0`)
  * `onnx`: `1.23.2`
  * `onnxruntime`: `1.31.1`
  * `librosa`: `1.0.0`
  * `soundfile`: `0.14.0`
  * `numpy`: `2.5.4`

> **Hardware Validation Note:** All quantization and benchmarks in this section were executed on an `x86_64` CPU using `AutoQuantizationConfig.avx2(is_static=False, per_channel=False)` and ONNX Runtime's `CPUExecutionProvider`. This model has **not** been validated on Raspberry Pi ARM hardware; the script automatically selects `AutoQuantizationConfig.arm64` when run on `aarch64`/`arm64` targets.

### 2.2 Model & Architecture Demarcation

* **Clinical Production Engine (not measured in this section):** `openai/whisper-small` (243.5M parameters) fine-tuned with PEFT LoRA adapter `Aaliya05/voicebridge` ($r=16, \alpha=32$).
* **Edge AI Quantization Baseline (this section):** `openai/whisper-tiny` (39M parameters), evaluated to benchmark dynamic INT8 ONNX footprint reduction and sub-second CPU execution.
* **LoRA Specification (`Aaliya05/voicebridge`):**
  * `base_model_name_or_path`: `openai/whisper-small`
  * `peft_type`: `LORA`
  * `r`: `16`, `lora_alpha`: `32`, `lora_dropout`: `0.05`
  * `target_modules`: `{'q_proj', 'v_proj'}` (attention projections in encoder and decoder)
* **Merge Output:** Standalone merged model and `WhisperProcessor` verified in `model_training/voicebridge_merged/`.

### 2.3 Per-Component ONNX Export & Dynamic INT8 Quantization

Hugging Face Optimum exports Whisper into three separate ONNX computation graphs to support autoregressive key-value caching (`encoder_model.onnx`, `decoder_model.onnx`, and `decoder_with_past_model.onnx`). Each component was quantized individually via `ORTQuantizer.from_pretrained(onnx_dir, file_name=...)` and verified using `onnx.checker.check_model()`.

| Component | FP32 ONNX File (`voicebridge_onnx/`) | FP32 Size (MB) | INT8 ONNX File (`voicebridge_onnx_int8/`) | INT8 Size (MB) | Size Reduction (%) |
| :--- | :--- | :---: | :--- | :---: | :---: |
| **Acoustic Encoder** | `encoder_model.onnx` | 31.36 MB | `encoder_model_quantized.onnx` | 9.63 MB | **69.29%** |
| **Decoder (Initial Step)** | `decoder_model.onnx` | 188.83 MB | `decoder_model_quantized.onnx` | 47.49 MB | **74.85%** |
| **Decoder (With Past KV)** | `decoder_with_past_model.onnx` | 184.31 MB | `decoder_with_past_model_quantized.onnx` | 46.34 MB | **74.86%** |
| **Encoder + 1 Decoder** *(Unique Weights)* | Encoder + Decoder | 220.18 MB | Encoder + Quantized Decoder | 57.12 MB | **74.06%** |
| **Total Package (All 3 Graphs)** | All 3 `.onnx` files | **404.49 MB** | All 3 `*_quantized.onnx` files | **103.45 MB** | **74.42%** |

*Note on Model Storage Size vs. Target:* Dynamic INT8 quantization achieved a **74.42% size reduction**, matching the guide's ~74% reduction expectation. Because Optimum exports two separate unmerged decoder files (`decoder_model` and `decoder_with_past_model`) that duplicate the decoder weights alongside untied token embeddings, the combined 3-file package on disk is **103.45 MB** (or **57.12 MB** for the encoder + single decoder), which exceeds the 38–40 MB single-checkpoint estimate.

### 2.4 Runtime Memory (RAM) & Performance Telemetry

* **Process Resident Set Size (RSS) Peak:** `1849.9 MB` (includes Python interpreter, PyTorch, Transformers, FP32 ONNX session, and INT8 ONNX session loaded in the same benchmark process).
* **Incremental INT8 ONNX Runtime Session RSS Delta:** `~139.4 MB` when loading the 3 quantized ONNX sessions into `CPUExecutionProvider`.

#### 2.4.1 Synthetic Execution Smoke Test (1.0s 440 Hz Sine Wave)

* **Input:** 1.0 second synthetic 440 Hz sine wave (`16 kHz`, mono `float32`).
* **Warm-up:** 2 untimed runs.
* **Timed Runs:** 5 iterations.
* **Average Inference Latency:** `653.5 ms`
* **Real-Time Factor (RTF):** `0.6535`
* **Decoded Smoke Output:** `'The Best!'`

#### 2.4.2 Authentic TORGO Clinical Audio Evaluation

Evaluated on the 3 authentic TORGO dysarthric speech WAV recordings (`16 kHz`, mono) located in `frontend/public/audio/`:

| Sample File | Speaker & Condition | Duration | Reference Transcript | FP32 ONNX Transcript (WER) | INT8 ONNX Transcript (WER) | FP32 Latency | INT8 Latency | INT8 RTF |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: | :---: | :---: |
| `torgo_mild_sample.wav` | `TORGO-M05` (Mild, CP) | 5.69 s | *"We have an excellent team"* | *"We have an 8th team"* (20.0%) | *"We have in 18th Team."* (40.0%) | 628.7 ms | 660.0 ms | 0.1160 |
| `torgo_moderate_sample.wav` | `TORGO-M04` (Moderate-to-Severe Tier, Post-Trauma TBI) | 5.87 s | *"Their house is grey and white"* | *"then down, great and white"* (66.7%) | *"Good night."* (100.0%) | 579.1 ms | 518.7 ms | 0.0884 |
| `torgo_severe_sample.wav` | `TORGO-M02` (Severe, ALS) | 6.00 s | *"The job provides many benefits"* | *"I'm gonna put my nose in the bed"* (160.0%) | *"I will be very happy."* (100.0%) | 706.6 ms | 597.2 ms | 0.0995 |
| **Average** | **All 3 TORGO Clips** | **5.85 s** | — | **Mean WER: 82.2%** | **Mean WER: 80.0%** | **638.1 ms** | **592.0 ms** | **0.1013** |

* **Target Comparison Summary (this side study only):**
  * **Size Reduction (%):** `74.42%` vs. `~74%` target → **PASS**
  * **Storage Footprint:** `103.45 MB` (all 3 graphs) / `57.12 MB` (Encoder + 1 Decoder) vs. `38–40 MB` target → **MISS**
  * **Average CPU Inference Latency:** `592.0 ms` (full encoder-decoder generation over ~5.85s audio clips) vs. `< 280 ms` target → **MISS**
  * **Average Real-Time Factor (RTF):** `0.1013` on TORGO clips (`0.0884` on Moderate, `0.0995` on Severe, `0.1160` on Mild) vs. `< 0.10` target → **Borderline / MISS** (`0.1013` mean)

> These target verdicts apply to the whisper-tiny experiment. The product's own results,
> including its own miss against the target, are in Section 1.

### 2.5 What this side study does and does not show

* **Shows:** dynamic INT8 ONNX quantization of whisper-tiny cuts its on-disk package by
  about three quarters without materially changing mean WER on three clips.
* **Does not show:** anything about whisper-small, LoRA, the shipped PyTorch path, or
  production latency and memory. The product is roughly six times larger and materially
  slower than the numbers in this section.
* **Why it is kept:** it is real work with a reproducible script
  (`model_training/export_and_quantize_onnx.py`) and a useful negative result: size
  reduction on a small model did not rescue accuracy on dysarthric speech.
<!-- /claims-check:historical -->
