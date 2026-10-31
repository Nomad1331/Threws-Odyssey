"use client";

import React, { useState } from "react";
import { GlassWater, BellRing, AlertTriangle, CheckCircle2, XCircle, Volume2 } from "lucide-react";

interface AACCard {
  id: string;
  label: string;
  spokenText: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "neutral" | "urgent" | "affirmative" | "negative";
}

const AAC_PRESETS: AACCard[] = [
  {
    id: "water",
    label: "Water",
    spokenText: "I need a glass of water please.",
    icon: GlassWater,
    tone: "neutral",
  },
  {
    id: "nurse",
    label: "Nurse / Caregiver",
    spokenText: "Please call the nurse or caregiver immediately.",
    icon: BellRing,
    tone: "neutral",
  },
  {
    id: "pain",
    label: "Pain Alert",
    spokenText: "I am in physical pain, please assist me right now.",
    icon: AlertTriangle,
    tone: "urgent",
  },
  {
    id: "yes",
    label: "Yes",
    spokenText: "Yes, that is correct.",
    icon: CheckCircle2,
    tone: "affirmative",
  },
  {
    id: "no",
    label: "No",
    spokenText: "No, I do not want that.",
    icon: XCircle,
    tone: "negative",
  },
];

interface QuickAssistGridProps {
  onSpeakPhrase?: (phrase: string) => void;
  className?: string;
}

export const QuickAssistGrid: React.FC<QuickAssistGridProps> = ({
  onSpeakPhrase,
  className = "",
}) => {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const handleCardClick = (card: AACCard) => {
    setActiveCardId(card.id);
    setTimeout(() => setActiveCardId(null), 1200);

    // Speak aloud using client-side Web Speech API
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(card.spokenText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }

    if (onSpeakPhrase) {
      onSpeakPhrase(card.spokenText);
    }
  };

  return (
    <div
      className={`rounded-2xl bg-surface/80 border-2 border-border p-5 shadow-card-subtle ${className}`}
      role="region"
      aria-label="AAC Quick Assist Cards"
    >
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-clinical-teal-light" />
          <h2 className="text-xs font-semibold tracking-wider uppercase text-clinical-text">
            AAC Quick-Tap Cards (Instant Speech)
          </h2>
        </div>
        <span className="text-[11px] font-mono text-clinical-muted">
          WCAG AAA Single-Tap
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {AAC_PRESETS.map((card) => {
          const Icon = card.icon;
          const isActive = activeCardId === card.id;

          const toneStyles = {
            neutral:
              "border-border hover:border-clinical-teal bg-surface-light text-clinical-text active:bg-clinical-teal/20",
            urgent:
              "border-clinical-rose/50 hover:border-clinical-rose bg-clinical-rose/10 text-clinical-text active:bg-clinical-rose/30",
            affirmative:
              "border-clinical-teal/50 hover:border-clinical-teal-light bg-clinical-teal/10 text-clinical-text active:bg-clinical-teal/30",
            negative:
              "border-slate-600 hover:border-slate-500 bg-slate-800/80 text-clinical-text active:bg-slate-700",
          }[card.tone];

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleCardClick(card)}
              aria-label={`Instant Assistive Speech: ${card.label}. Speaks: ${card.spokenText}`}
              className={`
                flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200
                focus:outline-none min-h-[96px] cursor-pointer active:scale-95 text-center
                ${toneStyles}
                ${isActive ? "ring-2 ring-clinical-teal-light scale-105" : ""}
              `}
            >
              <Icon
                className={`h-7 w-7 mb-2 transition-transform ${
                  isActive ? "scale-110 text-clinical-teal-light" : "text-clinical-muted"
                } ${card.tone === "urgent" ? "text-rose-400" : ""}`}
              />
              <span className="text-sm font-bold tracking-tight text-clinical-text">
                {card.label}
              </span>
              <span className="text-[10px] text-clinical-muted/70 mt-0.5 line-clamp-1">
                {card.id === "pain" ? "Priority" : "Instant Voice"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
