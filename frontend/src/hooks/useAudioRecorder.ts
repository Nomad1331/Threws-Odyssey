"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type RecordingState = "idle" | "listening" | "processing";

export interface AudioRecorderHook {
  state: RecordingState;
  audioLevel: number;
  audioAnalyser: AnalyserNode | null;
  recordedAudioUrl: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  clearRecordedAudio: () => void;
  setIdle: () => void;
}

/**
 * Custom React hook for capturing microphone audio and computing real-time volume.
 * Provides a clean interface for UI buttons, waveform visualizers, and backend transcription.
 *
 * Architecture & Design Highlights:
 * 1. 16kHz Mono Capture: Captures 1-channel 16,000 Hz audio directly from the browser hardware
 *    layer to match Whisper's expected acoustic sample rate and minimize network payload size.
 * 2. Disabled Noise Suppression: Set to false intentionally because standard browser AGC/noise
 *    suppression algorithms often erroneously discard atypical dysarthric phonations (such as
 *    breathy fricatives and low-energy formant transitions) as ambient noise.
 * 3. Dual-Branch Stream: Feeds into both an AnalyserNode (for 60 FPS live waveform rendering)
 *    and a MediaRecorder (for binary audio chunking).
 * 4. Resource Hygiene: Guarantees full microphone track termination and AudioContext closure on stop.
 */
export function useAudioRecorder(): AudioRecorderHook {
  const [state, setState] = useState<RecordingState>("idle");
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [audioAnalyser, setAudioAnalyser] = useState<AnalyserNode | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Compute real-time RMS volume for waveform animations
  useEffect(() => {
    if (!audioAnalyser || state !== "listening") {
      setAudioLevel(0);
      return;
    }

    let animId: number;
    const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);

    const checkVolume = () => {
      audioAnalyser.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const norm = (dataArray[i] - 128) / 128;
        sum += norm * norm;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      setAudioLevel(Math.min(rms * 5.0, 1.0));
      animId = requestAnimationFrame(checkVolume);
    };

    checkVolume();
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [audioAnalyser, state]);

  // Clean up object URLs on change and unmount
  useEffect(() => {
    return () => {
      if (recordedAudioUrl && recordedAudioUrl.startsWith("blob:")) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };
  }, [recordedAudioUrl]);

  // Clean up active hardware microphone stream and audio context on component unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        try {
          audioContextRef.current.close();
        } catch {
          // Context already closed
        }
        audioContextRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Recorder already inactive
        }
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    audioChunksRef.current = [];

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone API is not supported on this browser or requires HTTPS.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // Web Audio API for volume and frequency visualization
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      
      let ctx: AudioContext;
      try {
        ctx = new AudioContextClass({ sampleRate: 16000 });
      } catch {
        // Fallback for older WebKit / Safari engines that reject constructor options
        ctx = new AudioContextClass();
      }
      audioContextRef.current = ctx;

      const sourceNode = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      sourceNode.connect(analyser);
      setAudioAnalyser(analyser);

      // Select supported audio MIME type
      const mimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", ""];
      let selectedMime = "";
      for (const mime of mimeTypes) {
        if (mime === "" || MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const recorder = selectedMime
        ? new MediaRecorder(stream, { mimeType: selectedMime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(250);
      setState("listening");
    } catch (err) {
      console.error("Microphone access denied:", err);
      throw err;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    setState("processing");

    return new Promise<Blob | null>((resolve) => {
      const finish = () => {
        let blob: Blob | null = null;
        if (audioChunksRef.current.length > 0) {
          const mime = mediaRecorderRef.current?.mimeType || "audio/webm";
          blob = new Blob(audioChunksRef.current, { type: mime });
          audioChunksRef.current = []; // Free slice chunk buffers from memory
          const url = URL.createObjectURL(blob);
          setRecordedAudioUrl(url);
        }

        // Clean up media streams and audio context
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
          try {
            audioContextRef.current.close();
          } catch {
            // Context closed
          }
          audioContextRef.current = null;
        }
        setAudioAnalyser(null);
        // Note: Retain "processing" state until caller completes transcription and invokes setIdle()
        resolve(blob);
      };

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.onstop = finish;
        try {
          mediaRecorderRef.current.stop();
        } catch {
          finish();
        }
      } else {
        finish();
      }
    });
  }, []);

  const clearRecordedAudio = useCallback(() => {
    if (recordedAudioUrl && recordedAudioUrl.startsWith("blob:")) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    setRecordedAudioUrl(null);
  }, [recordedAudioUrl]);

  const setIdle = useCallback(() => {
    setState("idle");
  }, []);

  return {
    state,
    audioLevel,
    audioAnalyser,
    recordedAudioUrl,
    startRecording,
    stopRecording,
    clearRecordedAudio,
    setIdle,
  };
}
