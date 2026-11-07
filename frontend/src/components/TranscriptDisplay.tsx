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
  source?: "fastapi-backend" | "web-speech" | "unavailable";
  onClear?: () => void;
  secondaryTranscript?: string;
  audioAnalyser?: AnalyserNode | null;
  isRecording?: boolean;
  className?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  "fastapi-backend": "Whisper-small LoRA",
  "web-speech": "Browser speech",
};

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  transcript,
  latencyMs = null,
  confidenceScore = null,
  isProcessing = false,
  recordedAudioUrl,
  statusNotice,
  source,
  onClear,
  secondaryTranscript,
  audioAnalyser,
  isRecording = false,
  className = "",
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
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

      <div className="flex items-center justify-between border-b border-border pb-3 text-xs font-mono">
        <span className="text-[11px] font-semibold tracking-widest text-text-secondary">
          TRANSCRIPT
        </span>

        {transcript && !isProcessing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSpeakAloud}
              title="Read this text aloud"
              aria-label="Say it"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[6px] border border-border bg-surface px-3 text-xs text-text-primary transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>{isSpeaking ? "Speaking..." : "Say it"}</span>
            </button>
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                title="Clear"
                aria-label="Clear"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-[6px] border border-border bg-surface px-3 text-xs text-text-primary transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div aria-live="polite" className="flex min-h-[150px] items-center py-8">
        {isProcessing ? (
          <p className="text-2xl font-normal tracking-tight text-text-secondary sm:text-3xl">
            Processing...
          </p>
        ) : transcript ? (
          <div>
            <blockquote className="text-[28px] font-normal leading-snug tracking-tight text-text-primary sm:text-4xl">
              &ldquo;{transcript}&rdquo;
            </blockquote>
            {secondaryTranscript && (
              <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-text-secondary">
                Pre-written phrase (not recognized speech)
              </p>
            )}
          </div>
        ) : (
          <p className="text-[28px] font-normal leading-snug tracking-tight text-text-secondary sm:text-4xl">
            Press Speak to begin.
          </p>
        )}
      </div>

      <div className="rounded-[6px] border border-border p-3">
        <AudioWaveformCanvas
          isRecording={isRecording}
          audioAnalyser={audioAnalyser}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 divide-x divide-border border-t border-border pt-4">
        <div className="pr-4">
          <p className="font-mono text-[10px] font-semibold tracking-widest text-text-secondary">
            CONFIDENCE
          </p>
          <p className="mt-1 text-sm text-text-primary">
            {confidenceScore != null ? `${(confidenceScore * 100).toFixed(0)}%` : "not measured"}
          </p>
        </div>
        <div className="pl-4">
          <p className="font-mono text-[10px] font-semibold tracking-widest text-text-secondary">
            LATENCY
          </p>
          <p className="mt-1 text-sm text-text-primary">
            {latencyMs != null ? `${latencyMs} ms` : "not measured"}
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