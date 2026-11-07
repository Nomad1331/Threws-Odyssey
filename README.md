# 🎙️ VoiceBridge
### Real-Time Assistive Speech Transcription for Dysarthric Speech
> **THREWS Odyssey 2026** — *Track: Human-AI & Assistive Technology*  
> **Institution:** SIES Graduate School of Technology, Navi Mumbai  
> **Branch:** `voicebridge-clean`

---

## 📌 Problem & Motivation

Commercial automatic speech recognition (ASR) foundation models achieve high accuracy on normative speech. However, for individuals with **dysarthria**—neuromotor speech impairments caused by Cerebral Palsy (CP), Amyotrophic Lateral Sclerosis (ALS), or Traumatic Brain Injury (TBI)—standard speech recognition collapses, frequently producing **65% to 80% Word Error Rates (WER)**.

Current commercial solutions also face accessibility hurdles:
- **Cloud Dependency:** Many assistive tools require cloud streaming, posing privacy concerns and failing in offline environments.
- **Hardware Barrier:** Running large speech models locally typically demands expensive, power-hungry discrete GPUs.
- **Physical Usability:** Standard voice apps lack physical accommodations for users with accompanying motor spasticity or tremors.

**VoiceBridge** addresses these challenges through a lightweight, CPU-optimized transcription pipeline coupled with an accessible assistive interface.

---

## 🏛️ System Architecture

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
   [ faster-whisper INT8 CPU Engine ]
     • Model: Whisper tiny.en (INT8)
     • Device: Local CPU (no GPU needed)
     • VAD & pause compensation
                  │
                  ▼  (JSON Response)
   [ Next.js Accessible Frontend (:3000) ]
     • Instant Transcription Display
     • Text-to-Speech playback ("Say it")
     • AAC Quick-Assist confirmation cards
```

---

## 📊 Verified Edge AI Benchmarks

All metrics benchmarked on consumer laptop hardware (Intel Core i5 CPU, no GPU acceleration):

| Metric | Baseline (FP32) | VoiceBridge (INT8 CPU) | Improvement |
| :--- | :---: | :---: | :---: |
| **Model Size** | 151.7 MB | **38.9 MB** | **74.42% reduction** |
| **Active Memory Footprint** | ~380 MB | **103 MB** | **72.9% reduction** |
| **CPU Processing Latency** | 1,480 ms | **592 ms** | **2.50x faster** |
| **Real-Time Factor (RTF)** | 0.25 | **0.10** | **Real-time capable** |
| **Hardware Requirement** | GPU / Heavy CPU | **Standard Multi-Core CPU** | **Zero GPU required** |

*Reference: University of Toronto TORGO Database (Rudzicz et al., 2012).*

---

## 📂 Repository Structure

```
Threws-Odyssey/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI microservice endpoints (/health, /api/v1/translate-audio)
│   │   └── inference.py         # faster-whisper INT8 CPU transcription engine
│   └── requirements.txt         # Minimal, production dependencies (FastAPI, faster-whisper)
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Main 2-column accessible interface
│   │   │   └── layout.tsx       # Root layout & WCAG typography
│   │   ├── components/
│   │   │   ├── TactileMicButton.tsx       # Large touch-target button with spacebar trigger
│   │   │   ├── TranscriptDisplay.tsx      # Real-time text display & Web Speech TTS playback
│   │   │   ├── QuickAssistGrid.tsx        # High-contrast AAC cards with 2-step confirmation
│   │   │   ├── AudioWaveformCanvas.tsx    # Live 60FPS audio level visualizer
│   │   │   └── ClinicalBenchmarkDrawer.tsx# TORGO reference sample evaluation player
│   │   ├── hooks/
│   │   │   └── useAudioRecorder.ts        # Clean MediaRecorder & Web Audio RMS hook
│   │   └── lib/
│   │       └── transcriptionService.ts    # Frontend-to-backend API client
│   └── package.json
│
├── docs/
│   ├── EDGE_AI_BENCHMARK_RESULTS.md # Detailed CPU quantization telemetry and memory benchmarks
│   ├── COMPETITIVE_ANALYSIS.md      # Landscape analysis (Project Euphonia, Relate, Voiceitt)
│   └── DATASETS_AND_PROOF.md        # University of Toronto TORGO dataset documentation
│
├── model_training/
│   ├── torgo_streaming_test.py      # Hugging Face TORGO streaming evaluation script
│   └── export_and_quantize_onnx.py  # Standalone ONNX export & INT8 quantization script
│
├── facts.json                       # Single source of truth for all verified numbers
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
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

---

## ♿ Motor & Physical Accessibility Features

VoiceBridge was built specifically with physical accessibility considerations:
1. **Large Motor Targets:** The primary record button and AAC cards meet WCAG 2.1 AAA touch target recommendations (minimum 44x44px, up to 112px).
2. **Keyboard Assistive Hotkey:** Tap <kbd>SPACE</kbd> anywhere on the page to start or stop recording.
3. **Accidental Press Protection:** Critical phrases (such as "Pain Alert") require either a 1.5-second hold or a two-stage confirmation within a 3-second window.
4. **Haptic & Visual Feedback:** Device vibration on mobile touch and a live 60 FPS waveform canvas confirm microphone responsiveness.
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

- **Dataset:** University of Toronto TORGO Database for Dysarthric Articulation (*Frank Rudzicz, A. Roeck, E. Wang, 2012*).
- **Target Event:** THREWS Odyssey 2026.
- **License:** Open source under the MIT License.
