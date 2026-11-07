/**
 * VoiceBridge Transcription Service Client
 * ========================================
 * Sends recorded audio blobs (WebM or WAV) to the local VoiceBridge FastAPI Whisper backend.
 *
 * Responsibilities:
 * 1. Bundles binary Blobs into multipart/form-data payloads.
 * 2. Implements a 30-second AbortController timeout safeguard to prevent hanging network calls.
 * 3. Normalizes backend JSON responses (transcription text, confidence score, processing latency).
 * 4. Provides clear, actionable error diagnostics if the backend service is offline.
 */

export interface TranscriptionResult {
  text: string;
  confidence: number | null; // Normalized score between 0.0 and 1.0 (null if unmeasured)
  latencyMs: number;
  source: "voicebridge-backend" | "unavailable";
  statusNotice?: string;
  isError: boolean;
}

export async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
  // Pre-validate payload boundaries client-side to prevent redundant network I/O
  if (!audioBlob || audioBlob.size === 0) {
    return {
      text: "",
      confidence: null,
      latencyMs: 0,
      source: "unavailable",
      statusNotice: "No audio captured. Please try speaking again.",
      isError: false,
    };
  }

  const startTime = performance.now();
  // Strip trailing slashes to prevent 404s caused by double slashes (e.g. //api/v1/translate-audio)
  const backendBase = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
  const backendUrl = `${backendBase}/api/v1/translate-audio`;

  try {
    const formData = new FormData();
    let fileName = "recording.webm";
    if (audioBlob.type.includes("wav")) {
      fileName = "recording.wav";
    } else if (audioBlob.type.includes("ogg")) {
      fileName = "recording.ogg";
    } else if (
      audioBlob.type.includes("mp4") ||
      audioBlob.type.includes("m4a") ||
      audioBlob.type.includes("aac")
    ) {
      fileName = "recording.m4a";
    } else if (audioBlob.type.includes("mp3") || audioBlob.type.includes("mpeg")) {
      fileName = "recording.mp3";
    }
    formData.append("file", audioBlob, fileName);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch(backendUrl, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeoutId);
    }

    const elapsed = Math.round(performance.now() - startTime);

    if (response.ok) {
      const data = await response.json();
      const text = typeof data.transcription === "string" ? data.transcription.trim() : "";

      if (!text) {
        return {
          text: "",
          confidence: null,
          latencyMs: data.processing_time_ms ?? elapsed,
          source: "voicebridge-backend",
          statusNotice: "No speech recognized. Please try speaking again.",
          isError: false,
        };
      }

      const isFiniteConfidence =
        typeof data.confidence_score === "number" && Number.isFinite(data.confidence_score);

      return {
        text,
        confidence: isFiniteConfidence ? data.confidence_score : null,
        latencyMs: data.processing_time_ms ?? elapsed,
        source: "voicebridge-backend",
        statusNotice: "Transcribed with VoiceBridge Whisper INT8 (CPU)",
        isError: false,
      };
    }

    // Server returned an HTTP error response
    let errorMessage = `Server error (${response.status})`;
    try {
      const errorJson = await response.json();
      if (typeof errorJson.detail === "string") {
        errorMessage = errorJson.detail;
      } else if (Array.isArray(errorJson.detail) && errorJson.detail.length > 0) {
        const firstErr = errorJson.detail[0];
        errorMessage = typeof firstErr?.msg === "string" ? firstErr.msg : `Validation error (${response.status})`;
      }
    } catch {
      // Non-JSON response
    }

    return {
      text: "",
      confidence: null,
      latencyMs: elapsed,
      source: "unavailable",
      statusNotice: errorMessage,
      isError: true,
    };
  } catch (err: unknown) {
    const elapsed = Math.round(performance.now() - startTime);
    const isAbort = err instanceof DOMException && err.name === "AbortError";
    let statusNotice = "Backend server offline. Start with: uvicorn app.main:app --port 8000";

    const isNetworkError =
      err instanceof TypeError &&
      (err.message.includes("fetch") ||
        err.message.includes("NetworkError") ||
        err.message.includes("Load failed") ||
        err.message.includes("Network request failed"));

    if (isAbort) {
      statusNotice = "Request timed out after 30 seconds.";
    } else if (err instanceof Error && err.message && !isNetworkError) {
      statusNotice = err.message;
    }

    return {
      text: "",
      confidence: null,
      latencyMs: elapsed,
      source: "unavailable",
      statusNotice,
      isError: true,
    };
  }
}
