# 🎙️ VoiceBridge

### Assistive Speech Transcription for Dysarthric Speech

> **THREWS Odyssey 2026** — *Track: Human-AI & Assistive Technology*  
> **Institution:** SIES Graduate School of Technology, Navi Mumbai  
> **Branch:** `main` · **Detailed report:** [REPORT.md](REPORT.md) · **History:** [CHANGELOG.md](CHANGELOG.md)

**Live demo:** [voicebridge-threws.vercel.app](https://voicebridge-threws.vercel.app)  
**Backend health:** [voicebridge-api-six.vercel.app/health](https://voicebridge-api-six.vercel.app/health)  
**Demo video:** [49 s, narrated](https://voicebridge-threws.vercel.app/demo/voicebridge-demo.mp4)  
**Model:** [Nomad1331/voicebridge](https://huggingface.co/Nomad1331/voicebridge)

> **Status:** research prototype. The three TORGO demo clips are transcribed after
> speaker adaptation; this is **not** a general dysarthria model. No fourth speaker
> has been evaluated, live microphone accuracy is unmeasured, and it is not a
> medical device. Read [REPORT.md](REPORT.md) for the full limits.

---

## What it is

Commercial ASR is trained mostly on fluent speech. For people with dysarthria —
motor speech impairment from cerebral palsy, ALS, TBI, stroke or Parkinson's — it
often returns unusable text. VoiceBridge is an accessible, CPU-only prototype that
transcribes short phrases and presents them with confidence, latency, replay,
text-to-speech and AAC phrase cards.

It is designed for a normal laptop: no GPU, no external speech API, no cloud
speech account.

---

## Architecture

```
Browser (Next.js)
  mic / TORGO archive / AAC cards
        │  multipart audio
        ▼
FastAPI backend
  validate → PyAV decode to 16 kHz mono
  → whisper-small + PEFT LoRA (CPU, PyTorch)
        │
        ▼
transcript + confidence + latency
```

- **Frontend:** Next.js 14 App Router, React, Tailwind. Large tactile record
  button, keyboard shortcut, live waveform, replay/download, browser TTS, AAC
  cards with two-step Pain Alert.
- **Backend:** FastAPI. 30 s limit, extension/size validation, near-silence
  rejection, PyAV decoding, PEFT adapter, 12-test verification suite.
- **Deployment:** Vercel frontend; Vercel Container Runtime backend with the model
  sharded into four safetensors layers. Adapter baked into the image.

---

## Measured results

Every number below comes from `facts.json`, produced by
`benchmarks/benchmark_product.py`. `benchmarks/claims_check.py` fails if the
generated blocks or source hashes disagree.

<!-- BEGIN:generated:readme-accuracy -->
### Accuracy on the three TORGO demo clips

Word error rate on the exact clips the demo page plays, measured 2026-11-10.

| Severity | Speaker | Condition | WER | Demo reference -> model output |
| :--- | :--- | :--- | ---: | :--- |
| Mild | TORGO-M05 | Cerebral Palsy | **0.0%** | "We have an excellent team" -> "We have an excellent team" |
| Moderate-to-Severe | TORGO-M04 | Post-Trauma (TBI) | **16.7%** | "Their house is grey and white" -> "the house is grey and white" |
| Severe | TORGO-M02 | Amyotrophic Lateral Sclerosis (ALS) | **0.0%** | "The job provides many benefits" -> "The job provides many benefits" |
| **Mean of clips** | | | **5.6%** | corpus WER **6.2%** across 3 clips |

"Mean of clips" averages the three percentages; "corpus WER" counts every edit over every reference word. Both are reported because they answer different questions.
<!-- END:generated:readme-accuracy -->

<!-- BEGIN:generated:readme-performance -->
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
<!-- END:generated:readme-performance -->

**Scope:** the adapter was trained on 443 other utterances from the same three
TORGO speakers. The 11 rows matching the three demo sentences were excluded, but
the speakers were in training. The 16.7% is one word (“Their” → “the”). No fourth
speaker has been evaluated. Full details and caveats: [REPORT.md](REPORT.md).

---

## Quick start

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# CPU wheel first; requirements.txt pins 2.15.0
python -m pip install torch==2.15.0 --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r requirements.txt

# Must print ...\backend\.venv\Scripts\python.exe
python -c "import sys; print(sys.executable)"
python test_server.py

python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

If you see `ModuleNotFoundError: BloomPreTrainedModel`, you are running global
Python, not `backend\.venv`; recreate the venv with the commands above.

### Frontend

```powershell
cd frontend
npm ci
npm run build
npm run lint
npm start
```

The local frontend defaults to `http://127.0.0.1:8000`. To point it at the
deployed backend, set `NEXT_PUBLIC_BACKEND_URL` at build time.

### Verify

```powershell
backend\.venv\Scripts\python.exe backend\test_server.py
backend\.venv\Scripts\python.exe benchmarks\benchmark_product.py
backend\.venv\Scripts\python.exe benchmarks\benchmark_product.py --self-test
backend\.venv\Scripts\python.exe benchmarks\claims_check.py
```

---

## Repository

```
Threws-Odyssey/
├── backend/
│   ├── app/                     # FastAPI + inference engine
│   ├── models/                  # speaker-adapted LoRA adapter
│   ├── models/voicebridge-torgo-three/
│   ├── requirements.txt
│   ├── test_server.py           # 12 backend tests
│   └── Dockerfile.vercel        # Vercel container backend
├── benchmarks/
│   ├── benchmark_product.py     # writes facts.json
│   ├── claims_check.py          # provenance + generated-block gate
│   ├── render_docs.py           # renders README/REPORT blocks
│   └── generate_figures.py
├── frontend/
│   ├── src/app/                 # page, layout, icon.svg
│   ├── src/components/          # mic, transcript, AAC, archive, Logo
│   ├── public/audio/            # three TORGO demo clips
│   ├── public/logo.svg
│   ├── public/og-preview.jpg
│   └── public/demo/voicebridge-demo.mp4
├── model_training/
│   ├── kaggle/train.py          # speaker-disjoint experiment (not adopted)
│   ├── kaggle/three/train.py    # shipped three-speaker adaptation
│   └── VoiceBridge_Colab_Trainer.ipynb
├── assets/benchmarks/           # generated figures
├── facts.json                   # single source of truth for measured numbers
├── README.md
├── REPORT.md                    # full report, limits, deployment, submission copy
└── CHANGELOG.md
```

---

## Data and licence

- **Code:** MIT (`LICENSE`).
- **TORGO:** University of Toronto TORGO Database (Rudzicz et al., 2012),
  distributed under the Linguistic Data Consortium user agreement. The three
  demo WAVs are included for evaluation; redistribution may require LDC
  permission.
- **Base model:** `openai/whisper-small` (MIT).
- **Adapter:** `Nomad1331/voicebridge`, derived from TORGO and
  `Aaliya05/voicebridge`; same licensing question as the audio.

The app is a research prototype, not a medical device. See [REPORT.md](REPORT.md)
for the complete limitations, deployment notes and submission copy.
