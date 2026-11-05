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

    // High-DPI screen compensation
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

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Subtle hardware oscilloscope background grid line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash

      if (isRecording) {
        let rms = 0;
        if (audioAnalyser && dataArray) {
          audioAnalyser.getByteTimeDomainData(dataArray);
          let sumSquares = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const normalized = (dataArray[i] - 128) / 128;
            sumSquares += normalized * normalized;
          }
          rms = Math.sqrt(sumSquares / dataArray.length);
        } else {
          rms = 0.03;
        }

        phaseRef.current += 0.08;

        // Studio Phosphor Trace (Precision Amber)
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2.0;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();

        const points = 96;
        const effectiveRms = audioAnalyser ? Math.min(rms * 6.0, 1.0) : 0.05;

        for (let i = 0; i <= points; i++) {
          const x = (i / points) * width;
          const progress = i / points;
          // Gaussian envelope to smoothly taper the line ends
          const envelope = Math.sin(progress * Math.PI);
          const amplitude = (height * 0.38) * effectiveRms * envelope;

          const y =
            centerY +
            Math.sin(progress * 14 + phaseRef.current) * amplitude * 0.75 +
            Math.cos(progress * 26 - phaseRef.current * 1.8) * amplitude * 0.25;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      } else {
        // Calm resting standby sweep
        phaseRef.current += 0.02;
        const baselineAmplitude = 1.5 * Math.sin(phaseRef.current);

        ctx.strokeStyle = "rgba(113, 113, 122, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, centerY);

        const points = 48;
        for (let i = 0; i <= points; i++) {
          const x = (i / points) * width;
          const progress = i / points;
          const envelope = Math.sin(progress * Math.PI);
          const y = centerY + Math.sin(progress * 6 + phaseRef.current) * baselineAmplitude * envelope;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
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
      className={`relative h-14 w-full rounded-lg bg-zinc-950/80 border border-zinc-800/80 p-1 flex items-center justify-center overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="h-full w-full block" />
      <div className="absolute top-1 left-2 text-[9px] font-mono tracking-widest uppercase text-zinc-600">
        {isRecording ? "OSC • 16KHZ LIVE" : "OSC • STANDBY"}
      </div>
    </div>
  );
};
