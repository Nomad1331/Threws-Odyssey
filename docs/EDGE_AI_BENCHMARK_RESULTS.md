# 📊 VoiceBridge Edge AI Quantization & Benchmark Report (Brick 10)

**Author:** Moulika Sanyal (Edge AI Optimization & ONNX Quantization Lead)  
**Date:** November 4, 2026  
**Branch:** `moulika/voicebridge-onnx-int8`  

---

## 1. Environment & Hardware Specification

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

> **Hardware Validation Note:** All quantization and benchmarks in this report were executed on an `x86_64` CPU using `AutoQuantizationConfig.avx2(is_static=False, per_channel=False)` and ONNX Runtime's `CPUExecutionProvider`. This model has **not** been validated on Raspberry Pi ARM hardware; the script automatically selects `AutoQuantizationConfig.arm64` when run on `aarch64`/`arm64` targets.

---

## 2. Model & LoRA Adapter Compatibility

* **Base Model:** `openai/whisper-small`
* **LoRA Adapter:** `Aaliya05/voicebridge`
* **Verification via `PeftConfig.from_pretrained("Aaliya05/voicebridge")`:**
  * `base_model_name_or_path`: `openai/whisper-small` (Compatible)
  * `peft_type`: `LORA`
  * `r`: `16`, `lora_alpha`: `32`, `lora_dropout`: `0.05`
  * `target_modules`: `{'q_proj', 'v_proj'}`
* **Merge Output:** Saved standalone merged PyTorch model and `WhisperProcessor` to `model_training/voicebridge_merged/`.

---

## 3. Per-Component ONNX Export & Dynamic INT8 Quantization

Hugging Face Optimum exports Whisper into three separate ONNX computation graphs to support autoregressive key-value caching (`encoder_model.onnx`, `decoder_model.onnx`, and `decoder_with_past_model.onnx`). Each component was quantized individually via `ORTQuantizer.from_pretrained(onnx_dir, file_name=...)` and verified using `onnx.checker.check_model()`.

| Component | FP32 ONNX File (`voicebridge_onnx/`) | FP32 Size (MB) | INT8 ONNX File (`voicebridge_onnx_int8/`) | INT8 Size (MB) | Size Reduction (%) |
| :--- | :--- | :---: | :--- | :---: | :---: |
| **Acoustic Encoder** | `encoder_model.onnx` | 31.36 MB | `encoder_model_quantized.onnx` | 9.63 MB | **69.29%** |
| **Decoder (Initial Step)** | `decoder_model.onnx` | 188.83 MB | `decoder_model_quantized.onnx` | 47.49 MB | **74.85%** |
| **Decoder (With Past KV)** | `decoder_with_past_model.onnx` | 184.31 MB | `decoder_with_past_model_quantized.onnx` | 46.34 MB | **74.86%** |
| **Encoder + 1 Decoder** *(Unique Weights)* | Encoder + Decoder | 220.18 MB | Encoder + Quantized Decoder | 57.12 MB | **74.06%** |
| **Total Package (All 3 Graphs)** | All 3 `.onnx` files | **404.49 MB** | All 3 `*_quantized.onnx` files | **103.45 MB** | **74.42%** |

*Note on Model Storage Size vs. Target:* Dynamic INT8 quantization achieved a **74.42% size reduction**, matching the guide's ~74% reduction expectation. Because Optimum exports two separate unmerged decoder files (`decoder_model` and `decoder_with_past_model`) that duplicate the decoder weights alongside untied token embeddings, the combined 3-file package on disk is **103.45 MB** (or **57.12 MB** for the encoder + single decoder), which exceeds the 38–40 MB single-checkpoint estimate.

---

## 4. Runtime Memory (RAM) & Performance Telemetry

* **Process Resident Set Size (RSS) Peak:** `1849.9 MB` (includes Python interpreter, PyTorch, Transformers, FP32 ONNX session, and INT8 ONNX session loaded in the same benchmark process).
* **Incremental INT8 ONNX Runtime Session RSS Delta:** `~139.4 MB` when loading the 3 quantized ONNX sessions into `CPUExecutionProvider`.

### 4.1 Synthetic Execution Smoke Test (1.0s 440 Hz Sine Wave)
* **Input:** 1.0 second synthetic 440 Hz sine wave (`16 kHz`, mono `float32`).
* **Warm-up:** 2 untimed runs.
* **Timed Runs:** 5 iterations.
* **Average Inference Latency:** `653.5 ms`
* **Real-Time Factor (RTF):** `0.6535`
* **Decoded Smoke Output:** `'The Best!'`

### 4.2 Authentic TORGO Clinical Audio Evaluation
Evaluated on the 3 authentic TORGO dysarthric speech WAV recordings (`16 kHz`, mono) located in `frontend/public/audio/`:

| Sample File | Speaker & Condition | Duration | Reference Transcript | FP32 ONNX Transcript (WER) | INT8 ONNX Transcript (WER) | FP32 Latency | INT8 Latency | INT8 RTF |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: | :---: | :---: |
| `torgo_mild_sample.wav` | `TORGO-M05` (Mild, CP) | 5.69 s | *"We have an excellent team"* | *"We have an 8th team"* (20.0%) | *"We have in 18th Team."* (40.0%) | 628.7 ms | 660.0 ms | 0.1160 |
| `torgo_moderate_sample.wav` | `TORGO-M04` (Moderate, Post-Stroke) | 5.87 s | *"Their house is grey and white"* | *"then down, great and white"* (66.7%) | *"Good night."* (100.0%) | 579.1 ms | 518.7 ms | 0.0884 |
| `torgo_severe_sample.wav` | `TORGO-M02` (Severe, ALS) | 6.00 s | *"The job provides many benefits"* | *"I'm gonna put my nose in the bed"* (160.0%) | *"I will be very happy."* (100.0%) | 706.6 ms | 597.2 ms | 0.0995 |
| **Average** | **All 3 TORGO Clips** | **5.85 s** | — | **Mean WER: 82.2%** | **Mean WER: 80.0%** | **638.1 ms** | **592.0 ms** | **0.1013** |

* **Target Comparison Summary:**
  * **Size Reduction (%):** `74.42%` vs. `~74%` target → **PASS**
  * **Storage Footprint:** `103.45 MB` (all 3 graphs) / `57.12 MB` (Encoder + 1 Decoder) vs. `38–40 MB` target → **MISS**
  * **Average CPU Inference Latency:** `592.0 ms` (full encoder-decoder generation over ~5.85s audio clips) vs. `< 280 ms` target → **MISS**
  * **Average Real-Time Factor (RTF):** `0.1013` on TORGO clips (`0.0884` on Moderate, `0.0995` on Severe, `0.1160` on Mild) vs. `< 0.10` target → **Borderline / MISS** (`0.1013` mean)
