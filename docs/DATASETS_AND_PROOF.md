# VoiceBridge: Clinical Datasets & Acoustic Validation Specification
### THREWS Odyssey 2026 — Track: Human-AI & Assistive Technology
**Team:** Sleeper Cells (SIES Graduate School of Technology, Navi Mumbai)  
**Authors:** Manas Suryawanshi (Clinical Research Lead), Talha (System Architect), Aaliya Hussain (ML Lead), Moulika Sanyal (Edge AI Lead)

---

## 1. Primary Dataset: University of Toronto TORGO Database

### 1.1 Dataset Provenance & Overview
* **Principal Investigators:** Dr. Frank Rudzicz, A. Roeck, and E. Wang (Department of Computer Science & Department of Speech-Language Pathology, University of Toronto).
* **Official Institutional Archive:** [https://www.cs.toronto.edu/~complingweb/data/TORGO/torgo.html](https://www.cs.toronto.edu/~complingweb/data/TORGO/torgo.html)
* **Clinical Demographics:** Contains over 12,000 acoustic audio recordings from speakers with dysarthria caused by Cerebral Palsy (CP), Amyotrophic Lateral Sclerosis (ALS), and Traumatic Brain Injury (TBI / Post-Trauma), alongside matched non-dysarthric control subjects.
* **Recording Specifications:** 16kHz uncompressed acoustic waveform data (`.wav`), time-aligned phonetic transcriptions, orthographic target sentences, and 3D electromagnetic articulography (EMA) tracking.

### 1.2 Severity Distribution & Acoustic Pathologies
* **Speaker Classifications:** 8 dysarthric subjects spanning clinical classifications of Mild, Moderate, and Severe dysarthria.
* **Primary Acoustic Degradation Modes:**
  1. **Formant Centralization:** Acoustic resonances ($F_1$ and $F_2$) collapse toward a central neutral frequency (schwa-like sound `/ə/`) due to lingual and labial motor restrictions.
  2. **Transient Burst Loss:** Stop consonants ($p, b, t, d, k, g$) lose acoustic release bursts, sounding like breathy fricatives or indistinct murmurs.
  3. **Involuntary Prosodic Drift:** Unpredictable phoneme prolongation, spastic respiratory pauses, and sudden vocal intensity fluctuations.

### 1.3 Streaming Endpoints & Replication
The dataset is streamed via Hugging Face Hub, removing the need for manual 50GB archive downloads:
* **Primary Streaming Endpoint:** `abnerh/TORGO-database`
* **Pre-tokenized Mirrors:** `extraordinarylab/torgo`, `saeedzou/torgo-dysarthria`
* **Python Streaming Integration:**
  ```python
  from datasets import load_dataset
  dataset = load_dataset("abnerh/TORGO-database", split="train", streaming=True)
  ```

---

## 2. Baseline Model Performance & Foundation Model Breakdown

### 2.1 The Dysarthric Acoustic Failure Wall
Foundation speech recognition models (OpenAI Whisper, Google Speech API, Apple Siri) are trained on massive datasets (680,000+ hours) of fluent, normative speech (podcasts, broadcast media, audiobooks). When presented with dysarthric speech, foundation encoders suffer catastrophic breakdown:

* Normative speech achieves `<4% Word Error Rate (WER)`.
* Disordered speech in clinical datasets yields **65% to 80%+ Word Error Rate**, with severe cases collapsing into total hallucination loops.

### 2.2 Verified Empirical Baseline Telemetry
Evaluated on authentic TORGO clinical audio clips using the verified benchmark pipeline ([`docs/EDGE_AI_BENCHMARK_RESULTS.md`](./EDGE_AI_BENCHMARK_RESULTS.md)):

| Sample File | Speaker & Condition | Duration | Reference Transcript | Baseline Whisper FP32 (WER) | VoiceBridge INT8 CPU (WER) |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `torgo_mild_sample.wav` | `TORGO-M05` (Mild, CP) | 5.69 s | *"We have an excellent team"* | *"We have an 8th team"* (20.0%) | *"We have in 18th Team."* (40.0%) |
| `torgo_moderate_sample.wav` | `TORGO-M04` (Moderate, Post-Trauma TBI) | 5.87 s | *"Their house is grey and white"* | *"then down, great and white"* (66.7%) | *"Good night."* (100.0%) |
| `torgo_severe_sample.wav` | `TORGO-M02` (Severe, ALS) | 6.00 s | *"The job provides many benefits"* | *"I'm gonna put my nose in the bed"* (160.0%) | *"I will be very happy."* (100.0%) |
| **Mean** | **Held-Out Clinical Audio** | **5.85 s** | — | **82.2% Mean WER** | **80.0% Mean WER** |

*Key Clinical Insight:* Consistent with research from Google Project Euphonia and the Speech Accessibility Project, generalized zero-shot models cannot solve severe dysarthria across unseen speakers. The primary contribution of VoiceBridge is the **Edge AI execution pipeline** (74.42% storage reduction, 103MB RAM, 592ms latency) that makes real-time, on-device personalized calibration feasible without expensive GPUs or cloud latency.

---

## 3. Parameter-Efficient Adaptation Methodology (PEFT / LoRA)

* **Base Architecture:** `openai/whisper-tiny` (39 million parameters).
* **Weight Freezing:** 99.6% of base model weights are frozen to preserve the underlying linguistic, syntactic, and semantic representations of English.
* **Trainable Projections:** Low-rank decomposition matrices ($r=16, \alpha=32$) are injected into the Query (`q_proj`) and Value (`v_proj`) attention projection layers of the acoustic encoder.
* **Footprint:** Produces a compact adapter file (~1.5MB) that simplifies local edge execution and deployment.

---

## 4. Multilingual & Regional Transfer Roadmap

* **Phase 1 Benchmark:** Establish verified baseline and edge INT8 execution on the English TORGO benchmark.
* **Phase 2 Indic Transfer:** Acoustic adaptation techniques will be extended to regional Indian languages (Hindi, Marathi) using phonetically aligned corpora from the IIT Madras Speech Lab, validating that the underlying acoustic normalization is language-agnostic.
