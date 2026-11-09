# VoiceBridge — Five-Minute Demo

Four minutes of setup, or two if the dependencies are already installed. The point of
the demo is not that it works on every voice; it is that it works on mild dysarthria,
partially on the moderate-to-severe clip, and fails visibly on severe — and that every
number on screen is reproducible.

## Before the audience

1. **Backend** (one terminal):
   ```bash
   cd backend
   .\.venv\Scripts\activate      # Windows; source .venv/bin/activate elsewhere
   uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```
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

1. **Mild speech.** Hold the large record button and say a short sentence. The mild
   TORGO speaker says *"We have an excellent team"*; if you are demonstrating with your
   own voice, use a simple six-to-eight-word sentence. Release, wait for the transcript.
   Then tap **Say it**.

2. **Confidence.** Point at the `CONFIDENCE` tile. It is the model's own token
   probability, not a fixed number: the mild clip scores high, the severe clip low.

3. **The archive.** Open **Clinical Verification Archive (TORGO Dataset)** at the bottom.
   Select a sample, play the audio so the audience hears the real speech, then press
   **Transcribe with VoiceBridge**.

4. **The failure, on purpose.** Select the severe (ALS) sample and transcribe it. The
   output will not match the reference sentence. Say so plainly: *this is why we claim
   mild-to-moderate, not solved dysarthria.* Do not skip this step; a demo that hides
   the failure is the reason the old numbers were wrong.

5. **Phrase cards.** Tap **Water** — the text appears with confidence and latency shown
   as `N/A`, because a preset is not a model result. Tap **Pain Alert**: the first tap
   arms it, the second confirms. This is the accidental-tap protection.

6. **Stop the backend** and press record again. The app must say the backend is offline;
   it must not invent a sentence. If it ever invents one, the build is wrong.

## Answers for judges

- **"What is the accuracy?"** Mild is exact on the demo clip, the moderate-to-severe clip is about half wrong
  wrong, severe is worse than useless. The table in `README.md` is generated from
  `facts.json`; quote that, not memory.
- **"Why is it slow?"** It is a 243.5M-parameter model running on CPU in PyTorch, with no
  quantisation. The latency target is missed; `LIMITS.md` says so.
- **"Why only three clips?"** Because that is all we measured. Three speakers, one take
  each. It is preliminary and it is labelled preliminary.
- **"Does it work on a Raspberry Pi?"** It was never tested on one. No claim is made.

## Rules for the demo

- Never quote a number that is not in `facts.json`.
- Never present the whisper-tiny INT8 study as the product; it is labelled historical in
  `docs/EDGE_AI_BENCHMARK_RESULTS.md`.
- Show the failure. The severe clip is the most credible thing in the demo.
