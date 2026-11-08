/**
 * VoiceBridge Backend Service Client
 * ==================================
 * Client for communicating with the local VoiceBridge FastAPI Whisper backend.
 *
 * Responsibilities:
 * 1. Resolves and normalizes backend base URLs across environments and devices.
 * 2. Checks microservice health and connectivity (/health endpoint).
 * 3. Bundles binary Blobs into multipart/form-data payloads with container format detection.
 * 4. Implements AbortController timeout safeguards to prevent hanging network calls.
 * 5. Normalizes backend JSON responses (transcription text, confidence score, processing latency).
 * 6. Provides clear, actionable error diagnostics if the backend service is offline.
 */

export interface TranscriptionResult {
  text: string;
  confidence: number | null; // Normalized score between 0.0 and 1.0 (null if unmeasured)
  latencyMs: number;
  source: "voicebridge-backend" | "unavailable";
  statusNotice?: string;
  isError: boolean;
}

/**
 * Returns the normalized backend base URL without trailing slashes.
 */
export function getBackendBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_BACKEND_URL || "").trim();
  const base = raw || "http://127.0.0.1:8000";
  return base.replace(/\/+$/, "");
}

/**
 * Pings the backend /health endpoint to check server availability and model readiness.
 * Returns true if the service responds with HTTP 200 within timeoutMs.
 */
export async function checkBackendHealth(timeoutMs = 2500): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${getBackendBaseUrl()}/health`, { signal: controller.signal });
    return res.status === 200;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
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
  const backendUrl = `${getBackendBaseUrl()}/api/v1/translate-audio`;

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
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch(backendUrl, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const elapsed = Math.round(performance.now() - startTime);

    if (response.ok) {
      const data = await response.json();
      const text = typeof data.transcription === "string" ? data.transcription.trim() : "";
      const rawLatency = data.processing_time_ms;
      const validLatency =
        typeof rawLatency === "number" && Number.isFinite(rawLatency)
          ? Math.round(rawLatency)
          : elapsed;

      if (!text) {
        return {
          text: "",
          confidence: null,
          latencyMs: validLatency,
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
        latencyMs: validLatency,
        source: "voicebridge-backend",
        statusNotice: "Transcribed with VoiceBridge Clinical LoRA Engine",
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
    const isAbort =
      (err instanceof DOMException || err instanceof Error) && err.name === "AbortError";
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
