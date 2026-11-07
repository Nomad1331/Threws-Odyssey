"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { TactileMicButton, MicState } from "@/components/TactileMicButton";
import { TranscriptDisplay } from "@/components/TranscriptDisplay";
import { QuickAssistGrid } from "@/components/QuickAssistGrid";
import { ClinicalBenchmarkDrawer } from "@/components/ClinicalBenchmarkDrawer";
import { transcribeAudio } from "@/lib/transcriptionService";
import { ChevronDown, ChevronUp, Mic } from "lucide-react";

interface IWindowSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

interface SpeechRecognitionResultItem {
  transcript: string;
confidence: number | null;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionResultItem;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

type SourceType = "fastapi-backend" | "web-speech" | "unavailable";

export default function Home() {
  const [micState, setMicState] = useState<MicState>("idle");
  const [transcript, setTranscript] = useState<string>("");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [audioAnalyser, setAudioAnalyser] = useState<AnalyserNode | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | undefined>(undefined);
  const [secondaryTranscript, setSecondaryTranscript] = useState<string | undefined>(undefined);
  const [source, setSource] = useState<SourceType | undefined>(undefined);
  const [showJudgeConsole, setShowJudgeConsole] = useState<boolean>(false);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<IWindowSpeechRecognition | null>(null);
  const capturedTextRef = useRef<string>("");
  const recognitionErrorRef = useRef<string | null>(null);

  // Live microphone level for the waveform and mic button
  useEffect(() => {
    if (!audioAnalyser || micState !== "listening") {
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
  }, [audioAnalyser, micState]);

  // Revoke the object URL when it changes or on unmount
  useEffect(() => {
    return () => {
      if (recordedAudioUrl && recordedAudioUrl.startsWith("blob:")) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };
  }, [recordedAudioUrl]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 2000);

    fetch("http://127.0.0.1:8000/health", { signal: controller.signal })
      .then((response) => setBackendConnected(response.status === 200))
      .catch(() => setBackendConnected(false))
      .finally(() => window.clearTimeout(timeoutId));

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  // Toggle live microphone recording with MediaRecorder.
  const handleToggleMic = useCallback(async () => {
    if (micState === "listening") {
      setMicState("processing");
      setStatusNotice("Processing audio...");

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn("Speech recognition stop notice:", e);
        }
      }

      const finalizeProcessing = async () => {
        let audioBlob: Blob;
        if (audioChunksRef.current.length > 0) {
          const mime = mediaRecorderRef.current?.mimeType || "audio/webm";
          audioBlob = new Blob(audioChunksRef.current, { type: mime });
        } else {
          audioBlob = new Blob([], { type: "audio/webm" });
        }

        if (audioBlob.size > 0) {
          const newUrl = URL.createObjectURL(audioBlob);
          setRecordedAudioUrl((prev) => {
            if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
            return newUrl;
          });
        }

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
          await audioContextRef.current.close();
          audioContextRef.current = null;
        }
        setAudioAnalyser(null);
        setAudioLevel(0);

        const result = await transcribeAudio(
          audioBlob,
          capturedTextRef.current,
          recognitionErrorRef.current
        );

        setTranscript(result.text);
        setLatencyMs(result.latencyMs);
        setConfidenceScore(result.confidence);
        setStatusNotice(result.statusNotice);
        setSecondaryTranscript(result.secondaryText);
        setSource(result.source);
        setMicState("idle");
        // No auto-speak: the user taps "Say it" to hear the result.
      };

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.onstop = () => {
          finalizeProcessing();
        };
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.warn("MediaRecorder stop error:", e);
          finalizeProcessing();
        }
      } else {
        finalizeProcessing();
      }
    } else if (micState === "idle") {
      capturedTextRef.current = "";
      recognitionErrorRef.current = null;
      audioChunksRef.current = [];
      setStatusNotice("Capturing microphone stream...");

      let stream: MediaStream | null = null;
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          mediaStreamRef.current = stream;

          const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const ctx = new AudioContextClass();
          audioContextRef.current = ctx;

          const sourceNode = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 128;
          sourceNode.connect(analyser);

          setAudioAnalyser(analyser);
        }
      } catch (err) {
        console.warn("Microphone hardware error:", err);
      }

      if (stream) {
        try {
          let selectedMime = "audio/webm;codecs=opus";
          if (typeof MediaRecorder !== "undefined") {
            if (!MediaRecorder.isTypeSupported(selectedMime)) {
              selectedMime = "audio/webm";
              if (!MediaRecorder.isTypeSupported(selectedMime)) {
                selectedMime = "";
              }
            }

            const recorder = selectedMime
              ? new MediaRecorder(stream, { mimeType: selectedMime })
              : new MediaRecorder(stream);

            audioChunksRef.current = [];
            recorder.ondataavailable = (event: BlobEvent) => {
              if (event.data && event.data.size > 0) {
                audioChunksRef.current.push(event.data);
              }
            };

            recorder.start(100);
            mediaRecorderRef.current = recorder;
          }
        } catch (recErr) {
          console.warn("MediaRecorder setup error:", recErr);
        }
      }

      const win = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : {};
      const SpeechRecognitionClass = (win.SpeechRecognition || win.webkitSpeechRecognition) as
        | { new (): IWindowSpeechRecognition }
        | undefined;

      if (SpeechRecognitionClass) {
        try {
          const recognition = new SpeechRecognitionClass();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";

          recognition.onresult = (event: SpeechRecognitionEvent) => {
            let fullText = "";
            for (let i = 0; i < event.results.length; ++i) {
              fullText += event.results[i][0].transcript + " ";
            }
            const clean = fullText.trim();
            if (clean) capturedTextRef.current = clean;
          };

          recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.warn("Speech recognition notice:", event.error);
            recognitionErrorRef.current = event.error;
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.warn("Speech recognition initialization failed:", e);
        }
      }

      setMicState("listening");
    }
  }, [micState]);

  const handleClear = () => {
    setTranscript("");
    setLatencyMs(null);
    setConfidenceScore(null);
    setStatusNotice(undefined);
    setSecondaryTranscript(undefined);
    setSource(undefined);
    setRecordedAudioUrl((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col bg-canvas px-4 py-6 text-text-primary sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-border bg-surface">
            <Mic className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-text-primary">VoiceBridge</h1>
            <p className="text-sm text-text-secondary">
              Dysarthria speech recognition research prototype
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start rounded-[6px] border border-border bg-surface px-3 py-2 font-mono text-[10px] text-text-secondary sm:self-auto">
          <span className={`h-2 w-2 rounded-full ${backendConnected ? "bg-accent" : "bg-text-secondary"}`} />
          <span>
            {backendConnected
              ? "Backend connected"
              : "Backend not running. Start with: uvicorn backend.app.main:app --port 8000"}
          </span>
        </div>
      </header>

      <section className="grid flex-1 grid-cols-1 items-start gap-8 py-8 lg:grid-cols-2 lg:gap-12">
        <section className="flex flex-col items-center gap-5 w-full">
          <TranscriptDisplay
            transcript={transcript}
            latencyMs={latencyMs}
            confidenceScore={confidenceScore}
            isProcessing={micState === "processing"}
            recordedAudioUrl={recordedAudioUrl}
            statusNotice={statusNotice}
            secondaryTranscript={secondaryTranscript}
            source={source}
            audioAnalyser={audioAnalyser}
            isRecording={micState === "listening"}
            onClear={handleClear}
          />
        </section>

        <section className="flex w-full flex-col items-center gap-8 rounded-[6px] border border-border bg-surface p-5 sm:p-8">
          <TactileMicButton
            state={micState}
            onToggle={handleToggleMic}
            audioLevel={audioLevel}
          />
          <QuickAssistGrid onSpeakPhrase={(phrase) => setTranscript(phrase)} />
        </section>
      </section>

      <footer className="w-full border-t border-border pt-6">
        <button
          type="button"
          onClick={() => setShowJudgeConsole((prev) => !prev)}
          className="flex min-h-[44px] w-full items-center justify-between rounded-[6px] border border-border bg-surface px-4 text-left font-mono text-xs text-text-primary transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-3"
        >
          <span>Clinical Verification Archive (TORGO Dataset)</span>
          {showJudgeConsole ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        {showJudgeConsole && (
          <div className="mt-3 w-full max-w-3xl rounded-[6px] border border-border bg-surface p-4">
            <div className="mb-4 space-y-2 text-sm text-text-secondary">
              <p>TORGO dataset (Rudzicz, Namasivayam, Wolff, 2012). Used for research evaluation. Licence terms: see README.</p>
              <p>Model results: pending evaluation run.</p>
            </div>
            <ClinicalBenchmarkDrawer />
          </div>
        )}

        <div className="pt-5 text-center font-mono text-[10px] text-text-secondary">
          Research prototype • Not a medical device • SIES GST
        </div>
      </footer>
    </main>
  );
}