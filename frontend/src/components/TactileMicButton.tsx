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
    <div className="flex flex-col items-center justify-center select-none py-2">
      <button
            type="button"
            onClick={handleAction}
            disabled={disabled || isProcessing}
            aria-label={
              isListening
                ? "Stop recording"
                : isProcessing
                ? "Processing"
                : "Start recording"
            }
            aria-pressed={isListening}
            className={`relative flex h-28 w-28 flex-col items-center justify-center rounded-full border bg-speak-background text-text-primary transition-colors hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-3 sm:h-28 sm:w-28 ${
              isListening ? "border-accent" : "border-border"
            } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${
              isProcessing ? "cursor-wait" : ""
            }`}
          >
            <span
              className={`mb-2 h-2 w-2 rounded-full bg-accent transition-transform duration-75 ${
                isListening ? "animate-pulse" : ""
              }`}
              style={
                isListening && audioLevel > 0
                  ? { transform: `scale(${1 + Math.min(audioLevel * 1.8, 1.5)})` }
                  : undefined
              }
              aria-hidden="true"
            />
            {isListening ? (
              <Square className="h-7 w-7 text-accent" />
            ) : isProcessing ? (
              <Loader2 className="h-7 w-7 animate-spin text-accent" />
            ) : (
              <Mic className="h-7 w-7 text-text-primary" />
            )}
            <span className="mt-2 font-mono text-[10px] font-semibold tracking-widest text-text-primary">
              {isListening ? "STOP" : isProcessing ? "PROCESSING" : "IDLE"}
            </span>
            {!isProcessing && (
              <span className="mt-0.5 text-xs text-text-secondary">
                {isListening ? "Stop" : "Speak"}
              </span>
            )}
          </button>

      <p className="mt-4 text-xs text-text-secondary">
        Shortcut: <kbd className="font-mono">SPACE</kbd>
      </p>
    </div>
  );
};
