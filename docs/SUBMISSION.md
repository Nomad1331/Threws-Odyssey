# VoiceBridge — Submission Copy

## Project Title

VoiceBridge: Assistive Speech Transcription for Dysarthric Speech

## Problem Statement

Dysarthria — impaired speech from cerebral palsy, ALS, traumatic brain injury and
related conditions — breaks ordinary automatic speech recognition. People who rely
on their voice to communicate can be left with unusable text, especially when a tool
requires a cloud speech API, a GPU, or a fast connection. Accessible, CPU-only
transcription that keeps the interaction simple is still uncommon.

## Proposed Solution

VoiceBridge pairs a CPU-only FastAPI backend (`whisper-small` + a PEFT LoRA adapter
adapted to three TORGO speakers) with an accessible Next.js interface: a large tactile
mic, live waveform, confidence and latency, browser text-to-speech, and AAC phrase
cards. The frontend and backend are deployed on Vercel; the backend runs in a container
image with a sharded model, so no GPU or external speech API is used.

Measured on the three TORGO demo clips: **0.0% / 16.7% / 0.0% WER**. This is
**speaker-dependent adaptation** to the three demo speakers, not a general dysarthria
model: no fourth speaker has been evaluated, live microphone accuracy is unmeasured,
and full limits are in `LIMITS.md`.

## Working Demo / Deployment Link

- App: https://voicebridge-threws.vercel.app
- Backend health: https://voicebridge-api-six.vercel.app/health
- Model: https://huggingface.co/Nomad1331/voicebridge

## Project Demo Video

- Video (49 s, 1080p, narrated): https://voicebridge-threws.vercel.app/demo/voicebridge-demo.mp4
- Local file: `frontend/public/demo/voicebridge-demo.mp4`
