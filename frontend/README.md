# VoiceBridge Accessible Frontend

Next.js 14 client application for VoiceBridge, designed for motor accessibility and
assistive (not real-time) speech transcription.

## Features
- **Accessible Controls:** Large touch targets (at least 44x44 px) and a <kbd>SPACE</kbd> keyboard shortcut that yields to focused controls. Designed to accessible practice; not formally audited.
- **Live Visual Feedback:** HTML5 Canvas 2D waveform driven by Web Audio API RMS volume analysis.
- **Accidental Trigger Protection:** Two-step confirmation with a deliberate gap between taps on sensitive phrases ("Pain Alert").
- **On-Demand Speech Output:** Client-side speech synthesis ("Say it") powered by browser SpeechSynthesis.
- **Recording Replay:** Replay the clip you just recorded before or after transcription.
- **Clinical Benchmark Drawer:** Play authentic University of Toronto TORGO reference audio recordings (Mild CP, Moderate TBI, Severe ALS) and transcribe them live.

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Development
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### Production Build
```bash
npm run build
```
Verifies TypeScript compilation and builds static optimized production pages.
