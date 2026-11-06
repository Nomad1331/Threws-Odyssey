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
  // Safe tactile haptic feedback for mobile accessibility
  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(45);
      } catch {
        // Ignore haptic errors on unsupported hardware
      }
    }
  }, []);

  const handleAction = useCallback(() => {
    if (disabled || state === "processing") return;
    triggerHaptic();
    onToggle();
  }, [disabled, state, triggerHaptic, onToggle]);

  // Global spacebar listener for hands-free / motor dexterity assistance
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === "Space" && !disabled) {
        const activeTag = (document.activeElement?.tagName || "").toLowerCase();
        if (activeTag !== "input" && activeTag !== "textarea") {
          e.preventDefault();
          handleAction();
        }
      }
    },
    [disabled, handleAction]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const isListening = state === "listening";
  const isProcessing = state === "processing";

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-2">
      {/* Massive Hardware Dial Container with Maximum Touch Surface */}
      <div className="relative flex items-center justify-center">
        {/* Pulsing Radar Aura during Active Recording */}
        {isListening && (
          <span
            className="absolute -inset-3 sm:-inset-4 rounded-full border-2 border-amber-400/40 animate-ping opacity-60 pointer-events-none"
            aria-hidden="true"
          />
        )}

        {/* Tactile Outer Ring Housing with Audio Energy Scalability */}
        <div
          className={`relative flex items-center justify-center rounded-full p-2 transition-all duration-200 ${
            isListening
              ? "ring-4 ring-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.55)]"
              : isProcessing
              ? "ring-2 ring-amber-500/70 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.25)]"
              : "ring-2 ring-zinc-750 hover:ring-zinc-600 shadow-[0_12px_28px_rgba(0,0,0,0.6)]"
          }`}
          style={{
            transform: isListening
              ? `scale(${1.03 + Math.min(audioLevel * 0.18, 0.14)})`
              : "scale(1)",
          }}
        >
          {/* Motor-Accessible Mechanical Button: 160px on mobile, 192px on desktop */}
          <button
            type="button"
            onClick={handleAction}
            disabled={disabled || isProcessing}
            aria-label={
              isListening
                ? "Stop recording. Transcribing dysarthric speech."
                : isProcessing
                ? "Processing speech buffer."
                : "Record speech. Large touch target for motor assistance. Tap or press Spacebar."
            }
            aria-pressed={isListening}
            className={`
              relative flex h-36 w-36 sm:h-44 sm:w-44 flex-col items-center justify-center rounded-full
              transition-all duration-150 ease-out focus:outline-none focus:ring-4 focus:ring-amber-500/50
              ${
                isListening
                  ? "bg-gradient-to-b from-zinc-850 via-zinc-900 to-zinc-950 text-amber-400 border-2 border-amber-500/60 shadow-[inset_0_4px_12px_rgba(0,0,0,0.8)]"
                  : isProcessing
                  ? "bg-gradient-to-b from-zinc-850 to-zinc-950 text-amber-400 border border-amber-500/40 cursor-wait"
                  : "bg-gradient-to-b from-zinc-800 via-zinc-850 to-zinc-900 text-zinc-100 border-2 border-zinc-700/80 shadow-[inset_0_2px_4px_rgba(255,255,255,0.12),0_10px_24px_rgba(0,0,0,0.7)] hover:border-zinc-500 hover:from-zinc-750 hover:to-zinc-850 active:scale-95"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {/* Center State Content */}
            {isListening ? (
              <div className="flex flex-col items-center gap-2">
                <Square className="h-10 w-10 sm:h-12 sm:w-12 text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]" />
                <span className="text-[11px] sm:text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                  TAP TO STOP
                </span>
              </div>
            ) : isProcessing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-amber-400" />
                <span className="text-[11px] sm:text-xs font-mono font-semibold tracking-wider text-amber-400/90 uppercase">
                  PROCESSING
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                {/* Glowing Hardware Amber Status Tally LED */}
                <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
                {/* Prominent High-Visibility Mic Icon */}
                <Mic className="h-10 w-10 sm:h-12 sm:w-12 text-zinc-100 mt-0.5 filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]" />
                <span className="text-[11px] sm:text-xs font-sans font-semibold tracking-wide text-zinc-300">
                  Speak
                </span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Accessible Instruction Hint */}
      <div className="mt-3.5 flex items-center gap-2 text-center">
        {isListening ? (
          <span className="text-xs sm:text-sm font-mono text-amber-400 font-semibold tracking-wide animate-pulse">
            ● RECORDING LIVE SPEECH
          </span>
        ) : isProcessing ? (
          <span className="text-xs sm:text-sm font-mono text-amber-400/90 tracking-wide">
            Reconstructing acoustic buffer...
          </span>
        ) : (
          <span className="text-xs sm:text-sm font-sans text-zinc-400">
            Tap button or press <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[11px] font-mono text-zinc-200 shadow-sm">SPACE</kbd>
          </span>
        )}
      </div>
    </div>
  );
};
