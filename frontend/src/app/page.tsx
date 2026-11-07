"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { TactileMicButton, MicState } from "@/components/TactileMicButton";
import { AudioWaveformCanvas } from "@/components/AudioWaveformCanvas";
import { TranscriptDisplay } from "@/components/TranscriptDisplay";
import { QuickAssistGrid } from "@/components/QuickAssistGrid";
import { ClinicalBenchmarkDrawer } from "@/components/ClinicalBenchmarkDrawer";
import { transcribeAudio } from "@/lib/transcriptionService";
import { ChevronDown, ChevronUp } from "lucide-react";

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
  confidence: number;
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

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<IWindowSpeechRecognition | null>(null);
  const capturedTextRef = useRef<string>("");
  const recognitionErrorRef = useRef<string | null>(null);

  // Real-time microphone audio volume tracking
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

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (recordedAudioUrl && recordedAudioUrl.startsWith("blob:")) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };
  }, [recordedAudioUrl]);

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

  const handleSelectPhrase = (phrase: string) => {
    setTranscript(phrase);
    setStatusNotice("Phrase selected • Tap 'Say it' to speak aloud");
  };

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
    <main className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 max-w-xl mx-auto selection:bg-amber-500/30 selection:text-amber-200">
      {/* 1. Header */}
      <header className="flex flex-col items-center justify-center pt-2 pb-4 text-center">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
          VoiceBridge
        </h1>
        <div className="mt-1.5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono text-zinc-400 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
          <span>Research prototype</span>
        </div>
      </header>

      {/* 2. Hero stage */}
      <section className="my-auto flex flex-col items-center gap-5 w-full">
        <div className="w-full">
          <TranscriptDisplay
            transcript={transcript}
            latencyMs={latencyMs}
            confidenceScore={confidenceScore}
            isProcessing={micState === "processing"}
            recordedAudioUrl={recordedAudioUrl}
            statusNotice={statusNotice}
            secondaryTranscript={secondaryTranscript}
            source={source}
            onClear={handleClear}
          />
        </div>

        <div className="w-full py-1">
          <AudioWaveformCanvas
            isRecording={micState === "listening"}
            audioAnalyser={audioAnalyser}
          />
        </div>

        <div className="py-1">
          <TactileMicButton
            state={micState}
            onToggle={handleToggleMic}
            audioLevel={audioLevel}
          />
        </div>

        <div className="w-full pt-1">
          <QuickAssistGrid onSpeakPhrase={handleSelectPhrase} />
        </div>
      </section>

      {/* 3. Clinical benchmark archive */}
      <footer className="pt-6 pb-2 border-t border-zinc-850/80 flex flex-col items-center gap-3 w-full">
        <button
          type="button"
          onClick={() => setShowJudgeConsole((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors py-1 px-3 rounded-lg bg-zinc-900 border border-zinc-800"
        >
          <span>Clinical Verification Archive (TORGO Dataset)</span>
          {showJudgeConsole ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        {showJudgeConsole && (
          <div className="w-full mt-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <ClinicalBenchmarkDrawer />
          </div>
        )}

        <div className="text-[10px] sm:text-[11px] font-mono text-zinc-600 text-center">
          Research prototype • Not a medical device • SIES GST
        </div>
      </footer>
    </main>
  );
}