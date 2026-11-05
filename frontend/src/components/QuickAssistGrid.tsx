"use client";

import React, { useState } from "react";
import { GlassWater, BellRing, AlertCircle, Check, X } from "lucide-react";

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
    id: "yes",
    label: "Yes",
    spokenText: "Yes, that is correct.",
    icon: Check,
    tone: "affirmative",
  },
  {
    id: "no",
    label: "No",
    spokenText: "No, I do not want that.",
    icon: X,
    tone: "negative",
  },
  {
    id: "pain",
    label: "Pain Alert",
    spokenText: "I am in physical pain, please assist me right now.",
    icon: AlertCircle,
    tone: "urgent",
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
    setTimeout(() => setActiveCardId(null), 800);

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
      className={`flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto ${className}`}
      role="region"
      aria-label="Quick Assist Soundboard"
    >
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
              inline-flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full border text-xs sm:text-sm font-sans font-medium transition-all duration-100 select-none active:scale-95
              ${
                isActive
                  ? "bg-zinc-800 border-zinc-500 text-white translate-y-0.5"
                  : isUrgent
                  ? "bg-red-950/30 border-red-900/50 text-red-300 hover:border-red-700 hover:bg-red-950/50"
                  : "bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
              }
            `}
          >
            <Icon
              className={`h-3.5 w-3.5 ${
                isUrgent ? "text-red-400" : "text-zinc-400"
              }`}
            />
            <span>{card.label}</span>
          </button>
        );
      })}
    </div>
  );
};
