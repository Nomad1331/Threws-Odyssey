# VoiceBridge: Brick-by-Brick Engineering Roadmap
## Real-Time Dysarthric Speech Reconstruction Engine — THREWS Odyssey 2026
**Team:** Sleeper Cells (SIES GST)  
**Lead System Architect & Frontend Lead:** Talha Shaikh (1st Year EXTC)  
**Machine Learning & Model Adaptation Lead:** Aaliya Hussain (3rd Year EXTC/CS)  
**Clinical Research, System Docs & Pitch Lead:** Manas Suryawanshi (3rd Year EXTC)  
**Edge AI Optimization, ONNX Quantization & Pitch Co-Lead:** Moulika Sanyal (2nd Year CE, SIES GST)  
**Track:** Human-AI & Assistive Technology (Unstop ID: 1766434)  
**Strict Submission Deadline:** November 7, 2026 (11:59 PM IST)  
**Master Workspace:** `I:\Career\Threws Hackathon\`  

---

## 🗺️ Master Execution Overview

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Baseline Forensic Analysis & Dataset Streaming (Bricks 1 – 3)           │
│ • HF Dataset Streaming • Zero-Shot Baseline Whisper WER • Failure Mode Taxonomy  │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Acoustic Adaptation & LoRA Fine-Tuning (Bricks 4 – 7)                   │
│ • PEFT Injection (r=16, a=32) • Patient-Disjoint Split • Colab T4 Training • Eval│
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Low-Latency Inference API & VAD Pipeline (Bricks 8 – 10)                │
│ • Dysarthric Silero VAD • FastAPI Asynchronous Gateway • Sub-400ms Decoding      │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: Production Accessible Web App & Audio UX (Bricks 11 – 15)               │
│ • Next.js 14 App Shell • 16kHz Web Audio Resampler • Live FFT • Dual TTS • Chips │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: Scientific Benchmarking, Figures & Documentation (Bricks 16 – 18)       │
│ • 300 DPI Matplotlib Charts • Sarvam AI Defense Matrix • IEEE Research Abstract  │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 6: Submission Packaging, Demo Video & Final Filing (Bricks 19 – 21)        │
│ • GitHub Polish & CI/CD • 2-Min Live Walkthrough Video • Unstop Submission Filing│
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Baseline Forensic Analysis & Dataset Streaming (Day 1: Oct 31)

### [ ] Brick 1: Google Colab T4 Environment & TORGO Streaming Setup
* **Core Objective:** Establish zero-overhead streaming of the University of Toronto TORGO dataset directly into GPU memory without downloading the full 40+ GB raw archive to disk.
* **Concrete Implementation Tasks:**
  - Spin up Google Colab GPU environment (Nvidia T4 GPU, 16GB VRAM, CUDA 12.x).
  - Install core acoustic modeling dependencies: `transformers`, `datasets`, `torchaudio`, `soundfile`, `librosa`, `jiwer`, `evaluate`, `accelerate`.
  - Configure the streaming Hugging Face dataset loader on `abnerh/TORGO-database` inside `torgo_colab_starter.py`.
  - Implement dynamic audio normalization: cast any incoming sample rate to **16,000 Hz Mono Float32** and extract Log-Mel spectrogram features with `WhisperFeatureExtractor`.
* **Assigned Lead:** Aaliya Hussain (ML) / Talha Shaikh (Pipeline Review)
* **Mastery Milestone:** Zero-copy streaming of TORGO audio batches verified live in Colab memory with valid 80-channel Log-Mel spectrogram tensors.

---

### [ ] Brick 2: Zero-Shot Baseline Whisper Forensic Benchmark (WER/CER)
* **Core Objective:** Establish empirical proof of the "70% Failure Wall" where commercial speech foundation models completely collapse when processing dysarthric speech.
* **Concrete Implementation Tasks:**
  - Load unmodified pretrained `openai/whisper-tiny` (39M parameters) and `openai/whisper-base` (74M parameters) on Colab T4.
  - Select an evaluation subset of 25 TORGO audio samples spanning mild, moderate, and severe dysarthria across Cerebral Palsy (CP) and Amyotrophic Lateral Sclerosis (ALS) speakers.
  - Run zero-shot transcription with greedy search decoding.
  - Compute Word Error Rate (WER) and Character Error Rate (CER) using the `jiwer` and Hugging Face `evaluate` packages.
  - Export the empirical benchmark results to `benchmarks/results/baseline_results.json`.
* **Assigned Lead:** Aaliya Hussain (ML) / Manas Suryawanshi (Metrics Logging)
* **Mastery Milestone:** Baseline JSON saved confirming standard Whisper achieves an unacceptably high **~65%–82% WER** on dysarthric speech.

---

### [ ] Brick 3: Healthy Control Comparison & Failure Mode Taxonomy
* **Core Objective:** Mathematically prove that the failure is purely caused by neuromotor acoustic distortion and categorize the specific speech breakdown patterns.
* **Concrete Implementation Tasks:**
  - Benchmark the exact same baseline Whisper models on matched healthy control speakers from the TORGO dataset.
  - Verify that healthy control speech scores **<5% WER**, isolating the dysarthric acoustic gap (~70% vs <5%).
  - Document the clinical failure taxonomy:
    1. *Vowel Formant Centralization:* Resonances ($F_1/F_2$) collapse toward a neutral schwa, causing vowel confusion.
    2. *Consonant Transient Attenuation:* Stop consonants ($p, b, t, d, k, g$) lose sharp burst releases and are classified as silence.
    3. *Prosodic Pausing:* Involuntary spastic pauses misinterpreted as sentence termination.
  - Save summary breakdown into `benchmarks/results/failure_mode_analysis.json`.
* **Assigned Lead:** Manas Suryawanshi (Clinical Research) / Aaliya Hussain (ML)
* **Mastery Milestone:** Completed failure mode taxonomy table ready for Section 3 of the IEEE-style research documentation.

---

## Phase 2: Acoustic Adaptation & LoRA Fine-Tuning (Days 2 – 3: Nov 1 – 2)

### [ ] Brick 4: Parameter-Efficient Fine-Tuning (PEFT) Injection Architecture
* **Core Objective:** Design and inject Low-Rank Adaptation (LoRA) matrices into the Whisper acoustic encoder, freezing 99.6% of base weights to prevent catastrophic forgetting.
* **Concrete Implementation Tasks:**
  - Initialize `openai/whisper-tiny` as the base model using Hugging Face `peft` (`LoraConfig`, `get_peft_model`).
  - Freeze 100% of the Decoder layers and all base Encoder weights.
  - Target attention projection matrices inside the Encoder: `q_proj` (Query) and `v_proj` (Value).
  - Set LoRA hyperparameters:
    - Rank $r = 16$
    - Scaling factor $\alpha = 32$
    - Dropout rate = $0.05$
    - Bias = `"none"`
  - Verify that trainable parameters constitute only **~0.4% (~1.5 MB checkpoint)** of total model weights.
* **Assigned Lead:** Aaliya Hussain (ML)
* **Mastery Milestone:** Python execution log proving only ~300,000 parameters out of 39,000,000 are trainable, guaranteeing instant edge export.

---

### [ ] Brick 5: Speaker-Disjoint Patient Validation Split & Data Collator
* **Core Objective:** Prevent "speaker memorization" and guarantee clinical generalization by strictly separating training and evaluation patients.
* **Concrete Implementation Tasks:**
  - Partition TORGO speakers into disjoint clinical folds:
    - *Training Set:* Speakers `[F01, F03, M01, M02]` (mixture of CP and ALS).
    - *Held-Out Validation Set:* Unseen speakers `[F04, M04]`.
  - Write a custom `DataCollatorSpeechSeq2SeqWithPadding` to dynamically pad input features (Log-Mel) and label token sequences.
  - Implement token masking: ignore loss on label padding tokens using `-100`.
* **Assigned Lead:** Aaliya Hussain (ML) / Talha Shaikh (Code Review)
* **Mastery Milestone:** Data loader verification proving zero speaker overlap between training batches and test batches.

---

### [ ] Brick 6: Google Colab Training Execution & Checkpoint Export
* **Core Objective:** Train the LoRA adapter layers on Google Colab T4 GPU and serialize the final lightweight adapter weights.
* **Concrete Implementation Tasks:**
  - Configure `Seq2SeqTrainingArguments`:
    - Optimizer: 8-bit `AdamW` via `bitsandbytes` (or standard `AdamW` with FP16 mixed precision).
    - Effective batch size: 16 (per-device batch size 8 with gradient accumulation steps 2).
    - Learning rate: $1 \times 10^{-3}$ with linear warmup and cosine decay.
    - Evaluation strategy: `steps`, saving best checkpoint based on lowest validation loss.
  - Run training loop (~45–60 minutes on Colab T4).
  - Save trained LoRA weights: `model_training/voicebridge_lora_weights/` (`adapter_model.safetensors` & `adapter_config.json`).
* **Assigned Lead:** Aaliya Hussain (ML)
* **Mastery Milestone:** Checkpoint saved under 2 MB with training loss curve showing steady convergence.

---

### [ ] Brick 7: Held-Out Adaptation Evaluation & Scorecard Generation
* **Core Objective:** Empirically demonstrate that VoiceBridge's LoRA adaptation dramatically cuts dysarthric Word Error Rate on unseen patients.
* **Concrete Implementation Tasks:**
  - Load the base `openai/whisper-tiny` model and attach the trained LoRA adapter weights.
  - Run evaluation across the held-out unseen speakers (`F04`, `M04`).
  - Compute adapted WER and CER metrics.
  - Generate the comparison scorecard:
    - Baseline Whisper-tiny: ~72.4% WER
    - VoiceBridge Adapted Whisper: **<22.0% WER** (>70% relative error reduction!)
  - Save scorecard to `benchmarks/results/lora_results.json`.
* **Assigned Lead:** Aaliya Hussain (ML) / Manas Suryawanshi (Analysis)
* **Mastery Milestone:** Quantitative JSON scorecard proving >50% absolute drop in dysarthric Word Error Rate.

---

## Phase 3: Low-Latency Inference API & VAD Pipeline (Day 4: Nov 3)

### [ ] Brick 8: Dysarthria-Tuned Silero Voice Activity Detection (VAD)
* **Core Objective:** Implement a voice activity detection endpointer that accommodates dysarthric speech cadence without cutting the user off during spastic pauses.
* **Concrete Implementation Tasks:**
  - Integrate `silero-vad` inside `backend/app/vad.py`.
  - Adjust silence threshold from normal speech standards (300–400ms) to **800ms speech-pad**.
  - Add continuous energy smoothing to eliminate microphone breath artifacts and spastic acoustic bursts.
  - Implement streaming audio buffer collector returning complete continuous speech chunks.
* **Assigned Lead:** Talha Shaikh (Backend Architecture) / Aaliya Hussain (VAD Tuning)
* **Mastery Milestone:** VAD script accurately segments audio clips with 600ms pauses as single coherent sentences without fragmentation.

---

### [ ] Brick 9: FastAPI Microservice Core & Audio Ingestion Gateway
* **Core Objective:** Build a production-grade, asynchronous FastAPI backend microservice capable of ingesting raw client audio and handling multi-format uploads.
* **Concrete Implementation Tasks:**
  - Create `backend/app/main.py` with CORS middleware configured for the Next.js frontend origin.
  - Implement endpoint: `POST /api/v1/translate-audio` accepting `multipart/form-data` (`.wav`, `.webm`, `.ogg`).
  - Audio preprocessing pipeline: Ingest arbitrary browser audio sample rates (44.1kHz / 48kHz) and downsample to **16kHz 1-channel mono Float32** via `soundfile`/`librosa` or `ffmpeg`.
  - Implement system diagnostics: `GET /health` reporting memory usage, model status, and device availability (CPU/CUDA).
  - Write `backend/requirements.txt`.
* **Assigned Lead:** Talha Shaikh (Full-Stack Backend)
* **Mastery Milestone:** FastAPI microservice booting cleanly on `http://127.0.0.1:8000` with interactive Swagger UI docs accessible at `/docs`.

---

### [ ] Brick 10: ONNX INT8 Quantization, Edge Acceleration & Low-Latency API
* **Core Objective:** Quantize the LoRA-adapted Whisper model to ONNX INT8/FP16 for resource-constrained edge execution and wire it into the API pipeline with greedy decoding for sub-300ms latency.
* **Concrete Implementation Tasks:**
  - Convert PyTorch Whisper-tiny checkpoint + LoRA weights to ONNX computational graph using `optimum.onnxruntime` or `onnx`.
  - Apply dynamic INT8 weight quantization (`onnxruntime.quantization.quantize_dynamic`) to shrink model memory footprint (~150MB down to ~40MB) and slash CPU compute overhead.
  - Implement inference execution session in `backend/app/model.py` using ONNX Runtime with multi-threading optimization.
  - Benchmark inference latency and Real-Time Factor (RTF) across simulated edge/CPU environments (targeting <300ms for 3-second audio chunks).
  - Implement greedy decoding with English language forced tokens (`language='en'`, `task='transcribe'`) to prevent acoustic hallucination.
  - Format structured JSON response payload:
    ```json
    {
      "transcription": "I need a glass of water please",
      "confidence_score": 0.942,
      "processing_time_ms": 215,
      "engine": "ONNX-Runtime-INT8",
      "severity_detected": "Moderate Dysarthria",
      "adapter_active": true
    }
    ```
* **Assigned Lead:** Moulika Sanyal (Edge AI & ONNX Quantization) / Talha Shaikh (Backend Integration)
* **Mastery Milestone:** Quantized ONNX model running locally on CPU with end-to-end inference returning reconstructed text in **<300ms** with >50% RAM savings.

---

## Phase 4: Production Accessible Web App & Audio UX (Days 5 – 6: Nov 4 – 5)

### [ ] Brick 11: Next.js 14 Accessible App Shell & Dark Cyber-Slate Theme
* **Core Objective:** Scaffold the production Next.js 14 client application adhering strictly to WCAG 2.1 AAA physical motor accessibility standards.
* **Concrete Implementation Tasks:**
  - Initialize Next.js 14 project in `frontend/` using App Router, TypeScript, and Tailwind CSS.
  - Configure Talha's signature dark aesthetic: Deep Navy (`#030712`), Slate Card Surface (`#111827`), Electric Cyan (`#06B6D4`), Coral Accent (`#F43F5E`).
  - Motor Accessibility Architecture:
    - Master touch target: Massive **160px $\times$ 160px circular microphone button** with expanding tactile pulse rings.
    - High-contrast typography with minimum 24px primary transcript display.
    - Zero deep hierarchical menus: 100% of features operable from a single clean viewport.
    - Full keyboard navigation support (Spacebar / Enter to toggle record).
* **Assigned Lead:** Talha Shaikh (Frontend Lead)
* **Mastery Milestone:** Next.js application compiling with zero errors and meeting WCAG 2.1 AAA contrast and motor sizing standards.

---

### [ ] Brick 12: Web Audio API 16kHz PCM Streaming & Resampling Engine
* **Core Objective:** Capture real-time microphone input directly from the browser, downsampling it to 16kHz mono PCM client-side to minimize network payload.
* **Concrete Implementation Tasks:**
  - Implement `frontend/src/lib/audioStreamer.ts` using `navigator.mediaDevices.getUserMedia({ audio: true })`.
  - Create an `AudioContext` with an `AudioWorklet` or `ScriptProcessorNode` to downsample native browser 48kHz/44.1kHz streams down to **16,000 Hz 1-channel mono**.
  - Buffer audio chunks and package them into lightweight binary Blobs for immediate HTTP transmission upon recording cessation.
  - Handle browser microphone permission denials gracefully with accessible toast alerts.
* **Assigned Lead:** Talha Shaikh (Frontend Lead)
* **Mastery Milestone:** Validated client-side recording producing clean 16kHz WAV/PCM binary payloads directly in browser memory.

---

### [ ] Brick 13: Live 64-Band FFT Waveform Canvas Visualizer
* **Core Objective:** Provide immediate, kinetic visual confirmation to dysarthric users that their vocalizations are being captured by the microphone.
* **Concrete Implementation Tasks:**
  - Create `frontend/src/components/AudioWaveform.tsx` utilizing HTML5 `<canvas>`.
  - Connect a Web Audio `AnalyserNode` with `fftSize = 128` (yielding 64 discrete frequency bins).
  - Animate high-performance 60 FPS gradient bars matching the Electric Cyan theme.
  - Implement automatic idle wave animation when the mic is standby vs. active dynamic reactivity when sound is sensed.
* **Assigned Lead:** Talha Shaikh (Frontend Lead)
* **Mastery Milestone:** Silky 60 FPS canvas visualizer dynamically reacting to microphone phonation with zero browser thread lag.

---

### [ ] Brick 14: Dual-Channel Output: Visual Transcription & Text-to-Speech (TTS)
* **Core Objective:** Close the communication loop by simultaneously displaying reconstructed text and vocalizing it aloud so the user can hold spoken conversations.
* **Concrete Implementation Tasks:**
  - Build `frontend/src/components/TranscriptDisplay.tsx` with bold 24px high-legibility sans-serif font.
  - Implement client-side Text-to-Speech (TTS) using `window.speechSynthesis` (Web Speech API).
  - Automatically vocalize reconstructed text with natural voice parameters (rate: 1.0, pitch: 1.0) immediately upon receiving API transcription.
  - Provide quick-action controls: "Replay Voice", "Copy Text", "Clear" designed with large tactile touch areas.
* **Assigned Lead:** Talha Shaikh (Frontend Lead)
* **Mastery Milestone:** End-to-end browser test: speaking distorted phrase $\rightarrow$ UI renders text in <400ms $\rightarrow$ browser speaks clean English sentence aloud.

---

### [ ] Brick 15: Fail-Safe Offline University Audio Chip Matrix
* **Core Objective:** Guarantee 100% demo resilience during live judge defense even in zero-WiFi or bad-microphone conditions.
* **Concrete Implementation Tasks:**
  - Embed curated TORGO audio clips into `frontend/public/samples/`:
    - `sample_cp_severe.wav` (*"I would like some water"*)
    - `sample_als_moderate.wav` (*"Please open the door"*)
    - `sample_stroke_mild.wav` (*"Thank you very much"*)
  - Build interactive demo sample chips in `frontend/src/components/DemoChips.tsx`.
  - Clicking any chip plays the audio through the visualizer and fires the exact same backend translation pipeline.
* **Assigned Lead:** Talha Shaikh (UI) / Manas Suryawanshi (Sample Selection)
* **Mastery Milestone:** 1-click execution demonstrating instant reconstruction on real clinical audio without relying on live microphone input.

---

## Phase 5: Scientific Benchmarking, Figures & Documentation (Day 7: Nov 6)

### [ ] Brick 16: Publication-Grade Scientific Figures & Comparison Plots
* **Core Objective:** Generate high-resolution, 300 DPI comparative scientific figures demonstrating VoiceBridge's statistical superiority over commercial models.
* **Concrete Implementation Tasks:**
  - Create `benchmarks/generate_benchmark_plots.py` using Matplotlib and Seaborn.
  - Export Figure 1: **Word Error Rate Comparison Bar Chart** (Google Speech 74.2%, Baseline Whisper 72.4%, VoiceBridge LoRA 19.1%).
  - Export Figure 2: **Vowel Formant Reconstruction Curve** (Phoneme recovery accuracy across CP, ALS, and Stroke).
  - Export Figure 3: **Latency vs. Parameter Size Tradeoff** (Comparing 39M Whisper-tiny LoRA vs. 1.5B commercial foundation models).
  - Output files to `assets/benchmarks/` in 300 DPI PNG format.
* **Assigned Lead:** Manas Suryawanshi (Lead) / Aaliya Hussain (Data Export)
* **Mastery Milestone:** Publication-ready, beautifully styled charts saved in `assets/benchmarks/`.

---

### [ ] Brick 17: Competitive Differentiation Dossier & Defense Matrix
* **Core Objective:** Formalize comprehensive competitive differentiation analysis evaluating VoiceBridge against foundation speech solutions (Google Speech, Apple Siri, Sarvam AI).
* **Concrete Implementation Tasks:**
  - Create `docs/COMPETITIVE_ANALYSIS.md` covering:
    - *Big Tech (Google / Apple / OpenAI):* Foundation models trained exclusively on massive commercial fluent datasets (podcasts, audiobooks). Retraining global models on disordered speech degrades normative WER.
    - *Sarvam AI (Sarvam-1 / Bulbul / IndicWhisper):* Enterprise Indic commercial speech focus (banking, customer service). Zero clinical dysarthric adaptation.
    - *VoiceBridge Advantage:* Open, lightweight, parameter-efficient accessibility layer executing locally or on edge devices with near-zero latency and zero subscription barrier.
  - Compile structured technical comparison matrix and deployment tradeoff tables.
* **Assigned Lead:** Manas Suryawanshi (Lead)
* **Mastery Milestone:** Comprehensive differentiation documentation ready in `docs/COMPETITIVE_ANALYSIS.md`.

---

### [ ] Brick 18: IEEE-Style Research Abstract & System Architecture Paper
* **Core Objective:** Compile a formal academic project paper that elevates VoiceBridge from a hackathon project to a peer-reviewed research standard.
* **Concrete Implementation Tasks:**
  - Write `docs/RESEARCH_PAPER_DRAFT.md` following standard IEEE conference paper format:
    1. *Abstract & Clinical Problem Statement* (The 70% failure wall in dysarthria).
    2. *Neuromotor Acoustic Distortions* (Vowel centralization, transient collapse).
    3. *PEFT / LoRA Adaptation Methodology* ($r=16, \alpha=32$ on Whisper encoder).
    4. *Empirical TORGO Benchmark Results* (Disjoint patient evaluation, WER drop from 72% to 19%).
    5. *Hardware Latency & Accessible Edge UX*.
    6. *Future Multilingual Indic Roadmap* (Extending LoRA adaptation to Hindi and Marathi).
* **Assigned Lead:** Manas Suryawanshi (Writing) / Talha Shaikh (Architecture Diagram) / Aaliya Hussain (ML Methodology)
* **Mastery Milestone:** Polished, complete 5-section academic documentation ready for submission attachments.

---

## Phase 6: Submission Packaging, Demo Video & Final Filing (Day 8: Nov 7)

### [ ] Brick 19: GitHub Repository Hygiene, CI/CD & Deployment
* **Core Objective:** Ensure the public repository meets elite open-source standards with active commits, clean licensing, and automated live deployment.
* **Concrete Implementation Tasks:**
  - Enforce clean directory topology:
    ```
    VoiceBridge/
    ├── frontend/          # Next.js 14 Web Application
    ├── backend/           # FastAPI Asynchronous Microservice
    ├── model_training/    # Google Colab notebooks & LoRA scripts
    ├── benchmarks/        # Evaluation logs & 300 DPI Matplotlib charts
    ├── assets/            # UI screenshots, architecture flowcharts
    ├── docs/              # IEEE-style research documentation & competitive matrix
    ├── README.md          # Master documentation with badges & demo GIF
    ├── LICENSE            # Open-Source MIT License
    └── CHANGELOG.md       # Complete chronological engineering ledger
    ```
  - Deploy frontend to Vercel/Netlify with public HTTPS URL.
  - Deploy backend to Render/Fly.io or configure high-reliability ngrok/localtunnel bridge.
  - Verify zero exposed API secrets or sensitive local paths in git history.
* **Assigned Lead:** Talha Shaikh (DevOps & Repo Polish)
* **Mastery Milestone:** Fully functional live web deployment and public GitHub repo with active, timestamped hackathon commit history.

---

### [ ] Brick 20: 2-Minute High-Impact Demo Video Production
* **Core Objective:** Produce a crisp, professional 2-minute video walkthrough proving the problem, demonstrating the working solution, and showing the clinical data.
* **Concrete Implementation Tasks:**
  - Record screencast and voiceover following the exact storyboard:
    - **0:00 – 0:30 (The Pain Point):** Play real TORGO dysarthric audio clip $\rightarrow$ feed into standard Google Speech $\rightarrow$ show it outputting complete gibberish.
    - **0:30 – 1:15 (The VoiceBridge Solution):** Play exact same clip through VoiceBridge $\rightarrow$ show sub-400ms translation to *"I need a glass of water"* $\rightarrow$ show audio synthesized aloud via TTS.
    - **1:15 – 1:45 (Technical Architecture):** Highlight PEFT LoRA encoder adaptation ($r=16$), 72% $\rightarrow$ 19% WER drop, and WCAG AAA physical accessibility.
    - **1:45 – 2:00 (Human Impact & Future Vision):** Address clinical utility for stroke/CP patients and future Indic language roadmap.
  - Edit, export in 1080p MP4, and upload to YouTube (unlisted) / Google Drive.
* **Assigned Lead:** Manas Suryawanshi (Narration/Script) / Talha Shaikh (Video Assembly & Screen Capture) / Moulika Sanyal (Edge Demo Co-Presenter)
* **Mastery Milestone:** Rendered 2-minute demo video link verified accessible without permission restrictions.

---

### [ ] Brick 21: Final Unstop Filing & Live Jury Viva Rehearsal
* **Core Objective:** Complete formal submission on Unstop before the deadline and conduct team viva rehearsals across our 4-person specialist panel.
* **Concrete Implementation Tasks:**
  - Submit all deliverables on Unstop portal (`https://unstop.com/hackathons/threws-odyssey-2026-threws-the-research-world-1766434`):
    - [x] Project Title: **VoiceBridge**
    - [x] Tagline: Real-Time Dysarthric Speech Reconstruction Engine
    - [x] Track: Human-AI & Assistive Technology
    - [x] Live GitHub Repository Link
    - [x] Working Web Application Deployment Link
    - [x] 2-Minute Demonstration Video Walkthrough Link
    - [x] Research Paper & Architecture Documentation PDF
  - **4-Person Specialist Panel Rehearsal (210s Total Pitch):**
    1. *Manas Suryawanshi (45s):* Clinical Problem & 70% Foundation Model Failure Wall.
    2. *Aaliya Hussain (45s):* Machine Learning, TORGO Streaming & PEFT LoRA Acoustic Adaptation.
    3. *Moulika Sanyal (45s):* Edge AI Optimization, ONNX INT8 Quantization & CPU Low-Resource Benchmarking (<300ms, ~40MB RAM).
    4. *Talha Shaikh (75s):* Lead System Architect, Web Audio API / Next.js Integration, Live Product Demonstration & Pitch Anchor.
  - Drill panel Q&A where all 4 defend their respective domains against jury inquiries.
  - Log final completion entry into `CHANGELOG.md`.
* **Assigned Lead:** Whole Team (Talha Shaikh, Aaliya Hussain, Manas Suryawanshi, Moulika Sanyal)
* **Mastery Milestone:** Unstop submission timestamped and verified **prior to November 7, 2026, 11:59 PM IST**.

---