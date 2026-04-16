import axiosInstance from "./axiosInstance";

/**
 * Analyze patient symptoms using the Gemini AI service.
 *
 * POST /api/ai/analyze
 * Body:  { symptoms: string }   — 10–2000 characters, letters/numbers/punctuation only
 *
 * Response data shape:
 * {
 *   aiSuggestion: {
 *     specialty: string,   // e.g. "Cardiologist"
 *     reason:    string,   // one-sentence explanation
 *     urgency:   "normal" | "urgent" | "emergency",
 *     warning:   string | null
 *   },
 *   suggestedDoctors: Doctor[],
 *   metadata: { doctorLookup: "success" | "unavailable" }
 * }
 *
 * Access: Patient role only (enforced by API gateway).
 */
export const analyzeSymptoms = (symptoms) =>
  axiosInstance.post("/ai/analyze", { symptoms });
