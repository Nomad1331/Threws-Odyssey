"use client";

import React, { useState, useEffect, useCallback } from "react";
import { TactileMicButton } from "@/components/TactileMicButton";
import { TranscriptDisplay } from "@/components/TranscriptDisplay";
import { QuickAssistGrid } from "@/components/QuickAssistGrid";
import { ClinicalBenchmarkDrawer } from "@/components/ClinicalBenchmarkDrawer";
import { transcribeAudio, checkBackendHealth } from "@/lib/transcriptionService";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { ChevronDown, ChevronUp, Mic } from "lucide-react";

/**
 * VoiceBridge Application Root Stage (Next.js 14 App Router)
 * ==========================================================
 * Orchestrates the primary 2-column accessible interface:
 *
 * Left Column:
 * - TranscriptDisplay: Shows reconstructed speech, confidence score, wall-clock latency,
 *   live 60FPS waveform visualizer, and "Say it" browser Text-to-Speech playback.
 *
 * Right Column:
 * - TactileMicButton: Large 112px motor-accessible button with live RMS volume pulsing,
 *   haptic vibration feedback, and global spacebar hotkey listener.
 * - QuickAssistGrid: 5 AAC emergency care phrases with 2-step confirmation window on Pain Alert.
 *
 * Footer:
 * - Collapsible Clinical Verification Archive with authentic University of Toronto TORGO clips.
 */

export default function Home() {
  const {
    state: micState,
    audioLevel,
    audioAnalyser,
    recordedAudioUrl,
    startRecording,
    stopRecording,
    clearRecordedAudio,
    setIdle,
  } = useAudioRecorder();

  // Transcription state
  const [transcript, setTranscript] = useState<string>("");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | undefined>(undefined);
  const [source, setSource] = useState<"voicebridge-backend" | "unavailable" | undefined>(undefined);

  // UI state
  const [showJudgeConsole, setShowJudgeConsole] = useState<boolean>(false);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);

  // Check backend server health on mount
  useEffect(() => {
    let active = true;
    checkBackendHealth(2500).then((healthy) => {
      if (active) setBackendConnected(healthy);
    });
    return () => {
      active = false;
    };
  }, []);

  // Handle microphone start / stop toggle
  const handleToggleMic = useCallback(async () => {
    if (micState === "processing") return;

    if (micState === "listening") {
      setStatusNotice("Processing audio...");
      try {
        const audioBlob = await stopRecording();

        if (!audioBlob || audioBlob.size === 0) {
          setStatusNotice("No audio captured. Please try speaking again.");
          return;
        }

        // Send audio to FastAPI backend
        const result = await transcribeAudio(audioBlob);
        setStatusNotice(result.statusNotice);
        if (result.isError) {
          // Keep the previous transcript and its measured telemetry intact;
          // only the notice changes. A server error still means the backend is up.
          setBackendConnected(result.errorKind === "server");
          return;
        }
        setTranscript(result.text);
        setLatencyMs(result.latencyMs);
        setConfidenceScore(result.confidence);
        setSource(result.source);
        setBackendConnected(result.source === "voicebridge-backend");
      } catch (err) {
        console.error("Transcription error:", err);
        setStatusNotice("Failed to transcribe audio. Please try again.");
        setBackendConnected(false);
      } finally {
        setIdle();
      }
    } else {
      try {
        await startRecording();
        setStatusNotice(undefined);
      } catch {
        setStatusNotice("Microphone permission denied. Enable microphone access in browser.");
      }
    }
  }, [micState, startRecording, stopRecording, setIdle]);

  // Reset transcript and audio buffer
  const handleClear = useCallback(() => {
    setTranscript("");
    setLatencyMs(null);
    setConfidenceScore(null);
    setStatusNotice(undefined);
    setSource(undefined);
    clearRecordedAudio();
  }, [clearRecordedAudio]);

  // Set transcript from QuickAssist presets. A preset is not a model result, so
  // clear the previous recording's confidence/latency/source instead of letting
  // them describe a sentence the model never transcribed.
  const handleSpeakPhrase = useCallback((phrase: string) => {
    setTranscript(phrase);
    setLatencyMs(null);
    setConfidenceScore(null);
    setSource(undefined);
    setStatusNotice(undefined);
  }, []);

  // Transcribe pre-recorded clinical sample audio
  const handleRunSampleAudio = useCallback(async (audioUrl: string) => {
    setStatusNotice("Transcribing clinical sample audio...");
    try {
      const res = await fetch(audioUrl);
      if (!res.ok) {
        throw new Error(`Sample unavailable (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      if (!blob.type.startsWith("audio/")) {
        throw new Error("Sample is not an audio file.");
      }
      const result = await transcribeAudio(blob);
      setStatusNotice(result.statusNotice);
      if (result.isError) {
        setBackendConnected(result.errorKind === "server");
        return;
      }
      setTranscript(result.text);
      setLatencyMs(result.latencyMs);
      setConfidenceScore(result.confidence);
      setSource(result.source);
      setBackendConnected(result.source === "voicebridge-backend");
    } catch (err) {
      console.error("Clinical sample transcription error:", err);
      setStatusNotice(
        err instanceof Error ? err.message : "Failed to transcribe sample."
      );
    }
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col bg-canvas px-4 py-6 text-text-primary sm:px-6 lg:px-8">
      {/* 1. Header */}
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-border bg-surface">
            <Mic className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-text-primary">VoiceBridge</h1>
            <p className="text-sm text-text-secondary">
              Assistive speech transcription for motor and dysarthric speech disorders
            </p>
          </div>
        </div>

        {/* Live Backend Connection Indicator */}
        <div
          role="status"
          className="flex items-center gap-2 self-start rounded-[6px] border border-border bg-surface px-3 py-2 font-mono text-[10px] text-text-secondary sm:self-auto"
        >
          <span className={`h-2 w-2 rounded-full ${backendConnected ? "bg-accent" : "bg-text-secondary"}`} />
          <span>
            {backendConnected
              ? "Backend connected (FastAPI • Clinical LoRA)"
              : "Backend offline • Start with: uvicorn app.main:app --port 8000"}
          </span>
        </div>
      </header>

      {/* 2. Main 2-Column Application Stage */}
      <div className="grid flex-1 grid-cols-1 items-start gap-8 py-8 lg:grid-cols-2 lg:gap-12">
        {/* Left Column: Reconstructed Speech Card & Waveform */}
        <section aria-label="Speech transcription output" className="flex flex-col items-center gap-5 w-full">
          <TranscriptDisplay
            transcript={transcript}
            latencyMs={latencyMs}
            confidenceScore={confidenceScore}
            isProcessing={micState === "processing"}
            recordedAudioUrl={recordedAudioUrl}
            statusNotice={statusNotice}
            source={source}
            audioAnalyser={audioAnalyser}
            isRecording={micState === "listening"}
            onClear={handleClear}
          />
        </section>

        {/* Right Column: Record Button & AAC Quick Assist Cards */}
        <section aria-label="Recording controls and AAC presets" className="flex w-full flex-col items-center gap-8 rounded-[6px] border border-border bg-surface p-5 sm:p-8">
          <TactileMicButton
            state={micState}
            onToggle={handleToggleMic}
            audioLevel={audioLevel}
          />
          <QuickAssistGrid onSpeakPhrase={handleSpeakPhrase} />
        </section>
      </div>

      {/* 3. Footer: Clinical Verification Archive (TORGO Dataset) */}
      <footer className="w-full border-t border-border pt-6">
        <button
          type="button"
          onClick={() => setShowJudgeConsole((prev) => !prev)}
          aria-expanded={showJudgeConsole}
          aria-controls="clinical-verification-archive"
          className="flex min-h-[44px] w-full items-center justify-between rounded-[6px] border border-border bg-surface px-4 text-left font-mono text-xs text-text-primary transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          <span>Clinical Verification Archive (TORGO Dataset)</span>
          {showJudgeConsole ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {showJudgeConsole && (
          <div
            id="clinical-verification-archive"
            className="mt-3 w-full rounded-[6px] border border-border bg-surface p-4"
          >
            <div className="mb-4 space-y-1 font-mono text-xs text-text-secondary">
              <p>Reference corpus: University of Toronto TORGO Database (Rudzicz et al., 2012).</p>
              <p>Clinical evaluation clips: M05 (Cerebral Palsy), M04 (Post-Trauma TBI), M02 (ALS).</p>
            </div>
            <ClinicalBenchmarkDrawer
              onRunInference={handleRunSampleAudio}
              isProcessing={statusNotice?.includes("Transcribing")}
            />
          </div>
        )}

        <div className="pt-5 text-center font-mono text-[10px] text-text-secondary">
          Research prototype • SIES Graduate School of Technology • THREWS Odyssey 2026
        </div>
      </footer>
    </main>
  );
}
