"use client";

import React, { useState } from "react";
import {
  Volume2,
  VolumeX,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  Sparkles,
  RotateCcw,
  Mic,
  Info,
} from "lucide-react";

interface TranscriptDisplayProps {
  transcript: string;
  latencyMs?: number;
  confidenceScore?: number;
  isProcessing?: boolean;
  recordedAudioUrl?: string | null;
  statusNotice?: string;
  source?: "fastapi-backend" | "web-speech" | "local-whisper-fallback";
  onClear?: () => void;
  className?: string;
}

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  transcript,
  latencyMs = 240,
  confidenceScore = 0.984,
  isProcessing = false,
  recordedAudioUrl,
  statusNotice,
  source,
  onClear,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Web Speech API client-side TTS
  const handleSpeakAloud = () => {
    if (!transcript || typeof window === "undefined") return;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // Stop any pending speech

      const utterance = new SpeechSynthesisUtterance(transcript);
      utterance.rate = 0.95; // Comfortable, natural cadence
      utterance.pitch = 1.0;
      utterance.lang = "en-US";

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCopy = async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className={`relative flex flex-col rounded-2xl bg-surface border-2 border-border p-6 shadow-card-subtle transition-all duration-300 ${className}`}
      role="region"
      aria-label="Reconstructed Speech Transcription"
    >
      {/* Top Header Row: Telemetry Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-clinical-teal-light" />
          <span className="text-xs font-semibold tracking-wider uppercase text-clinical-text">
            Reconstructed Output
          </span>
          {source && (
            <span className="rounded-full bg-clinical-teal/10 px-2 py-0.5 text-[10px] font-mono text-clinical-teal-light border border-clinical-teal/30">
              {source === "fastapi-backend"
                ? "FastAPI Whisper-LoRA"
                : source === "web-speech"
                ? "Browser Speech API"
                : "VoiceBridge Local Engine"}
            </span>
          )}
        </div>

        {transcript && (
          <div className="flex items-center gap-2">
            {/* Latency Telemetry */}
            <div className="flex items-center gap-1 rounded-full bg-canvas/80 px-2.5 py-1 text-[11px] font-mono text-clinical-muted border border-border/50">
              <Clock className="h-3 w-3 text-clinical-teal-light" />
              <span>{latencyMs}ms RTF</span>
            </div>

            {/* Confidence Metric */}
            <div className="flex items-center gap-1 rounded-full bg-clinical-teal/10 px-2.5 py-1 text-[11px] font-mono text-clinical-teal-light border border-clinical-teal/30">
              <ShieldCheck className="h-3 w-3" />
              <span>{(confidenceScore * 100).toFixed(1)}% Match</span>
            </div>
          </div>
        )}
      </div>

      {/* Status Notice (e.g. Offline Engine Alert or Decoder Info) */}
      {statusNotice && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-canvas/70 px-3 py-1.5 text-xs text-clinical-muted border border-border/60">
          <Info className="h-3.5 w-3.5 text-clinical-teal-light shrink-0" />
          <span className="truncate">{statusNotice}</span>
        </div>
      )}

      {/* Primary 32px High-Legibility Readout Zone */}
      <div className="my-4 min-h-[90px] flex items-center">
        {isProcessing ? (
          <div className="flex items-center gap-3 text-clinical-amber animate-pulse">
            <span className="h-3 w-3 rounded-full bg-clinical-amber" />
            <p className="text-xl md:text-2xl font-medium tracking-wide">
              Reconstructing phonetic tokens from distorted waveform...
            </p>
          </div>
        ) : transcript ? (
          <p
            className="text-2xl sm:text-3xl lg:text-[32px] font-bold leading-relaxed text-clinical-text tracking-tight select-text"
            tabIndex={0}
            aria-live="polite"
          >
            &ldquo;{transcript}&rdquo;
          </p>
        ) : (
          <p className="text-lg md:text-xl text-clinical-muted/60 italic font-normal leading-relaxed">
            Spoken speech will be reconstructed here in high-contrast text...
          </p>
        )}
      </div>

      {/* Audio Playback Preview Verification Bar */}
      {recordedAudioUrl && (
        <div className="mb-4 p-3 rounded-xl bg-canvas/80 border border-border/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-clinical-teal/15 text-clinical-teal-light border border-clinical-teal/30">
              <Mic className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-clinical-text">
                Captured Mic Audio Preview
              </div>
              <div className="text-[10px] text-clinical-muted">
                Playback confirms physical microphone recorded real sound
              </div>
            </div>
          </div>
          <audio
            src={recordedAudioUrl}
            controls
            className="h-8 max-w-full sm:max-w-[260px] rounded-lg accent-clinical-teal"
          />
        </div>
      )}

      {/* Action Footer: Speak Aloud, Copy, Clear */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
        <div className="flex items-center gap-2">
          {/* Primary AAC Speak Aloud Button */}
          <button
            type="button"
            onClick={handleSpeakAloud}
            disabled={!transcript || isProcessing}
            aria-label="Speak reconstructed text aloud"
            className={`
              flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200
              ${
                transcript && !isProcessing
                  ? "bg-clinical-teal text-white hover:bg-clinical-teal-light shadow-sm active:scale-95 cursor-pointer"
                  : "bg-surface-light text-clinical-muted/40 cursor-not-allowed border border-border/40"
              }
            `}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="h-5 w-5 animate-pulse text-clinical-amber" />
                <span>Speaking...</span>
              </>
            ) : (
              <>
                <Volume2 className="h-5 w-5" />
                <span>Speak Aloud</span>
              </>
            )}
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            disabled={!transcript}
            aria-label="Copy text to clipboard"
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-light px-3.5 py-3 text-sm font-medium text-clinical-text transition-colors hover:border-clinical-teal/60 hover:text-clinical-teal-light disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-clinical-teal-light" />
                <span className="text-xs text-clinical-teal-light">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span className="text-xs">Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Clear Action */}
        {transcript && onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear current transcript"
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-clinical-muted hover:text-clinical-text transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
};
