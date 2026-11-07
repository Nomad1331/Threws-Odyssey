"use client";

import React, { useRef, useState } from "react";
import { Volume2, X } from "lucide-react";
import { AudioWaveformCanvas } from "@/components/AudioWaveformCanvas";

interface TranscriptDisplayProps {
  transcript: string;
  latencyMs?: number | null;
  confidenceScore?: number | null;
  isProcessing?: boolean;
  recordedAudioUrl?: string | null;
  statusNotice?: string;
  source?: "voicebridge-backend" | "unavailable";
  onClear?: () => void;
  audioAnalyser?: AnalyserNode | null;
  isRecording?: boolean;
  className?: string;
}

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  transcript,
  latencyMs = null,
  confidenceScore = null,
  isProcessing = false,
  recordedAudioUrl,
  statusNotice,
  source,
  onClear,
  audioAnalyser,
  isRecording = false,
  className = "",
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Keep a reference so the browser does not garbage-collect the utterance mid-speech
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Speak text aloud using browser SpeechSynthesis
  const handleSpeakAloud = () => {
    if (!transcript || typeof window === "undefined") return;

    setSpeechError(null);

    if (!("speechSynthesis" in window)) {
      setSpeechError("Speech synthesis is not supported on this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(transcript);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.lang = "en-US";
    utteranceRef.current = utterance;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      utteranceRef.current = null;
    };
    utterance.onerror = (event) => {
      setIsSpeaking(false);
      utteranceRef.current = null;
      if (event.error !== "canceled" && event.error !== "interrupted") {
        setSpeechError(`Speech synthesis error: ${event.error}`);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div
      className={`w-full rounded-[6px] border border-border bg-surface p-5 sm:p-6 ${className}`}
      role="region"
      aria-label="Speech transcription"
    >
      {recordedAudioUrl && (
        <audio
          id="patient-audio-playback"
          src={recordedAudioUrl}
          className="hidden"
        />
      )}

      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-border pb-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold tracking-widest text-text-secondary">
            TRANSCRIPTION
          </span>
          {source && (
            <span className="rounded-[4px] border border-border px-1.5 py-0.5 text-[9px] text-text-secondary">
              {source === "voicebridge-backend" ? "Whisper INT8" : "Offline"}
            </span>
          )}
        </div>

        {transcript && !isProcessing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSpeakAloud}
              title="Speak phrase aloud"
              aria-label="Speak phrase aloud"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[6px] border border-border bg-surface px-3 text-xs text-text-primary transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>{isSpeaking ? "Speaking..." : "Say it"}</span>
            </button>
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                title="Clear transcript"
                aria-label="Clear transcript"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-[6px] border border-border bg-surface px-3 text-xs text-text-primary transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Transcription Output */}
      <div aria-live="polite" className="flex min-h-[140px] items-center py-6">
        {isProcessing ? (
          <p className="text-2xl font-normal tracking-tight text-text-secondary sm:text-3xl">
            Transcribing audio...
          </p>
        ) : transcript ? (
          <blockquote className="text-[26px] font-normal leading-snug tracking-tight text-text-primary sm:text-3xl">
            &ldquo;{transcript}&rdquo;
          </blockquote>
        ) : (
          <p className="text-[26px] font-normal leading-snug tracking-tight text-text-secondary sm:text-3xl">
            Press Speak to begin.
          </p>
        )}
      </div>

      {/* Live Audio Waveform Canvas */}
      <div className="rounded-[6px] border border-border p-3">
        <AudioWaveformCanvas
          isRecording={isRecording}
          audioAnalyser={audioAnalyser}
        />
      </div>

      {/* Telemetry Bar (Confidence & Latency) */}
      <div className="mt-5 grid grid-cols-2 divide-x divide-border border-t border-border pt-4">
        <div className="pr-4">
          <p className="font-mono text-[10px] font-semibold tracking-widest text-text-secondary">
            CONFIDENCE
          </p>
          <p className="mt-1 text-sm text-text-primary">
            {confidenceScore != null ? `${(confidenceScore * 100).toFixed(0)}%` : "N/A"}
          </p>
        </div>
        <div className="pl-4">
          <p className="font-mono text-[10px] font-semibold tracking-widest text-text-secondary">
            LATENCY
          </p>
          <p className="mt-1 text-sm text-text-primary">
            {latencyMs != null ? `${latencyMs} ms` : "N/A"}
          </p>
        </div>
      </div>

      {speechError && (
        <p className="pt-3 text-xs text-pain-text">{speechError}</p>
      )}

      {statusNotice && (
        <div className="mt-3 border-t border-border pt-3 font-mono text-[10px] text-text-secondary">
          {statusNotice}
        </div>
      )}
    </div>
  );
};
