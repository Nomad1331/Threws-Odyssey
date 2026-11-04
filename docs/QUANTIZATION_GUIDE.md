# ⚡ VoiceBridge Edge AI Quantization Guide (Brick 10)
**Lead:** Moulika Sanyal (Edge AI & Model Quantization Lead)  
**Target:** THREWS Odyssey 2026 • *Track: Human-AI & Assistive Technology*

---

## 🎯 The Objective

Aaliya has trained the LoRA adapter on Kaggle and pushed it to Hugging Face (`Aaliya05/voicebridge`). 

Right now, running raw PyTorch consumes **~150MB of RAM** and requires **~2GB of PyTorch dependencies** on disk. Your job is to transform this into an **ultra-lightweight, edge-deployable ONNX model**:

| Metric | Raw PyTorch Baseline | Your Target (ONNX INT8) | Impact for Judges |
| :--- | :--- | :--- | :--- |
| **Model Size / RAM** | ~150 MB | **~38–40 MB** | **~74% memory reduction** |
| **Dependencies** | PyTorch (~2 GB) | Pure ONNX Runtime (~40 MB) | Can run on low-cost tablets / laptops |
| **Inference Latency** | ~450 ms | **< 280 ms** on CPU | Real-Time Factor (RTF) < 0.1 |

---

## 🛠️ Step-by-Step Instructions

You can run this locally or on Google Colab / Kaggle.

### Step 1: Install Required Libraries
Open a terminal (or a Colab/Kaggle notebook cell) and install:

```bash
pip install torch transformers peft "optimum[onnxruntime]" onnx onnxruntime librosa soundfile numpy
```

---

### Step 2: Run the Turnkey Script
Inside the repository, run the automated script located at `model_training/export_and_quantize_onnx.py`:

```bash
cd model_training
python export_and_quantize_onnx.py
```

#### What the script does automatically:
1. **Downloads** `openai/whisper-tiny` and attaches `Aaliya05/voicebridge`.
2. **Merges** the LoRA weights permanently into the base model (`merge_and_unload`).
3. **Exports** the full computational graph (Encoder, Decoder, Past KV) to `voicebridge_onnx/`.
4. **Applies Dynamic INT8 Quantization** to produce the final edge model in `voicebridge_onnx_int8/`.
5. **Runs an automated smoke test** and prints your final benchmark table!

---

### Step 3: Expected Output
When it finishes, you should see a summary like this:

```text
--------------------------------------------------
📊 FINAL CLINICAL EDGE BENCHMARK RESULTS
--------------------------------------------------
Target Hardware     : Standard Multi-Core CPU (x86_64 / ARM)
Memory Footprint    : 38.6 MB (Target: <50MB)  [PASS]
Inference Latency   : ~190-240 ms (Target: <300ms)  [PASS]
Decoder Output      : '...'
--------------------------------------------------
✅ BRICK 10 COMPLETE: Model is ready for edge deployment!
```

---

### Step 4: Deliverables for the Team & Presentation

Once completed, you have two deliverables:
1. **Commit the code / output directory** (or push the INT8 checkpoint so the backend can use it).
2. **Log the final numbers for the Pitch Deck:**
   * Exact size reduction (e.g., `148.5 MB` $\rightarrow$ `38.6 MB`).
   * Average CPU latency (e.g., `215 ms`).
   * Real-Time Factor (e.g., `RTF = 0.07`).

*(These numbers will be featured directly on Slide 6: "Edge Architecture & Low-Resource Deployment" during the final pitch!)*
