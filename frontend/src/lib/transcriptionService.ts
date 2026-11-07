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
  const startTime = performance.now();
  const backendUrl = "http://127.0.0.1:8000/api/v1/translate-audio";

  try {
    const formData = new FormData();
    const fileName = audioBlob.type.includes("wav") ? "recording.wav" : "recording.webm";
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

      return {
        text,
        confidence: typeof data.confidence_score === "number" ? data.confidence_score : null,
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
    const statusNotice = isAbort
      ? "Request timed out after 30 seconds."
      : "Backend server offline. Start with: uvicorn app.main:app --port 8000";

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
