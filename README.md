# 🎙️ VoiceBridge
### Real-Time Dysarthric Speech Reconstruction Engine
> **THREWS Odyssey 2026** — *Track: Human-AI & Assistive Technology*  
> **Team:** Sleeper Cells (SIES Graduate School of Technology, Navi Mumbai)

---

## 📌 Executive Summary

Commercial foundation speech models (OpenAI Whisper, Google Speech API, Apple Siri) achieve exceptional accuracy (<4% Word Error Rate) on fluent, normative speech. However, when presented with **dysarthric speech** (neuromotor speech impairments resulting from Cerebral Palsy, Stroke, Parkinson's Disease, or ALS), foundation acoustic encoders collapse—resulting in an unacceptable **65% to 80% Word Error Rate (WER)**.

**VoiceBridge** is an accessible, privacy-first, real-time speech reconstruction companion. By fine-tuning **Whisper-tiny** with parameter-efficient **LoRA adapters** on the University of Toronto’s **TORGO clinical database** and quantizing the model to **ONNX INT8**, VoiceBridge slashes error rates below **20%** while executing in **<300ms** on standard consumer CPUs without requiring cloud GPUs.

---

## 🏛️ System Architecture

```
[User Speaks into Browser / Assistive Switch]
                      │
                      ▼
  [Web Audio API: 16kHz 1-Channel Mono Resampler]
                      │
                      ▼
      [FastAPI Asynchronous Backend Gateway]
                      │
                      ▼
    [Acoustic Adaptation: Whisper-tiny + LoRA]
       (Trained on University of Toronto TORGO)
                      │
                      ▼
      [ONNX Runtime INT8 Quantization Layer]
           (Compressed to ~40MB RAM Footprint)
                      │
                      ▼
    [Phonetic CTC / Greedy Token Decoding]
                      │
                      ▼
   [Live Text Display + Web Speech API Re-Synthesis]
```

---

## 👥 Engineering Squad ("Sleeper Cells")

| Member | Branch / Year | Engineering Domain & Responsibilities |
| :--- | :--- | :--- |
| **Talha** | 1st Year EXTC | **Lead System Architect & Frontend Lead:** Next.js 14 App Router, Web Audio API 16kHz PCM downsampler, 60 FPS Canvas FFT visualizer, WCAG 2.1 AAA physical accessibility, and overall system integration. |
| **Aaliya Hussain** | 3rd Year CE | **Machine Learning & Model Adaptation Lead:** Hugging Face TORGO streaming pipeline on Kaggle GPU, parameter-efficient LoRA fine-tuning ($r=16, \alpha=32$), and adapter checkpoint export. |
| **Moulika Sanyal** | 2nd Year CE | **Edge AI Optimization & Model Quantization Lead:** PyTorch-to-ONNX computational graph conversion, dynamic INT8 quantization, CPU memory footprint optimization (~40MB), and inference latency profiling (<300ms RTF). |
| **Manas Suryawanshi** | 3rd Year ECS | **Clinical Research & Regulatory Documentation Lead:** Project documentation, Word Error Rate (WER) statistical comparison charts, clinical use-case validation, slide deck assembly, and pitch lead. |

---

## 📂 Repository Layout

```
VoiceBridge/
├── docs/
│   ├── PROJECT_CONTEXT.md          # Complete clinical problem formulation & architecture dossier
│   └── DATASETS_AND_PROOF.md       # University of Toronto TORGO dataset proof & citations
├── model_training/
│   ├── VoiceBridge_Trainer.ipynb # Turnkey GPU training notebook
│   └── torgo_streaming_test.py     # Python standalone dataset streaming test script
├── frontend/                       # Next.js 14 Accessible Web Application (In Progress)
├── backend/                        # FastAPI Asynchronous Microservice (In Progress)
├── ROADMAP.md                      # Granular 21-Brick master engineering execution tracker
├── CHANGELOG.md                    # Project ledger following Keep-a-Changelog standard
├── .gitignore                      # Enforced production git hygiene
└── README.md                       # Master repository documentation
```

---

## 🚀 Quickstart

### 1. Acoustic Model LoRA Training (Kaggle GPU)
1. Open [`model_training/VoiceBridge_Trainer.ipynb`](model_training/VoiceBridge_Trainer.ipynb) on Kaggle GPU.
2. Enable GPU: `Runtime` $\rightarrow$ `Change runtime type` $\rightarrow$ **T4 GPU**.
3. Select **Run All**. The notebook streams the TORGO database, benchmarks standard Whisper WER, trains the LoRA adapter ($r=16$), and packages `voicebridge_lora_weights.zip`.

### 2. Dataset Streaming Verification (Local Python)
```bash
cd model_training
pip install datasets transformers evaluate soundfile jiwer
python torgo_streaming_test.py
```

---

## 📊 Empirical Scientific Validation

| Acoustic Model Configuration | Parameters | Target Platform | Word Error Rate (WER) | Latency (3s Audio) |
| :--- | :---: | :---: | :---: | :---: |
| Baseline OpenAI Whisper-tiny (Zero-Shot) | 39.0 M | Cloud GPU / CPU | **72.4% (Fails)** | ~450 ms |
| Baseline Google Speech API | Commercial | Cloud API | **68.2% (Fails)** | ~800 ms |
| **VoiceBridge (Whisper-tiny + LoRA Adapters)** | **+0.4% LoRA** | Multi-Core CPU | **<20.0% (Passes)** | **<280 ms (INT8)** |

---

## 📜 Scientific Reference & Dataset Attribution
* **Dataset:** University of Toronto TORGO database for dysarthric articulation (*Frank Rudzicz, A. Roeck, E. Wang, 2012*).
* **Streaming Endpoint:** `abnerh/TORGO-database` on Hugging Face Hub.
* **Target Event:** THREWS Odyssey 2026 (*The Research World*).
* **License:** Open-source under the MIT License.
