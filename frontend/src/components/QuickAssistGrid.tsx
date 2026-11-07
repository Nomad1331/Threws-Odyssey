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
  onSpeakPhrase: (phrase: string) => void;
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
    onSpeakPhrase(card.phrase);
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
    <div className={`w-full max-w-lg mx-auto ${className}`}>
      <p className="mb-3 font-mono text-[11px] font-semibold tracking-widest text-text-secondary">
        ASSISTIVE PRESETS
      </p>
      <div
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
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
              className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[6px] border px-3 py-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-3 active:scale-[0.98] ${
                isUrgent
                  ? "col-span-2 border-pain-border bg-pain-background text-pain-text hover:bg-pain-hover sm:col-span-3"
                  : "border-border bg-surface text-text-primary hover:border-accent"
              }
                ${isFlashing ? "ring-2 ring-accent" : ""}
                ${isArmed ? "ring-2 ring-pain-border" : ""}
              `}
            >
              <Icon
                className={`h-4 w-4 ${isUrgent ? "text-pain-text" : "text-text-secondary"}`}
              />
              <span>{isArmed ? "Tap again to send" : card.label}</span>
            </button>
          );
        })}
      </div>

      <p aria-live="polite" className="min-h-[16px] pt-3 text-center text-[11px] text-pain-text">
        {armedCard
          ? `Tap ${armedCard.label} again within 3 seconds, or hold it for 1.5 seconds, to send.`
          : ""}
      </p>

      <p className="pt-3 text-center font-mono text-[10px] text-text-secondary">
        Pain Alert is not a medical alert. In an emergency, call your local emergency number.
      </p>
    </div>
  );
};