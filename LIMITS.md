# VoiceBridge — Limits

This file exists so nobody has to discover the limits the hard way. Every number
here is rendered from `facts.json` by `benchmarks/render_docs.py`; nothing is typed.

<!-- BEGIN:generated:limits-summary -->
- **Accuracy:** mild **0.0%**, moderate **50.0%**, severe **120.0%** word error rate on the 3 demo clips (3 speakers). Mean of clips 56.7%; corpus WER 56.2%.
- **Latency:** 1,674.1 ms mean per sentence against a 280 ms target — **MISS**.
- **Memory:** 1,020.5 MB RSS delta at load; 1,753.8 MB peak. **Disk:** 978.5 MB.
- **Model:** openai/whisper-small + LoRA, cpu only; no GPU, Raspberry Pi or Coral Edge TPU validation.
- **Sample size:** 3 clips from 3 speakers. Preliminary; not a clinical result.
<!-- END:generated:limits-summary -->

## What this prototype is

A CPU-only research prototype that transcribes short English sentences from people
with dysarthria and presents them in an accessible browser interface. It was built for
THREWS Odyssey 2026 and has not been used by any patient outside the team.

## What it does not do

- **It does not work on severe dysarthria.** The severe TORGO clip produces a sentence
  that is worse than the reference: the model invents words. This is shown, not hidden.
- **It is not clinically validated.** No speech-language pathologist reviewed outputs,
  no person with dysarthria used the app, and there is no medical-device certification.
- **It is not real-time.** A sentence takes seconds to transcribe, and the original
  latency target is missed. The demo is turn-based: speak, wait, read.
- **Three clips are not a benchmark.** Three speakers, one take each, no confidence
  intervals. TORGO also repeats sentences across speakers, so some sentence text may
  overlap between the adapter's training data and these clips; we have not measured that
  overlap.
- **Speaker independence is unproven.** The adapter was trained on TORGO speakers and
  evaluated on TORGO speakers. The demo clips may come from speakers who appear in the
  training portion; we have not measured or ruled that out.
- **No voice activity detection or endpointing.** The browser records a clip; the server
  transcribes the whole clip. Recordings are capped at 30 seconds, the model's window.
- **Near-silence is rejected, not detected.** A digital-silence clip returns an empty
  transcript instead of invented words, but a tone, background noise or other non-speech
  sound can still produce a word. There is no speech detector.
- **Long outputs are capped.** A very long utterance inside the 30-second window can be
  cut short by the model's generation limit.
- **No Raspberry Pi, ARM, Coral or GPU validation.** Benchmarks ran on one x86_64 desktop
  CPU.
- **Accessibility is designed, not audited.** The interface follows target-size and
  focus-visible practices (44x44 px minimum targets, visible focus rings, full keyboard
  operation), but no formal WCAG audit was performed.

## Data and licensing

- **Code:** MIT.
- **TORGO:** the dataset is distributed under the Linguistic Data Consortium's user
  agreement. The three demo WAV files in `frontend/public/audio/` are TORGO recordings
  included for evaluation; redistribution may require LDC permission. Check before
  publishing a fork with the audio included.
- **Adapter:** `Aaliya05/voicebridge` is a LoRA adapter trained on TORGO. Whether it may
  be redistributed is the same licensing question as the audio; it is public on Hugging
  Face today.

## Performance envelope

The measured latency, memory and disk figures above are for one machine, CPU-only,
with the model already loaded. A cold start adds several seconds for model load. A
machine with fewer cores will be slower in proportion.
