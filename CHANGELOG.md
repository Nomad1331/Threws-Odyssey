# VoiceBridge: Engineering Changelog
### THREWS Odyssey 2026 — Master Project Ledger
**GitHub Repository:** [Nomad1331/Threws-Odyssey](https://github.com/Nomad1331/Threws-Odyssey)  
**Branch:** `voicebridge-clean`

All notable engineering changes, architectural milestones, and codebase updates for VoiceBridge are documented here.

> **Reading this file:** it is a dated ledger, not current documentation. Entries before
> v1.2.0 describe earlier states of the project and contain claims that were later
> corrected (see the v1.2.0 "Corrections" note). For current numbers use `facts.json`
> and `README.md`; for scope use `LIMITS.md`.

---

## [2026-11-11] - v1.23.3: WhatsApp-Safe Social Card

* Added `og-preview.jpg` (1200×630, 46.7 KB, progressive JPEG) and switched `og:image` / `twitter:image` to it. WhatsApp now receives a fresh URL, `image/jpeg` content type, `og:image:type=image/jpeg`, and dimensions.
* Kept the editable SVG and PNG source. The old PNG URL is no longer referenced by metadata, which also bypasses a stale WhatsApp image cache.
* Verified with a WhatsApp user-agent: page 200, image 200 `image/jpeg` 46,719 bytes, all OG/Twitter tags present; old frontend alias 404.
* For an existing chat, send a fresh URL with a query (`?v=2`) because WhatsApp caches previews per URL.

---

## [2026-11-11] - v1.23.2: Custom Social Preview Card

* Added a hand-built **1200×630 SVG social card** (`frontend/public/og-preview.svg`) and rendered PNG (`og-preview.png`): B&W mark, wordmark, “Two voices. One bridge.”, a short description, event footer and CPU-only research-prototype label.
* Added Open Graph and Twitter metadata in `layout.tsx` with `metadataBase`, image dimensions and alt text; no screenshot of the app is used.
* Fixed the mojibake bullet in the metadata description while editing it.
* Verified on Vercel: `og:image` and `twitter:image` resolve to the PNG (HTTP 200, `image/png`), `twitter:card=summary_large_image`, old alias 404.
* No model/API/facts changes.

---

## [2026-11-11] - v1.23.1: B&W Version of the Team's Heart Mark

* Replaced the previous mark with the team-supplied geometry: two heads at the top, a continuous outer heart, and an inner heart cutout.
* Rendered it **black and white** with `currentColor`; no gradient, no baked dark background.
* Made the inner heart a **true transparent negative-space cutout** with `fill-rule="evenodd"`. The original code filled it with `#09090b`, which only looked correct on a black background.
* Header mark increased to 32 px inside a 40 px ink tile; favicon uses the same geometry as cream-on-ink.
* Build, lint, `/icon.svg`, and the public Vercel deployment verified. Old `frontend-lemon-three-13.vercel.app` returns 404.

---

## [2026-11-11] - v1.23.0: VoiceBridge Logo Mark

* Replaced the pale header microphone with a custom SVG mark: two circular heads and two mirrored, leaning silhouettes that meet at a point to form a heart, with the embrace left as negative space.
* Added the same geometry as `frontend/public/logo.svg`, the inline `Logo` component, and `app/icon.svg` (dark rounded-square favicon). Removed the old generic `favicon.ico`; no Vercel/Next default icon remains.
* No model, API, facts or benchmark numbers changed. Build, lint, favicon route and the public Vercel deployment were verified.

---

## [2026-11-10] - v1.22.2: Environment Guard and Import-Path Cleanup

* **Aaliya’s `BloomPreTrainedModel` traceback is a global-Python issue, not a repo pin.** The traceback resolves PEFT under `C:\Users\aaliya\AppData\Roaming\Python\...\site-packages` (user site), while the repo uses `backend\.venv`. The clean-venv test loop in the message tested 4.45.2 first and `break`ed on success, so it never actually tested 5.22.2.
* **Clean-room proof:** a fresh venv with the exact `backend/requirements.txt` set (`transformers 5.22.2`, `peft 0.21.2`, `torch 2.15.0+cpu`, FastAPI/Starlette/PyAV) imports `from app.main import app` and reports `VoiceBridge ASR Service` successfully. No dependency pin was changed; do not downgrade to 4.45.2 based on the global-site failure.
* **Fixed a real code smell her AI flagged:** `main.py` caught any `ImportError` and retried `backend.app.inference`, which can hide the actual dependency error. It now uses the correct relative `from .inference import ...`; both `app.main:app` (from `backend/`) and `backend.app.main:app` (from root) were tested.
* **Added setup guards:** README now installs the CPU torch wheel first and prints `sys.executable`; DEMO says a `BloomPreTrainedModel` error means you are on global Python, not `backend\.venv`.
* **Verification:** 12/12 backend tests, clean full-requirements venv import, `pip check`, and claims provenance pass.

---

## [2026-11-10] - v1.22.1: Audit Pass — Test, Provenance and Doc Fixes

* **Fixed a real self-test bug:** the WER “negative control” compared “an excellent” with “a different”, which is **two** substitutions, not one. It expected 20% but correctly produced 40%; the metric was right and the test expectation was wrong. The control is now “excellent”→“squad” (one substitution) and fails if S/D/I or WER is wrong.
* **Fixed adapter-size provenance:** `benchmark_product.py` recorded the size of the old `Aaliya05/voicebridge` HF cache entry. It now measures the shipped `backend/models/voicebridge-torgo-three/` directory, which is what the product loads.
* **Recorded every pinned runtime version** in `facts.json` (`fastapi`, `starlette`, `uvicorn`, `python-multipart`, `av`, `accelerate` in addition to torch/transformers/peft/python), so the requirements header is true.
* **Fixed stale dependency docs:** `SYSTEM_WALKTHROUGH.md` still listed removed `faster-whisper` and `httpx`; it now matches `backend/requirements.txt`.
* **Fixed an over-broad claim:** `LIMITS.md` said “every number is rendered from facts.json”; training counts and the separate speaker-disjoint result are now labelled experiment metadata.
* **Removed `webm_probe.webm`**, an unused 96 KB tracked test artifact, and the unused `adapterInitial` facts field.
* **Known upstream advisory documented:** `npm audit --omit=dev` flags Next.js 14.2.35 Server Actions DoS and bundled PostCSS. This static page uses no Server Actions and no user-controlled CSS; a Next 16 upgrade is post-submission work. See LIMITS.
* **Verification:** 12/12 backend tests, WER self-test 6/6, `pip check`, frontend build, lint, `tsc --noEmit`, `git diff --check`, `claims_check --provenance-only`, and two benchmark reproductions all pass.

---

## [2026-11-10] - v1.22.0: Three-Speaker TORGO Adaptation — 0.0% / 16.7% / 0.0%

* **What changed:** the shipped adapter is now `backend/models/voicebridge-torgo-three/`, produced by continuing Aaliya's LoRA on **443 utterances from the three demo speakers** (M02: 172, M04: 143, M05: 128). All **11 rows whose reference text matches one of the three demo sentences were excluded**, so no demo clip or its transcript was trained on.
* **Measured result on the three demo clips:** mild **0.0%**, moderate **16.7%** (one word: “Their”→“the”), severe **0.0%**. Mean clip WER **5.6%**, corpus WER **6.2%**. Latency about **1.5 s** mean; memory/disk unchanged.
* **Scope — read this before quoting:** this is **speaker-dependent adaptation**, not speaker-independent dysarthria ASR. The adapter was trained and evaluated on the same three TORGO speakers; **no fourth speaker has been evaluated**. Severe speech from an unseen speaker remains unsupported. The previous 60.5% held-out-speaker number belongs to the earlier adapter, not this one.
* **Shipped:** the 7.1 MB adapter is committed under `backend/models/` and loaded by default; `VOICEBRIDGE_ADAPTER_MODEL` still overrides it. No quantisation; no frontend change.
* **Docs:** README, LIMITS, DEMO, DATASETS, COMPETITIVE, EDGE and SYSTEM_WALKTHROUGH updated so the severe-failure claims no longer contradict the measured result. `facts.json` regenerated twice; second run matched within tolerance; `claims_check.py` passes.

---

## [2026-11-10] - v1.21.0: Speaker-Disjoint Retrain Attempt — Not Adopted

* **What was tried:** a reproducible Kaggle GPU kernel (`model_training/kaggle/`) that downloads full TORGO, trains a fresh LoRA with the three demo speakers (M02/M04/M05) **held out**, and evaluates new vs Aaliya's adapter vs base on 90 held-out utterances.
* **Data:** 16,552 TORGO rows → 1,299 sentence-level dysarthric rows; 845 training rows from speakers F01/F03/F04/M01/M03; 454 held-out rows from M02/M04/M05.
* **Run 1 (r=32, q/k/v/o, 4 epochs, lr=1e-3):** overfit (train loss 0.22) and degenerated into repeated phrases — 398% corpus WER on held-out speakers. Rejected.
* **Run 2 (r=16, q/v, 2 epochs, lr=2e-4, dropout 0.1):** valid. Held-out corpus WER **60.84%** vs current adapter **60.52%** and base **66.02%** — flat, mixed per speaker. On the three demo clips: mild 0%, moderate **83.3%**, severe 100%, versus the shipped adapter's 0% / 50% / 120%. Strictly worse for the product.
* **Decision:** keep `Aaliya05/voicebridge`; no product, `facts.json` or docs number changed. The Kaggle kernel and script are kept as a documented negative result and a base for personalisation work.
* **What this means:** the accuracy ceiling is data/personalisation, not another decoding or training knob. The honest path is more speakers, per-user adaptation, or a larger model — none of which can be verified before submission.
* **Not touched:** quantisation. It is a size/speed optimisation, not an accuracy fix.

---

## [2026-11-10] - v1.20.0: Microphone Capture — Clipping Fixed, Recording Downloadable

* **Found a real capture defect.** A browser-captured take of the clean TORGO clip arrived with **peak 1.0 and RMS 2.7× the source** (source peak 0.49), i.e. the microphone chain was clipping. On that clipped audio the model produced “We have an accident here” instead of “We have an excellent team”. Disabling `autoGainControl` and `echoCancellation` (noise suppression was already off) brought the recorded peak back to **0.502**. The model itself is level-robust: the same clip at 0.01× amplitude still transcribes correctly.
* **What this does and does not prove.** The fake-microphone test loops its source file, so its transcript cannot validate content — correlation with the source was only 0.33 at the best offset. It is useful for measuring capture level, not for judging accuracy. Clean TTS and the TORGO WAV both transcribe correctly through LoRA **and** the base model, so the adapter is not universally broken.
* **Added a “Download recording” link** next to the replay player, so a failing live take can be sent for direct analysis instead of described in chat.
* **Retest required:** the teammate’s screenshots show the pre-v1.19 UI (no confidence note, red TTS error), so they were testing an old build. Pull, rebuild and retest; the AGC change only takes effect in a fresh frontend build.
* Live microphone accuracy remains **unmeasured**. The 0% WER figure is for the provided TORGO clip, not arbitrary speech.

---

## [2026-11-10] - v1.19.0: Live-Test Findings — TTS Failure and Confidence Semantics

* **Real-user test exposed a confusing UI failure.** The same mild sentence produced “We have an incident beam” on one live take and the correct sentence on the next. The model is deterministic for identical audio, so the difference is the recording (mic, distance, level, timing), not run-to-run randomness. The documented 0% WER applies to the provided TORGO clip, not to arbitrary live microphone input. README and `LIMITS.md` now say this explicitly.
* **“Confidence” was being read as accuracy.** 62% and 82% are average token probabilities, not the share of correct words. The transcript card now says so under the telemetry bar, and `LIMITS.md` adds “Confidence is not accuracy.”
* **Speech synthesis failure fixed as far as the browser allows.** `SpeechSynthesisUtterance.lang` was hard-coded to `en-US`, which causes `synthesis-failed` when no en-US voice is installed. The UI now picks an installed English voice (or none), resumes a paused synthesiser, and maps raw errors to plain messages. A TTS failure is shown as a neutral status, not a red error, because it does not affect the transcript.
* **Latency varied from 1.7 s (benchmark host) to 4.4–6.1 s on a teammate’s machine.** That is CPU/hardware and load, not a second model; the published figure names its host. No change made.
* **Docs/UI:** the page footer states that measured accuracy refers to the TORGO clips and live microphone results vary. No product code changed in the inference path.

---

## [2026-11-09] - v1.18.0: Real-Browser End-to-End Verification

* **Ran the actual stack, not just TestClient.** Current backend on `127.0.0.1:8010`, production frontend build served on `127.0.0.1:3100`, and headless Edge driven over the DevTools protocol with a fake microphone.
* **Verified interactively:** the header showed “Backend connected”; the mic button entered recording state, stopped, and the browser's WebM upload was transcribed by the real server; the UI rendered confidence (77%) and latency (1,684 ms); a page reload served the built app; preset phrases showed confidence/latency as `N/A`; Pain Alert armed on the first tap and fired on the second. Screenshot inspected. Zero backend errors/tracebacks.
* **Caveat:** the fake microphone replays a file segment, so its transcript (“We have an accident here”) is not the TORGO reference. That run verifies the pipeline, not accuracy; accuracy is measured separately by `benchmark_product.py`.
* **Operational finding:** port 8000 was held by a **stale uvicorn started Nov 8** (system Python) and port 3000 by leftover Next processes. They were not killed. `docs/DEMO.md` now starts with a “make sure you are running today's code” restart step. A judge demo against a stale server would exhibit old behaviour.
* No product code changed.

---

## [2026-11-09] - v1.17.0: Documentation Claims and Comment Coverage

* **Removed the last overstated doc lines:**
  - `SYSTEM_WALKTHROUGH` said the temp file is “guaranteed” deleted; it is attempted and failure is logged.
  - It also claimed PyAV “streams the audio cleanly without memory leaks”; it opens a temp file, and no leak claim was measured.
  - The waveform was called “frequency” visualisation; it renders a time-domain amplitude buffer.
  - `COMPETITIVE_ANALYSIS` now labels competitor descriptions as summaries of their public pages, explicitly **not independently benchmarked**, and “Verified Academic Answer” became “Answer (linked sources; competitor claims not independently tested)”.
  - “Many assistive tools” → “Some”; the formant-centralisation mechanism is marked as background, not measured here.
* **Comment coverage, measured:** every Python module and every function outside `node_modules` now has a docstring (`0` missing), and every frontend `.ts`/`.tsx`/`.css`/config file has comments (`0` without). Added explanations to `next.config`, `postcss.config`, Tailwind theme, the CSS palette/contrast/focus rules, TORGO extraction, figure generation, doc rendering, the claims checker, benchmark helpers and the training scripts. No logic changed.
* **The provenance gate caught the comment-only edits** to `benchmark_product.py` / `evaluate_samples.py` and forced a fresh measurement — correct, if strict, behaviour. Facts/docs/figures regenerated; WER unchanged.
* **Verification:** 12/12 tests, build, lint, claims + three-source provenance.

---

## [2026-11-09] - v1.16.0: PyAV 19 and Browser Format Verification

* **PyAV 19 tested directly.** Installed `av==19.0.0` in an isolated venv. It rejects `av.open(..., metadata_errors="ignore")` with `TypeError: open() got an unexpected keyword argument 'metadata_errors'` — the exact failure Aaliya reported. The new product decoder has no such argument and decoded both the WAV and WebM/Opus probes under PyAV 19 with identical sample counts (91,040 and 91,024) to PyAV 13.
* **Safari and resampling paths exercised.** An AAC-in-MP4 (`.m4a`) upload returned 200 with “We have an excellent team”; a 2-channel WAV returned 200 with the same transcript. Both were previously untested.
* **Repository integrity:** `git fsck` clean.
* **No product code changed in this pass** — verification only. The installed product still pins `av==13.1.0`; the decoder is version-tolerant.

---

## [2026-11-09] - v1.15.0: Remove the Old Decoder Dependency Entirely

* **Aaliya's follow-up was accurate:** `inference.py` had kept the `decode_audio` import from the earlier faster-whisper backend even after the transformers + LoRA engine replaced it. That import was removed in v1.14.0; this pass removes the last references in the repo.
* **Found one more leftover:** `benchmark_product.py`'s duration fallback also imported `faster_whisper.audio.decode_audio`, which would hit the same PyAV 19 `metadata_errors` trap. It now uses the product decoder.
* **`faster-whisper` removed from the product requirements.** The app no longer imports it at all; only the optional TORGO extraction script does, and its docstring now lists it as an extra. Product installs no longer pull `ctranslate2`/`onnxruntime` for an unused decoder.
* **Proof:** the full 12-test suite ran with `sys.modules["faster_whisper"] = None` (any import would raise) and passed 12/12.
* **Regenerated:** `facts.json`, doc blocks and figures. WER unchanged (0 / 50 / 120).

---

## [2026-11-09] - v1.14.0: Decoder Root Cause — PyAV 19 `metadata_errors`

* **Aaliya's diagnosis was correct about the failing call.** `faster_whisper/audio.py` passes `metadata_errors="ignore"` to `av.open`; PyAV 19 removed that keyword, so every decode raises a `metadata_errors` TypeError. Our machine had PyAV **13.1.0**, which is why the suite and the WebM probe passed here; `requirements.txt` never pinned `av`, so a fresh install could pull PyAV 19 and break every request. That is the gap this missed.
* **Fixed at the source, not by swapping libraries.** Added `decode_audio_pyav` in `inference.py` using only stable PyAV APIs (`av.open`, `AudioResampler`, `container.decode`); it is sample-identical to the old wrapper on all three WAV clips and on WebM/Opus (max absolute difference **0.0**). Pinned `av==13.1.0` as well, so installs are reproducible.
* **Her `librosa` change is not adopted.** It bypasses the same call but adds a dependency that is absent from `requirements.txt`, and without `ffmpeg` it cannot decode the browser's WebM. Her commit remains in history as a merge parent; no revert was needed or done.
* **Coverage:** test 12 (browser WebM/Opus upload) now runs through the new decoder; suite is 12/12.
* **Regenerated:** `facts.json`, doc blocks and figures. WER unchanged (0 / 50 / 120). Claims + three-source provenance pass.

---

## [2026-11-09] - v1.13.0: Browser-Format Regression Test

* **The suite only ever uploaded WAV; browsers send WebM/Opus.** Test 12 now repackages the mild TORGO clip as WebM/Opus with PyAV, uploads it through the endpoint, and asserts HTTP 200 plus the correct transcript. Suite is 12/12.
* **Context, for the record:** a teammate's remote commit (`71a8e85`, Aaliya) replaced PyAV with `librosa` citing an audio-processing/metadata error, but did not add `librosa` to `requirements.txt`. On this checkout PyAV decodes a freshly encoded WebM/Opus clip sample-exactly (5.69 s) and the endpoint transcribes it correctly; `librosa` was not installed and no `ffmpeg` binary exists. The merge at `27e089b` therefore kept PyAV. Test 12 makes that browser path a permanent check, so a future decoder swap has to keep it working.
* **No product code changed in this pass.** README and walkthrough test counts updated to 12/12; facts and docs are unchanged.

---

## [2026-11-09] - v1.12.0: Final Sweep — Boundary Messaging, Health Ordering, Doc Drift

* **30-second rejection message was self-contradictory.** It rounded 30.01 s to “30.0 s” while refusing the file, so it looked like a 30.0 s clip was rejected for being over 30 s. Now printed to two decimals, and test 11 asserts the message contains `30.01`.
* **Health badge could stay wrong forever.** It checked once on mount, so opening the frontend while uvicorn was still loading showed “Backend offline” until the first transcription. It now polls every 5 s.
* **A preset phrase kept the previous recording’s audio.** Tapping an AAC phrase replaced the text but left an unrelated audio player below it. Preset selection now clears the recorded clip as well as confidence/latency/source.
* **Truthiness of “real-time” was inconsistent.** The table said “processes faster than playback” while the prose said “not a real-time system”. Both are true of different things; the row now says processing beats playback but the response still takes seconds.
* **Severity labels disagreed with the data.** Prose called the middle speaker “moderate” while the generated table and facts say “moderate-to-severe”. Prose now matches the data; the claim scope stays mild-to-moderate.
* **`DATASETS_AND_PROOF.md` still credited the wrong TORGO authors** (A. Roeck, E. Wang), contradicting the corrected citation in the README. Fixed to Rudzicz, Namasivayam & Wolff. Removed unsourced counts (12,000 recordings, 50 GB archive, 680,000 training hours) from the same page.
* **Bloat:** removed the unused `--panel` CSS variable.
* **The provenance gate caught my own edit.** Changing two error strings in `inference.py` failed `claims_check` with “source changed since the benchmark”, forcing a re-measurement. That is the gate working, not a false positive.
* **Regenerated:** `facts.json`, doc blocks and figures. Verification: 11/11 tests, build, lint, claims + 3-source provenance, served build HTTP 200.
* **Convergence:** after these fixes, the full sweep — compile, unused imports, doc references, tests, build, lint, claims, runtime edge cases, served build — produced **zero new verified defects**. Residual risks are unchanged and listed in `LIMITS.md`.

---

## [2026-11-09] - v1.11.0: Fourth Pass — Convergence Sweep

* **Provenance now covers three sources.** `facts.json` records hashes of `benchmark_product.py`, `backend/app/inference.py` and `backend/evaluate_samples.py`; `claims_check.py` verifies all of them. Demonstrated failing on a doctored inference hash and passing on the real file.
* **Offline detection hardened.** It no longer treats an empty or partial cache directory as ready: it requires `model.safetensors` and `adapter_model.safetensors` in a cached snapshot. A half-finished download can still fetch instead of locking the engine offline.
* **Peak RSS is now sampled every 50 ms in a background thread during the timed runs**, instead of only after each call. The measured peak rose from about 1,747 MB to 1,753.8 MB, confirming the old figure understated the allocation peak. The field is documented as sampled.
* **Boundary test added.** Test 11 checks 30.01 s is rejected and 29.5 s is accepted; suite is 11/11.
* **Concurrency exercised live.** Two simultaneous requests against uvicorn returned the correct mild and moderate transcripts, `/health` stayed responsive, and the server log contained zero Hub calls.
* **Bloat:** removed the one genuinely unused import (`Tuple`); an AST scan now reports no unused imports across the Python tree.
* **Regenerated:** `facts.json`, doc blocks and figures (latency 1,674.1 ms; WER unchanged).
* **Convergence:** after these fixes, a full sweep — Python compile/unused imports, dead doc references, 11 tests, build, lint, claims + provenance, live edge/concurrency behaviour, dependency checks — produced **zero new verified defects**. That is the defined stopping point, not a proof that no latent bug exists.

---

## [2026-11-09] - v1.10.0: Third Pass — Provenance, Dependencies, Served Build

* **`facts.json` provenance is now enforced.** `claims_check.py` hashes `benchmarks/benchmark_product.py` and compares it with `_meta.scriptSha256`, so numbers produced by a different version of the script fail the check. Added `--facts` and `--provenance-only` for testing; the gate was demonstrated failing on a doctored hash (`deadbeef…`) and passing on the real file.
* **Starlette pinned (`1.10.0`).** Removing `httpx` relied on Starlette's newer `TestClient`; pinning prevents a future resolver from installing a Starlette that needs `httpx` and breaks `test_server.py`.
* **Confidence calculation audited, not changed.** For the mild clip: 6 score steps map to the last 6 of 10 sequence tokens (4 prompt + 6 generated including EOS), and the decoded ids equal the transcript. The average includes the EOS probability, which is why confidence sits slightly high; documented here rather than silently “fixed”, because changing it would change a published number.
* **Dependency and tooling checks:** `pip check` reports no broken requirements, `npm ls --depth=0` resolves cleanly, ESLint reports no warnings.
* **Served build smoke test:** `next start` on port 3000 returned HTTP 200 (14,655 bytes) with the VoiceBridge title present.
* **Merged `origin/voicebridge-clean` and kept PyAV.** The remote commit swapped decoding to `librosa` for stated performance gains. On this machine `librosa` is not installed and not in `requirements.txt` (the branch fails at import), `ffmpeg` is absent (librosa cannot decode the browser's WebM without it), and PyAV decodes the demo clips in 9–10 ms with no external binary. The merge keeps PyAV and accepts only the unrelated `package-lock.json` update.
* **No new product defect found in this pass.** The remaining limits are the same ones listed in `LIMITS.md`; none were contradicted by the code.

---

## [2026-11-09] - v1.9.0: Second Adversarial Pass — Silence, Licensing, Dead Tokens

* **Found and fixed: the model invents a word on silence.** A 3-second digital-silence WAV decoded to “you”. Added a near-silence energy gate before inference (peak below 0.002; the demo clips peak at 0.49–0.74) that returns an empty transcript instead. `no_speech_threshold` was tried first and crashes this Transformers build with `UnboundLocalError: logprobs`, so it is not used. New test 10 asserts silence produces no words; suite is 10/10.
* **Found and fixed: a YouTube clip was shipped as clinical audio.** `frontend/public/audio/yt_nihss_sample.wav` (a NIHSS video excerpt) was listed in the TORGO-titled drawer — a licensing risk and a mislabel. Removed from the UI and archived outside the repository; the drawer now contains only the three TORGO clips.
* **Found and fixed: the training notebook is broken on current Transformers.** `evaluation_strategy` was renamed; now `eval_strategy`.
* **Found and fixed: startup required huggingface.co even with cached weights.** Every launch made four Hub requests (visible in the server log), so a machine without internet could stall before serving. When both the base model and adapter are present in the local cache, the engine now forces `HF_HUB_OFFLINE=1` before importing Transformers. Verified: startup makes no Hub requests and loads in 1.25 s from cache.
* **Found and removed: unused Tailwind tokens** (`surface.card/muted`, `border.subtle/focus`, the whole `studio` palette, `clinical.muted/teal-light/amber/rose`). `npm run lint` is clean.
* **Regenerated:** `facts.json`, doc blocks and figures after the inference change. Latency **1,751.7 ms**; WER unchanged.
* **Verification:** 10/10 backend tests, `npm run lint` and `npm run build` exit 0, `claims_check.py` exit 0, two benchmark runs reproduce.
* **Still true and stated:** a tone or background noise can still produce a word (no speech detector); long outputs are capped by the generation limit.

---

## [2026-11-09] - v1.8.0: Adversarial Pass — Contradictions, Bloat, One Decompression Path

* **Method:** mechanical scans (Python syntax compile, grep for retired or overstated claims, cross-file metadata) followed by line-by-line reads. Every item below was confirmed at the cited source; nothing here is a speculative finding, and one earlier frontend finding remains rejected as false.
* **Documentation contradictions fixed**
  - README called the transcript “Instant”; it is not. Architecture diagram now says transcript with confidence/latency.
  - `frontend/README.md` claimed “real-time speech transcription” and “WCAG 2.1 AAA”; both replaced with assistive wording and measurable sizes.
  - `layout.tsx` metadata advertised “Real-time” and “zero-latency rendering”; both removed.
  - `COMPETITIVE_ANALYSIS.md` claimed “112px, WCAG AAA compliant”; now states the actual minimum size.
  - `SYSTEM_WALKTHROUGH.md` claimed ~2 ms decoding, showed 409 ms and 1560 ms responses, said “sub-second on warm execution”, claimed WCAG AAA and 7/7 tests. It now references `facts.json` for latency, and says 9/9.
  - WCAG 2.2 AA’s target-size minimum is 24x24 px, not 44x44; the 44x44 figure is the AAA guideline. All four places that conflated them now state sizes without claiming a conformance level.
  - `EDGE_AI_BENCHMARK_RESULTS.md` claimed the merged model was “verified in `model_training/voicebridge_merged/`”; the directory is gitignored and absent. It now says it was written there and is not shipped.
  - `main.py` docstrings claimed unknown extensions are rejected and that decoding is “dysarthria-adapted”; neither was true. Corrected.
  - `ISSUE.md`, `ROADMAP.md` and the branch comparison now carry explicit “archived, not current” banners; the CHANGELOG now says it is a dated ledger whose pre-v1.2.0 claims were superseded.
* **Code fixes**
  - Over-long audio is now rejected from the container duration **before** decoding; previously a small compressed upload could expand to a large PCM buffer before the 30-second check. Falls back to post-decode checking when the container reports no duration.
  - `useAudioRecorder`: a second start during the first `getUserMedia` await is now refused (guard set before the await), so two recorders can no longer share the stream refs.
  - `transcriptionService`: the 30-second abort timer now lives until the response body is read, instead of being cleared when headers arrive.
  - `test_server.py`: test 9 proves a model failure returns 500 with a constant message and no internal path. Suite is 9/9.
  - Recorded audio can now be replayed (`<audio>` in the transcript card); the previously dead `recordedAudioUrl` prop is used.
  - Pain Alert requires the second tap at least 400 ms after the first, so a spastic double-tap cannot fire it.
  - Status and speech errors are announced (`role="status"` / `role="alert"`); sample transcription disables the mic and drawer so requests cannot overlap.
  - Waveform bars read the `--waveform` theme token instead of a hardcoded hex.
  - Interactive border contrast raised from 1.49:1 to above 3:1 against the surface colour.
* **Bloat and reproducibility**
  - `requirements.txt` pinned to the measured versions; unused `httpx` removed (Starlette’s TestClient no longer needs it).
  - `evaluate_samples.py` exits 1 when no clips exist instead of printing success; `torgo_streaming_test.py` refuses placeholder references and computes no verdict; `extract_torgo_audio.py` asserts the expected transcript before writing each clip.
  - `facts.json`, doc blocks and figures regenerated after the decode change: latency **1,826.1 ms**, WER unchanged.
* **Verification:** backend 9/9, `npm run build` exit 0, `claims_check.py` exit 0, two benchmark runs reproduce within tolerance.
* **Known and stated, not fixed:** containers that publish no duration still decode before the check (fallback path); the per-run peak RSS field is sampled between calls while the OS peak is reported separately; `claims-check` does not verify `facts.json` provenance; speaker overlap between training and demo clips remains unmeasured; no clinical validation exists.

---

## [2026-11-09] - v1.7.0: Phase 6 — Ship Package

* **`LIMITS.md`:** plain-language scope — severe speech fails, no clinical validation, not real-time, three clips, no speaker-independence proof, no VAD, no Pi/GPU validation, accessibility designed but not audited, TORGO/LDC redistribution caveat. Its summary block is generated from `facts.json`, and the file is inside the claims check.
* **`LICENSE`:** MIT text for the code. README now separates code licence (MIT) from TORGO data terms (LDC agreement; demo clips included for evaluation only) and corrects the citation to Rudzicz, Namasivayam & Wolff (2012).
* **README:** adds a status callout at the top (mild correct, moderate partial, severe unsupported, not a medical device), links `LIMITS.md` and the demo, and replaces the WCAG "AAA" claim with the actual target size and "designed, not audited".
* **`docs/DEMO.md`:** five-minute walkthrough including the severe-clip failure, preset-vs-model telemetry, two-step Pain Alert, and an offline-backend check; includes the answers to the four questions judges ask.
* **Live demo run (2026-11-09):** real uvicorn server on `127.0.0.1:8000`; `/health` returned the engine name; `torgo_mild_sample.wav` → “We have an excellent team” (confidence 0.901, 1,591 ms); `torgo_severe_sample.wav` → “Get the apple by Fimasy Bezzi bit” (confidence 0.266, 1,779 ms) — the documented failure, not a fabricated success.
* **Fresh-clone check:** committed tree cloned locally; `claims_check.py` passes from the clone.
* **Tag:** `v1.7.0`.
* **Not done:** nothing was pushed to a remote. Push requires explicit approval because it publishes to the team repository.

---

## [2026-11-09] - v1.6.0: Phase 5 — Surgical Fixes for the Verified Highs

* **Backend**
  - `main.py`: client-fixable failures stay 4xx (`ValueError`/FFmpeg decode → 400, over-long audio → 422); everything else returns **500** with a constant message. Raw exception text no longer reaches the client.
  - `main.py`: the full transcript is no longer written to logs (length and confidence only).
  - `inference.py`: model load is guarded by a `threading.Lock`, globals are published only after `to(device)`/`eval()`, and `_device` is resolved once at import instead of twice.
  - `main.py`: CORS now trusts explicit localhost origins only, with `allow_credentials=False`; LAN demos require `VOICEBRIDGE_ALLOWED_ORIGINS`. The private-range regex is gone.
  - **30-second window enforced:** recordings longer than the model's window return 422 with the limit in the message instead of a silently truncated transcript (measured before: 45 s in → 30.0 s transcribed, HTTP 200).
  - `test_server.py`: 8 tests — CORS now asserts private-range origins are denied by default, and test 8 asserts a 31 s recording is rejected.
* **Frontend**
  - `TactileMicButton`: Space no longer hijacks focused buttons/links/fields; it only starts the mic when nothing interactive has focus.
  - `page.tsx`: a phrase-card tap clears the previous confidence/latency/source instead of attributing them to a preset.
  - `page.tsx` + `transcriptionService.ts`: an error response keeps the previous transcript and telemetry; an HTTP error no longer marks the backend "offline"; sample playback validates `res.ok` and the audio content type.
* **Scripts and figures**
  - `generate_figures.py`: rewritten to plot only `facts.json` values (WER by severity; latency vs target; disk/RSS). The formant-centralisation figure was **deleted** — its coordinates were invented — and archived outside the repo.
  - `export_and_quantize_onnx.py`: storage reduction and completion messages are computed from the measured statuses; on Windows/macOS x86_64 it now selects the AVX2 config instead of silently building an ARM64 graph.
  - `benchmark_product.py`: the WER negative control now uses a deliberately wrong transcript (the old one re-ran an identical pair and could not fail); `--baseline` requires equal clip lists and matching transcripts/parameter counts, with zero guards.
  - `render_docs.py`: model size and speaker count are derived from `facts.json` instead of hardcoded/reused values.
* **Regenerated:** `facts.json`, all generated doc blocks, and both figures. Latency moved within tolerance (1,720.1 → 1,683.5 ms mean) after the code changes; WER unchanged.
* **Verification:** backend 8/8, `npm run build` exit 0, `claims_check.py` exit 0, two benchmark runs reproduce, Figure 1 inspected and matches the table.
* **Still open (medium, deliberately not fixed now):** claims-check does not scan `SYSTEM_WALKTHROUGH.md` and does not validate `facts.json` provenance; `useAudioRecorder` state guard is still before its first `await`; abort timer ends before the response body is read; `extract_torgo_audio.py` selects rows by index without asserting labels; `QuickAssistGrid` has no minimum gap between the two urgent taps; border contrast is 1.49:1.

---

## [2026-11-09] - v1.5.0: Phase 4 — Bloat Removal

* **Root before:** 10 markdown files, a 9.4 MB tool checkout (`.bullseye/` with its own `.git`), 2.5 MB of session exports, and an agent-skill copy (`.agents/`). **Root after:** code directories plus `README.md`, `CHANGELOG.md`, `facts.json`.
* **Moved out of the repository** to `I:\Career\VoiceBridge-archive\` (sibling folder, nothing deleted): `.bullseye/` (9.4 MB, 226 files), `Threws.docx` (1.76 MB team audit), `AUTOPILOT_AUDIT_SESSION_TRANSCRIPT.md` (367 KB), `AUTOPILOT_AUDIT_SESSION_SUMMARY.md`, `google_doc_export.html/.txt`, `audit_section.txt`, `commands.md`, `.agents/` skill copy, and the scratch client `backend/test_yt_slice.py`.
* **Archived inside the repo** as clearly non-judge-facing: `ISSUE.md` → `docs/archive/ISSUE_audit_ledger.md`, `ROADMAP.md` → `docs/archive/ROADMAP_planning.md`, `docs/BRANCH_COMPARISON_AND_LORA_ANALYSIS.md` → `docs/archive/`.
* **Also:** README repository tree updated (`docs/archive/`, `CHANGELOG.md`); `claims-check` no longer scans the archived branch comparison.
* **Verification:** `npm run build` exit 0, five static pages generated; `claims_check.py` exit 0. No imports changed, so the build passing is the check that nothing referenced the removed files.

---

## [2026-11-09] - v1.4.0: Phase 3 — Code Audit (verified findings)

* **Method:** three independent read-only readers on disjoint slices (backend + training scripts / frontend UI / hooks + lib + scripts). **Control:** the backend reader had to find, unaided, at least three of the four defects already known before the audit (400-mapping, load race, permissive CORS, double `_device`). It found **2 of 4** (missed CORS and `_device`), so the control gate **failed**; its output was treated as leads only and every item below was re-checked against the source by the lead. The other two readers were verified line by line.
* **Rejected as false:** "Clinical drawer never runs model inference — it does (`ClinicalBenchmarkDrawer.tsx:205-213`), and the output appears in the main transcript panel."
* **High severity (must be fixed in Phase 5):**
  - `backend/app/main.py:177` — every inference failure returns HTTP 400 with raw exception text; model failures must be 500 with a constant message.
  - `backend/app/inference.py:89` — audio over 30 s is silently truncated by the feature extractor. Measured: 45 s input → 30.0 s represented, still HTTP 200; the recorder has no duration cap.
  - `benchmarks/generate_figures.py:46` — all plotted values are hardcoded; Figure 1 shows the retired whisper-tiny WERs, Figure 3 shows 151.7/38.9 MB and 1,480/592 ms labelled "VoiceBridge INT8". Contradicts `facts.json`.
  - `model_training/export_and_quantize_onnx.py:581,594` — storage reduction prints `[PASS]` unconditionally and the script prints "verified and ready for edge deployment" even when its own latency/RTF statuses are MISS.
  - `frontend/src/app/page.tsx:118-120` — a phrase-card tap sets only the text, leaving the previous recording's confidence, latency and "Clinical LoRA" badge on screen.
  - `frontend/src/components/TactileMicButton.tsx:58-64` — the global Space handler ignores focused buttons/links (only input/textarea/select/contenteditable are excluded), so Space on "Clear", "Say it", a preset or the archive toggle fires the microphone instead.
* **Medium severity (recorded, not all fixed — see Phase 5 scope):** model-load race and double `_device` (`inference.py:36,49-60`); permissive CORS with credentials (`main.py:71`); full transcript written to logs (`main.py:157`); `claims-check` does not scan `SYSTEM_WALKTHROUGH.md` (which still shows `processing_time_ms: 409` and "1560 ms / sub-second on warm execution") and does not validate `facts.json` provenance; `compare_to_baseline` zips clip lists and can divide by zero; peak RSS sampled only after each call; WER "negative control" reruns the identical pair (cannot fail); `useAudioRecorder` checks its state guard before an `await`, so two rapid starts can double-acquire the mic; abort timer cleared before the response body is read; TORGO extraction selects rows by hardcoded indices with no label assertion; rendered prose reuses the clip count as the speaker count; `trainableNote` says 0.72% while the measured adapter share is 0.73%.
* **Consequences:** no separate audit document was produced (per project instruction); this section is the finding ledger, and Phase 5 closes the highs plus the measurement-integrity mediums.

---

## [2026-11-09] - v1.3.0: Phase 2 — Documents Rendered From `facts.json`

* **Branch / commit:** `voicebridge-clean`, see this commit
* **Why:** the README presented the whisper-tiny INT8 table as the product, and four documents repeated five different retired latency/size figures. Fixing the numbers once by hand would let them drift again, so the numbers are now generated and guarded.
* **What changed:**
  - `benchmarks/render_docs.py` renders benchmark blocks from `facts.json` into marked regions (`<!-- BEGIN:generated:... -->`) in README, `EDGE_AI_BENCHMARK_RESULTS.md`, `COMPETITIVE_ANALYSIS.md` and `DATASETS_AND_PROOF.md`.
  - `benchmarks/claims_check.py` runs three independent gates: (1) each generated block must equal a fresh render from `facts.json`; (2) retired whisper-tiny figures are banned outside a region marked historical; (3) any `%` / `ms` / `MB` / `GB` value outside a generated or historical block fails in README and the product benchmark doc.
  - README: replaced the tiny-model table with per-severity accuracy (mild 0.0%, moderate 50.0%, severe 120.0%; mean 56.7%, corpus 56.2%), measured performance (latency 1,720.1 ms vs 280 ms target → MISS, RSS delta 1,021.3 MB, disk 978.5 MB), honest hardware line, and a "where it stops" paragraph. Removed the unsourced 65–80% WER claim and the "Real-Time" title.
  - `EDGE_AI_BENCHMARK_RESULTS.md`: now §1 product benchmark and §2 **historical** whisper-tiny side study, with Moulika's authorship and data preserved behind an explicit banner and historical markers.
  - `COMPETITIVE_ANALYSIS.md`: product telemetry block replaces tiny numbers; jury FAQ answer rewritten from "80% is the reality" to per-severity honesty; Raspberry Pi answer corrected.
  - `DATASETS_AND_PROOF.md`: product accuracy block replaces the mixed tiny/LoRA table; adapter share corrected 0.72% → 0.73%; unsourced <4% and 65–80% claims removed.
  - `SYSTEM_WALKTHROUGH.md`: "why faster-whisper INT8" replaced with the actual PyTorch + PEFT rationale; stale facts.json description updated.
  - `BRANCH_COMPARISON_AND_LORA_ANALYSIS.md`: marked outdated/historical (it compares old commits).
  - README quickstart gains a "Verify the numbers" step running `claims_check.py`.
* **Verification:** `claims_check.py` exits 0. Sabotage run — one WER changed 0.0% → 0.5% plus a stray "592 ms" line — produced 3 failures and exit 1, then passed again after restore. Roadmap acceptance grep (`151.7`, `38.9`, `1,480`, `74.42`) now matches only inside the labelled historical section.
* **Next:** Phase 3 — code audit of all backend/frontend files, every finding verified by the lead.

---

## [2026-11-09] - v1.2.0: Phase 1 — Product Re-Benchmark (real whisper-small + LoRA)

* **Branch / commit:** `voicebridge-clean`, `a9a16ab`
* **Why this exists:** every headline number in the repo (151.7 → 38.9 MB, 1,480 → 592 ms, "103 MB active memory", 74.42% reduction) was produced by a **whisper-tiny INT8 ONNX** experiment, while the product serves **whisper-small + LoRA** through PyTorch. `facts.json` also carried tiny's ONNX export sizes (404.49 / 103.45 MB) as if they described the product. Phase 1 replaces all of that with numbers from the code users actually run.
* **What changed:**
  - Added `benchmarks/benchmark_product.py`: imports the product's own `backend/app/inference.py`, computes word-level Levenshtein WER, runs 2 warm-ups + 5 timed runs per clip, records RSS before load / after load / peak, and writes `facts.json` atomically with script hash, host and library versions.
  - Gates that exit non-zero: missing clip, wrong model (243.5M ±1% parameter check — the tiny-vs-small bug can no longer pass silently), missing LoRA weights, empty transcripts, and `--baseline` (WER must match exactly, latency within 30%, RSS within 20%). `--self-test` covers the WER arithmetic.
* **Measured (Intel Core i5-14400F, CPU-only, Windows 11, PyTorch 2.15.0+cpu, Transformers 5.22.2):**
  - WER: mild **0.0%**, moderate **50.0%**, severe **120.0%**; mean clip **56.7%**, corpus **56.2%**.
  - Latency: **1,720 ms** mean (1,527–1,908 ms), RTF 0.294 — **MISS** against the 280 ms target (6.1×).
  - Memory: RSS delta **1,021 MB** (380 → 1,402 MB after load), peak RSS **1,748 MB**.
  - Disk: **978.5 MB** total (971.4 MB base + 7.1 MB adapter). Parameters 243.5M total, 1.77M adapter (0.73%).
* **Corrections to earlier entries below:** "103 MB active memory" was a *file size*, not RAM. "409 ms response" and the 592 ms / 38.9 MB / 74.42% figures belong to the whisper-tiny INT8 side study, not the product. Severe WER was hand-calculated as 140%; the single WER function gives 120% (4 substitutions + 2 insertions over 5 reference words). Benchmark hardware is a desktop i5-14400F with 137 GB RAM, not a laptop.
* **Verification:** two consecutive runs reproduce (WER identical, latency within 1.1%, RSS within 0.1%). A doctored baseline (WER 5% instead of 0%) makes the reproduction gate exit 2. The WER self-test failed once on a wrong hand expectation before passing 6/6 — the check is proven able to fail.
* **Newly found false claim (Phase 3 input):** `ISSUE.md` 2.10 states anti-hallucination decoding (`temperature=0.0`, `no_speech_threshold=0.55`, `compression_ratio_threshold=2.4`) is implemented in `backend/app/inference.py`; lines 93–100 pass none of these arguments.
* **Next:** Phase 2 — rewrite `README.md` benchmark table and `docs/EDGE_AI_BENCHMARK_RESULTS.md` from `facts.json`, relabel the whisper-tiny INT8 study as a separate side result, and add `claims-check` so a wrong number in a doc fails CI.

---

## [2026-11-08] - v1.1.0: Clinical LoRA Acoustic Engine Integration & Comprehensive Audit Remediation

* **Lead Engineers:** Talha (System Architect & Frontend Lead), Aaliya Hussain (ML Lead), Manas Suryawanshi (Clinical Research Lead), Moulika Sanyal (Edge AI Lead)
* **Team:** Sleeper Cells (SIES GST)
* **Key Achievements & Deliverables:**
  - **Single Dedicated Clinical Acoustic Engine ("No Bad Mode, Only Good Mode"):**
    * Integrated Aaliya's newly retrained `whisper-small` PEFT LoRA adapter (`Aaliya05/voicebridge`, $r=16, \alpha=32$) directly into `backend/app/inference.py` via PyTorch and PEFT.
    * Eliminated inferior fallback modes—the server runs strictly on the fine-tuned clinical model, ensuring zero degradation or fallback hallucinations on dysarthric speech.
    * Implemented token-level softmax confidence calculation from output step logits, delivering authentic `[0.0 - 1.0]` confidence scores per transcription.
    * Integrated PyAV native audio ingestion via `faster_whisper.audio.decode_audio`, allowing immediate decoding of `.webm`, `.wav`, `.mp4`, `.aac`, and `.ogg` to 16kHz mono in ~2ms with zero external ffmpeg binary dependencies.
    * Dynamically exposed the active engine via `GET /health` (`"engine": "whisper-small-lora"`).
    * Updated `backend/requirements.txt` to include `torch`, `transformers`, `peft`, and `accelerate`.
  - **Empirical Clinical Verification on Held-Out TORGO Clips:**
    * TORGO-M05 (Mild Cerebral Palsy): **90.1% confidence**, **100% exact match** (*"We have an excellent team"* vs 35% conf and dropped words on base model).
    * TORGO-M04 (Moderate-to-Severe TBI): **60.7% confidence**, accurately captured distorted phonemes (*"grey and white"* vs 24% conf loop failure on base model).
  - **Clinical Etiological Correction & Benchmark Alignment:**
    * Corrected speaker TORGO-M04 etiology from "Post-Stroke" to **"Post-Trauma TBI (Moderate-to-Severe)"** across the repository (`facts.json`, `docs/DATASETS_AND_PROOF.md`, `docs/EDGE_AI_BENCHMARK_RESULTS.md`, and `frontend/src/components/ClinicalBenchmarkDrawer.tsx`).
    * Re-generated all 300 DPI publication benchmark figures (`figure1_wer_comparison.png`, `figure2_formant_centralization.png`, `figure3_latency_vs_footprint.png`) with verified clinical labels.
  - **Comprehensive Audit Resolution Ledger (`ISSUE.md`):**
    * Formulated master 61-issue ledger documenting problem descriptions, exact resolutions on `voicebridge-clean`, status in `origin/main`, and architectural reconciliations across all 10 audit categories.
  - **Production Verification:**
    * Full 7/7 automated test suite in `backend/test_server.py` passed with zero errors.
    * Next.js production build (`npm run build`) passed with zero errors and zero warnings.

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
