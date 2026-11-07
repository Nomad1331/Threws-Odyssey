"use client";

import React, { useState, useEffect, useRef } from "react";
import { GlassWater, BellRing, AlertCircle, Check, X } from "lucide-react";

interface AACPreset {
  id: string;
  label: string;
  phrase: string;
  icon: React.ComponentType<{ className?: string }>;
  isUrgent?: boolean;
}

const PRESETS: AACPreset[] = [
  { id: "water", label: "Water", phrase: "I would like some water, please.", icon: GlassWater },
  { id: "nurse", label: "Caregiver", phrase: "Please call my caregiver.", icon: BellRing },
  { id: "yes", label: "Yes", phrase: "Yes.", icon: Check },
  { id: "no", label: "No", phrase: "No.", icon: X },
  { id: "pain", label: "Pain Alert", phrase: "I am in pain. Please come to me now.", icon: AlertCircle, isUrgent: true },
];

interface QuickAssistGridProps {
  onSpeakPhrase?: (phrase: string) => void;
  className?: string;
}

/**
 * QuickAssistGrid: Augmentative & Alternative Communication (AAC) Preset Panel
 * ===========================================================================
 * Provides immediate one-touch access to essential clinical and personal care phrases
 * (Water, Caregiver, Yes, No, Pain Alert).
 *
 * Spasticity & Involuntary Movement Protection:
 * Individuals with spastic Cerebral Palsy or ALS frequently experience involuntary
 * motor spasms. For high-urgency actions ("Pain Alert"), a 2-step confirmation window is
 * enforced: the user must tap a second time within a 3000ms window before the alert
 * triggers, eliminating false alarms.
 */

export const QuickAssistGrid: React.FC<QuickAssistGridProps> = ({
  onSpeakPhrase,
  className = "",
}) => {
  const [armedId, setArmedId] = useState<string | null>(null);
  const armTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (armTimeoutRef.current) clearTimeout(armTimeoutRef.current);
    };
  }, []);

  const handleClick = (preset: AACPreset) => {
    // Optional tactile haptic vibration for mobile users
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(preset.isUrgent ? 50 : 25);
      } catch {
        // Disregard haptic errors on unsupported hardware or webviews
      }
    }

    // Two-step confirmation for urgent alerts (e.g. Pain Alert)
    if (preset.isUrgent) {
      if (armedId !== preset.id) {
        setArmedId(preset.id);
        if (armTimeoutRef.current) clearTimeout(armTimeoutRef.current);
        armTimeoutRef.current = setTimeout(() => setArmedId(null), 3000);
        return;
      }
      if (armTimeoutRef.current) {
        clearTimeout(armTimeoutRef.current);
        armTimeoutRef.current = null;
      }
      setArmedId(null);
    }

    if (onSpeakPhrase) {
      onSpeakPhrase(preset.phrase);
    }
  };

  return (
    <div className={`w-full max-w-lg mx-auto ${className}`}>
      <p className="mb-3 font-mono text-[11px] font-semibold tracking-widest text-text-secondary">
        ASSISTIVE PRESETS
      </p>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="group" aria-label="Quick phrases">
        {PRESETS.map((preset) => {
          const Icon = preset.icon;
          const isArmed = armedId === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleClick(preset)}
              aria-pressed={preset.isUrgent ? isArmed : undefined}
              className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[6px] border px-3 py-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:scale-[0.98] ${
                preset.isUrgent
                  ? "col-span-2 border-pain-border bg-pain-background text-pain-text hover:bg-pain-hover sm:col-span-3"
                  : "border-border bg-surface text-text-primary hover:border-accent"
              } ${isArmed ? "ring-2 ring-pain-border font-bold" : ""}`}
            >
              <Icon className={`h-4 w-4 ${preset.isUrgent ? "text-pain-text" : "text-text-secondary"}`} />
              <span>{isArmed ? "Confirm Pain Alert?" : preset.label}</span>
            </button>
          );
        })}
      </div>

      <p className="pt-3 text-center font-mono text-[10px] text-text-secondary">
        Pain Alert requires two taps within 3 seconds to prevent accidental triggers.
      </p>
    </div>
  );
};
