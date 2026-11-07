"use client";

import React, { useEffect, useRef } from "react";

interface AudioWaveformCanvasProps {
  isRecording: boolean;
  audioAnalyser?: AnalyserNode | null;
  className?: string;
}

/**
 * AudioWaveformCanvas: 60 FPS HTML5 Canvas Audio Visualizer
 * ==========================================================
 * Provides instant kinetic visual feedback to dysarthric speakers that their
 * acoustic vocalizations are being registered by the system.
 *
 * Technical Details:
 * 1. High-DPI Rendering: Automatically reads window.devicePixelRatio and scales
 *    the canvas internal 2D drawing context to eliminate blurry rendering on Retina displays.
 * 2. Real-Time RMS Bars: Samples 48 discrete time-domain amplitude windows directly from the
 *    Web Audio API AnalyserNode byte buffer.
 * 3. Memory & Frame Loop Safety: Guarantees cancelAnimationFrame cleanup upon component unmount
 *    or when recording stops.
 */

export const AudioWaveformCanvas: React.FC<AudioWaveformCanvasProps> = ({
  isRecording,
  audioAnalyser,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

      if (isRecording && audioAnalyser && dataArray) {
        audioAnalyser.getByteTimeDomainData(dataArray);
      }

      for (let i = 0; i < barCount; i++) {
        const x = i * barSpacing + (barSpacing - barWidth) / 2;
        const sampleIndex = Math.floor((i / barCount) * (dataArray?.length ?? 1));
        const sample = dataArray?.[sampleIndex] ?? 128;
        const amplitude = isRecording ? Math.abs(sample - 128) / 128 : 0;
        const barHeight = Math.max(4, height * 0.85 * amplitude);
        ctx.fillStyle = "#c4c4bf";

        const y = centerY - barHeight / 2;

        ctx.beginPath();
        ctx.rect(x, y, barWidth, barHeight);
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
      className={`relative h-12 w-full mx-auto flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="h-full w-full block" />
    </div>
  );
};
