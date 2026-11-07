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
      return;
    }

    setAudioError(null);
    audio.src = trial.audioUrl;
    audio.currentTime = 0;
    audio
      .play()
      .then(() => setPlayingAudioId(trial.id))
      .catch((err: unknown) => {
        const name = err instanceof Error ? err.name : "unknown";
        console.error("Benchmark audio play failed:", trial.audioUrl, err);
        setAudioError(`Could not play ${trial.audioUrl} (${name}).`);
        setPlayingAudioId(null);
      });
  };

  const currentTrial = TORGO_TRIALS.find((t) => t.id === selectedTrialId) || TORGO_TRIALS[0];

  return (
    <div
      className={`rounded-2xl bg-zinc-900/80 border border-zinc-800/80 p-4 sm:p-5 ${className}`}
      role="region"
      aria-label="Clinical benchmark archive"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 font-mono text-xs text-zinc-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span className="font-semibold uppercase tracking-wider text-[11px]">
            Clinical Benchmark Archive
          </span>
        </div>
        <span className="text-[10px] sm:text-[11px] font-mono text-zinc-500">
          TORGO reference clips. Model results pending evaluation run.
        </span>
      </div>

      {/* Sample selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 my-3">
        {TORGO_TRIALS.map((trial) => {
          const isSelected = trial.id === selectedTrialId;
          return (
            <button
              key={trial.id}
              type="button"
              onClick={() => setSelectedTrialId(trial.id)}
              className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-150 font-mono text-xs active:scale-[0.98] ${
                isSelected
                  ? "bg-zinc-800 border-zinc-600 text-zinc-100 shadow-sm"
                  : "bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:border-zinc-750 hover:text-zinc-200"
              }`}
            >
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                {trial.sampleLabel}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                {trial.speakerId}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected sample */}
      <div className="rounded-xl bg-zinc-950/80 border border-zinc-850 p-4 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-850 text-xs">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-0.5">
              Intended speech (reference)
            </span>
            <span className="text-sm font-sans font-medium text-zinc-100">
              &ldquo;{currentTrial.targetText}&rdquo;
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => handleTogglePlayAudio(currentTrial, e)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all active:scale-95 ${
              playingAudioId === currentTrial.id
                ? "bg-amber-950/70 border-amber-500/50 text-amber-300"
                : "bg-zinc-900 border-zinc-750 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            }`}
          >
            {playingAudioId === currentTrial.id ? (
              <Square className="h-3 w-3 fill-amber-400 text-amber-400" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            <span>{playingAudioId === currentTrial.id ? "Pause" : "Play recording"}</span>
          </button>
        </div>

        {audioError && (
          <p className="mt-3 text-[11px] text-red-400 font-sans">{audioError}</p>
        )}

        {/* Model results placeholder: filled from the results file, not typed here */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 text-xs">
          <div className="rounded-lg bg-zinc-900/60 border border-zinc-800 p-3">
            <div className="text-[11px] text-zinc-400 font-semibold mb-1">Baseline Whisper-tiny</div>
            <p className="text-[11px] text-zinc-500 italic">Prediction and WER: pending run</p>
          </div>
          <div className="rounded-lg bg-zinc-900/60 border border-zinc-800 p-3">
            <div className="text-[11px] text-zinc-400 font-semibold mb-1">VoiceBridge (LoRA)</div>
            <p className="text-[11px] text-zinc-500 italic">Prediction and WER: pending run</p>
          </div>
        </div>
      </div>
    </div>
  );
};