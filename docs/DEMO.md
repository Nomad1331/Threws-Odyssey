# VoiceBridge — Five-Minute Demo

Four minutes of setup, or two if the dependencies are already installed. The point of
the demo is that the shipped adapter transcribes the **three TORGO speakers** near-exactly
after speaker adaptation — and that this is **not** the same as working on a new speaker.
Every number on screen is reproducible from `facts.json`.

## Before the audience

0. **Make sure you are running today's code, not an old server.** A leftover
   `uvicorn` on port 8000 will keep serving the old behaviour even after you pull.
   Check and restart:
   ```powershell
   Get-NetTCPConnection -LocalPort 8000 -State Listen | Select-Object OwningProcess
   # stop that PID, then start the backend below
   ```

1. **Backend** (one terminal):
   ```bash
   cd backend
   .\.venv\Scripts\activate      # Windows; source .venv/bin/activate elsewhere
   python -c "import sys; print(sys.executable)"   # must be backend\.venv
   uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```
   If you see `ModuleNotFoundError: BloomPreTrainedModel`, you are running global
   Python, not `backend\.venv`; recreate the venv from `backend/requirements.txt`.
   Wait for `VoiceBridge acoustic engine (whisper-small-lora) loaded`.

2. **Frontend** (second terminal):
   ```bash
   cd frontend
   npm install                   # first time only
   npm run dev
   ```
   Open <http://localhost:3000>. The header indicator should read
   `Backend connected (FastAPI • Clinical LoRA)`.

3. **Numbers check** (optional, third terminal):
   ```bash
   python benchmarks/claims_check.py
   ```
   Prints `claims-check: OK` only if every number in the docs matches `facts.json`.

## The walkthrough

1. **The archive is the measured path.** Open **Clinical Verification Archive
   (TORGO Dataset)** at the bottom and transcribe the three samples. This is what the
   0.0% / 16.7% / 0.0% figures describe. Do not replace this with a live microphone and
   imply the same accuracy; the adapter is adapted to these three speakers.

2. **Confidence.** Point at the `CONFIDENCE` tile. It is the model's average token
   probability, not correctness: on this build mild is 89%, moderate 61%, severe 65%.
   A high number is not a guarantee that a word is right.

3. **The boundary, stated honestly.** Transcribe the severe (ALS) clip: on this
   speaker-adapted build it now matches the reference. Say plainly that this is because
   the adapter was further trained on 443 other utterances from the same speaker; severe
   speech from a **new** speaker is not supported. Do not present it as solved severe
   dysarthria.

4. **Phrase cards.** Tap **Water** — the text appears with confidence and latency shown
   as `N/A`, because a preset is not a model result. Tap **Pain Alert**: the first tap
   arms it, the second confirms. This is the accidental-tap protection.

5. **Stop the backend** and press record again. The app must say the backend is offline;
   it must not invent a sentence. If it ever invents one, the build is wrong.

## Answers for judges

- **"What is the accuracy?"** 0.0% / 16.7% / 0.0% on the three TORGO demo speakers
  (mean 5.6%). It is speaker-adapted to those speakers and **not evaluated on a fourth
  speaker**. The table in `README.md` is generated from `facts.json`; quote that.
- **"Why is it slow?"** It is a 243.5M-parameter model running on CPU in PyTorch, with no
  quantisation. The latency target is missed; `LIMITS.md` says so.
- **"Why only three clips?"** Because that is all we measured. Three speakers, one take
  each. The adapter saw other sentences from those same speakers; it is preliminary.
- **"Does it work on a Raspberry Pi?"** It was never tested on one. No claim is made.

## Rules for the demo

- Never quote a number that is not in `facts.json`.
- Never present the whisper-tiny INT8 study as the product; it is labelled historical in
  `docs/EDGE_AI_BENCHMARK_RESULTS.md`.
- Show the boundary: three adapted TORGO speakers are not general dysarthria, and the
  phrase cards are the reliable path for severe users.
