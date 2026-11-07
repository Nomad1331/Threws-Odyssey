/**
 * VoiceBridge Universal 16kHz Mono WAV Recorder
 * THREWS Odyssey 2026 • Assistive Speech Technology
 *
 * Captures microphone stream via standard Web Audio API,
 * downsamples to 16kHz mono PCM, and generates a valid 16-bit WAV Blob.
 * Universally compatible across Brave, Firefox, Chrome, Edge, and Safari.
 */

function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (outputRate === inputRate) {
    return buffer;
  }
  if (outputRate > inputRate) {
    return buffer; // Do not upsample
  }
  const sampleRateRatio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF Chunk Descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true); // ChunkSize
  writeString(view, 8, "WAVE");

  // "fmt " sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true); // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate (16000)
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample (16)

  // "data" sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true); // Subchunk2Size

  // Write 16-bit PCM samples with clipping protection
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, val, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export class UniversalAudioRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private chunks: Float32Array[] = [];
  private inputSampleRate = 44100;
  private isRecording = false;

  async start(): Promise<{ stream: MediaStream; analyser: AnalyserNode }> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.mediaStream = stream;
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    const ctx = new AudioContextClass();
    this.audioContext = ctx;
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {}
    }
    this.inputSampleRate = ctx.sampleRate;
    this.chunks = [];
    this.isRecording = true;

    const source = ctx.createMediaStreamSource(stream);

    // Analyser node for live 60FPS visualizer
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    this.analyser = analyser;

    // ScriptProcessor to capture raw PCM chunks
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    this.processor = processor;

    processor.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const channelData = e.inputBuffer.getChannelData(0);
      this.chunks.push(new Float32Array(channelData));
      // Zero out speaker output to prevent acoustic feedback loop
      const outputData = e.outputBuffer.getChannelData(0);
      outputData.fill(0);
    };

    source.connect(processor);

    // Connect through a zero-gain node so Chrome/Firefox keep running processor without speaker playback
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0;
    processor.connect(gainNode);
    gainNode.connect(ctx.destination);

    return { stream, analyser };
  }

  /**
   * Generates a 16kHz WAV snapshot of the audio recorded so far
   * without interrupting or stopping the active recording stream.
   */
  getSnapshotWav(): Blob | null {
    if (!this.isRecording || this.chunks.length === 0) return null;
    const totalLength = this.chunks.reduce((acc, c) => acc + c.length, 0);
    if (totalLength === 0) return null;

    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const targetSampleRate = 16000;
    const resampled = downsampleBuffer(merged, this.inputSampleRate, targetSampleRate);

    // Apply gentle 40ms cosine window taper at the snapshot tail
    // to prevent FFT spectral leakage and phantom boundary consonant hallucinations
    const fadeSamples = Math.min(640, resampled.length); // 40ms at 16kHz
    if (fadeSamples > 0) {
      const startIndex = resampled.length - fadeSamples;
      for (let i = 0; i < fadeSamples; i++) {
        const factor = 0.5 * (1 + Math.cos((Math.PI * i) / fadeSamples));
        resampled[startIndex + i] *= factor;
      }
    }

    return encodeWAV(resampled, targetSampleRate);
  }

  async stop(): Promise<Blob> {
    this.isRecording = false;

    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch {}
      this.processor = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      try {
        await this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    // Concatenate captured PCM chunks
    const totalLength = this.chunks.reduce((acc, c) => acc + c.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    // Downsample to 16kHz mono (optimal Whisper INT8 input)
    const targetSampleRate = 16000;
    const resampled = downsampleBuffer(merged, this.inputSampleRate, targetSampleRate);

    // Encode to 16-bit uncompressed WAV
    return encodeWAV(resampled, targetSampleRate);
  }
}
