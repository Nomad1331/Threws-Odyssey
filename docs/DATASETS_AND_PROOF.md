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
* **Speaker Classifications:** 8 dysarthric subjects (`F01`, `F03`, `F04`, `M01`, `M02`, `M03`, `M04`, `M05`) spanning Mild, Moderate, and Severe dysarthria across Cerebral Palsy, ALS, and Post-Trauma TBI, alongside 7 matched non-dysarthric control subjects (`FC01`, `FC02`, `FC03`, `FC06`, `MC01`, `MC02`, `MC04`) totaling 15 subjects.
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

* Normative speech is transcribed well by modern systems.
* Disordered speech is not: foundation models produce unusable output, and severe cases collapse into hallucination loops.

### 2.2 Measured product accuracy on the TORGO demo clips
From `facts.json`, written by `benchmarks/benchmark_product.py` (the shipped `whisper-small` + LoRA engine):

<!-- BEGIN:generated:datasets-accuracy -->
| Sample file | Speaker (condition) | Duration | Reference | Model output | WER | Confidence |
| :--- | :--- | ---: | :--- | :--- | ---: | ---: |
| `torgo_mild_sample.wav` | TORGO-M05 (Cerebral Palsy) | 5.69 s | “We have an excellent team” | “We have an excellent team” | **0.0%** | 90.1% |
| `torgo_moderate_sample.wav` | TORGO-M04 (Post-Trauma (TBI)) | 5.87 s | “Their house is grey and white” | “then there's the grey and white” | **50.0%** | 60.7% |
| `torgo_severe_sample.wav` | TORGO-M02 (Amyotrophic Lateral Sclerosis (ALS)) | 6.0 s | “The job provides many benefits” | “Get the apple by Fimasy Bezzi bit” | **120.0%** | 26.6% |
<!-- END:generated:datasets-accuracy -->

*Key clinical insight:* the adapted model transcribes the mild clip exactly, partially reconstructs the moderate clip, and fails on the severe clip. The earlier unadapted `whisper-tiny` INT8 comparison is retained as a labelled historical side study in [`docs/EDGE_AI_BENCHMARK_RESULTS.md`](./EDGE_AI_BENCHMARK_RESULTS.md); it is not a product result.

---

## 3. Parameter-Efficient Adaptation Methodology (PEFT / LoRA)

* **Clinical Adapted Architecture:** `openai/whisper-small` (243.5 million parameters).
* **Baseline Comparison Model:** `openai/whisper-tiny` (39 million parameters, evaluated for edge quantization footprint).
* **Weight Freezing:** more than 99% of base model weights are frozen (preserving generalized English vocabulary, phonetics, and syntax).
* **Trainable Projections:** Low-rank decomposition matrices ($r=16, \alpha=32$) are injected into the Query (`q_proj`) and Value (`v_proj`) attention projection layers across both the acoustic encoder and autoregressive decoder blocks (1.77M adapter parameters, 0.73% of total weights; see `facts.json`).
* **Footprint:** Produces a 7.1 MB adapter file hosted on Hugging Face Hub (`Aaliya05/voicebridge`), enabling CPU-only execution with authentic token softmax confidence scoring.

---

## 4. Multilingual & Regional Transfer Roadmap

* **Phase 1 Benchmark:** Measure the shipped CPU-only baseline on the English TORGO clips; the INT8 study is retained as a labelled side result only.
* **Phase 2 Indic Transfer:** Acoustic adaptation techniques will be extended to regional Indian languages (Hindi, Marathi) using phonetically aligned corpora from the IIT Madras Speech Lab, validating that the underlying acoustic normalization is language-agnostic.
