"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Square } from "lucide-react";

export interface BenchmarkTrial {
  id: string;
  sampleLabel: string;
  speakerId: string;
  condition: string;
  targetText: string;
  audioUrl: string;
}

const TORGO_TRIALS: BenchmarkTrial[] = [
  {
    id: "trial-1",
    sampleLabel: "Sample 01",
    speakerId: "M05",
    condition: "Cerebral Palsy (Mild)",
    targetText: "We have an excellent team",
    audioUrl: "/audio/torgo_mild_sample.wav",
  },
  {
    id: "trial-2",
    sampleLabel: "Sample 02",
    speakerId: "M04",
    condition: "Post-Trauma TBI (Moderate-to-Severe)",
    targetText: "Their house is grey and white",
    audioUrl: "/audio/torgo_moderate_sample.wav",
  },
  {
    id: "trial-3",
    sampleLabel: "Sample 03",
    speakerId: "M02",
    condition: "ALS (Severe)",
    targetText: "The job provides many benefits",
    audioUrl: "/audio/torgo_severe_sample.wav",
  },
];

interface ClinicalBenchmarkDrawerProps {
  className?: string;
}

/**
 * ClinicalBenchmarkDrawer: Authentic TORGO Acoustic Evaluation Player
 * ====================================================================
 * Allows evaluators, judges, and clinicians to listen to authentic held-out acoustic
 * recordings from the University of Toronto TORGO dysarthria corpus.
 *
 * Etiology Demographics:
 * 1. Sample 01 (M05): Cerebral Palsy, Mild severity.
 * 2. Sample 02 (M04): Post-Trauma Traumatic Brain Injury (TBI), Moderate-to-Severe severity.
 * 3. Sample 03 (M02): Amyotrophic Lateral Sclerosis (ALS), Severe severity.
 */

export const ClinicalBenchmarkDrawer: React.FC<ClinicalBenchmarkDrawerProps> = ({
  className = "",
}) => {
  const [selectedTrialId, setSelectedTrialId] = useState<string>("trial-1");
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioPlayerRef.current = audio;

    audio.onended = () => setPlayingAudioId(null);
    audio.onpause = () => setPlayingAudioId(null);
    audio.onerror = () => setPlayingAudioId(null);

    return () => {
      audio.pause();
      audio.src = "";
      audio.onended = null;
      audio.onpause = null;
      audio.onerror = null;
      audioPlayerRef.current = null;
    };
  }, []);

  const handleSelectTrial = (id: string) => {
    if (playingAudioId && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingAudioId(null);
    }
    setSelectedTrialId(id);
  };

  const handleTogglePlayAudio = (trial: BenchmarkTrial) => {
    const audio = audioPlayerRef.current;
    if (!audio) return;

    if (playingAudioId === trial.id) {
      audio.pause();
      setPlayingAudioId(null);
    } else {
      audio.src = trial.audioUrl;
      audio.currentTime = 0;
      audio
        .play()
        .then(() => setPlayingAudioId(trial.id))
        .catch(() => setPlayingAudioId(null));
    }
  };

  const currentTrial = TORGO_TRIALS.find((t) => t.id === selectedTrialId) || TORGO_TRIALS[0];

  return (
    <div
      className={`rounded-[6px] border border-border bg-surface p-4 sm:p-5 ${className}`}
      role="region"
      aria-label="Clinical benchmark reference"
    >
      <div className="flex flex-col justify-between gap-1 border-b border-border pb-3 sm:flex-row sm:items-center sm:gap-2">
        <div className="flex items-center gap-2 font-mono text-xs text-text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="text-[11px] font-semibold tracking-wider">
            TORGO Clinical Speech References
          </span>
        </div>
        <span className="font-mono text-[10px] text-text-secondary sm:text-[11px]">
          University of Toronto TORGO Database (Rudzicz et al., 2012)
        </span>
      </div>

      {/* Sample selector */}
      <div className="my-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {TORGO_TRIALS.map((trial) => {
          const isSelected = trial.id === selectedTrialId;
          return (
            <button
              key={trial.id}
              type="button"
              onClick={() => handleSelectTrial(trial.id)}
              aria-pressed={isSelected}
              className={`flex min-h-[44px] items-center justify-between rounded-[6px] border p-3 text-left font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:scale-[0.98] ${
                isSelected
                  ? "border-accent bg-surface text-text-primary"
                  : "border-border bg-surface text-text-secondary hover:border-accent"
              }`}
            >
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-text-secondary">
                  {trial.sampleLabel}
                </span>
                <span className="text-[11px] text-text-primary">{trial.condition}</span>
              </div>
              <span className="rounded-[4px] border border-border px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                {trial.speakerId}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected sample details */}
      <div className="rounded-[6px] border border-border bg-surface p-4 font-mono">
        <div className="flex flex-col justify-between gap-3 text-xs sm:flex-row sm:items-center">
          <div>
            <span className="mb-0.5 block text-[10px] uppercase tracking-widest text-text-secondary">
              Intended speech (Ground Truth)
            </span>
            <span className="font-sans text-sm font-medium text-text-primary">
              &ldquo;{currentTrial.targetText}&rdquo;
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleTogglePlayAudio(currentTrial)}
            aria-label={
              playingAudioId === currentTrial.id
                ? `Pause ${currentTrial.sampleLabel} recording`
                : `Play ${currentTrial.sampleLabel} recording`
            }
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-[6px] border px-3 py-1.5 font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:scale-95 ${
              playingAudioId === currentTrial.id
                ? "border-accent bg-surface text-accent"
                : "border-border bg-surface text-text-primary hover:border-accent"
            }`}
          >
            {playingAudioId === currentTrial.id ? (
              <Square className="h-3 w-3 fill-accent text-accent" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            <span>{playingAudioId === currentTrial.id ? "Pause" : "Play recording"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
