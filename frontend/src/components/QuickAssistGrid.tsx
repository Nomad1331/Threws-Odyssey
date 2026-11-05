"use client";

import React, { useState } from "react";
import { GlassWater, BellRing, AlertCircle, CheckCircle, XCircle } from "lucide-react";

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
    label: "Caregiver",
    spokenText: "Please call the caregiver or nurse immediately.",
    icon: BellRing,
    tone: "neutral",
  },
  {
    id: "pain",
    label: "Pain Alert",
    spokenText: "I am in physical pain, please assist me right now.",
    icon: AlertCircle,
    tone: "urgent",
  },
  {
    id: "yes",
    label: "Yes",
    spokenText: "Yes, that is correct.",
    icon: CheckCircle,
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
    setTimeout(() => setActiveCardId(null), 1000);

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
      className={`rounded-2xl bg-zinc-900/80 border border-zinc-800/80 p-4 sm:p-5 ${className}`}
      role="region"
      aria-label="Quick Assist Soundboard"
    >
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800 font-mono text-xs">
        <div className="flex items-center gap-2 text-zinc-300">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
          <span className="font-semibold uppercase tracking-wider text-[11px]">
            Quick Assist Pads
          </span>
        </div>
        <span className="text-[10px] sm:text-[11px] text-zinc-500 font-mono">
          Single-touch speech for vocal fatigue
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {AAC_PRESETS.map((card) => {
          const Icon = card.icon;
          const isActive = activeCardId === card.id;
          const isUrgent = card.tone === "urgent";

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleCardClick(card)}
              className={`
                flex flex-col items-center justify-center min-h-[76px] sm:min-h-[86px] p-3 rounded-xl border text-center transition-all duration-100 select-none
                ${
                  isActive
                    ? "bg-zinc-800 border-zinc-500 translate-y-0.5 shadow-inner"
                    : isUrgent
                    ? "bg-red-950/20 border-red-900/40 text-red-200 hover:border-red-700 hover:bg-red-950/30 tactile-bezel active:scale-95"
                    : "bg-zinc-950/70 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 tactile-bezel active:scale-95"
                }
              `}
            >
              <Icon
                className={`h-5 w-5 mb-1.5 ${
                  isUrgent ? "text-red-400" : "text-zinc-400"
                }`}
              />
              <span className="text-xs sm:text-sm font-sans font-medium tracking-tight">
                {card.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
