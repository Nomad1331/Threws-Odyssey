# VoiceBridge: Engineering Changelog
### THREWS Odyssey 2026 — Master Project Ledger
**Primary Directory:** `I:\Career\Threws Hackathon\`  
**Master Repository:** `I:\Career\`  

All notable engineering changes, architectural milestones, and codebase updates for VoiceBridge are documented here.

---

## [2026-10-31] - v0.1.2: Team Roster Finalization & Technical Specializations

### Added & Realigned
* **Team Roster:** Codified 4-member multidisciplinary engineering squad ("Sleeper Cells"):
  * **Talha Shaikh:** Lead System Architect, Next.js 14 Web App & Full-Stack Integration.
  * **Aaliya Hussain:** Machine Learning Engineer & Acoustic Model Adaptation (Whisper + LoRA).
  * **Moulika Sanyal:** Edge AI Optimization, ONNX INT8 Quantization & CPU Hardware Benchmarking.
  * **Manas Suryawanshi:** Clinical Research, Regulatory Documentation & Slide Deck Lead.
* **Edge AI Layer (`ROADMAP.md` - Brick 10):** Architected the ONNX INT8 quantization pipeline to compress fine-tuned Whisper-tiny (~150MB down to ~40MB) and target sub-300ms CPU latency.
* **Jury Defense Protocol (`docs/PROJECT_CONTEXT.md` - Section 7):** Codified 4-way technical presentation roster for the live jury evaluation (Manas: Clinical Problem; Aaliya: LoRA Fine-Tuning; Moulika: Edge ONNX Benchmarks; Talha: Architecture & Live Demo Anchor).

---

## [2026-10-31] - v0.1.1: 21-Brick Engineering Roadmap Formulation

### Added
* **Engineering Roadmap (`ROADMAP.md`):** Decomposed project into 6 Phases and 21 discrete, verifiable Bricks spanning baseline evaluation through final Unstop submission.
* **Progress Tracking:** Integrated live 21-brick status matrix with explicit task ownership, deliverables, and acceptance criteria.

---

## [2026-10-30] - v0.1.0: Workspace Inception & Scientific Verification

### Added
* **Project Initiation:** Locked target into **THREWS Odyssey 2026** under the **Human-AI & Assistive Technology** track.
* **Scientific Verification:** Verified streaming endpoint for University of Toronto TORGO dataset (`abnerh/TORGO-database`) on Hugging Face Hub.
* **Documentation Suite:** Created core documentation (`ROADMAP.md`, `docs/PROJECT_CONTEXT.md`, `docs/DATASETS_AND_PROOF.md`).
* **Starter Assets:**
  * `model_training/VoiceBridge_Colab_Trainer.ipynb`: GPU-accelerated Google Colab training notebook for Whisper-tiny LoRA fine-tuning.
  * `model_training/torgo_streaming_test.py`: Python streaming test script.
