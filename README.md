# 🎙️ VoiceBridge
### Assistive Speech Transcription for Dysarthric Speech
> **THREWS Odyssey 2026** — *Track: Human-AI & Assistive Technology*  
> **Institution:** SIES Graduate School of Technology, Navi Mumbai  
> **Branch:** `voicebridge-clean`

> **Status: research prototype.** It transcribes **mild** dysarthric speech correctly and
> **moderate** speech partially; **severe** speech is not supported and is reported as a
> known limit. It is not a medical device and has no clinical validation. Read
> **[LIMITS.md](LIMITS.md)** before quoting anything here. Five-minute walkthrough:
> **[docs/DEMO.md](docs/DEMO.md)**.

---

## 📌 Problem & Motivation

Commercial automatic speech recognition (ASR) foundation models achieve high accuracy on normative speech. However, for individuals with **dysarthria**—neuromotor speech impairments caused by Cerebral Palsy (CP), Amyotrophic Lateral Sclerosis (ALS), or Traumatic Brain Injury (TBI)—standard speech recognition frequently produces unusable output.

Current commercial solutions also face accessibility hurdles:
- **Cloud Dependency:** Many assistive tools require cloud streaming, posing privacy concerns and failing in offline environments.
- **Hardware Barrier:** Running large speech models locally typically demands expensive, power-hungry discrete GPUs.
- **Physical Usability:** Standard voice apps lack physical accommodations for users with accompanying motor spasticity or tremors.

**VoiceBridge** addresses these challenges with a CPU-only transcription pipeline (no discrete GPU, no cloud API) coupled with an accessible assistive interface. It is a research prototype, not a medical device.

---

## 🏛️ System Architecture

> 📖 **Looking for a deep-dive walkthrough?** See the complete [System Walkthrough & Code Tour](docs/SYSTEM_WALKTHROUGH.md) tracing every step from microphone click to synthesized speech.

```
[ Microphone Input / Assistive Switch ]
                  │
                  ▼
   [ Web Audio API (16kHz Capture) ]
                  │
                  ▼  (HTTP POST Multipart)
   [ FastAPI Backend Gateway (:8000) ]
                  │
                  ▼
   [ Clinical Acoustic LoRA Engine ]
     • Base: openai/whisper-small (243.5M params)
     • Fine-Tuned PEFT LoRA Adapter: Aaliya05/voicebridge (r=16, alpha=32)
     • Token-Level Softmax Confidence Scoring
     • Native PyAV Audio Ingestion (.webm, .wav, .mp4, .aac)
                  │
                  ▼  (JSON Response)
   [ Next.js Accessible Frontend (:3000) ]
     • Transcript display with confidence and latency
     • Text-to-Speech playback ("Say it")
     • AAC Quick-Assist confirmation cards
```

---

## 📊 Measured Results

Every number below comes from `facts.json`, produced by one command: `benchmarks/benchmark_product.py`, which loads the same engine the server runs. No figure is typed by hand, and `benchmarks/claims_check.py` fails if this file ever disagrees with `facts.json`.

<!-- BEGIN:generated:readme-accuracy -->
### Accuracy on the three TORGO demo clips

Word error rate on the exact clips the demo page plays, measured 2026-11-09.

| Severity | Speaker | Condition | WER | Demo reference → model output |
| :--- | :--- | :--- | ---: | :--- |
| Mild | TORGO-M05 | Cerebral Palsy | **0.0%** | “We have an excellent team” → “We have an excellent team” |
| Moderate-to-Severe | TORGO-M04 | Post-Trauma (TBI) | **50.0%** | “Their house is grey and white” → “then there's the grey and white” |
| Severe | TORGO-M02 | Amyotrophic Lateral Sclerosis (ALS) | **120.0%** | “The job provides many benefits” → “Get the apple by Fimasy Bezzi bit” |
| **Mean of clips** | | | **56.7%** | corpus WER **56.2%** across 3 clips |

“Mean of clips” averages the three percentages; “corpus WER” counts every edit over every reference word. Both are reported because they answer different questions.
<!-- END:generated:readme-accuracy -->

<!-- BEGIN:generated:readme-performance -->
### Speed, memory and size

Measured 2026-11-09 on Intel(R) Core(TM) i5-14400F (10 cores / 16 threads, 137.3 GB RAM), Windows 11 (10.0.26300), CPU-only, PyTorch 2.15.0+cpu.

| Metric | Measured | Target | Verdict |
| :--- | ---: | ---: | :--- |
| Model | whisper-small 243.5M parameters + LoRA 1.77M (0.73%) | — | the model the server runs |
| Disk | 978.5 MB (971.4 MB base + 7.1 MB adapter) | — | — |
| Memory added when the model loads (RSS) | 1,020.2 MB | — | — |
| Peak process memory | 1,747.1 MB | — | — |
| Latency per sentence | 1,751.7 ms mean (1,681.9 ms median, 1,583.7–2,423.6 ms range) | 280 ms | **MISS, 6.3× over** |
| Real-time factor | 0.299 | below 1.0 | processes faster than playback |

“Memory added” is resident memory after loading the model minus resident memory after imports; “peak” is the highest observed during the timed runs. Latency is wall time around `transcribe_audio`, including audio decode.
<!-- END:generated:readme-performance -->

**Where it stops:** mild dysarthric speech is transcribed correctly; moderate speech is partially usable; severe speech is not usable and is reported here as a known limit. The system runs on a CPU without a GPU, but it is not a real-time system. Full, honest scope in [LIMITS.md](LIMITS.md).

*Reference: University of Toronto TORGO Database (Rudzicz et al., 2012).*

---

## 📂 Repository Structure

```
Threws-Odyssey/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI microservice endpoints (/health, /api/v1/translate-audio)
│   │   └── inference.py         # Whisper-Small LoRA clinical acoustic inference engine
│   ├── requirements.txt         # Pinned production dependencies (FastAPI, PyTorch, Transformers, PEFT)
│   ├── evaluate_samples.py      # Runs the three demo clips through the live engine
│   └── test_server.py           # Automated TestClient verification suite (10/10 tests)
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Main 2-column accessible interface
│   │   │   └── layout.tsx       # Root layout & accessible typography
│   │   ├── components/
│   │   │   ├── TactileMicButton.tsx       # Large touch-target button with keyboard trigger
│   │   │   ├── TranscriptDisplay.tsx      # Live transcript, replay & Web Speech TTS playback
│   │   │   ├── QuickAssistGrid.tsx        # High-contrast AAC cards with 2-step confirmation
│   │   │   ├── AudioWaveformCanvas.tsx    # Live audio level visualizer
│   │   │   └── ClinicalBenchmarkDrawer.tsx# TORGO reference sample evaluation player
│   │   ├── hooks/
│   │   │   └── useAudioRecorder.ts        # Clean MediaRecorder & Web Audio RMS hook
│   │   └── lib/
│   │       └── transcriptionService.ts    # Frontend-to-backend API client
│   └── package.json
│
├── benchmarks/
│   ├── benchmark_product.py     # Measures the shipped model, writes facts.json
│   ├── render_docs.py           # Renders the benchmark blocks below from facts.json
│   ├── claims_check.py          # Fails if a document number disagrees with facts.json
│   ├── generate_figures.py      # 300 DPI publication chart generator
│   └── extract_torgo_audio.py   # TORGO parquet sample extraction script
│
├── assets/benchmarks/           # 300 DPI figures generated from facts.json (accuracy; latency/footprint)
│
├── docs/
│   ├── SYSTEM_WALKTHROUGH.md        # Complete end-to-end architecture & code tour
│   ├── EDGE_AI_BENCHMARK_RESULTS.md # Product benchmark + whisper-tiny INT8 side study
│   ├── COMPETITIVE_ANALYSIS.md      # Landscape analysis (Project Euphonia, Relate, Voiceitt)
│   ├── DATASETS_AND_PROOF.md        # University of Toronto TORGO dataset documentation
│   ├── DEMO.md                      # Five-minute judge walkthrough
│   └── archive/                     # Internal planning/audit ledgers, superseded, not judge-facing
│
├── model_training/
│   ├── VoiceBridge_Colab_Trainer.ipynb # Kaggle/Colab GPU LoRA fine-tuning notebook
│   ├── torgo_streaming_test.py         # Hugging Face TORGO streaming evaluation script
│   └── export_and_quantize_onnx.py     # Standalone ONNX export & INT8 quantization script
│
├── facts.json                       # Single source of truth for all verified numbers
├── LIMITS.md                        # What it cannot do, in plain language
├── LICENSE                          # MIT (code)
├── CHANGELOG.md                     # Dated engineering ledger, including corrections
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.12 (the version the benchmark was measured with)
- Node.js 18+ and npm

### 1. Start the Backend API

```bash
cd backend

# Create virtual environment (if not already created)
python -m venv .venv

# Activate virtual environment
# Windows:
.\.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend verification suite (10/10 tests)
python test_server.py

# Start the FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Backend will be available at: `http://127.0.0.1:8000` (Health check: `/health`).

### 2. Start the Frontend App

In a separate terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Verify the numbers

From the repository root, with the backend virtualenv active:

```bash
python benchmarks/claims_check.py
```

It fails if any benchmark figure in the docs no longer matches `facts.json`.

---

## ♿ Motor & Physical Accessibility Features

VoiceBridge was built specifically with physical accessibility considerations:
1. **Large Motor Targets:** The primary record button and AAC cards are at least 44x44 px, up to 112 px.
2. **Keyboard Assistive Hotkey:** Press <kbd>SPACE</kbd> to start or stop recording when no other control has focus.
3. **Accidental Press Protection:** Critical phrases (such as "Pain Alert") require a two-stage confirmation within a 3-second window to prevent unintended triggers caused by motor spasticity or tremors.
4. **Haptic & Visual Feedback:** Device vibration on mobile touch and a live waveform canvas confirm microphone responsiveness.
5. **Speech Synthesis:** Tap "Say it" to read out the reconstructed transcription through the browser's native text-to-speech engine.

---

## 👥 Engineering Team

**SIES Graduate School of Technology, Navi Mumbai**
- **Talha** — Lead System Architect & Frontend Engineering
- **Aaliya Hussain** — Machine Learning & Model Adaptation
- **Moulika Sanyal** — Edge AI Optimization & Quantization
- **Manas Suryawanshi** — Clinical Research & Documentation

---

## 📜 Dataset Attribution & License

- **Dataset:** University of Toronto TORGO Database for Dysarthric Articulation (Rudzicz, Namasivayam & Wolff, 2012). It is distributed under the Linguistic Data Consortium's user agreement. The three demo clips are TORGO recordings included for evaluation; redistribution may require LDC permission.
- **Code:** MIT — see [LICENSE](LICENSE).
- **Target Event:** THREWS Odyssey 2026.
- **Scope and limits:** [LIMITS.md](LIMITS.md).
