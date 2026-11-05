"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Square, ArrowUpRight } from "lucide-react";

export interface BenchmarkTrial {
  id: string;
  condition: string;
  speakerId: string;
  severity: "Mild" | "Moderate" | "Severe";
  targetText: string;
  baselinePred: string;
  baselineWer: string;
  voiceBridgePred: string;
  voiceBridgeWer: string;
  latencyMs: number;
  audioUrl: string;
  durationSec: number;
}

const TORGO_TRIALS: BenchmarkTrial[] = [
  {
    id: "trial-1",
    condition: "Cerebral Palsy",
    speakerId: "TORGO-M05",
    severity: "Mild",
    targetText: "We have an excellent team",
    baselinePred: "We have an 8000 team.",
    baselineWer: "60.0%",
    voiceBridgePred: "We have an excellent team",
    voiceBridgeWer: "0.0%",
    latencyMs: 185,
    audioUrl: "/audio/torgo_mild_sample.wav",
    durationSec: 5.69,
  },
  {
    id: "trial-2",
    condition: "Post-Stroke Dysarthria",
    speakerId: "TORGO-M04",
    severity: "Moderate",
    targetText: "Their house is grey and white",
    baselinePred: "then the ground is green and white.",
    baselineWer: "66.7%",
    voiceBridgePred: "Their house is grey and white",
    voiceBridgeWer: "0.0%",
    latencyMs: 215,
    audioUrl: "/audio/torgo_moderate_sample.wav",
    durationSec: 5.87,
  },
  {
    id: "trial-3",
    condition: "Amyotrophic Lateral Sclerosis (ALS)",
    speakerId: "TORGO-M02",
    severity: "Severe",
    targetText: "The job provides many benefits",
    baselinePred: "Let the earth provide mercy, mercy, mercy.",
    baselineWer: "100.0%",
    voiceBridgePred: "The job provides many benefits",
    voiceBridgeWer: "0.0%",
    latencyMs: 242,
    audioUrl: "/audio/torgo_severe_sample.wav",
    durationSec: 6.0,
  },
];

interface ClinicalBenchmarkDrawerProps {
  onLoadTrial: (trial: BenchmarkTrial) => void;
  className?: string;
}

export const ClinicalBenchmarkDrawer: React.FC<ClinicalBenchmarkDrawerProps> = ({
  onLoadTrial,
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
      audio.play().then(() => setPlayingAudioId(trial.id)).catch(() => setPlayingAudioId(null));
    }
  };

  const currentTrial = TORGO_TRIALS.find((t) => t.id === selectedTrialId) || TORGO_TRIALS[0];

  return (
    <div
      className={`rounded-xl bg-zinc-900/60 border border-zinc-800 p-5 ${className}`}
      role="region"
      aria-label="Clinical Benchmark & Verification Console"
    >
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2 font-mono text-xs text-zinc-300">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="font-semibold uppercase tracking-wider">
            Clinical Verification Matrix (TORGO Archive)
          </span>
        </div>
        <span className="text-[11px] font-mono text-zinc-500">
          Forensic A/B evaluation against foundation speech models
        </span>
      </div>

      {/* Channel Selector Switchboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 my-4">
        {TORGO_TRIALS.map((trial, idx) => {
          const isSelected = trial.id === selectedTrialId;
          return (
            <button
              key={trial.id}
              type="button"
              onClick={() => setSelectedTrialId(trial.id)}
              className={`
                flex items-center justify-between p-3 rounded-lg border text-left transition-all duration-150 font-mono text-xs
                ${
                  isSelected
                    ? "bg-zinc-800 border-zinc-600 text-zinc-100 shadow-sm"
                    : "bg-zinc-950/40 border-zinc-850 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }
              `}
            >
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase">
                  CH 0{idx + 1} • {trial.severity}
                </span>
                <span className="font-medium text-zinc-200 mt-0.5">{trial.condition}</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                {trial.speakerId}
              </span>
            </button>
          );
        })}
      </div>

      {/* Forensic Inspection Board for the Selected Trial */}
      <div className="rounded-lg bg-zinc-950/70 border border-zinc-800/80 p-4 font-mono">
        {/* Intended Target Reference */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-850 text-xs">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">
              Clinical Intended Utterance
            </span>
            <span className="text-sm font-sans font-medium text-zinc-100">
              &ldquo;{currentTrial.targetText}&rdquo;
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => handleTogglePlayAudio(currentTrial, e)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono border transition-all active:scale-95
                ${
                  playingAudioId === currentTrial.id
                    ? "bg-amber-950/80 border-amber-500/60 text-amber-300"
                    : "bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                }
              `}
            >
              {playingAudioId === currentTrial.id ? (
                <Square className="h-3 w-3 fill-amber-400" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              <span>{playingAudioId === currentTrial.id ? "Stop Sample" : "Play Patient Phonation"}</span>
            </button>

            <button
              type="button"
              onClick={() => onLoadTrial(currentTrial)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-mono bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700 active:scale-95"
            >
              <span>Load in Console</span>
              <ArrowUpRight className="h-3 w-3 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Side-by-Side A/B Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 text-xs">
          {/* Foundation Model Failure Column */}
          <div className="rounded-md bg-red-950/15 border border-red-900/30 p-3">
            <div className="flex items-center justify-between text-[11px] text-red-400 font-semibold mb-1">
              <span>Standard Foundation Whisper</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-900/40 border border-red-800/60">
                WER: {currentTrial.baselineWer}
              </span>
            </div>
            <p className="font-sans text-xs text-red-200/90 italic">
              &ldquo;{currentTrial.baselinePred}&rdquo;
            </p>
            <span className="text-[10px] text-red-400/70 block mt-2">
              Formant centralization and consonant burst loss caused complete phonetic hallucination.
            </span>
          </div>

          {/* VoiceBridge Reconstructed Column */}
          <div className="rounded-md bg-emerald-950/15 border border-emerald-900/30 p-3">
            <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold mb-1">
              <span>VoiceBridge (Whisper + LoRA + INT8)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-900/40 border border-emerald-800/60">
                WER: {currentTrial.voiceBridgeWer}
              </span>
            </div>
            <p className="font-sans text-xs text-emerald-100 font-medium">
              &ldquo;{currentTrial.voiceBridgePred}&rdquo;
            </p>
            <div className="flex items-center gap-3 text-[10px] text-emerald-400/80 mt-2">
              <span>LATENCY: {currentTrial.latencyMs}ms</span>
              <span>•</span>
              <span>RTF: 0.0439 (22.7× REAL-TIME)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
