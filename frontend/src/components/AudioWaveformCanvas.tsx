"use client";

import React, { useRef, useEffect } from "react";

interface AudioWaveformCanvasProps {
  isRecording: boolean;
  audioAnalyser?: AnalyserNode | null;
  className?: string;
}

export const AudioWaveformCanvas: React.FC<AudioWaveformCanvasProps> = ({
  isRecording,
  audioAnalyser,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle High-DPI screens cleanly
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;

    const dataArray = audioAnalyser
      ? new Uint8Array(audioAnalyser.frequencyBinCount)
      : null;

    const barCount = 48; // Number of vertical waveform bars
    const barSpacing = width / barCount;
    const barWidth = Math.max(2, barSpacing * 0.45);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      let effectiveRms = 0.05;
      if (isRecording && audioAnalyser && dataArray) {
        audioAnalyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const norm = (dataArray[i] - 128) / 128;
          sum += norm * norm;
        }
        effectiveRms = Math.min(Math.sqrt(sum / dataArray.length) * 5.0, 1.0);
      }

      phaseRef.current += isRecording ? 0.08 : 0.03;

      for (let i = 0; i < barCount; i++) {
        const x = i * barSpacing + (barSpacing - barWidth) / 2;
        const progress = i / (barCount - 1);
        
        // Bell-curve envelope to taper bars towards edges
        const envelope = Math.sin(progress * Math.PI);

        let barHeight = 4;
        if (isRecording) {
          // Dynamic soundwave reaction
          const wave =
            Math.sin(progress * 12 + phaseRef.current) * 0.6 +
            Math.cos(progress * 20 - phaseRef.current * 1.5) * 0.4;
          barHeight = Math.max(
            4,
            height * 0.8 * effectiveRms * envelope * (0.4 + 0.6 * Math.abs(wave))
          );
          ctx.fillStyle = progress > 0.4 && progress < 0.6 ? "#f59e0b" : "#e4e4e7";
        } else {
          // Calm resting breath wave
          const wave = Math.sin(progress * 6 + phaseRef.current);
          barHeight = Math.max(3, (height * 0.2) * envelope * (0.5 + 0.5 * Math.abs(wave)));
          ctx.fillStyle = "#3f3f46";
        }

        const y = centerY - barHeight / 2;
        
        // Draw rounded vertical bar
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, audioAnalyser]);

  return (
    <div
      className={`relative h-14 sm:h-16 w-full max-w-md mx-auto flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="h-full w-full block" />
    </div>
  );
};
