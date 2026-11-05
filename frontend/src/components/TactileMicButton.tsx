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
      {/* Precision Hardware Outer Housing Ring */}
      <div
        className={`relative flex items-center justify-center rounded-full p-2 transition-all duration-100 ${
          isListening
            ? "bg-zinc-900/90 ring-2 ring-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.2)]"
            : isProcessing
            ? "bg-zinc-900/90 ring-2 ring-amber-500/50"
            : "bg-zinc-900/50 ring-1 ring-zinc-800"
        }`}
        style={{
          transform: isListening ? `scale(${1 + Math.min(audioLevel * 0.2, 0.15)})` : "scale(1)",
        }}
      >
        {/* Physical Mechanical Recording Button */}
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled || isProcessing}
          aria-label={
            isListening
              ? "Stop recording. Audio buffer will process."
              : isProcessing
              ? "Reconstructing dysarthric speech..."
              : "Toggle recording. Press Spacebar or click."
          }
          aria-pressed={isListening}
          className={`
            relative flex h-36 w-36 flex-col items-center justify-center rounded-full
            border transition-all duration-150 ease-out focus:outline-none
            ${
              isListening
                ? "border-red-500/80 bg-gradient-to-b from-zinc-900 to-zinc-950 text-red-400 tactile-pressed"
                : isProcessing
                ? "border-amber-500/80 bg-gradient-to-b from-zinc-900 to-zinc-950 text-amber-400"
                : "border-zinc-700/80 bg-gradient-to-b from-zinc-800 to-zinc-900 text-zinc-100 hover:border-zinc-500 hover:from-zinc-750 hover:to-zinc-850 tactile-bezel active:scale-[0.98]"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
        >
          {/* LED Tally Light Indicator */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span
              className={`h-2 w-2 rounded-full transition-colors duration-150 ${
                isListening
                  ? "bg-red-500 shadow-led-red animate-pulse"
                  : isProcessing
                  ? "bg-amber-400 shadow-led-amber animate-pulse"
                  : "bg-emerald-500/70"
              }`}
            />
            <span className="text-[10px] font-mono tracking-widest uppercase font-semibold text-zinc-400">
              {isListening ? "REC" : isProcessing ? "BUSY" : "READY"}
            </span>
          </div>

          {/* Central Physical Icon */}
          <div className="my-1">
            {isListening ? (
              <Square className="h-7 w-7 text-red-500 fill-red-500" />
            ) : isProcessing ? (
              <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
            ) : (
              <Mic className="h-7 w-7 text-zinc-100" />
            )}
          </div>

          {/* Subdued Status Action Label */}
          <span className="text-[11px] font-medium tracking-tight text-zinc-300">
            {isListening ? "Stop Capture" : isProcessing ? "Processing" : "Record Speech"}
          </span>
        </button>
      </div>

      {/* Hardware Hotkey Keycap Hint */}
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
        <span>Press</span>
        <kbd className="px-2 py-0.5 rounded bg-zinc-800/90 border border-zinc-700 text-[10px] font-mono text-zinc-300 shadow-sm">
          SPACE
        </kbd>
        <span>to toggle</span>
      </div>
    </div>
  );
};
