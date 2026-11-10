# VoiceBridge — Limits

This file exists so nobody has to discover the limits the hard way. Every number
here is rendered from `facts.json` by `benchmarks/render_docs.py`; nothing is typed.

<!-- BEGIN:generated:limits-summary -->
- **Accuracy:** mild **0.0%**, moderate-to-severe **16.7%**, severe **0.0%** word error rate on the 3 demo clips (3 speakers). Mean of clips 5.6%; corpus WER 6.2%.
- **Latency:** 1,564.7 ms mean per sentence against a 280 ms target — **MISS**.
- **Memory:** 1,019.9 MB RSS delta at load; 1,747 MB peak. **Disk:** 978.5 MB.
- **Model:** openai/whisper-small + LoRA, cpu only; no GPU, Raspberry Pi or Coral Edge TPU validation.
- **Sample size:** 3 clips from 3 speakers. Preliminary; not a clinical result.
<!-- END:generated:limits-summary -->

## What this prototype is

A CPU-only research prototype that transcribes short English sentences from people
with dysarthria and presents them in an accessible browser interface. It was built for
THREWS Odyssey 2026 and has not been used by any patient outside the team.

## What it does not do

- **It is speaker-adapted to three TORGO speakers, not general.** The shipped adapter
  was further trained on 443 other utterances from M02, M04 and M05, with the 11 rows
  whose text matches the demo sentences excluded. It transcribes those three demo clips
  near-exactly, but it has **not been evaluated on any other speaker**; severe dysarthria
  from a new speaker remains unsupported. Do not quote 5.6% as general accuracy.
- **It is not clinically validated.** No speech-language pathologist reviewed outputs,
  no person with dysarthria used the app, and there is no medical-device certification.
- **It is not real-time.** A sentence takes seconds to transcribe, and the original
  latency target is missed. The demo is turn-based: speak, wait, read.
- **Three clips are not a benchmark.** Three speakers, one take each, no confidence
  intervals. The exact demo sentences were excluded from adaptation, but the adapter saw
  443 other utterances from the same three speakers; this measures speaker adaptation,
  not unseen-speaker accuracy.
- **Live microphone accuracy is not what we measured.** The WER figures come from the
  three provided clips, recorded with the TORGO head-mounted microphone. A laptop or phone
  microphone, distance, background noise and take-to-take variation change the output; the
  same sentence can come out right on one take and wrong on the next.
- **Confidence is not accuracy.** The percentage shown under a transcript is the model's
  average token probability, not the share of words that are correct.
- **Speaker independence is unproven; this build is deliberately speaker-dependent.** The
  adapter was trained on the same three speakers whose clips it is scored on. No fourth
  speaker has been evaluated. Do not present it as working across dysarthric speakers.
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
- **Adapter:** the initial adapter is `Aaliya05/voicebridge`; the shipped adapter is a
  further adaptation trained on TORGO and is redistributed in `backend/models/` under the
  same TORGO/LDC licensing question as the audio. Check before publishing a fork.

## Performance envelope

The measured latency, memory and disk figures above are for one machine, CPU-only,
with the model already loaded. A cold start adds several seconds for model load. A
machine with fewer cores will be slower in proportion.
