# 🧭 VoiceBridge System Walkthrough & Code Tour
### The Complete End-to-End Architectural Guide
> **Target Audience:** Engineering Teammates, Technical Evaluators, and Code Reviewers  
> **Repository:** [Nomad1331/Threws-Odyssey](https://github.com/Nomad1331/Threws-Odyssey)  
> **Branch:** `voicebridge-clean`

---

## 📌 1. Project Purpose & Core Problem

Automatic Speech Recognition (ASR) systems (OpenAI Whisper, Google Speech API, Apple Siri) are trained on fluent, normative speech. For individuals with **dysarthria**—neuromotor speech impairments resulting from Cerebral Palsy (CP), Amyotrophic Lateral Sclerosis (ALS), or Traumatic Brain Injury (TBI)—these models collapse, yielding **65% to 80% Word Error Rates (WER)**.

**VoiceBridge** is an open-source assistive speech transcription prototype built on two principles:
1. **Edge AI Optimization:** Executes a quantized **INT8 Whisper model on standard consumer CPUs** (Intel Core i5) without requiring discrete GPUs or cloud APIs (103MB memory footprint, ~400ms latency).
2. **Physical Accessibility:** Designed specifically for motor-impaired individuals with WCAG 2.1 AAA touch targets, physical keyboard shortcuts (<kbd>SPACE</kbd>), tactile haptic feedback, and accidental-trigger protection.

---

## 🔄 2. End-to-End Data Lifecycle Diagram

```
[ User Presses Speak (or taps SPACE) ]
                     │
                     ▼
  [ 1. Web Audio API & MediaRecorder ]  <--- (frontend/src/hooks/useAudioRecorder.ts)
  • Captures 16kHz microphone stream
  • Computes live RMS volume for 60FPS waveform
  • Packages audio into a WebM / WAV Blob
                     │
                     ▼
  [ 2. HTTP POST API Request ]          <--- (frontend/src/lib/transcriptionService.ts)
  • Wraps Blob in multipart/form-data
  • POST http://127.0.0.1:8000/api/v1/translate-audio
                     │
                     ▼
  [ 3. FastAPI Gateway ]                <--- (backend/app/main.py)
  • Ingests audio, writes temp file
  • Measures wall-clock execution time
                     │
                     ▼
  [ 4. faster-whisper INT8 CPU Engine ] <--- (backend/app/inference.py)
  • Model: tiny.en quantized to INT8
  • CTranslate2 C++ runtime on 4 CPU threads
  • Generates transcript string + confidence score
                     │
                     ▼
  [ 5. JSON Response to Browser ]
  • {"transcription": "...", "confidence_score": 0.85, "processing_time_ms": 409}
                     │
                     ▼
  [ 6. Accessible UI Rendering ]        <--- (frontend/src/components/TranscriptDisplay.tsx)
  • Large high-contrast typography
  • Telemetry bar (latency & confidence)
  • "Say it" button invokes browser SpeechSynthesis TTS
```

---

## 🚶 3. Step-by-Step Execution Walkthrough

Here is exactly what happens in memory and across the network from the moment the servers boot to when words appear on screen:

### Step 1: Server Boot & Pre-Warming
* **Backend (`backend/app/main.py`):**
  When you run `uvicorn app.main:app`, FastAPI's `@asynccontextmanager lifespan` executes **before** the server accepts traffic. It calls `load_model()`, loading the `tiny.en` INT8 CTranslate2 model into RAM once (~103MB). This ensures the very first user transcription has zero cold-start delay.
* **Frontend (`frontend/src/app/page.tsx`):**
  When Next.js mounts in the browser, a `useEffect` sends a quick ping to `GET http://127.0.0.1:8000/health`. If the server responds with HTTP 200, the top-right header badge flips from gray to green (`Backend connected`).

### Step 2: Audio Capture
* The user either taps the large circular record button (`TactileMicButton.tsx`) or hits the physical <kbd>SPACE</kbd> bar.
* `useAudioRecorder.ts` calls `navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } })`.
* It branches the stream into two nodes:
  1. **`AnalyserNode` (Web Audio API):** Computes root-mean-square (RMS) volume every animation frame to animate the live waveform (`AudioWaveformCanvas.tsx`) and pulse the record button.
  2. **`MediaRecorder`:** Accumulates audio data packets in memory at 250ms intervals.

### Step 3: Stop & Audio Blob Assembly
* Tapping the button again (or hitting <kbd>SPACE</kbd>) calls `stopRecording()`.
* The `MediaRecorder` fires its `onstop` callback, bundling all buffered audio slices into a single unified `Blob` (`audio/webm` or `audio/wav`).
* All hardware microphone tracks are closed immediately to release the device.

### Step 4: Network Transmission
* `page.tsx` passes the `Blob` to `transcribeAudio(audioBlob)` in `transcriptionService.ts`.
* The service packages the blob into a standard HTML5 `FormData` object:
  ```typescript
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");
  ```
* It executes an asynchronous `fetch()` to `http://127.0.0.1:8000/api/v1/translate-audio` with a 30-second `AbortController` timeout safeguard.

### Step 5: Backend Inference
* In `backend/app/main.py`, FastAPI receives the upload as an `UploadFile`.
* It writes the bytes to an OS temporary file (`tempfile.NamedTemporaryFile`) so CTranslate2's underlying C++ audio decoder (`libsndfile`) can stream the audio without memory leaks.
* It calls `transcribe_audio(temp_path)` in `backend/app/inference.py`:
  * Runs greedy `beam_size=1` decoding on the INT8 quantized model.
  * `vad_filter=False` is deliberately set so dysarthric speech pauses and low-energy articulation aren't mistakenly clipped.
* The backend computes elapsed time and returns a validated Pydantic JSON response:
  ```json
  {
    "transcription": "We are having a team.",
    "confidence_score": 0.85,
    "processing_time_ms": 409
  }
  ```
* In the `finally` block, `os.unlink(temp_path)` guarantees the temporary file is deleted from disk.

### Step 6: UI Display & Text-to-Speech Playback
* `page.tsx` receives the JSON payload and updates React state:
  * `transcript`: The reconstructed sentence.
  * `latencyMs`: 409 ms.
  * `confidenceScore`: 85%.
* `TranscriptDisplay.tsx` updates immediately with the text.
* The user can click **"Say it"** (`Volume2` icon) to have the browser's native `SpeechSynthesis` read the reconstructed sentence aloud at a comfortable conversational pace (0.95x rate).

---

## 📂 4. Complete File-by-File Blueprint

### Backend Microservice (`/backend`)
| File | Responsibility |
| :--- | :--- |
| **`requirements.txt`** | Minimal, production-tested dependencies (6 packages: `fastapi`, `uvicorn`, `faster-whisper`, `soundfile`, `python-multipart`, `numpy`). Zero heavy PyTorch/CUDA bloat. |
| **`app/main.py`** | FastAPI application setup, CORS configuration, `@app.get("/health")`, and `@app.post("/api/v1/translate-audio")` route with tempfile cleanup. |
| **`app/inference.py`** | Singleton `load_model()` and `transcribe_audio()` functions executing faster-whisper INT8 on CPU with greedy decoding. |

### Frontend Application (`/frontend/src`)
| File | Responsibility |
| :--- | :--- |
| **`app/page.tsx`** | Main 2-column page layout. Manages global transcription state, backend health polling, and coordinates child components. |
| **`app/layout.tsx`** | Root HTML document shell, Geist font variables, high-contrast WCAG dark mode styles. |
| **`hooks/useAudioRecorder.ts`** | Isolated custom React hook handling microphone permission, `MediaRecorder` lifecycle, Web Audio API `AnalyserNode`, and real-time RMS volume. |
| **`lib/transcriptionService.ts`** | Fetch client for the FastAPI backend. Builds multipart form data, manages timeouts, and normalizes API errors. |
| **`components/TactileMicButton.tsx`** | Large circular record button with haptic vibration (`navigator.vibrate`), live volume pulse animation, and global <kbd>SPACE</kbd> hotkey. |
| **`components/TranscriptDisplay.tsx`** | Displays reconstructed text, live waveform canvas, confidence/latency telemetry, and the "Say it" browser text-to-speech button. |
| **`components/QuickAssistGrid.tsx`** | 5 high-frequency assistive phrase buttons (Water, Caregiver, Yes, No, Pain Alert) with a 2-step confirmation window on Pain Alert. |
| **`components/ClinicalBenchmarkDrawer.tsx`** | Collapsible evaluation archive allowing users and judges to listen to authentic University of Toronto TORGO dysarthria audio clips (M05, M04, M02). |
| **`components/AudioWaveformCanvas.tsx`** | High-DPI HTML5 Canvas 2D component rendering real-time 48-bar audio frequency/waveform visualizations. |

### Project Root & Documentation
| File | Responsibility |
| :--- | :--- |
| **`README.md`** | Public repository landing page with project motivation, verified benchmarks, and 60-second quickstart guides. |
| **`facts.json`** | Single source of truth anchoring all benchmarked numbers (74.4% size cut, 103MB RAM, 592ms latency) to prevent contradictory claims. |
| **`docs/EDGE_AI_BENCHMARK_RESULTS.md`** | Comprehensive hardware benchmark log comparing FP32 baseline Whisper vs VoiceBridge INT8 CPU execution. |
| **`docs/DATASETS_AND_PROOF.md`** | Clinical citation and provenance documentation for the University of Toronto TORGO corpus. |
| **`docs/COMPETITIVE_ANALYSIS.md`** | Market and technical comparison against Google Project Euphonia, Project Relate, UIUC Speech Accessibility Project, and Voiceitt. |

---

## 💡 5. Key Engineering Decisions & Trade-Offs

### 1. Why `faster-whisper` INT8 on CPU instead of standard PyTorch?
* **Problem:** Standard PyTorch Whisper requires downloading a 2GB+ CUDA runtime, takes 1,480ms on CPU, and consumes over 380MB of RAM.
* **Solution:** faster-whisper compiles the model down to C++ via CTranslate2. By applying dynamic 8-bit quantization (INT8), model weights drop from **151.7 MB to 38.9 MB (74.4% reduction)** and active RAM drops to **103 MB**.
* **Impact:** The system runs at a **0.10 Real-Time Factor (RTF)** on standard laptop CPUs with zero GPU requirements.

### 2. Why browser-native `MediaRecorder` instead of custom PCM buffers?
* **Problem:** Custom `ScriptProcessorNode` buffers (like the deleted `wavRecorder.ts`) run on the browser's main JavaScript thread, causing audio glitches and high CPU overhead on mobile devices.
* **Solution:** Modern `MediaRecorder` runs in a dedicated browser audio thread, encoding native 16kHz Opus/WebM with zero main-thread jank.

### 3. Why two-step confirmation on "Pain Alert"?
* **Problem:** Individuals with spastic Cerebral Palsy or ALS experience involuntary tremors or motor spasms, making accidental taps common.
* **Solution:** Clicking "Pain Alert" does not fire immediately; it enters an "Armed" state and requires a second confirmation tap within a 3-second window. Standard phrases (Water, Yes, No) fire with a single tap.

---

## 🧪 6. Developer 60-Second Sanity Check

To verify the entire pipeline end-to-end on any machine:

1. **Check Backend Readiness:**
   ```bash
   curl http://127.0.0.1:8000/health
   # Expected output: {"status":"healthy","service":"VoiceBridge ASR Service","engine":"whisper-tiny-int8"}
   ```

2. **Test End-to-End Transcription via API:**
   ```bash
   python -c "
   import urllib.request, uuid
   boundary = uuid.uuid4().hex
   with open(r'frontend/public/audio/torgo_mild_sample.wav', 'rb') as f: data = f.read()
   body = (f'--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"sample.wav\"\r\nContent-Type: audio/wav\r\n\r\n').encode() + data + f'\r\n--{boundary}--\r\n'.encode()
   req = urllib.request.Request('http://127.0.0.1:8000/api/v1/translate-audio', data=body, headers={'Content-Type': f'multipart/form-data; boundary={boundary}'})
   print(urllib.request.urlopen(req).read().decode())
   "
   ```
   **Expected output:** `{"transcription":"We are having a team.","confidence_score":...,"processing_time_ms":409}`

3. **Verify Frontend Production Build:**
   ```bash
   cd frontend
   npm run build
   # Expected output: Compiled successfully. Linting and checking validity of types... Static pages generated (5/5).
   ```
