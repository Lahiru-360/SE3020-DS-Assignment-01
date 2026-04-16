import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  AlertTriangle,
  Stethoscope,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { analyzeSymptoms } from "../../api/aiService";
import Alert from "../../components/ui/Alert";

// ── Urgency config ─────────────────────────────────────────────────────────

const URGENCY_CFG = {
  emergency: {
    bg: "rgba(231,76,60,0.10)",
    border: "var(--color-error)",
    color: "var(--color-error)",
    label: "Emergency",
    icon: AlertTriangle,
  },
  urgent: {
    bg: "rgba(244,167,50,0.10)",
    border: "var(--color-warning)",
    color: "var(--color-warning)",
    label: "Urgent",
    icon: AlertTriangle,
  },
  normal: {
    bg: "rgba(39,174,122,0.10)",
    border: "var(--color-success)",
    color: "var(--color-success)",
    label: "Normal",
    icon: Stethoscope,
  },
};

function UrgencyBadge({ urgency }) {
  const cfg =
    URGENCY_CFG[(urgency || "normal").toLowerCase()] ?? URGENCY_CFG.normal;
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ── Doctor card ─────────────────────────────────────────────────────────────

function DoctorCard({ doctor, onBook }) {
  const fullName =
    doctor.fullName ??
    `${doctor.firstName ?? ""} ${doctor.lastName ?? ""}`.trim();
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl border border-border bg-bg-card hover:border-primary transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ background: "var(--color-primary)" }}
        >
          {(fullName[0] ?? "D").toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">
            {fullName || "Unknown Doctor"}
          </p>
          <p className="text-xs text-text-muted truncate">
            {doctor.specialization ?? "Specialist"}
          </p>
          {doctor.consultationFee != null && (
            <p className="text-xs text-primary font-medium mt-0.5">
              LKR {Number(doctor.consultationFee).toLocaleString("en-LK")}
            </p>
          )}
        </div>
      </div>
      <button
        onClick={() => onBook(doctor)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-hover transition-colors shrink-0"
      >
        Book
        <ChevronRight size={12} />
      </button>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

const MAX_CHARS = 2000;
const MIN_CHARS = 10;

export default function PatientSmartMatch() {
  const navigate = useNavigate();

  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const charCount = symptoms.length;
  const isValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await analyzeSymptoms(symptoms.trim());
      setResult(res.data?.data);
    } catch (err) {
      setError(
        err.response?.data?.message ?? "AI analysis failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleBook(doctor) {
    navigate("/patient/appointments", {
      state: { preselectedDoctorId: doctor._id ?? doctor.userId },
    });
  }

  const aiSuggestion = result?.aiSuggestion;
  const suggestedDoctors = result?.suggestedDoctors ?? [];
  const doctorLookupFailed = result?.metadata?.doctorLookup === "unavailable";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={20} className="text-primary" />
          <h1 className="text-xl font-semibold text-text-primary">
            AI Doctor Match
          </h1>
        </div>
        <p className="text-sm text-text-muted">
          Describe your symptoms and our AI will suggest the right specialist
          and matching doctors.
        </p>
      </div>

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-border bg-bg-card p-5 space-y-4"
      >
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
            Describe your symptoms
          </label>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="e.g. I have been experiencing chest pain and shortness of breath for the past two days…"
            rows={5}
            maxLength={MAX_CHARS}
            className="w-full rounded-lg border border-border bg-bg-main px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary resize-none"
          />
          <div className="flex items-center justify-between">
            <span
              className="text-xs"
              style={{
                color:
                  charCount < MIN_CHARS
                    ? "var(--color-warning)"
                    : "var(--color-text-muted)",
              }}
            >
              {charCount < MIN_CHARS
                ? `${MIN_CHARS - charCount} more character${MIN_CHARS - charCount !== 1 ? "s" : ""} needed`
                : `${charCount} / ${MAX_CHARS}`}
            </span>
            {charCount > MAX_CHARS && (
              <span className="text-xs" style={{ color: "var(--color-error)" }}>
                Too long
              </span>
            )}
          </div>
        </div>

        {error && <Alert type="error" message={error} />}

        <button
          type="submit"
          disabled={loading || !isValid}
          className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <Sparkles size={15} />
              Analyze Symptoms
            </>
          )}
        </button>
      </form>

      {/* Results */}
      {aiSuggestion && (
        <div className="space-y-4">
          {/* Emergency warning */}
          {aiSuggestion.warning && (
            <div
              className="flex items-start gap-3 rounded-xl border p-4"
              style={{
                background: URGENCY_CFG.emergency.bg,
                borderColor: URGENCY_CFG.emergency.border,
              }}
            >
              <AlertTriangle
                size={18}
                style={{ color: URGENCY_CFG.emergency.color }}
                className="shrink-0 mt-0.5"
              />
              <p
                className="text-sm font-semibold"
                style={{ color: URGENCY_CFG.emergency.color }}
              >
                {aiSuggestion.warning}
              </p>
            </div>
          )}

          {/* AI suggestion card */}
          <div className="rounded-xl border border-border bg-bg-card p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">
                  Recommended Specialist
                </p>
                <p className="text-lg font-bold text-text-primary">
                  {aiSuggestion.specialty}
                </p>
              </div>
              <UrgencyBadge urgency={aiSuggestion.urgency} />
            </div>
            {aiSuggestion.reason && (
              <p className="text-sm text-text-muted border-t border-border pt-3">
                {aiSuggestion.reason}
              </p>
            )}
          </div>

          {/* Suggested doctors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">
                {suggestedDoctors.length > 0
                  ? `Available ${aiSuggestion.specialty}s (${suggestedDoctors.length})`
                  : "Matching Doctors"}
              </h2>
            </div>

            {doctorLookupFailed && (
              <Alert
                type="warning"
                message="Doctor lookup is temporarily unavailable. Please use the Appointments page to search for a specialist."
              />
            )}

            {!doctorLookupFailed && suggestedDoctors.length === 0 && (
              <div className="rounded-xl border border-border bg-bg-card px-5 py-10 text-center">
                <p className="text-sm text-text-muted">
                  No {aiSuggestion.specialty}s available right now. Try
                  searching from the Appointments page.
                </p>
                <button
                  onClick={() => navigate("/patient/appointments")}
                  className="mt-3 text-sm font-medium text-primary hover:underline"
                >
                  Go to Appointments →
                </button>
              </div>
            )}

            {suggestedDoctors.map((doc) => (
              <DoctorCard
                key={doc._id ?? doc.userId}
                doctor={doc}
                onBook={handleBook}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
