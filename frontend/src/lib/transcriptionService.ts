/**
 * VoiceBridge Transcription Service
 * The local FastAPI backend is the source of truth. Browser speech is retained
 * only as an explicitly labelled secondary result when the backend is down.
 */

export interface TranscriptionResult {
  text: string;
  confidence: number | null; // null = not measured
  latencyMs: number;
  source: "fastapi-backend" | "web-speech" | "unavailable";
  statusNotice?: string;
  secondaryText?: string;
  isFallback: boolean;
}

export async function transcribeAudio(
  audioBlob: Blob,
  browserTranscript?: string,
  recognitionError?: string | null
): Promise<TranscriptionResult> {
  const startTime = performance.now();
  const backendUnavailableNotice =
    "Backend not running. Start the server with: uvicorn main:app --port 8000";

  // The trained VoiceBridge backend is the only primary transcription source.
  try {
    const formData = new FormData();
    formData.append("file", audioBlob, "user_recording.webm");

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 60_000);
    let response: Response;
    try {
      response = await fetch("http://127.0.0.1:8000/api/v1/translate-audio", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeoutId);
    }

    if (response.ok) {
      const data = await response.json();
      const elapsed = Math.round(performance.now() - startTime);
      const text = typeof data.transcription === "string" ? data.transcription.trim() : "";
      if (!text) {
        return {
          text: "",
          confidence: null,
          latencyMs: data.processing_time_ms ?? elapsed,
          source: "unavailable",
          statusNotice: "No speech recognized. Try again.",
          isFallback: true,
        };
      }

      return {
        text,
        confidence: typeof data.confidence_score === "number" ? data.confidence_score : null,
        latencyMs: data.processing_time_ms ?? elapsed,
        source: "fastapi-backend",
        statusNotice: "Processed by VoiceBridge FastAPI + Whisper-tiny LoRA",
        isFallback: false,
      };
    }

    let detail = "Audio transcription failed.";
    try {
      const errorData = await response.json();
      if (typeof errorData.detail === "string" && errorData.detail.trim()) {
        detail = errorData.detail.trim();
      }
    } catch {
      // Use the generic message when the backend does not return JSON.
    }

    return {
      text: "",
      confidence: null,
      latencyMs: Math.round(performance.now() - startTime),
      source: "unavailable",
      statusNotice: detail,
      isFallback: true,
    };
  } catch {
    // The browser transcript is never promoted to the primary result.
  }

  return {
    text: "",
    confidence: null,
    latencyMs: Math.round(performance.now() - startTime),
    source: "unavailable",
    statusNotice: backendUnavailableNotice,
    secondaryText: browserTranscript?.trim() || undefined,
    isFallback: true,
  };
}