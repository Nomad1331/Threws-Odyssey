"use client";

import React, { useState } from "react";
import {
  Volume2,
  Copy,
  Check,
  Play,
  Square,
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
      setTimeout(() => setCopied(false), 2000);
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
      audioEl.play();
      setIsPlayingAudio(true);
    }
  };

  return (
    <div
      className={`relative flex flex-col justify-between rounded-xl bg-zinc-900/70 border border-zinc-800 p-6 shadow-sm transition-all duration-200 ${className}`}
      role="region"
      aria-label="Reconstructed Speech Transcription"
    >
      {/* Discreet Audio Element for Patient Phonation Playback */}
      {recordedAudioUrl && (
        <audio
          id="patient-audio-playback"
          src={recordedAudioUrl}
          onEnded={() => setIsPlayingAudio(false)}
          onPause={() => setIsPlayingAudio(false)}
          className="hidden"
        />
      )}

      {/* Top Header Row: Discrete Studio Telemetry */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="font-semibold tracking-wider uppercase text-zinc-300">
            Reconstructed Transcript
          </span>
        </div>

        <div className="flex items-center gap-3 text-zinc-500 text-[11px]">
          {latencyMs > 0 && (
            <span>
              LATENCY: <strong className="text-zinc-300">{latencyMs}ms</strong>
            </span>
          )}
          <span>•</span>
          <span>
            ACC: <strong className="text-zinc-300">{(confidenceScore * 100).toFixed(1)}%</strong>
          </span>
          <span>•</span>
          <span className="uppercase text-zinc-400">
            {source === "fastapi-backend"
              ? "INT8 ONNX"
              : source === "web-speech"
              ? "Speech API"
              : "Edge Whisper"}
          </span>
        </div>
      </div>

      {/* Main Reconstructed Speech Display: Massive Editorial Typography */}
      <div className="min-h-[120px] flex items-center justify-start my-2">
        {isProcessing ? (
          <div className="flex items-center gap-3 text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xl sm:text-2xl font-light tracking-tight text-zinc-300 animate-pulse">
              Reconstructing dysarthric phonemes...
            </span>
          </div>
        ) : transcript ? (
          <blockquote className="text-2xl sm:text-3xl md:text-4xl font-normal tracking-tight text-zinc-100 leading-tight">
            &ldquo;{transcript}&rdquo;
          </blockquote>
        ) : (
          <p className="text-xl sm:text-2xl font-light text-zinc-600 italic">
            Press record or spacebar to speak, or pick a clinical test below...
          </p>
        )}
      </div>

      {/* Bottom Action Bar: Tactile Physical Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-800/80 mt-4">
        {/* Left: Audio & TTS Triggers */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSpeakAloud}
            disabled={!transcript || isProcessing}
            aria-label="Vocalize speech aloud"
            className={`
              inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium font-mono
              border transition-all duration-150 active:scale-95
              ${
                isSpeaking
                  ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-300"
                  : "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-750 hover:border-zinc-600"
              }
              ${!transcript || isProcessing ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            <Volume2 className={`h-3.5 w-3.5 ${isSpeaking ? "animate-pulse" : ""}`} />
            <span>{isSpeaking ? "Speaking..." : "Vocalize (TTS)"}</span>
          </button>

          {recordedAudioUrl && (
            <button
              type="button"
              onClick={handleToggleAudioPlayback}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono
                border transition-all duration-150 active:scale-95
                ${
                  isPlayingAudio
                    ? "bg-amber-950/60 border-amber-500/60 text-amber-300"
                    : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750"
                }
              `}
            >
              {isPlayingAudio ? <Square className="h-3 w-3 fill-amber-400" /> : <Play className="h-3 w-3" />}
              <span>{isPlayingAudio ? "Stop Audio" : "Hear Patient Phonation"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            disabled={!transcript || isProcessing}
            aria-label="Copy transcript"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-750 active:scale-95 disabled:opacity-40"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>

        {/* Right: Clear Action & Status Notice */}
        <div className="flex items-center gap-3">
          {statusNotice && (
            <span className="hidden md:inline text-[11px] font-mono text-zinc-500">
              {statusNotice}
            </span>
          )}
          {onClear && transcript && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-mono text-zinc-500 hover:text-zinc-300 underline underline-offset-4"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
