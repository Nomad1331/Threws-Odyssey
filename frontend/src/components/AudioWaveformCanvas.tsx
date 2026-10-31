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

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Create calm clinical gradient (Therapeutic Teal)
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "rgba(13, 148, 136, 0.2)");
      gradient.addColorStop(0.5, "rgba(20, 184, 166, 0.95)");
      gradient.addColorStop(1, "rgba(13, 148, 136, 0.2)");

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = gradient;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();

      if (isRecording) {
        let rms = 0;
        if (audioAnalyser && dataArray) {
          audioAnalyser.getByteTimeDomainData(dataArray);
          // Calculate true RMS energy from real hardware audio stream
          let sumSquares = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const normalized = (dataArray[i] - 128) / 128;
            sumSquares += normalized * normalized;
          }
          rms = Math.sqrt(sumSquares / dataArray.length);
        } else {
          // Resting telemetry baseline when microphone is waiting
          rms = 0.02;
        }

        phaseRef.current += 0.06;

        // Render multi-harmonic smooth sine wave scaled to vocal energy
        const points = 80;
        const effectiveRms = audioAnalyser ? rms * 5.0 : 0.02;
        for (let i = 0; i <= points; i++) {
          const x = (i / points) * width;
          const progress = i / points;
          // Apply Gaussian envelope to taper edges smoothly
          const envelope = Math.sin(progress * Math.PI);
          const amplitude = (height * 0.42) * Math.min(effectiveRms, 1) * envelope;
          
          const y =
            centerY +
            Math.sin(progress * 10 + phaseRef.current) * amplitude * 0.7 +
            Math.cos(progress * 18 - phaseRef.current * 1.5) * amplitude * 0.3;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      } else {
        // Calm resting baseline pulse (medical telemetry look)
        phaseRef.current += 0.02;
        const baselineAmplitude = 2.5 * Math.sin(phaseRef.current);
        ctx.moveTo(0, centerY);
        ctx.bezierCurveTo(
          width * 0.35,
          centerY - baselineAmplitude,
          width * 0.65,
          centerY + baselineAmplitude,
          width,
          centerY
        );
      }

      ctx.stroke();

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
      className={`relative w-full overflow-hidden rounded-xl bg-surface/40 border border-border/50 backdrop-blur-sm ${className}`}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-16 block"
        style={{ width: "100%", height: "64px" }}
      />
      <div className="absolute top-2 left-3 flex items-center gap-1.5 pointer-events-none">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isRecording ? "bg-clinical-teal-light animate-pulse" : "bg-slate-600"
          }`}
        />
        <span className="text-[10px] font-mono tracking-wider text-clinical-muted/70 uppercase">
          {isRecording ? "16kHz Mono Stream" : "Audio Idle"}
        </span>
      </div>
    </div>
  );
};
