"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Square } from "lucide-react";

export interface BenchmarkTrial {
  id: string;
  sampleLabel: string;
  speakerId: string;
  targetText: string;
  audioUrl: string;
  durationSec: number;
}

// Reference transcripts and audio only. No model predictions or WER values here:
// those come from the evaluation run (results file), not from hardcoded text.
const TORGO_TRIALS: BenchmarkTrial[] = [
  {
    id: "trial-1",
    sampleLabel: "Sample 01",
    speakerId: "M05",
    targetText: "We have an excellent team",
    audioUrl: "/audio/torgo_mild_sample.wav",
    durationSec: 5.69,
  },
  {
    id: "trial-2",
    sampleLabel: "Sample 02",
    speakerId: "M04",
    targetText: "Their house is grey and white",
    audioUrl: "/audio/torgo_moderate_sample.wav",
    durationSec: 5.87,
  },
  {
    id: "trial-3",
    sampleLabel: "Sample 03",
    speakerId: "M02",
    targetText: "The job provides many benefits",
    audioUrl: "/audio/torgo_severe_sample.wav",
    durationSec: 6.0,
  },
];

interface ClinicalBenchmarkDrawerProps {
  className?: string;
}

export const ClinicalBenchmarkDrawer: React.FC<ClinicalBenchmarkDrawerProps> = ({
  className = "",
}) => {
  const [selectedTrialId, setSelectedTrialId] = useState<string>("trial-1");
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioPlayerRef.current = audio;

    audio.onended = () => setPlayingAudioId(null);
    audio.onpause = () => setPlayingAudioId(null);
    audio.onerror = () => {
      const code = audio.error?.code;
      console.error("Benchmark audio load error:", audio.src, audio.error);
      setAudioError(`Audio failed to load (error code ${code ?? "unknown"}).`);
      setPlayingAudioId(null);
    };

    return () => {
      audio.pause();
    };
  }, []);

  const handleTogglePlayAudio = (trial: BenchmarkTrial, e: React.MouseEvent) => {
    e.stopPropagation();
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
      aria-label="Clinical benchmark archive"
    >
      <div className="flex flex-col justify-between gap-1 border-b border-border pb-3 sm:flex-row sm:items-center sm:gap-2">
        <div className="flex items-center gap-2 font-mono text-xs text-text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="text-[11px] font-semibold tracking-wider">
            Clinical Benchmark Archive
          </span>
        </div>
        <span className="font-mono text-[10px] text-text-secondary sm:text-[11px]">
          TORGO reference clips. Model results pending evaluation run.
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
              onClick={() => setSelectedTrialId(trial.id)}
              className={`flex min-h-[44px] items-center justify-between rounded-[6px] border p-3 text-left font-mono text-xs transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-3 active:scale-[0.98] ${
                isSelected
                  ? "border-accent bg-surface text-text-primary"
                  : "border-border bg-surface text-text-secondary hover:border-accent"
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider text-text-secondary">
                {trial.sampleLabel}
              </span>
              <span className="rounded-[6px] border border-border px-2 py-0.5 font-mono text-[10px] text-text-secondary">
                {trial.speakerId}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected sample */}
      <div className="rounded-[6px] border border-border bg-surface p-4 font-mono">
        <div className="flex flex-col justify-between gap-3 border-b border-border pb-3 text-xs sm:flex-row sm:items-center">
          <div>
            <span className="mb-0.5 block text-[10px] uppercase tracking-widest text-text-secondary">
              Intended speech (reference)
            </span>
            <span className="font-sans text-sm font-medium text-text-primary">
              &ldquo;{currentTrial.targetText}&rdquo;
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => handleTogglePlayAudio(currentTrial, e)}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-[6px] border px-3 py-1.5 font-mono text-xs transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-3 active:scale-95 ${
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
            <span>{playingAudioId === currentTrial.id ? "Pause" : "Reference recording"}</span>
          </button>
        </div>

        {/* Model results placeholder: filled from the results file, not typed here */}
        <div className="grid grid-cols-1 gap-3 pt-3 text-xs md:grid-cols-2">
          <div className="rounded-[6px] border border-border p-3">
            <div className="mb-1 text-[11px] font-semibold text-text-secondary">Baseline Whisper-tiny</div>
            <p className="text-[11px] text-text-secondary">Prediction and WER: pending run</p>
          </div>
          <div className="rounded-[6px] border border-border p-3">
            <div className="mb-1 text-[11px] font-semibold text-text-secondary">VoiceBridge (LoRA)</div>
            <p className="text-[11px] text-text-secondary">Prediction and WER: pending run</p>
          </div>
        </div>
      </div>
    </div>
  );
};