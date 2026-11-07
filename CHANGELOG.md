# VoiceBridge: Engineering Changelog
### THREWS Odyssey 2026 — Master Project Ledger
**GitHub Repository:** [Nomad1331/Threws-Odyssey](https://github.com/Nomad1331/Threws-Odyssey)  
**Branch:** `voicebridge-clean`

All notable engineering changes, architectural milestones, and codebase updates for VoiceBridge are documented here.

---

## [2026-11-07] - v1.0.0: Architecture Refactoring & System Tour Documentation

* **Lead Engineers:** Talha (System Architect & Frontend Lead), Aaliya Hussain (ML Lead), Moulika Sanyal (Edge AI Lead), Manas Suryawanshi (Clinical Research Lead)
* **Key Achievements:**
  - Decoupled and simplified frontend architecture:
    * Created `frontend/src/hooks/useAudioRecorder.ts` separating microphone recording and Web Audio API volume analysis from page view.
    * Streamlined `frontend/src/app/page.tsx` into ~170 lines of clean React layout.
    * Streamlined `QuickAssistGrid.tsx` to 88 lines with 2-step confirmation window on Pain Alert.
    * Streamlined `ClinicalBenchmarkDrawer.tsx` to an authentic reference player.
    * Purged 221 lines of unused dead code (`frontend/src/lib/wavRecorder.ts`).
  - Minimalist Backend Runtime:
    * Standardized `backend/requirements.txt` to 4 essential packages (`fastapi`, `uvicorn`, `faster-whisper`, `python-multipart`).
    * Configured greedy INT8 Whisper CPU inference (409ms verified response on consumer hardware).
  - Comprehensive Documentation:
    * Created `docs/SYSTEM_WALKTHROUGH.md`: Complete end-to-end trace from microphone click to synthesized speech.
    * Aligned `README.md`, `ROADMAP.md`, and `docs/DATASETS_AND_PROOF.md` with verified `facts.json` single source of truth.
  - Production Build:
    * `npm run build` executed and passed with exit code 0 (zero TypeScript errors, zero ESLint warnings, 5 static pages optimized).

---

## [2026-11-05] - v0.4.0: Assistive Speech Competitive Dossier & Edge AI Reporting

* **Phase:** Phase 5 (Brick 17: Competitive Dossier & Brick 18: System Tour)
* **Lead Engineers:** Manas Suryawanshi (Clinical Research & Pitch Lead), Talha (System Architect)
* **Team:** Sleeper Cells (SIES GST)
* **Key Deliverables Completed:**
  - `docs/COMPETITIVE_ANALYSIS.md`: Assistive speech research ecosystem dossier contextualizing VoiceBridge within Google Project Euphonia, Project Relate, UIUC Speech Accessibility Project, and Voiceitt.
  - `docs/EDGE_AI_BENCHMARK_RESULTS.md`: Telemetry report detailing neuromotor dysarthric acoustic pathology, ONNX INT8 benchmarks (592.0ms latency, 0.1013 RTF, 74.42% storage cut).
  - Roadmap progress synchronized across documentation.

---

## [2026-11-04] - v0.3.0: Whisper ONNX INT8 Edge Quantization Pipeline (Brick 10)

* **Phase:** Phase 3 (Brick 10: ONNX INT8 Quantization, Edge Acceleration & Low-Latency Pipeline)
* **Lead Engineers:** Moulika Sanyal (Edge AI & Quantization Lead), Talha (System Architect)
* **Team:** Sleeper Cells (SIES GST)
* **Key Achievements & Benchmarks:**
  - Shrunk model size by **74.42%** (from 404.49 MB down to 103.45 MB total across 3 ONNX graphs).
  - Benchmarked CPU execution: **592.0 ms average latency** and **0.1013 RTF** on authentic TORGO clinical speech.
  - Formulated full benchmark telemetry report in `docs/EDGE_AI_BENCHMARK_RESULTS.md`.

---

## [2026-11-01] - v0.2.4: Authentic Clinical Audio Assets & 300 DPI Publication Benchmark Figures

* **Phase:** Phase 4 (Brick 15: Offline Audio Chip Matrix) & Phase 5 (Brick 16: Publication Figures)
* **Lead Engineers:** Manas Suryawanshi (Research & Pitch Lead), Talha (System Architect)
* **Team:** Sleeper Cells (SIES GST)
* **Assets Created & Integrated:**
  - `frontend/public/audio/`: Extracted 3 authentic dysarthric `.wav` recordings directly from University of Toronto TORGO dataset:
    1. `torgo_mild_sample.wav`: Patient TORGO-M05 (Cerebral Palsy, Mild) — *"We have an excellent team"*.
    2. `torgo_moderate_sample.wav`: Patient TORGO-M04 (Post-Trauma TBI, Moderate) — *"Their house is grey and white"*.
    3. `torgo_severe_sample.wav`: Patient TORGO-M02 (ALS, Severe) — *"The job provides many benefits"*.
  - `frontend/src/components/ClinicalBenchmarkDrawer.tsx`: Embedded reference audio player allowing judges and users to listen to authentic patient acoustic recordings alongside ground-truth text.
  - `assets/benchmarks/`: Generated publication-ready 300 DPI figures:
    1. `figure1_wer_comparison.png`: Word Error Rate across clinical severity tiers on TORGO.
    2. `figure2_formant_centralization.png`: Acoustic vowel formant space ($F_1$ vs. $F_2$) demonstrating corner vowel quadrilateral collapse toward neutral schwa `/ə/`.
    3. `figure3_latency_vs_footprint.png`: CPU inference latency vs. memory working set comparing FP32 baseline against VoiceBridge INT8 (592ms latency, 103MB footprint).

---

## [2026-11-01] - v0.2.2: FastAPI Backend Microservice & CPU Whisper ASR Pipeline

* **Phase:** Phase 3 (Bricks 8 – 10) / Brick 9 (FastAPI Microservice Core & Ingestion Gateway)
* **Lead Engineer:** Talha (Lead System Architect)
* **Team:** Sleeper Cells (SIES GST)
* **Files Created & Configured:**
  - `backend/`: Dedicated Python microservice environment with isolated virtual environment (`backend/.venv`).
  - `backend/requirements.txt`: Specified production dependencies (`fastapi`, `uvicorn[standard]`, `faster-whisper`, `python-multipart`).
  - `backend/app/main.py`: Built production asynchronous FastAPI server featuring CORS, lifespan pre-warming, health check, and `/api/v1/translate-audio` endpoint.
  - `backend/app/inference.py`: CPU-optimized Whisper INT8 inference engine with greedy decoding.

---

## [2026-10-31] - v0.2.0: Accessible Frontend Architecture & Clinical Design System

* **Phase:** Phase 4 (Bricks 11 – 15) / Phase F1 & F2 (Production Accessible Web App & Audio UX)
* **Lead Engineer:** Talha (Lead System Architect & Frontend Lead)
* **Team:** Sleeper Cells (SIES GST)
* **Key Achievements:**
  - `frontend/`: Initialized Next.js App Router project with TypeScript, Tailwind CSS, ESLint, and `lucide-react`.
  - Implemented high-contrast, WCAG 2.1 AAA accessible UI with large motor hit targets.
  - Integrated live HTML5 Canvas waveform visualizer, spacebar keyboard shortcut, and browser native speech synthesis ("Say it").

---

## [2026-10-30] - v0.1.0: Workspace Inception & Scientific Verification

* **Phase:** Phase 1 (Baseline Analysis)
* **Team:** Sleeper Cells (SIES GST)
* **Key Achievements:**
  - Initiated VoiceBridge under the **THREWS Odyssey 2026** Human-AI & Assistive Technology track.
  - Verified streaming access for University of Toronto TORGO dataset (`abnerh/TORGO-database`) on Hugging Face Hub.
  - Created core documentation suite and initial exploratory training scripts.
