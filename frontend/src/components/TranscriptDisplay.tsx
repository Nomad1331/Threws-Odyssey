"use client";

import React, { useState, useRef } from "react";
import { Volume2, Copy, Check, Play, Square, X } from "lucide-react";

interface TranscriptDisplayProps {
  transcript: string;
  latencyMs?: number | null;
  confidenceScore?: number | null;
  isProcessing?: boolean;
  recordedAudioUrl?: string | null;
  statusNotice?: string;
  secondaryTranscript?: string;
  source?: "fastapi-backend" | "web-speech" | "unavailable";
  onClear?: () => void;
  className?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  "fastapi-backend": "Whisper-tiny LoRA",
  "web-speech": "Browser speech",
};

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  transcript,
  latencyMs = null,
  confidenceScore = null,
  isProcessing = false,
  recordedAudioUrl,
  statusNotice,
  secondaryTranscript,
  source,
  onClear,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Keep a reference so the browser does not garbage-collect the utterance mid-speech
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Speak only when the user taps "Say it"
  const handleSpeakAloud = () => {
    if (!transcript || typeof window === "undefined") return;

    setSpeechError(null);

    if (!("speechSynthesis" in window)) {
      setSpeechError("This browser cannot read text aloud.");
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
        setSpeechError(`Speech output failed (${event.error}). Check your system voice settings.`);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard not available
    }
  };

  // Replay the recorded audio
  const handleToggleAudioPlayback = () => {
    if (!recordedAudioUrl || typeof window === "undefined") return;

    const audioEl = document.getElementById("patient-audio-playback") as HTMLAudioElement | null;
    if (!audioEl) return;

    if (isPlayingAudio) {
      audioEl.pause();
      setIsPlayingAudio(false);
    } else {
      audioEl.currentTime = 0;
      audioEl.play().catch(() => setIsPlayingAudio(false));
      setIsPlayingAudio(true);
    }
  };

  const sourceLabel = source ? SOURCE_LABELS[source] : undefined;

  return (
    <div
      className={`relative flex flex-col justify-between rounded-2xl bg-zinc-900/80 border border-zinc-800/80 p-5 sm:p-6 shadow-sm transition-all duration-200 ${className}`}
      role="region"
      aria-label="Speech transcription"
    >
      {recordedAudioUrl && (
        <audio
          id="patient-audio-playback"
          src={recordedAudioUrl}
          onEnded={() => setIsPlayingAudio(false)}
          onPause={() => setIsPlayingAudio(false)}
          className="hidden"
        />
      )}

      {/* Top row: status and tools */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">
            {isProcessing ? "Processing" : "Output"}
          </span>
          {!isProcessing && latencyMs != null && (
            <span className="text-[10px] text-zinc-500 hidden sm:inline">
              ({latencyMs}ms
              {confidenceScore != null ? ` • ${(confidenceScore * 100).toFixed(0)}% conf` : ""}
              {sourceLabel ? ` • ${sourceLabel}` : ""})
            </span>
          )}
        </div>

        {transcript && !isProcessing && (
          <div className="flex items-center gap-1">
            {/* Labeled "Say it" button */}
            <button
              type="button"
              onClick={handleSpeakAloud}
              title="Read this text aloud"
              aria-label="Say it"
              className={`inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md border transition-all active:scale-90 ${
                isSpeaking
                  ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-300"
                  : "bg-zinc-850/80 border-zinc-600 text-zinc-200 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <Volume2 className={`h-3.5 w-3.5 ${isSpeaking ? "animate-pulse text-emerald-400" : ""}`} />
              <span className="text-[11px] font-sans">{isSpeaking ? "Speaking..." : "Say it"}</span>
            </button>

            {recordedAudioUrl && (
              <button
                type="button"
                onClick={handleToggleAudioPlayback}
                title={isPlayingAudio ? "Stop audio" : "Play recording"}
                aria-label="Play recording"
                className={`p-1.5 rounded-md border transition-all active:scale-90 ${
                  isPlayingAudio
                    ? "bg-amber-950/80 border-amber-500/60 text-amber-300"
                    : "bg-zinc-850/80 border-zinc-750 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                {isPlayingAudio ? (
                  <Square className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              title="Copy text"
              aria-label="Copy text"
              className="p-1.5 rounded-md border border-zinc-750 bg-zinc-850/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all active:scale-90"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>

            {onClear && (
              <button
                type="button"
                onClick={onClear}
                title="Clear"
                aria-label="Clear"
                className="p-1.5 rounded-md border border-zinc-750 bg-zinc-850/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all active:scale-90"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main text */}
      <div className="min-h-[100px] sm:min-h-[120px] flex items-center justify-start py-2">
        {isProcessing ? (
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xl sm:text-2xl md:text-3xl font-light tracking-tight text-zinc-400 animate-pulse">
              Processing...
            </span>
          </div>
        ) : transcript ? (
          <blockquote className="text-2xl sm:text-3xl md:text-4xl font-normal tracking-tight text-zinc-100 leading-snug">
            &ldquo;{transcript}&rdquo;
          </blockquote>
        ) : (
          <p className="text-lg sm:text-xl font-light text-zinc-600 italic">
            Press Speak to begin.
          </p>
        )}
      </div>

      {speechError && (
        <p className="pt-2 text-[11px] font-sans text-red-400">{speechError}</p>
      )}

      {statusNotice && (
        <div className="pt-2 text-[10px] sm:text-[11px] font-mono text-zinc-500 border-t border-zinc-850/60 mt-2 truncate">
          {statusNotice}
        </div>
      )}
    </div>
  );
};