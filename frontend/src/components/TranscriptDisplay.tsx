"use client";

import React, { useState } from "react";
import { Volume2, Copy, Check, Play, Square, X } from "lucide-react";

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
  latencyMs = 257,
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
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Client-side Web Speech API TTS
  const handleSpeakAloud = () => {
    if (!transcript || typeof window === "undefined") return;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(transcript);
      utterance.rate = 0.95;
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
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback
    }
  };

  // Replay captured or loaded patient audio
  const handleToggleAudioPlayback = () => {
    if (!recordedAudioUrl || typeof window === "undefined") return;

    const audioEl = document.getElementById("patient-audio-playback") as HTMLAudioElement;
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

  return (
    <div
      className={`relative flex flex-col justify-between rounded-2xl bg-zinc-900/80 border border-zinc-800/80 p-5 sm:p-6 shadow-sm transition-all duration-200 ${className}`}
      role="region"
      aria-label="Reconstructed Speech Transcription"
    >
      {/* Audio Element for Patient Phonation Playback */}
      {recordedAudioUrl && (
        <audio
          id="patient-audio-playback"
          src={recordedAudioUrl}
          onEnded={() => setIsPlayingAudio(false)}
          onPause={() => setIsPlayingAudio(false)}
          className="hidden"
        />
      )}

      {/* Top Header Row: Discrete Studio Telemetry & Subtle Corner Controls */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-3 text-xs font-mono">
        {/* Left: Minimal Live Status Dot & Speed */}
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">
            {isProcessing ? "Processing Buffer" : "Live Speech Output"}
          </span>
          {latencyMs > 0 && !isProcessing && (
            <span className="text-[10px] text-zinc-500 hidden sm:inline">
              ({latencyMs}ms • {(confidenceScore * 100).toFixed(0)}% acc
              {source ? ` • ${source === "fastapi-backend" ? "ONNX INT8" : source === "web-speech" ? "Speech API" : "Edge"}` : ""}
              )
            </span>
          )}
        </div>

        {/* Right: Unobtrusive Icon Tools (Listen, Copy, Clear) */}
        {transcript && !isProcessing && (
          <div className="flex items-center gap-1">
            {/* Replay Vocalization */}
            <button
              type="button"
              onClick={handleSpeakAloud}
              title="Vocalize speech aloud"
              aria-label="Vocalize speech aloud"
              className={`p-1.5 rounded-md border transition-all active:scale-90 ${
                isSpeaking
                  ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-300"
                  : "bg-zinc-850/80 border-zinc-750 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              <Volume2 className={`h-3.5 w-3.5 ${isSpeaking ? "animate-pulse text-emerald-400" : ""}`} />
            </button>

            {/* Hear Patient Phonation if Available */}
            {recordedAudioUrl && (
              <button
                type="button"
                onClick={handleToggleAudioPlayback}
                title={isPlayingAudio ? "Stop patient phonation" : "Hear patient phonation"}
                aria-label="Hear patient audio"
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

            {/* Quick Copy */}
            <button
              type="button"
              onClick={handleCopy}
              title="Copy text"
              aria-label="Copy transcript"
              className="p-1.5 rounded-md border border-zinc-750 bg-zinc-850/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all active:scale-90"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>

            {/* Clear */}
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                title="Clear transcript"
                aria-label="Clear transcript"
                className="p-1.5 rounded-md border border-zinc-750 bg-zinc-850/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all active:scale-90"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Reconstructed Speech Display: Dignified Fluid Typography */}
      <div className="min-h-[100px] sm:min-h-[120px] flex items-center justify-start py-2">
        {isProcessing ? (
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xl sm:text-2xl md:text-3xl font-light tracking-tight text-zinc-400 animate-pulse">
              Reconstructing dysarthric speech...
            </span>
          </div>
        ) : transcript ? (
          <blockquote className="text-2xl sm:text-3xl md:text-4xl font-normal tracking-tight text-zinc-100 leading-snug">
            &ldquo;{transcript}&rdquo;
          </blockquote>
        ) : (
          <p className="text-lg sm:text-xl font-light text-zinc-600 italic">
            Tap the button below or press Spacebar to start speaking...
          </p>
        )}
      </div>

      {/* Discreet Bottom Status Notice (if any) */}
      {statusNotice && (
        <div className="pt-2 text-[10px] sm:text-[11px] font-mono text-zinc-500 border-t border-zinc-850/60 mt-2 truncate">
          {statusNotice}
        </div>
      )}
    </div>
  );
};
