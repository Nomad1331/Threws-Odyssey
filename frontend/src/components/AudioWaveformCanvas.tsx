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

    const barCount = 48; // Number of vertical waveform bars

    // Measure and configure high-DPI canvas coordinates
    const setupCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return { width: 0, height: 0, centerY: 0 };
      }
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      return { width: rect.width, height: rect.height, centerY: rect.height / 2 };
    };

    let dims = setupCanvas();

    const dataArray = audioAnalyser
      ? new Uint8Array(audioAnalyser.frequencyBinCount)
      : null;

    const drawBars = (getAmplitude: (index: number) => number) => {
      if (dims.width === 0 || dims.height === 0) return;
      ctx.clearRect(0, 0, dims.width, dims.height);
      const barSpacing = dims.width / barCount;
      const barWidth = Math.max(2, barSpacing * 0.45);

      for (let i = 0; i < barCount; i++) {
        const x = i * barSpacing + (barSpacing - barWidth) / 2;
        const amplitude = getAmplitude(i);
        const barHeight = Math.max(4, dims.height * 0.85 * amplitude);
        ctx.fillStyle = "#c4c4bf";

        const y = dims.centerY - barHeight / 2;
        ctx.beginPath();
        ctx.rect(x, y, barWidth, barHeight);
        ctx.fill();
      }
    };

    // If idle, render static baseline once without wasting RAF GPU cycles
    if (!isRecording) {
      drawBars(() => 0);
    } else {
      const render = () => {
        if (dims.width === 0) {
          dims = setupCanvas();
        }

        if (audioAnalyser && dataArray) {
          audioAnalyser.getByteTimeDomainData(dataArray);
        }

        drawBars((i) => {
          const sampleIndex = Math.floor((i / barCount) * (dataArray?.length ?? 1));
          const sample = dataArray?.[sampleIndex] ?? 128;
          return Math.abs(sample - 128) / 128;
        });

        animationFrameRef.current = requestAnimationFrame(render);
      };

      render();
    }

    const handleResize = () => {
      dims = setupCanvas();
      if (!isRecording) {
        drawBars(() => 0);
      }
    };

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(canvas);
    } else {
      window.addEventListener("resize", handleResize);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener("resize", handleResize);
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
