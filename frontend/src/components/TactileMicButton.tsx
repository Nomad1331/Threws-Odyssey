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

/**
 * TactileMicButton: Motor-Accessible Audio Recording Toggle
 * ==========================================================
 * Designed specifically for users with neuromotor disabilities (e.g. Cerebral Palsy, ALS tremors).
 *
 * Accessibility Specifications:
 * 1. Touch Target: 112px diameter (WCAG 2.1 AAA specifies a minimum of 44x44px).
 * 2. Multi-Modal Feedback: Combines physical haptic vibration (45ms pulse on supported mobile hardware),
 *    visual color changes, and dynamic RMS scale pulsing.
 * 3. Assistive Switch Hotkey: Global spacebar trigger allows hands-free operation via adaptive switch
 *    controllers (which map to the standard keyboard spacebar).
 * 4. Input Safe: Automatically disables spacebar hijacking when focused inside text fields or textareas.
 */

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
        // Enforce repeat check to eliminate rapid spastic trigger loops from held switch buttons
        if (e.repeat) return;
        const activeEl = document.activeElement as HTMLElement | null;
        // Let a focused control handle Space itself (buttons, links, fields).
        // Without this, Space on "Clear"/"Say it"/a preset activates the mic instead.
        if (
          activeEl?.closest(
            'button, a, input, select, textarea, [role="button"], [contenteditable="true"]'
          )
        ) {
          return;
        }
        e.preventDefault();
        handleAction();
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
        aria-busy={isProcessing}
        aria-label={
          isListening
            ? "Stop recording"
            : isProcessing
            ? "Processing"
            : "Start recording"
        }
        aria-pressed={isListening}
        className={`relative flex h-28 w-28 flex-col items-center justify-center rounded-full border bg-speak-background text-text-primary transition-colors hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-canvas ${
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
            isListening && typeof audioLevel === "number" && Number.isFinite(audioLevel) && audioLevel > 0
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
