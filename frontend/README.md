# VoiceBridge Accessible Frontend

Next.js 14 client application for VoiceBridge, designed specifically for motor accessibility and real-time speech transcription.

## Features
- **Accessible Controls:** Large touch targets compliant with WCAG 2.1 AAA recommendations and global <kbd>SPACE</kbd> keyboard hotkey.
- **Real-Time Visual Feedback:** Live HTML5 Canvas 2D waveform driven by Web Audio API RMS volume analysis.
- **Accidental Trigger Protection:** 2-step confirmation window on sensitive phrases ("Pain Alert").
- **On-Demand Speech Output:** Client-side speech synthesis ("Say it") powered by browser SpeechSynthesis.
- **Clinical Benchmark Drawer:** Play authentic University of Toronto TORGO reference audio recordings (Mild CP, Moderate TBI, Severe ALS).

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
