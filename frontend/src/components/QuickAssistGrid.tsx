"use client";

import React, { useState, useEffect, useRef } from "react";
import { GlassWater, BellRing, AlertCircle, Check, X } from "lucide-react";

interface AACCard {
  id: string;
  label: string;
  phrase: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "neutral" | "urgent" | "affirmative" | "negative";
  requiresConfirm: boolean;
}

const AAC_PRESETS: AACCard[] = [
  {
    id: "water",
    label: "Water",
    phrase: "I would like some water, please.",
    icon: GlassWater,
    tone: "neutral",
    requiresConfirm: false,
  },
  {
    id: "nurse",
    label: "Caregiver",
    phrase: "Please call my caregiver.",
    icon: BellRing,
    tone: "neutral",
    requiresConfirm: false,
  },
  {
    id: "yes",
    label: "Yes",
    phrase: "Yes.",
    icon: Check,
    tone: "affirmative",
    requiresConfirm: false,
  },
  {
    id: "no",
    label: "No",
    phrase: "No.",
    icon: X,
    tone: "negative",
    requiresConfirm: false,
  },
  {
    id: "pain",
    label: "Pain Alert",
    phrase: "I am in pain. Please come to me now.",
    icon: AlertCircle,
    tone: "urgent",
    requiresConfirm: true,
  },
];

const CONFIRM_WINDOW_MS = 3000;
const HOLD_MS = 1500;

function vibrate(ms: number) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(ms);
    } catch {
      // Vibration not supported
    }
  }
}

interface QuickAssistGridProps {
  onSpeakPhrase?: (phrase: string) => void;
  className?: string;
}

export const QuickAssistGrid: React.FC<QuickAssistGridProps> = ({
  onSpeakPhrase,
  className = "",
}) => {
  const [flashId, setFlashId] = useState<string | null>(null);
  const [armedId, setArmedId] = useState<string | null>(null);

  const armTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (armTimerRef.current) clearTimeout(armTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  const disarm = () => {
    if (armTimerRef.current) {
      clearTimeout(armTimerRef.current);
      armTimerRef.current = null;
    }
    setArmedId(null);
  };

  // Sends the phrase. The page puts it in the transcript box; the user taps "Say it" to hear it.
  const send = (card: AACCard) => {
    disarm();
    vibrate(30);
    setFlashId(card.id);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlashId(null), 800);
    if (onSpeakPhrase) {
      onSpeakPhrase(card.phrase);
    }
  };

  // First tap on a confirm-required button: arm it and start the 3-second window.
  const arm = (card: AACCard) => {
    vibrate(15);
    setArmedId(card.id);
    if (armTimerRef.current) clearTimeout(armTimerRef.current);
    armTimerRef.current = setTimeout(() => {
      armTimerRef.current = null;
      setArmedId(null);
    }, CONFIRM_WINDOW_MS);
  };

  const handleClick = (card: AACCard) => {
    // A hold has already sent this press; ignore the click that follows the release.
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    if (!card.requiresConfirm) {
      send(card);
      return;
    }

    if (armedId === card.id) {
      send(card);
      return;
    }

    arm(card);
  };

  const startHold = (card: AACCard) => {
    suppressClickRef.current = false;
    if (!card.requiresConfirm) return;

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      suppressClickRef.current = true;
      send(card);
    }, HOLD_MS);
  };

  // Release before the hold time: cancel the hold. The normal click handles it.
  const endHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  // Pointer left the button: cancel the hold and drop any pending click suppression.
  const cancelHold = () => {
    endHold();
    suppressClickRef.current = false;
  };

  const armedCard = AAC_PRESETS.find((c) => c.id === armedId);

  return (
    <div className={`w-full max-w-lg mx-auto flex flex-col items-center gap-3 ${className}`}>
      <div
        className="flex flex-wrap items-center justify-center gap-2.5"
        role="group"
        aria-label="Quick phrase buttons"
      >
        {AAC_PRESETS.map((card) => {
          const Icon = card.icon;
          const isFlashing = flashId === card.id;
          const isArmed = armedId === card.id;
          const isUrgent = card.tone === "urgent";

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleClick(card)}
              onPointerDown={() => startHold(card)}
              onPointerUp={endHold}
              onPointerLeave={cancelHold}
              onPointerCancel={cancelHold}
              onContextMenu={(e) => {
                if (isUrgent) e.preventDefault();
              }}
              className={`
                inline-flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 min-h-[44px] rounded-full border text-xs sm:text-sm font-sans font-medium transition-all duration-100 select-none active:scale-95 shadow-sm
                ${
                  isFlashing
                    ? "bg-zinc-800 border-amber-500 text-white ring-2 ring-amber-500/30"
                    : isArmed
                    ? "bg-red-900/70 border-red-500 text-white ring-2 ring-red-500/40"
                    : isUrgent
                    ? "bg-red-950/40 border-red-800/60 text-red-300 hover:border-red-600 hover:bg-red-950/60"
                    : "bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
                }
              `}
            >
              <Icon
                className={`h-4 w-4 ${
                  isArmed ? "text-white" : isUrgent ? "text-red-400" : "text-zinc-400"
                }`}
              />
              <span>{isArmed ? "Tap again to send" : card.label}</span>
            </button>
          );
        })}
      </div>

      <p aria-live="polite" className="min-h-[16px] text-[11px] font-sans text-red-300 text-center">
        {armedCard
          ? `Tap ${armedCard.label} again within 3 seconds, or hold it for 1.5 seconds, to send.`
          : ""}
      </p>

      <p className="text-[10px] font-mono text-zinc-500 text-center">
        Pain Alert is not a medical alert. In an emergency, call your local emergency number.
      </p>
    </div>
  );
};