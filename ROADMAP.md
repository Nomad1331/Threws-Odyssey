# VoiceBridge: Brick-by-Brick Engineering Roadmap
## Real-Time Dysarthric Speech Reconstruction Engine — THREWS Odyssey 2026
**Team:** Sleeper Cells (SIES GST)  
**Lead System Architect & Frontend Lead:** Talha (1st Year EXTC)  
**Machine Learning & Model Adaptation Lead:** Aaliya Hussain (3rd Year EXTC/CS)  
**Clinical Research, System Docs & Pitch Lead:** Manas Suryawanshi (3rd Year ECS)  
**Edge AI Optimization, ONNX Quantization & Pitch Co-Lead:** Moulika Sanyal (2nd Year CE, SIES GST)  
**Track:** Human-AI & Assistive Technology (Unstop ID: 1766434)  
**Strict Submission Deadline:** November 7, 2026 (11:59 PM IST)  
**GitHub Repository:** [Nomad1331/Threws-Odyssey](https://github.com/Nomad1331/Threws-Odyssey)

---

## 🗺️ Master Execution Overview

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Baseline Forensic Analysis & Dataset Streaming (Bricks 1 – 3) [DONE ✅] │
│ • HF Dataset Streaming • Zero-Shot Baseline Whisper WER • Failure Mode Taxonomy  │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Acoustic Adaptation & LoRA Fine-Tuning (Bricks 4 – 7) [DONE ✅]         │
│ • PEFT Injection (r=16, a=32) • Patient-Disjoint Split • Kaggle GPU Training • Eval│
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Low-Latency Inference API Pipeline (Bricks 8 – 10) [DONE ✅]             │
│ • FastAPI Asynchronous Gateway • ONNX INT8 Quantization                           │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: Production Accessible Web App & Audio UX (Bricks 11 – 15) [DONE ✅]     │
│ • Next.js 14 App Shell • 16kHz Web Audio Resampler • Live FFT • Dual TTS • Chips │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: Scientific Benchmarking, Figures & Documentation (Bricks 16 – 18) [ACTIVE]
│ • 300 DPI Matplotlib Charts [DONE] • Assistive Competitive Dossier • System Tour│
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 6: Submission Packaging, Demo Video & Final Filing (Bricks 19 – 21) [FINAL]│
│ • GitHub Polish & CI/CD • 2-Min Live Walkthrough Video • Unstop Submission Filing│
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Baseline Forensic Analysis & Dataset Streaming (Oct 31)

### [x] Brick 1: Kaggle GPU Environment & TORGO Streaming Setup (COMPLETED)
* **Core Objective:** Establish zero-overhead streaming of the University of Toronto TORGO dataset directly into GPU memory without downloading the full 40+ GB raw archive to disk.
* **Accomplished:**
  - Configured Hugging Face dataset streaming on `abnerh/TORGO-database`.
  - Implemented dynamic audio normalization casting all incoming speech to **16,000 Hz Mono Float32**.
  - Built Log-Mel spectrogram feature extraction via `WhisperFeatureExtractor`.
  - Created [`model_training/VoiceBridge_Trainer.ipynb`](file:///I:/Career/Threws%20Hackathon/model_training/VoiceBridge_Trainer.ipynb) and [`model_training/torgo_streaming_test.py`](file:///I:/Career/Threws%20Hackathon/model_training/torgo_streaming_test.py). Fine-tuning notebook: Whisper-small (pending results). Served model: Whisper-tiny.
* **Lead:** Aaliya Hussain (ML) / Talha (Pipeline Review)
* **Status:** Verified live with zero-copy tensor extraction.

---

### [x] Brick 2: Zero-Shot Baseline Whisper Forensic Benchmark (WER/CER) (COMPLETED)
* **Core Objective:** Establish empirical proof of the "70% Failure Wall" where commercial speech foundation models completely collapse on dysarthric speech.
* **Accomplished:**
  - Benchmarked unmodified `openai/whisper-tiny` (39M parameters).
  - Evaluated clinical speech from Cerebral Palsy (CP) and Amyotrophic Lateral Sclerosis (ALS) speakers.
  - Confirmed that standard foundation Whisper achieves an unacceptable **65%–82% WER** on dysarthric audio.
* **Lead:** Aaliya Hussain (ML) / Manas Suryawanshi (Metrics Logging)
* **Status:** Documented and verified as the core clinical problem statement.

---

### [x] Brick 3: Healthy Control Comparison & Failure Mode Taxonomy (COMPLETED)
* **Core Objective:** Mathematically prove that the speech recognition failure is purely caused by neuromotor acoustic distortion and categorize the specific speech breakdown patterns.
* **Accomplished:**
  - Benchmarked matched healthy control speakers, verifying healthy speech scores **<5% WER**, confirming the massive ~70% dysarthric gap.
  - Codified the clinical failure taxonomy in [`docs/DATASETS_AND_PROOF.md`](file:///I:/Career/Threws%20Hackathon/docs/DATASETS_AND_PROOF.md):
    1. *Vowel Formant Centralization:* Resonances ($F_1/F_2$) collapse toward neutral schwa `/ə/`.
    2. *Consonant Transient Attenuation:* Stop consonants ($p, b, t, d, k, g$) lose sharp burst releases and are classified as silence.
    3. *Prosodic Pausing:* Involuntary spastic pauses misinterpreted as sentence termination.
* **Lead:** Manas Suryawanshi (Clinical Research) / Aaliya Hussain (ML)
* **Status:** Completed and integrated into the clinical defense dossier.

---

## Phase 2: Acoustic Adaptation & LoRA Fine-Tuning (Nov 1 – 2)

### [x] Brick 4: Parameter-Efficient Fine-Tuning (PEFT) Injection Architecture (COMPLETED)
* **Core Objective:** Design and inject Low-Rank Adaptation (LoRA) matrices into Whisper attention in the encoder and decoder, freezing 99.6% of base weights to prevent catastrophic forgetting.
* **Accomplished:**
  - Configured `peft.LoraConfig` targeting Query (`q_proj`) and Value (`v_proj`) attention projection layers.
  - Hyperparameters locked: $r = 16$, $\alpha = 32$, dropout = $0.05$, bias = `"none"`.
  - Trainable parameters restricted to **~0.4% (~1.5 MB)** of total model weights, enabling lightweight edge distribution.
* **Lead:** Aaliya Hussain (ML)
* **Status:** Verified and serialized in model config.

---

### [x] Brick 5: Speaker-Disjoint Patient Validation Split & Data Collator (COMPLETED)
* **Core Objective:** Prevent "speaker memorization" and guarantee clinical generalization by strictly separating training and evaluation patients.
* **Accomplished:**
  - Separated TORGO speakers into patient-disjoint folds (training on `[F01, F03, M01, M02]`, validating on held-out unseen speakers `[F04, M04]`).
  - Configured dynamic padding for Log-Mel spectrogram inputs and label token sequences with `-100` masking on padding tokens.
* **Lead:** Aaliya Hussain (ML) / Talha (Code Review)
* **Status:** Validated zero-leakage patient-disjoint validation.

---

### [x] Brick 6: LoRA Training Execution & Checkpoint Export (COMPLETED)
* **Core Objective:** Train the LoRA adapter layers and serialize the final lightweight adapter weights to Hugging Face Hub.
* **Accomplished:**
  - Executed training loop with FP16 precision, linear warmup, and cosine learning rate decay.
  - Successfully exported trained adapter weights to Hugging Face Hub under [`Aaliya05/voicebridge`](https://huggingface.co/Aaliya05/voicebridge).
  - Standalone checkpoint verified under 2 MB.
* **Lead:** Aaliya Hussain (ML)
* **Status:** Model weights live and accessible via Hugging Face Hub.

---

### [x] Brick 7: Held-Out Adaptation Evaluation & Scientific Telemetry (COMPLETED)
* **Core Objective:** Evaluate acoustic model behavior across held-out, unseen clinical speakers.
* **Accomplished:**
  - Evaluated `openai/whisper-tiny` on held-out TORGO clinical clips across Mild, Moderate, and Severe subjects.
  - Confirmed empirical findings consistent with Google Euphonia: zero-shot foundation models collapse on severe dysarthria (82.2% baseline WER), and speaker-independent generalization across unseen atypical speech requires on-device personalization.
  - Established the Edge AI baseline: proved that quantized INT8 Whisper runs at 0.10 RTF on consumer CPUs, enabling local edge personalization.
* **Lead:** Aaliya Hussain (ML) / Manas Suryawanshi (Analysis)
* **Status:** Empirical baseline documented in `docs/EDGE_AI_BENCHMARK_RESULTS.md`.

---

## Phase 3: Low-Latency Inference API Pipeline (Nov 3 – 4)

## Not implemented: VAD and pause-specific behavior
### [ ] Brick 8: Dysarthria-Tuned Voice Activity Detection (VAD) (NOT IMPLEMENTED)
* **Core Objective:** Not implemented.
* **Accomplished:**
  - Not implemented.
* **Lead:** Talha (Backend Architecture) / Aaliya Hussain (audio pause handling)
* **Status:** Not implemented.

---

### [x] Brick 9: FastAPI Microservice Core & Audio Ingestion Gateway (COMPLETED)
* **Core Objective:** Build a production-grade, asynchronous FastAPI backend microservice capable of ingesting raw client audio and handling multi-format uploads.
* **Accomplished:**
  - Built [`backend/app/main.py`](file:///I:/Career/Threws%20Hackathon/backend/app/main.py) with CORS middleware configured for Next.js frontend origin.
  - Implemented `POST /api/v1/translate-audio` route accepting multipart audio (`.wav`, `.webm`, `.ogg`).
  - Implemented `GET /health` system diagnostics route reporting service status and model engine.
  - Integrated CPU-optimized INT8 Whisper inference engine in [`backend/app/inference.py`](file:///I:/Career/Threws%20Hackathon/backend/app/inference.py).
* **Lead:** Talha (Full-Stack Backend)
* **Status:** Fully functional and verified live on port 8000.

---

### [x] Brick 10: ONNX INT8 Quantization, Edge Acceleration & Low-Latency Pipeline (COMPLETED)
* **Core Objective:** Quantize the Whisper model to ONNX INT8 for resource-constrained edge execution and benchmark CPU latency and memory footprint.
* **Accomplished:**
  - Merged `Aaliya05/voicebridge` LoRA weights permanently into `openai/whisper-tiny` base graph.
  - Exported computation graphs (`encoder_model`, `decoder_model`, `decoder_with_past_model`) via Optimum ONNX.
  - Applied dynamic INT8 quantization across all components, achieving **74.42% storage reduction** (103.45 MB 3-graph bundle; 57.12 MB unique weights).
  - Benchmarked CPU performance: **Real-Time Factor (RTF) = 0.1013 (~10× faster than real-time)**, processing 1 second of speech in ~100 ms on consumer CPUs.
  - Pushed turnkey script [`model_training/export_and_quantize_onnx.py`](file:///I:/Career/Threws%20Hackathon/model_training/export_and_quantize_onnx.py) and comprehensive telemetry report [`docs/EDGE_AI_BENCHMARK_RESULTS.md`](file:///I:/Career/Threws%20Hackathon/docs/EDGE_AI_BENCHMARK_RESULTS.md) to branch `moulika/voicebridge-onnx-int8`.
* **Lead:** Moulika Sanyal (Edge AI & ONNX Quantization) / Talha (Pipeline Review)
* **Status:** Validated on CPU hardware with verified graphs and benchmark reports.

---

## Phase 4: Production Accessible Web App & Audio UX (Nov 4)

### [x] Brick 11: Next.js 14 Accessible App Shell & Interface (COMPLETED)
* **Core Objective:** Scaffold the production Next.js 14 client application adhering strictly to WCAG 2.1 AAA physical motor accessibility standards.
* **Accomplished:**
  - Built Next.js 14 App Router application in [`frontend/`](file:///I:/Career/Threws%20Hackathon/frontend/) with TypeScript and Tailwind CSS.
  - Implemented clean high-contrast assistive styling with custom CSS tokens.
  - Designed large circular microphone button ([`frontend/src/components/TactileMicButton.tsx`](file:///I:/Career/Threws%20Hackathon/frontend/src/components/TactileMicButton.tsx)) meeting WCAG AAA minimum 44px hit-target recommendations (112px diameter).
  - Keyboard navigation: Global Spacebar toggle for recording.
  - Single-viewport layout with zero deep menus ([`frontend/src/app/page.tsx`](file:///I:/Career/Threws%20Hackathon/frontend/src/app/page.tsx)).
* **Lead:** Talha (Frontend Lead)
* **Status:** Passed `npm run build` with zero TypeScript errors and zero ESLint warnings.

---

### [x] Brick 12: Web Audio API 16kHz PCM Streaming & Resampling Engine (COMPLETED)
* **Core Objective:** Capture real-time microphone input directly from the browser, downsampling it to 16kHz mono PCM client-side to minimize network payload.
* **Accomplished:**
  - Implemented browser audio capture via `navigator.mediaDevices.getUserMedia({ audio: true })`.
  - Resampled native 44.1kHz/48kHz browser streams to **16,000 Hz 1-channel mono**.
  - Packaged recorded buffers into binary Blobs for immediate HTTP multipart transmission.
* **Lead:** Talha (Frontend Lead)
* **Status:** Verified live browser microphone recording and downsampling.

---

### [x] Brick 13: Live Waveform Canvas Visualizer (COMPLETED)
* **Core Objective:** Provide immediate, kinetic visual confirmation to dysarthric users that their vocalizations are being captured by the microphone.
* **Accomplished:**
  - Created [`frontend/src/components/AudioWaveformCanvas.tsx`](file:///I:/Career/Threws%20Hackathon/frontend/src/components/AudioWaveformCanvas.tsx) utilizing HTML5 `<canvas>`.
  - Connected Web Audio `AnalyserNode` with `fftSize = 256`.
  - Implemented 60 FPS multi-harmonic animated wave during active listening and resting baseline when idle.
* **Lead:** Talha (Frontend Lead)
* **Status:** 60 FPS canvas visualizer with zero main-thread lag.

---

### [x] Brick 14: Dual-Channel Output: Visual Transcription & On-Demand Speech Synthesis (COMPLETED)
* **Core Objective:** Close the communication loop by displaying reconstructed text and vocalizing it aloud on demand.
* **Accomplished:**
  - Created [`frontend/src/components/TranscriptDisplay.tsx`](file:///I:/Career/Threws%20Hackathon/frontend/src/components/TranscriptDisplay.tsx) with high-legibility display.
  - Integrated client-side Text-to-Speech (TTS) via Web Speech API (`window.speechSynthesis`) invoked on-demand via "Say it".
  - Added latency telemetry badge, confidence indicator, and quick-assist emergency tap cards ([`frontend/src/components/QuickAssistGrid.tsx`](file:///I:/Career/Threws%20Hackathon/frontend/src/components/QuickAssistGrid.tsx)).
* **Lead:** Talha (Frontend Lead)
* **Status:** End-to-end speech-to-display-to-audio loop verified.

---

### [x] Brick 15: Fail-Safe Offline University Audio Chip Matrix (COMPLETED)
* **Core Objective:** Guarantee 100% demo resilience during live judge defense even in zero-WiFi or bad-microphone conditions.
* **Accomplished:**
  - Embedded 3 authentic TORGO clinical audio recordings in [`frontend/public/audio/`](file:///I:/Career/Threws%20Hackathon/frontend/public/audio/):
    1. `torgo_mild_sample.wav`: TORGO-M05 (Cerebral Palsy, Mild) — *"We have an excellent team"*
    2. `torgo_moderate_sample.wav`: TORGO-M04 (Post-Trauma TBI, Moderate) — *"Their house is grey and white"*
    3. `torgo_severe_sample.wav`: TORGO-M02 (ALS, Severe) — *"The job provides many benefits"*
  - Created interactive evaluation drawer ([`frontend/src/components/ClinicalBenchmarkDrawer.tsx`](file:///I:/Career/Threws%20Hackathon/frontend/src/components/ClinicalBenchmarkDrawer.tsx)) allowing judges to listen to authentic raw patient audio alongside ground-truth text.
* **Lead:** Talha (UI) / Manas Suryawanshi (Clinical Audio Curation)
* **Status:** Interactive drawer integrated into main landing page.

---

## Phase 5: Scientific Benchmarking, Figures & Documentation (Nov 5 – 6)

### [x] Brick 16: Publication-Grade Scientific Figures & Comparison Plots (COMPLETED)
* **Core Objective:** Generate high-resolution, 300 DPI comparative scientific figures demonstrating VoiceBridge's statistical superiority over commercial models.
* **Accomplished:**
  - Created [`benchmarks/generate_figures.py`](file:///I:/Career/Threws%20Hackathon/benchmarks/generate_figures.py) with clinical slate styling.
  - Exported 3 publication-ready 300 DPI figures to [`assets/benchmarks/`](file:///I:/Career/Threws%20Hackathon/assets/benchmarks/):
    1. `figure1_wer_comparison.png`: Word Error Rate comparison across clinical severity tiers showing foundation failure on moderate and severe dysarthria.
    2. `figure2_formant_centralization.png`: Acoustic vowel formant space ($F_1$ vs. $F_2$) demonstrating corner vowel quadrilateral collapse toward neutral schwa `/ə/`.
    3. `figure3_latency_vs_footprint.png`: CPU inference latency vs. memory working set comparing FP32 baseline against VoiceBridge INT8 on CPU (592ms, 103MB footprint, 74.4% size cut).
* **Lead:** Manas Suryawanshi (Lead) / Talha (Export Pipeline)
* **Status:** 300 DPI publication plots generated and stored.

---

### [x] Brick 17: Competitive Differentiation Dossier & Defense Matrix (COMPLETED)
* **Core Objective:** Formalize comprehensive competitive differentiation analysis evaluating VoiceBridge within the assistive speech research ecosystem (Google Project Euphonia, Project Relate, UIUC SAP, Voiceitt).
* **Accomplished:**
  - Authored [`docs/COMPETITIVE_ANALYSIS.md`](file:///I:/Career/Threws%20Hackathon/docs/COMPETITIVE_ANALYSIS.md) covering:
    - *Big Tech & Research Labs:* Google Euphonia, Google Project Relate, UIUC Speech Accessibility Project, and Voiceitt.
    - *Atypical Speech Realities:* Ground-truth analysis of speaker-independent dysarthric speech challenges and why personalization is required for severe cases.
    - *VoiceBridge Contribution:* Open-source, parameter-efficient edge baseline executing on consumer CPUs with a 74.4% storage cut, 103MB RAM, and WCAG AAA physical motor accessibility.
* **Lead:** Manas Suryawanshi (Lead) / Talha (Technical Input)
* **Status:** Completed and verified in documentation suite.

---

### [x] Brick 18: System Architecture & End-to-End Walkthrough (COMPLETED)
* **Core Objective:** Compile a formal, transparent architectural walkthrough that demystifies every component and data flow across the system.
* **Accomplished:**
  - Authored [`docs/SYSTEM_WALKTHROUGH.md`](file:///I:/Career/Threws%20Hackathon/docs/SYSTEM_WALKTHROUGH.md) providing:
    1. *End-to-End Execution Trace:* 6-step lifecycle from microphone press to browser text-to-speech.
    2. *File-by-File Blueprint:* Clear inventory and responsibilities of every backend and frontend file.
    3. *Design Trade-offs:* Technical explanations for faster-whisper INT8 CPU inference and motor accessibility features.
    4. *Developer Sanity Checklist:* 60-second commands to verify health, transcription, and production builds.
    5. *Edge AI Quantization Profile:* INT8 dynamic quantization achieving a 74.42% size reduction and 0.10 RTF.
    6. *Future Multilingual Roadmap:* Extending edge speech adaptation techniques to regional Indic languages.
* **Assigned Lead:** Manas Suryawanshi (Writing) / Talha (Architecture) / Moulika Sanyal (Edge Data)
* **Target Date:** November 5 – 6, 2026

---

## Phase 6: Submission Packaging, Demo Video & Final Filing (Nov 6 – 7)

### [ ] Brick 19: GitHub Repository Hygiene, CI/CD & Deployment
* **Core Objective:** Ensure the public repository meets elite open-source standards with active commits, clean licensing, and automated live deployment.
* **Concrete Implementation Tasks:**
  - Verify clean directory structure across `frontend/`, `backend/`, `model_training/`, `benchmarks/`, `assets/`, `docs/`.
  - Deploy frontend to Vercel with public HTTPS URL.
  - Deploy backend to Render/Fly.io or configure high-reliability bridge.
  - Confirm zero exposed API secrets or sensitive paths in git history.
* **Assigned Lead:** Talha (DevOps & Repo Polish)
* **Target Date:** November 6, 2026

---

### [ ] Brick 20: 2-Minute High-Impact Demo Video Production
* **Core Objective:** Produce a crisp, professional 2-minute video walkthrough proving the problem, demonstrating the working solution, and showing the clinical data.
* **Concrete Implementation Tasks:**
  - Record screencast and voiceover following the exact storyboard:
    - **0:00 – 0:30 (The Pain Point):** Play real TORGO dysarthric audio clip $\rightarrow$ feed into standard Whisper $\rightarrow$ show it outputting complete gibberish.
    - **0:30 – 1:15 (The VoiceBridge Solution):** Play exact same clip through VoiceBridge $\rightarrow$ show real-time translation $\rightarrow$ show audio synthesized aloud via TTS.
    - **1:15 – 1:45 (Technical Architecture):** Highlight Edge AI INT8 CPU optimization (74.4% size cut, 103MB footprint, 592ms latency at 0.10 RTF), foundation model failure analysis on TORGO, and WCAG AAA physical accessibility.
    - **1:45 – 2:00 (Human Impact & Future Vision):** Clinical utility for TBI/CP/ALS individuals and future Indic language roadmap.
  - Edit, export in 1080p MP4, and upload unlisted link.
* **Assigned Lead:** Manas Suryawanshi (Script) / Talha (Video Assembly & Screen Capture) / Moulika Sanyal (Edge Co-Presenter)
* **Target Date:** November 7, 2026

---

### [ ] Brick 21: Final Unstop Filing & 4-Person Panel Viva Rehearsal
* **Core Objective:** Complete formal submission on Unstop before the deadline and conduct team viva rehearsals across our 4-person specialist panel.
* **Concrete Implementation Tasks:**
  - Submit all deliverables on Unstop portal (`https://unstop.com/hackathons/threws-odyssey-2026-threws-the-research-world-1766434`):
    - [x] Project Title: **VoiceBridge**
    - [x] Tagline: Real-Time Dysarthric Speech Reconstruction Engine
    - [x] Track: Human-AI & Assistive Technology
    - [ ] Live GitHub Repository Link
    - [ ] Working Web Application Deployment Link
    - [ ] 2-Minute Demonstration Video Walkthrough Link
    - [ ] Research Paper & Architecture Documentation PDF
  - **4-Person Specialist Panel Rehearsal (~2.5m Total Pitch):**
    1. *Manas Suryawanshi (45s):* Clinical Problem & Dysarthric Foundation Model Failure Wall.
    2. *Aaliya Hussain (45s):* Machine Learning, TORGO Streaming & Parameter-Efficient Exploration.
    3. *Moulika Sanyal (45s):* Edge AI Optimization, INT8 Quantization & CPU Hardware Benchmarking (592ms, 103MB RAM, 74.4% size cut).
    4. *Talha (35s):* System Architecture & Live Accessible Web Demonstration Anchor.
  - Log final completion entry into `CHANGELOG.md`.
* **Assigned Lead:** Whole Team (Talha, Aaliya Hussain, Manas Suryawanshi, Moulika Sanyal)
* **Target Date:** November 7, 2026 (Prior to 11:59 PM IST)

---

## 📊 Live Progress Tracker

| Brick | Title | Target Date | Lead | Status |
| :---: | :--- | :---: | :---: | :---: |
| **01** | Kaggle GPU & TORGO HF Streaming Setup | Oct 31 | Aaliya / Talha | **COMPLETED** ✅ |
| **02** | Zero-Shot Baseline Whisper Benchmark (WER/CER) | Oct 31 | Aaliya / Manas | **COMPLETED** ✅ |
| **03** | Healthy Control Comparison & Failure Taxonomy | Oct 31 | Manas / Aaliya | **COMPLETED** ✅ |
| **04** | PEFT / LoRA Attention Injection ($r=16, \alpha=32$) | Nov 01 | Aaliya | **COMPLETED** ✅ |
| **05** | Speaker-Disjoint Patient Validation Split | Nov 01 | Aaliya / Talha | **COMPLETED** ✅ |
| **06** | LoRA Training Loop & Checkpoint Export | Nov 02 | Aaliya | **COMPLETED** ✅ |
| **07** | Held-Out Test Evaluation & Scorecard Generation | Nov 02 | Aaliya / Manas | **COMPLETED** ✅ |
| **08** | Dysarthria-Tuned audio pause handling | Nov 03 | Talha / Aaliya | **NOT IMPLEMENTED** |
| **09** | FastAPI Microservice Core & Ingestion Gateway | Nov 03 | Talha | **COMPLETED** ✅ |
| **10** | ONNX INT8 Quantization, Edge Acceleration & Low-Latency Pipeline | Nov 04 | Moulika / Talha | **COMPLETED** ✅ |
| **11** | Next.js 14 App Shell & WCAG AAA Dark UI | Nov 04 | Talha | **COMPLETED** ✅ |
| **12** | Web Audio API 16kHz PCM Downsampler Engine | Nov 04 | Talha | **COMPLETED** ✅ |
| **13** | Live 64-Band FFT Waveform Canvas Visualizer | Nov 04 | Talha | **COMPLETED** ✅ |
| **14** | Visual Transcription Display & Auto-TTS Engine | Nov 04 | Talha | **COMPLETED** ✅ |
| **15** | Fail-Safe Offline University Audio Chip Matrix | Nov 04 | Talha / Manas | **COMPLETED** ✅ |
| **16** | 300 DPI Publication Benchmark Figures Export | Nov 04 | Manas / Talha | **COMPLETED** ✅ |
| **17** | Assistive Speech Competitive Dossier | Nov 05 | Manas / Talha | **COMPLETED** ✅ |
| **18** | End-to-End System Walkthrough & Code Tour | Nov 05 | Talha / Manas | **COMPLETED** ✅ |
| **19** | GitHub Repository Hygiene & Live Deployment | Nov 06 | Talha | UP NEXT ⏳ |
| **20** | 2-Minute High-Impact Demo Video Production | Nov 07 | Manas / Talha / Moulika | PENDING |
| **21** | Final Unstop Filing & 4-Person Panel Viva Rehearsal | Nov 07 | Whole Team | PENDING |
