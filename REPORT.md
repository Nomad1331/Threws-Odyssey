# VoiceBridge — Project Report

**THREWS Odyssey 2026 · SIES Graduate School of Technology · Sleeper Cells**

- **Live app:** https://voicebridge-threws.vercel.app
- **Backend health:** https://voicebridge-api-six.vercel.app/health
- **Demo video (49 s, narrated):** https://voicebridge-threws.vercel.app/demo/voicebridge-demo.mp4
- **Adapter:** https://huggingface.co/Nomad1331/voicebridge

This report is the single detailed reference. `README.md` is the quick start and
`CHANGELOG.md` is the history.

---

## 1. Executive summary

VoiceBridge is a CPU-only assistive speech transcription prototype for dysarthric
speech. It pairs a `whisper-small` acoustic model with a PEFT LoRA adapter adapted
to three TORGO speakers, then presents the result through an accessible browser
interface with a large tactile mic, confidence/latency, text-to-speech and AAC
phrase cards. The frontend and backend are deployed on Vercel; the backend is a
container image with a sharded model, so no GPU or external speech API is needed.

Measured on the three TORGO demo clips: **0.0% / 16.7% / 0.0% WER**. This is
**speaker-dependent adaptation to the three demo speakers**, not a general
dysarthria model. The exact demo clips and all 11 rows with the same reference
text were excluded from training, but the same three speakers were trained on; no
fourth speaker has been evaluated.

---

## 2. Problem and users

Dysarthria is a motor speech disorder caused by conditions such as cerebral palsy,
ALS, traumatic brain injury, stroke and Parkinson's disease. Articulation,
phonation and prosody become atypical; general-purpose ASR — trained mostly on
fluent speech — often returns unusable text. People who rely on their voice to
communicate can be left with a tool that works for everyone else.

The project targets a simple, low-hardware assistive interaction:

- a person with dysarthria speaking a short phrase;
- a caregiver or clinician reading the transcript;
- a browser on a normal laptop, with no GPU and no speech-cloud account.

It is a research prototype, not a medical device.

---

## 3. System architecture

```
Browser (Next.js)
  mic / archive / AAC cards
        │  multipart audio
        ▼
FastAPI backend
  validate → PyAV decode to 16 kHz mono → Whisper-small + LoRA
        │
        ▼
transcript + confidence + latency
```

**Frontend:** Next.js 14 App Router, React, Tailwind. Large tactile record button,
keyboard shortcut, live waveform, transcript replay/download, confidence and
latency, browser TTS, AAC preset cards with two-step Pain Alert confirmation.

**Backend:** FastAPI. Validates size/extension, decodes with PyAV (WebM, WAV, MP4,
AAC, OGG) to 16 kHz mono, enforces a 30 s window, rejects near-silence, runs
`whisper-small` + LoRA on CPU through PyTorch/PEFT, and returns text plus average
token probability and wall-clock latency.

**Deployment:** Vercel frontend; Vercel Container Runtime backend
(`voicebridge-api`). The backend image contains CPU PyTorch, PyAV/ffmpeg and four
~240 MB safetensors shards of the base model. The 7.1 MB adapter is in the image.
No model is downloaded at request time.

---

## 4. Model and adaptation

### 4.1 Base and adapter

- Base: `openai/whisper-small`, **241.7 M** parameters.
- Adapter: PEFT LoRA, r=16, alpha=32, `q_proj` + `v_proj`, **1.77 M** parameters
  (0.73% of the combined model). Combined parameter count is **243.5 M**.
- Storage: 971.4 MB base + 7.1 MB adapter = 978.5 MB.
- Runtime: CPU only, PyTorch, no external speech API.

### 4.2 Final adaptation

The shipped adapter continues `Aaliya05/voicebridge` on **443 utterances from
M02, M04 and M05**. All **11 rows** whose reference text matches one of the three
demo sentences were excluded, so the demo clips and their transcripts were not
trained on. The exact demo audio is therefore held out; the speakers are not.

Training used the Kaggle GPU kernel in `model_training/kaggle/three/`, 2 epochs,
learning rate 1e-4. The earlier speaker-disjoint experiment (training on five
other speakers, evaluating on M02/M04/M05) was a negative result: 60.84% vs
60.52% corpus WER for the previous adapter, and worse on the demo clips. It is kept
in `model_training/kaggle/` for reproducibility, not shipped.

### 4.3 Aaliya's model summary — checked

Her summary is **substantially correct**. The points to tighten:

| Her statement | Verdict |
|---|---|
| "Whisper-Small, approximately 243.5 million parameters" | Base is **241.7 M**; 243.5 M includes the **1.77 M** adapter. |
| "LoRA on query and value projections" | Correct: r=16, alpha=32, `q_proj`/`v_proj`. |
| "continued training an existing Whisper-Small LoRA adapter on TORGO" | Correct; specifically 443 M02/M04/M05 utterances, with 11 demo-sentence rows excluded. |
| "processes audio into mono 16 kHz ... PyTorch on CPU ... no GPU or external speech API" | Correct. |
| "WER 0%, 16.7%, 0%" | Correct for the three TORGO demo clips, in mild/moderate/severe order. 16.7% is one substitution out of six words. |
| "recordings came from speakers represented in training; speaker-dependent, not generalizable" | Correct. Add that the exact demo **clips and texts** were excluded, and no fourth speaker was evaluated. |
| "adapted specifically for dysarthric speech" | True of the TORGO adapter, but the result is **speaker-adapted to three speakers**, not a general dysarthria system. |

Do not describe the model as having "solved" severe dysarthria. It reconstructs
the severe **M02 demo clip** after speaker adaptation; severe speech from an
unseen speaker remains unsupported.

---

## 5. Data and provenance

- Corpus: University of Toronto **TORGO** Database (Rudzicz et al., 2012),
  distributed under the Linguistic Data Consortium user agreement.
- Speakers: M02 (ALS, severe), M04 (post-trauma TBI, moderate-to-severe), M05
  (cerebral palsy, mild) for the demo; the adapter training used the same three.
- Demo clips: `frontend/public/audio/torgo_mild_sample.wav`,
  `torgo_moderate_sample.wav`, `torgo_severe_sample.wav`.
- Base weights: `openai/whisper-small` (MIT). Sharded copy:
  `Nomad1331/voicebridge-whisper-small-sharded`.
- Adapter: `Nomad1331/voicebridge` and
  `backend/models/voicebridge-torgo-three/`.
- Benchmark source: `facts.json`, written by
  `benchmarks/benchmark_product.py`; `benchmarks/claims_check.py` guards the
  generated blocks and provenance hashes.

TORGO/LDC redistribution terms apply to the audio and to models derived from it.
Check before publishing a fork with the audio or adapter.

---

## 6. Results

<!-- BEGIN:generated:report-results -->
| Severity | Speaker | Condition | WER | Avg. token prob. | Latency | Model output |
| :--- | :--- | :--- | ---: | ---: | ---: | :--- |
| Mild | TORGO-M05 | Cerebral Palsy | **0.0%** | 89.3% | 1,576.1 ms | "We have an excellent team" |
| Moderate-to-Severe | TORGO-M04 | Post-Trauma (TBI) | **16.7%** | 61.2% | 1,588.4 ms | "the house is grey and white" |
| Severe | TORGO-M02 | Amyotrophic Lateral Sclerosis (ALS) | **0.0%** | 65.4% | 1,583.3 ms | "The job provides many benefits" |
| **Mean / corpus** | | | **5.6%** mean; **6.2%** corpus | | **1,582.6 ms** | 3 clips |

WER is computed after lowercasing and stripping punctuation; corpus WER counts every edit over every reference word. Confidence is average token probability, not accuracy.
<!-- END:generated:report-results -->

The 16.7% is one word: “Their” → “the”. Confidence is the model's average token
probability, not accuracy. The three clips are a preliminary evaluation, not a
clinical result.

---

## 7. Performance and footprint

<!-- BEGIN:generated:report-performance -->
### Speed, memory and size

Measured 2026-11-10 on Intel(R) Core(TM) i5-14400F (10 cores / 16 threads, 137.3 GB RAM), Windows 11 (10.0.26300), CPU-only, PyTorch 2.15.0+cpu.

| Metric | Measured | Target | Verdict |
| :--- | ---: | ---: | :--- |
| Model | whisper-small 243.5M parameters + LoRA 1.77M (0.73%) | - | the model the server runs |
| Disk | 978.5 MB (971.4 MB base + 7.1 MB adapter) | - | - |
| Memory added when the model loads (RSS) | 1,019.6 MB | - | - |
| Peak process memory | 1,756.3 MB | - | - |
| Latency per sentence | 1,582.6 ms mean (1,593 ms median, 1,531-1,617.2 ms range) | 280 ms | **MISS, 5.7x over** |
| Real-time factor | 0.27 | below 1.0 | processing beats playback; the response still takes seconds |

"Memory added" is resident memory after loading the model minus resident memory after imports; "peak" is the highest observed during the timed runs. Latency is wall time around `transcribe_audio`, including audio decode.
<!-- END:generated:report-performance -->

The latency target is missed by a wide margin. The model runs on CPU in PyTorch;
it is not a real-time system. Vercel container cold starts add roughly 5–7 s on
the first request after idle; warm inference is about 5 s.

---

## 8. Limits

<!-- BEGIN:generated:report-limits -->
- **Accuracy:** mild **0.0%**, moderate-to-severe **16.7%**, severe **0.0%** word error rate on the 3 demo clips (3 speakers). Mean of clips 5.6%; corpus WER 6.2%.
- **Latency:** 1,582.6 ms mean per sentence against a 280 ms target - **MISS**.
- **Memory:** 1,019.6 MB RSS delta at load; 1,756.3 MB peak. **Disk:** 978.5 MB.
- **Model:** openai/whisper-small + LoRA, cpu only; no GPU, Raspberry Pi or Coral Edge TPU validation.
- **Sample size:** 3 clips from 3 speakers. Preliminary; not a clinical result.
<!-- END:generated:report-limits -->

- **Speaker-dependent, not general.** The adapter was trained and evaluated on
  the same three TORGO speakers. No fourth speaker has been evaluated.
- **Severe speech from a new speaker is unsupported.** The severe M02 demo clip
  works after adaptation; that is not evidence for unseen severe dysarthria.
- **Live microphone accuracy is unmeasured.** The measured WER uses TORGO
  head-mounted recordings. Phone-speaker → PC-mic tests change the acoustics;
  room reverb, echo cancellation and timing can break transcription.
- **Three clips are not a benchmark.** Three speakers, one take each, no
  confidence intervals.
- **Confidence is not accuracy.** It is the average token probability.
- **No clinical validation.** No speech-language pathologist reviewed outputs and
  no patient used the app outside the team.
- **Accessibility is designed, not formally audited.**
- **Upstream npm advisory.** `npm audit --omit=dev` flags Next.js 14.2.35 and its
  bundled PostCSS. This static page uses no Server Actions and no user-controlled
  CSS; a Next 16 upgrade is post-submission work.
- **TORGO/LDC licensing** applies to audio and derived adapter redistribution.

---

## 9. Deployment

- Frontend: Vercel, `voicebridge-threws.vercel.app`.
- Backend: Vercel Container Runtime, `voicebridge-api-six.vercel.app`.
- Container image: `backend/Dockerfile.vercel`; model shards from
  `Nomad1331/voicebridge-whisper-small-sharded`; adapter baked into the image.
- CORS: `VOICEBRIDGE_ALLOWED_ORIGINS=https://voicebridge-threws.vercel.app`.
- Frontend env: `NEXT_PUBLIC_BACKEND_URL=https://voicebridge-api-six.vercel.app`.
- Hobby container instances scale down after 5 minutes idle. First request:
  ~4.9 s health / ~5–7 s transcription; later requests warm. Vercel Hobby does
  not allow a sub-daily cron, so a keep-alive must be an external pinger; it
  reduces idle cold starts but does not guarantee warmth.
- The old Cloudflare tunnel and local uvicorn were stopped after verifying the
  public app with both off.

---

## 10. Demo and submission

**Project title:** VoiceBridge: Assistive Speech Transcription for Dysarthric Speech

**Problem:** Dysarthria breaks ordinary ASR, leaving people who rely on speech
without usable text, especially when tools need a GPU or cloud speech API.

**Solution:** CPU-only `whisper-small` + speaker-adapted LoRA, accessible Next.js
interface, TORGO archive, confidence/latency, TTS and AAC cards; deployed on
Vercel with a container backend.

**Links:**

- App: https://voicebridge-threws.vercel.app
- Backend: https://voicebridge-api-six.vercel.app/health
- Video: https://voicebridge-threws.vercel.app/demo/voicebridge-demo.mp4
- Model: https://huggingface.co/Nomad1331/voicebridge

**Demo flow:** open the Clinical Verification Archive; run Sample 01 (mild),
Sample 02 (moderate) and Sample 03 (severe). The UI shows confidence and latency;
the transcript card notes that confidence is not accuracy. Use the archive for
the measured claims, not a live microphone.

---

## 11. Competitive context

The adjacent field is active; descriptions below are summaries of public project
pages, not independently benchmarked by us.

- **Google Project Euphonia / Project Relate** — personalized models for
  non-standard speech. Relate collects user recordings and adapts on-device.
  https://sites.research.google/euphonia/
- **Speech Accessibility Project (UIUC)** — large licensed dataset of impaired
  speech for research. https://speechaccessibilityproject.beckman.illinois.edu/
- **UA-Speech** — 16-speaker dysarthric corpus, academic licence.
  https://speechtechnology.web.illinois.edu/uaspeech/
- **Voiceitt** — commercial assistive speech app with personalized models.
  https://www.voiceitt.com/

VoiceBridge's contribution is not a new foundation model. It is a measured,
CPU-only adaptation and deployment pipeline with an accessible interface and
honest per-clip limits.

---

## 12. Historical experiments

- The earlier **whisper-tiny dynamic INT8 ONNX** study was a separate edge
  experiment, not the product. The shipped model is whisper-small + LoRA in
  PyTorch. Exact historical numbers are in `CHANGELOG.md`; they are not product
  claims.
- The **speaker-disjoint retrain** on five other TORGO speakers was rejected:
  held-out corpus WER was flat/slightly worse and the demo clips regressed. It is
  retained in `model_training/kaggle/` but not shipped.

---

## 13. Changes since 7 November 2026

Baseline: `aec38a1` (last commit on 7 Nov 2026). Through v1.26.0 (`810d08a`):
**78 commits, 67 files, +5,615 / -1,300 lines.** The documentation consolidation
after v1.26.0 changes docs only; it does not change the product or benchmark.

| Area | What changed |
|---|---|
| Acoustic model | Replaced the earlier tiny/CTranslate2 path with `whisper-small` + PEFT LoRA; added the three-speaker TORGO adapter; 0%/16.7%/0% on the demo clips. |
| Backend | PyAV native decode, 16 kHz mono, 30 s limit, near-silence rejection, CORS boundary, sanitized errors, 12-test suite, pinned CPU dependencies. |
| Frontend | New B&W heart mark and favicon; social card; raw mic capture with AGC/echo cancellation disabled; recording download; confidence disclaimer; TTS error handling; safer preset interactions. |
| Benchmarks | `facts.json` as single source of truth; benchmark/self-test; generated docs; source-hash provenance; claims gate; regenerated figures. |
| Deployment | Vercel container backend with sharded base model; HF adapter and shard repos; cold/warm measurements; no tunnel. |
| Training | Kaggle speaker-disjoint negative experiment retained; final three-speaker adaptation shipped. |
| Docs | Consolidated from 12+ Markdown files to `README.md`, `REPORT.md`, `CHANGELOG.md`. |
| Fixes | WER self-test control corrected; adapter size sourced from shipped directory; lockfile/venv reproducibility; stale dependency references removed. |

The main branch was replaced by a content-sync commit whose tree is exactly this
branch; old main state is preserved at `backup-main-before-clean`.

---

## 14. Reproduce

```powershell
# Backend
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install torch==2.15.0 --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r requirements.txt
python test_server.py

# Product benchmark
python benchmarks/benchmark_product.py
python benchmarks/claims_check.py

# Frontend
cd ..\frontend
npm ci
npm run build
npm run lint
```

Deployment instructions are in `backend/Dockerfile.vercel`; the model shards are
public at `Nomad1331/voicebridge-whisper-small-sharded`.
