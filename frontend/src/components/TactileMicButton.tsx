"use client";

import React, { useEffect, useCallback } from "react";
import { Mic, Square, Loader2 } from "lucide-react";

export type MicState = "idle" | "listening" | "processing";

interface TactileMicButtonProps {
  state: MicState;
  onToggle: () => void;
  disabled?: boolean;
  audioLevel?: number; // 0.0 to 1.0 real-time microphone volume
}

export const TactileMicButton: React.FC<TactileMicButtonProps> = ({
  state,
  onToggle,
  disabled = false,
  audioLevel = 0,
}) => {
  // Handle Spacebar toggle globally for users with limited motor dexterity
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === "Space" && !disabled) {
        // Prevent default only if not typing in an input/textarea
        const activeTag = (document.activeElement?.tagName || "").toLowerCase();
        if (activeTag !== "input" && activeTag !== "textarea") {
          e.preventDefault();
          onToggle();
        }
      }
    },
    [disabled, onToggle]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const isListening = state === "listening";
  const isProcessing = state === "processing";

  // Dynamic voice reactivity: scale rings based on real vocal energy
  const voiceScale = isListening ? 1 + Math.min(audioLevel * 0.5, 0.4) : 1;
  const outerScale = isListening ? 1 + Math.min(audioLevel * 0.8, 0.6) : 1;
  const isSpeaking = isListening && audioLevel > 0.05;

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Real-time Voice Reactive Pulse Rings (Only expand when sound is detected) */}
      {isListening && (
        <>
          <div
            className="absolute h-52 w-52 rounded-full bg-clinical-teal/20 transition-transform duration-75 ease-out pointer-events-none"
            style={{ transform: `scale(${outerScale})`, opacity: isSpeaking ? 0.45 : 0.15 }}
            aria-hidden="true"
          />
          <div
            className="absolute h-44 w-44 rounded-full bg-clinical-teal-light/30 transition-transform duration-75 ease-out pointer-events-none"
            style={{ transform: `scale(${voiceScale})`, opacity: isSpeaking ? 0.6 : 0.2 }}
            aria-hidden="true"
          />
        </>
      )}

      {/* Gentle Aura when Idle */}
      {!isListening && !isProcessing && (
        <div
          className="absolute h-44 w-44 rounded-full bg-clinical-teal/10 blur-xl pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Primary Giant Tactile Button (160px x 160px) */}
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled || isProcessing}
        aria-label={
          isListening
            ? "Stop listening. Recording in progress."
            : isProcessing
            ? "Reconstructing speech via ONNX Whisper..."
            : "Start listening. Speak naturally."
        }
        aria-pressed={isListening}
        className={`
          relative z-10 flex h-40 w-40 flex-col items-center justify-center rounded-full
          border-4 transition-all duration-300 ease-out focus:outline-none
          active:scale-95 shadow-card-subtle
          ${
            isListening
              ? "border-clinical-teal-light bg-surface text-clinical-teal-light shadow-aura-active scale-105"
              : isProcessing
              ? "border-clinical-amber/60 bg-surface/90 text-clinical-amber shadow-aura-idle"
              : "border-border bg-surface text-clinical-text hover:border-clinical-teal hover:text-clinical-teal-light shadow-aura-idle"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        {isListening ? (
          <>
            <Square className="h-12 w-12 text-clinical-teal-light fill-clinical-teal-light/20 transition-transform" />
            <span className="mt-2 text-xs font-semibold tracking-wider uppercase text-clinical-teal-light">
              Listening
            </span>
          </>
        ) : isProcessing ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-clinical-amber" />
            <span className="mt-2 text-xs font-semibold tracking-wider uppercase text-clinical-amber">
              Decoding
            </span>
          </>
        ) : (
          <>
            <Mic className="h-12 w-12 text-clinical-teal-light transition-transform group-hover:scale-110" />
            <span className="mt-2 text-xs font-semibold tracking-wider uppercase text-clinical-muted">
              Tap to Speak
            </span>
          </>
        )}
      </button>

      {/* Motor-Accessible Assistive Status Indicator */}
      <div className="mt-4 flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
            isListening
              ? "bg-clinical-teal-light animate-ping"
              : isProcessing
              ? "bg-clinical-amber animate-pulse"
              : "bg-slate-600"
          }`}
          aria-hidden="true"
        />
        <p className="text-xs font-medium text-clinical-muted">
          {isListening
            ? "Capturing 16kHz audio stream... Press Space or Tap to Finish"
            : isProcessing
            ? "Whisper-LoRA ONNX INT8 decoding in progress..."
            : "Touch anywhere or press Spacebar"}
        </p>
      </div>
    </div>
  );
};
