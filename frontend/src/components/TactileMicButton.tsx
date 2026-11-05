"use client";

import React, { useEffect, useCallback } from "react";
import { Mic, Square, Loader2 } from "lucide-react";

export type MicState = "idle" | "listening" | "processing";

interface TactileMicButtonProps {
  state: MicState;
  onToggle: () => void;
  disabled?: boolean;
  audioLevel?: number;
}

export const TactileMicButton: React.FC<TactileMicButtonProps> = ({
  state,
  onToggle,
  disabled = false,
  audioLevel = 0,
}) => {
  // Global spacebar listener for hands-free / motor dexterity support
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === "Space" && !disabled) {
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

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Outer Illuminated Hardware Amber Ring (Matches Mockup) */}
      <div
        className={`relative flex items-center justify-center rounded-full p-1.5 transition-all duration-300 ${
          isListening
            ? "ring-4 ring-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.45)] scale-105"
            : isProcessing
            ? "ring-2 ring-amber-500/70 animate-pulse"
            : "ring-2 ring-zinc-800 hover:ring-zinc-700"
        }`}
        style={{
          transform: isListening
            ? `scale(${1.02 + Math.min(audioLevel * 0.15, 0.12)})`
            : "scale(1)",
        }}
      >
        {/* Physical Weighted Mechanical Switch */}
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled || isProcessing}
          aria-label={
            isListening
              ? "Stop recording. Transcribing speech..."
              : isProcessing
              ? "Reconstructing dysarthric speech..."
              : "Start recording speech. Press Spacebar or tap."
          }
          aria-pressed={isListening}
          className={`
            relative flex h-24 w-24 sm:h-28 sm:w-28 flex-col items-center justify-center rounded-full
            transition-all duration-150 ease-out focus:outline-none
            ${
              isListening
                ? "bg-gradient-to-b from-zinc-850 to-zinc-950 text-amber-400 border border-amber-500/50 shadow-inner"
                : isProcessing
                ? "bg-gradient-to-b from-zinc-850 to-zinc-950 text-amber-400 border border-amber-500/40"
                : "bg-gradient-to-b from-zinc-800 to-zinc-900 text-zinc-200 border border-zinc-700/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.6)] hover:border-zinc-500 active:scale-95"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
        >
          {/* Status Indicator */}
          {isListening ? (
            <Square className="h-6 w-6 text-amber-400 fill-amber-400" />
          ) : isProcessing ? (
            <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
          ) : (
            <div className="flex flex-col items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400/90 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
              <Mic className="h-6 w-6 text-zinc-100 mt-0.5" />
            </div>
          )}
        </button>
      </div>

      {/* Discreet Keycap Hint */}
      <span className="mt-2.5 text-[11px] font-mono text-zinc-500">
        {isListening ? (
          <span className="text-amber-400 font-semibold animate-pulse">● RECORDING</span>
        ) : isProcessing ? (
          <span className="text-amber-400/90">PROCESSING...</span>
        ) : (
          "Press SPACE to speak"
        )}
      </span>
    </div>
  );
};
