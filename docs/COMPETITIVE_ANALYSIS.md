# VoiceBridge: Assistive Speech Landscape & Differentiation Dossier
### THREWS Odyssey 2026 — Track: Human-AI & Assistive Technology
**Team:** Sleeper Cells (SIES Graduate School of Technology, Navi Mumbai)  
**Authors:** Manas Suryawanshi (Clinical Research & Pitch Lead), Talha (Lead System Architect), Aaliya Hussain (ML Lead), Moulika Sanyal (Edge AI Lead)  
**Repository:** [Nomad1331/Threws-Odyssey](https://github.com/Nomad1331/Threws-Odyssey)  

---

## 1. Executive Summary & Problem Scope

Automated Speech Recognition (ASR) foundation models achieve exceptional accuracy (<4% Word Error Rate) on fluent, normative speech. However, for individuals living with neuromotor speech disorders (dysarthria arising from Cerebral Palsy, ALS, Parkinson’s, or Traumatic Brain Injury), standard acoustic models collapse:

* **The Acoustic Failure Wall:** Zero-shot foundation models (such as `openai/whisper-tiny`) suffer catastrophic breakdown on moderate-to-severe dysarthria (measured at **82.2% Word Error Rate** on held-out TORGO clinical clips). Vowel formant centralization collapses vowel contrast toward a neutral schwa (`/ə/`), while attenuated stop-consonant burst releases are discarded as background noise.
* **The Research Reality:** Uncontrolled, real-world dysarthric speech across diverse speakers remains one of the hardest open problems in speech science. Even in controlled laboratory settings (such as the University of Toronto TORGO archive, recorded with head-mounted directional microphones), speaker-independent generalization is a steep hurdle.
* **VoiceBridge's Focus:** VoiceBridge does not claim to have solved dysarthria with 90%+ zero-shot accuracy. Rather, VoiceBridge presents an **open-source, parameter-efficient edge engineering baseline**:
  1. Low-Rank Adaptation (LoRA) exploring acoustic adaptation on compact foundation backbones (`whisper-tiny`, 39M parameters).
  2. Computational graph decomposition and **dynamic ONNX INT8 quantization** achieving a verified **74.42% storage reduction** (103.45 MB across 3 graphs) and **592.0 ms CPU inference** (Real-Time Factor 0.1013, 10× faster than real-time) on standard consumer laptop CPUs without GPU requirements.
  3. Physical accessibility engineering: a 160px tactile touch dial, DSP cosine boundary windowing to prevent transient hallucinations, and explicit user confirmation before vocalization.

---

## 2. The Assistive Speech Research Ecosystem

Unlike generic voice assistants, several dedicated academic and industry research initiatives focus specifically on atypical and impaired speech:

### 2.1 Existing Academic & Industry Initiatives

* **Project Euphonia (Google Research):**
  * *Focus:* Research initiative collecting thousands of hours of disordered speech from individuals with ALS, Cerebral Palsy, and stroke to train personalized speech models.
  * *Key Finding:* Confirmed that severe dysarthria exhibits extreme idiosyncratic speaker variance; personalized, speaker-dependent fine-tuning is required for high clinical intelligibility.
  * *Official Link:* [https://sites.research.google/euphonia/](https://sites.research.google/euphonia/)

* **Project Relate (Google):**
  * *Focus:* Android application enabling individuals with non-standard speech to record custom training phrases on their personal device to train a personalized acoustic model.
  * *Key Finding:* Provides customizable listening, repeating, and assistant modes for everyday communication.

* **The Speech Accessibility Project (SAP):**
  * *Focus:* Major research consortium led by the University of Illinois Urbana-Champaign (UIUC) alongside Google, Apple, Amazon, Microsoft, and the Davis Phinney Foundation.
  * *Key Finding:* Creating large-scale, de-identified datasets of impaired speech (Parkinson's, ALS, CP, Down syndrome) for researchers under licensed terms to address the scarcity of clinical training data.
  * *Official Link:* [https://speechaccessibilityproject.org/](https://speechaccessibilityproject.org/)

* **Voiceitt:**
  * *Focus:* Commercial assistive technology platform that maps non-standard, dysarthric speech to standard speech output using an individualized calibration phase.
  * *Official Link:* [https://www.voiceitt.com/](https://www.voiceitt.com/)

* **Listen for Atypical Speech (Apple):**
  * *Focus:* iOS accessibility feature utilizing on-device machine learning to recognize custom vocalizations and atypical speech patterns trained on user-specific voice recordings.
  * *Official Link:* [https://www.apple.com/accessibility/](https://www.apple.com/accessibility/)

---

## 3. Where VoiceBridge Fits

| Dimension | Proprietary Initiatives<br>*(Google Euphonia / Relate, Apple, Voiceitt)* | Unadapted Foundation Whisper<br>*(Base OpenAI Whisper-tiny)* | **VoiceBridge Prototype**<br>*(Ours: Whisper + LoRA + INT8)* |
| :--- | :--- | :--- | :--- |
| **System Approach** | Closed-source, personalized commercial apps | Open-weights general-purpose foundation model | **Open-source parameter-efficient edge prototype** |
| **Atypical Adaptation** | Extensive personalized training on user voice | Zero (Trained only on 680k hrs normative speech) | **Trained on TORGO clinical dysarthria archive** |
| **Baseline Severe WER** | Highly variable depending on user calibration | **82.2% (Collapses on severe dysarthria)** | **80.0% (Preliminary baseline on held-out severe speech)** |
| **Model Quantization** | Proprietary on-device / cloud engines | Uncompressed FP32 PyTorch (~404 MB ONNX / 151 MB PyTorch) | **Dynamic INT8 ONNX (103.45 MB total, 74.42% reduction)** |
| **Tested Hardware** | Device-specific (Pixel / iPhone / Cloud) | High-end CPU / GPU | **13th Gen Intel Core i5-1334U (x86_64 CPU with AVX2)** |
| **CPU Latency (~5.85s clip)** | Cloud or mobile neural engine dependent | ~638.1 ms (FP32 ONNX CPU) | **592.0 ms (INT8 ONNX CPU, RTF = 0.1013)** |
| **Software License** | Proprietary / Commercial Subscription | MIT License (Open-weights) | **MIT License (Open-source research prototype)** |

> [!NOTE]
> **Hardware Validation Clarification:** All benchmarks reported in this project were executed on an `x86_64` CPU (Intel Core i5-1334U with AVX2 support). VoiceBridge has **not** been tested on Raspberry Pi or ARM hardware, nor on Google Coral Edge TPU (which cannot execute Whisper architectures). Raspberry Pi deployment remains a theoretical hardware target for future work.

---

## 4. Context on Indian Languages & Regional ASR

Several high-quality Indian-language speech tools exist, notably **IndicWhisper** (developed by **AI4Bharat** at IIT Madras) and commercial platforms from emerging labs like **Sarvam AI**. 

* **Different Domains:** Indic speech models are optimized for fluent, fast-paced normative speech across diverse regional Indian languages and accents (Hindi, Tamil, Telugu, Marathi, etc.) in commercial, banking, and customer support workflows. They do not claim to evaluate or treat motor-speech disorders.
* **VoiceBridge Scope:** The current VoiceBridge prototype is evaluated exclusively on English clinical recordings from the University of Toronto TORGO archive. We have **not** evaluated Sarvam AI, IndicWhisper, or any Indian-language engine on dysarthric speech, and make no claims regarding their accuracy on atypical speech.
* **Future Research Vision:** Our interest in regional accessibility is a long-term goal: transferring the parameter-efficient LoRA and INT8 quantization methodology demonstrated here to Indic foundation models using phonetically annotated corpora (such as those from IIT Madras) to support motor-impaired individuals in Indian regional languages.

---

## 5. Verified Empirical Telemetry (Single Source of Truth)

All metrics below are drawn directly from the verified execution log recorded by Moulika on November 4, 2026 ([`docs/EDGE_AI_BENCHMARK_RESULTS.md`](./EDGE_AI_BENCHMARK_RESULTS.md)):

* **Host Hardware:** Intel(R) Core(TM) i5-1334U (10 cores, x86_64, AVX2)
* **Execution Provider:** ONNX Runtime `CPUExecutionProvider`
* **Storage Footprint:**
  * FP32 ONNX Baseline: **404.49 MB** (all 3 graphs) / 220.18 MB (Encoder + 1 Decoder)
  * INT8 Quantized Package: **103.45 MB** (all 3 graphs) / 57.12 MB (Encoder + 1 Decoder)
  * **Storage Reduction:** **74.42%** (Target: ~74% → **PASS**)
* **Inference Speed & Throughput:**
  * Average CPU Inference Latency (TORGO ~5.85s clips): **592.0 ms**
  * Real-Time Factor (RTF): **0.1013** (~10× faster than real-time playback)
* **Clinical Speech Evaluation (Held-Out Audio Clips):**
  * Clip 1 (`TORGO-M05`, Cerebral Palsy): Baseline FP32 WER **20.0%** → INT8 WER **40.0%**
  * Clip 2 (`TORGO-M04`, Post-Trauma TBI): Baseline FP32 WER **66.7%** → INT8 WER **100.0%**
  * Clip 3 (`TORGO-M02`, ALS): Baseline FP32 WER **160.0%** → INT8 WER **100.0%**
  * **Overall Mean WER:** FP32 Baseline **82.2%** → INT8 Quantized **80.0%**

---

## 6. Strategic Jury Defense: Handling Difficult Questions

| Juror Question | Verified Academic Answer |
| :--- | :--- |
| **"Why is your Word Error Rate 80% on held-out clips? Isn't that high?"** | *"Yes, 80% WER is high, and that is the honest scientific reality of severe dysarthria. Foundation Whisper collapses with 82.2% error, outputting total hallucinations on severe pauses. Research from Google Euphonia shows that speaker-independent dysarthric speech cannot be solved zero-shot; it requires personalized calibration. Our contribution is the **edge engineering pipeline**: we compressed the model by 74.4% and proved it can run in real-time on consumer CPUs (0.10 RTF), creating the baseline for edge-based personalization."* |
| **"Why did you compare with Sarvam AI earlier?"** | *"That was an early conceptual mistake in our drafts. Sarvam AI and AI4Bharat's IndicWhisper are excellent platforms for normative Indian languages, but they do not focus on clinical dysarthria, and our current evaluation is English-only on TORGO. We have removed that comparison. Our real comparative context is atypical speech research like Google Project Euphonia and the Speech Accessibility Project."* |
| **"Did you deploy this on a Raspberry Pi?"** | *"No. All benchmarks were run on a standard 13th Gen Intel Core i5 laptop CPU. Raspberry Pi and embedded ARM targets are part of our future roadmap once ARM-specific INT8 execution kernels are validated."* |
| **"TORGO was recorded in a sound booth with head-mounted mics. How will this work in the real world?"** | *"That is a critical clinical limitation. In the real world, ambient noise, microphone distance, and acoustic reverberation further degrade the signal. That is why we implemented universal 16kHz mono audio recording with a 40ms cosine window taper to suppress boundary transients, and why we designed the physical interface with a 160px tactile touch dial and mandatory confirmation before vocalization."* |
