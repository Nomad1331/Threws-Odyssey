# VoiceBridge: Assistive Speech Landscape & Differentiation Dossier
### THREWS Odyssey 2026 — Track: Human-AI & Assistive Technology
**Team:** Sleeper Cells (SIES Graduate School of Technology, Navi Mumbai)  
**Authors:** Manas Suryawanshi (Clinical Research & Pitch Lead), Talha (Lead System Architect), Aaliya Hussain (ML Lead), Moulika Sanyal (Edge AI Lead)  
**Repository:** [Nomad1331/Threws-Odyssey](https://github.com/Nomad1331/Threws-Odyssey)  

---

## 1. Executive Summary & Problem Scope

Automated Speech Recognition (ASR) foundation models achieve exceptional accuracy (<4% Word Error Rate) on fluent, normative speech. However, for individuals living with neuromotor speech disorders (dysarthria arising from Cerebral Palsy, ALS, Parkinson’s, or Traumatic Brain Injury), standard acoustic models collapse:

* **The Acoustic Failure Wall:** Zero-shot foundation models (such as `openai/whisper-tiny`) break down on moderate-to-severe dysarthria. Vowel formant centralization collapses vowel contrast toward a neutral schwa (`/ə/`), while attenuated stop-consonant burst releases are discarded as background noise.
* **The Research Reality:** Uncontrolled, real-world dysarthric speech across diverse speakers remains one of the hardest open problems in speech science. Even in controlled laboratory settings (such as the University of Toronto TORGO archive, recorded with head-mounted directional microphones), speaker-independent generalization is a steep hurdle.
* **VoiceBridge's Focus:** VoiceBridge does not claim to have magically solved severe dysarthria zero-shot across unseen speakers without calibration. Rather, VoiceBridge presents an **open-source, parameter-efficient edge engineering architecture**:
  1. Parameter-Efficient Fine-Tuning: Low-Rank Adaptation (LoRA, $r=16, \alpha=32$) on `whisper-small` (243.5M parameters) to recover collapsed phoneme contrasts without catastrophic forgetting.
  2. Edge Quantization Feasibility: a **separate side study** quantized `whisper-tiny` to dynamic INT8 ONNX and measured footprint and latency. The shipped product does **not** use that path; it runs `whisper-small` + LoRA in PyTorch, and its measured latency, memory and accuracy are in §5. The tiny study is labelled historical in [`EDGE_AI_BENCHMARK_RESULTS.md`](./EDGE_AI_BENCHMARK_RESULTS.md).
  3. Physical accessibility engineering: a large tactile touch button (at least 44x44 px), a keyboard shortcut that yields to focused controls, live visual waveform feedback, and explicit two-stage confirmation before vocalizing urgent phrases.

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

| Dimension | Proprietary Initiatives<br>*(Google Euphonia / Relate, Apple, Voiceitt)* | Unadapted Foundation Whisper<br>*(Base OpenAI Whisper FP32/INT8)* | **VoiceBridge Architecture**<br>*(Ours: Whisper + LoRA Adapter)* |
| :--- | :--- | :--- | :--- |
| **System Approach** | Closed-source, personalized commercial apps | Open-weights general-purpose foundation model | **Open-source parameter-efficient assistive pipeline** |
| **Atypical Adaptation** | Extensive personalized training on user voice | Zero (Trained only on 680k hrs normative speech) | **Trained on TORGO clinical dysarthria archive (r=16, a=32)** |
| **Baseline Severe WER** | Highly variable depending on user calibration | Collapses into hallucination loops on severe speech | **Measured per severity in `facts.json`: mild correct, moderate partial, severe fails** |
| **Model Quantization** | Proprietary on-device / cloud engines | Untouched FP32 weights | **No quantization shipped — FP32 PyTorch** |
| **Tested Hardware** | Device-specific (Pixel / iPhone / Cloud) | High-end CPU / GPU | **CPU-only x86_64 (see §5)** |
| **CPU Latency (~5.85s clip)** | Cloud or mobile neural engine dependent | Varies by model size | **Measured in §5** |
| **Software License** | Proprietary / Commercial Subscription | MIT License (Open-weights) | **MIT License (Open-source research prototype)** |

> [!NOTE]
> **Hardware Validation Clarification:** The product benchmark in §5 ran on a CPU-only `x86_64` machine with no GPU. VoiceBridge has **not** been tested on Raspberry Pi or ARM hardware, nor on Google Coral Edge TPU (which cannot execute Whisper architectures). Raspberry Pi deployment remains a theoretical hardware target for future work.

---

## 4. Context on Indian Languages & Regional ASR

Several high-quality Indian-language speech tools exist, notably **IndicWhisper** (developed by **AI4Bharat** at IIT Madras) and commercial platforms from emerging labs like **Sarvam AI**. 

* **Different Domains:** Indic speech models are optimized for fluent, fast-paced normative speech across diverse regional Indian languages and accents (Hindi, Tamil, Telugu, Marathi, etc.) in commercial, banking, and customer support workflows. They do not claim to evaluate or treat motor-speech disorders.
* **VoiceBridge Scope:** The current VoiceBridge prototype is evaluated exclusively on English clinical recordings from the University of Toronto TORGO archive. We have **not** evaluated Sarvam AI, IndicWhisper, or any Indian-language engine on dysarthric speech, and make no claims regarding their accuracy on atypical speech.
* **Future Research Vision:** Our interest in regional accessibility is a long-term goal: transferring the parameter-efficient LoRA and INT8 quantization methodology demonstrated here to Indic foundation models using phonetically annotated corpora (such as those from IIT Madras) to support motor-impaired individuals in Indian regional languages.

---

## 5. Verified Empirical Telemetry (Single Source of Truth)

<!-- BEGIN:generated:competitive-telemetry -->
All metrics below come from `facts.json`, written by `benchmarks/benchmark_product.py`.

* **Host:** Intel(R) Core(TM) i5-14400F (10 cores), Windows 11 (10.0.26300), CPU-only
* **Model:** openai/whisper-small (243.5M parameters) + LoRA (1.77M, 0.73%)
* **Disk:** 978.5 MB (971.4 MB base + 7.1 MB adapter)
* **Memory:** 1,020.2 MB RSS delta at load; 1,747.1 MB peak
* **Latency:** 1,751.7 ms mean per sentence (RTF 0.299); target 280 ms → **MISS**
* **Accuracy:**
  * TORGO-M05 (Cerebral Palsy): **0.0% WER** — “We have an excellent team” → “We have an excellent team”
  * TORGO-M04 (Post-Trauma (TBI)): **50.0% WER** — “Their house is grey and white” → “then there's the grey and white”
  * TORGO-M02 (Amyotrophic Lateral Sclerosis (ALS)): **120.0% WER** — “The job provides many benefits” → “Get the apple by Fimasy Bezzi bit”
  * **Mean of clips:** 56.7% · **corpus WER:** 56.2%
<!-- END:generated:competitive-telemetry -->

---

## 6. Strategic Jury Defense: Handling Difficult Questions

| Juror Question | Verified Academic Answer |
| :--- | :--- |
| **"Why is your Word Error Rate 50% on moderate speech? Isn't that high?"** | *"Yes, and the severe clip is worse still. That is the honest result: the system fixes mild dysarthric speech and only partially handles moderate speech. We report per-severity WER in `facts.json` instead of hiding it behind a blended average. Our contribution is a working CPU-only open pipeline plus the measurement that shows exactly where it stops working; we do not claim that speaker-independent severe dysarthria is solved."* |
| **"Why did you compare with Sarvam AI earlier?"** | *"That was an early conceptual mistake in our drafts. Sarvam AI and AI4Bharat's IndicWhisper are excellent platforms for normative Indian languages, but they do not focus on clinical dysarthria, and our current evaluation is English-only on TORGO. We have removed that comparison. Our real comparative context is atypical speech research like Google Project Euphonia and the Speech Accessibility Project."* |
| **"Did you deploy this on a Raspberry Pi?"** | *"No. Benchmarks ran on a desktop x86_64 CPU with no GPU. Raspberry Pi and embedded ARM targets are future work, not a validated deployment."* |
| **"TORGO was recorded in a sound booth with head-mounted mics. How will this work in the real world?"** | *"That is a critical clinical limitation. In the real world, ambient noise, microphone distance, and acoustic reverberation further degrade the signal. That is why we capture 16kHz mono audio directly via modern browser audio APIs, and why we designed the physical interface with a large tactile touch button (112px), live visual volume feedback, and mandatory confirmation before vocalizing emergency alerts."* |
