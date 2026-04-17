import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/useAuth";
import {
  getDoctorAppointments,
  updateAppointmentStatus,
  cancelAppointment,
  getDoctorPrescriptions,
  downloadPrescriptionPdf,
} from "../../api/doctorService";
import { endSession } from "../../api/telemedicineService";
import {
  getPatientRecordsForDoctor,
  getPatientRecordSignedUrlForDoctor,
} from "../../api/recordService";
import Loader from "../../components/ui/Loader";
import Alert from "../../components/ui/Alert";
import StatusBadge from "../../components/ui/StatusBadge";
import TelemedicineButton from "../../components/ui/TelemedicineButton";
import PrescriptionForm from "./PrescriptionForm";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { dateStyle: "medium" });
}

// Status filters
const FILTERS = ["all", "pending", "confirmed", "completed", "cancelled"];

const FILTER_LABELS = {
  all: "All",
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const ACTIONS = {
  pending: ["confirm", "cancel"],
  confirmed: ["complete", "cancel"],
  completed: [],
  cancelled: [],
};

//  CloseButton

function CloseButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-text-muted hover:text-primary hover:border-primary transition-colors shrink-0"
      aria-label="Close"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  );
}

//  PrescriptionView

function PrescriptionView({ prescription }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-text-muted mb-0.5">Diagnosis</p>
        <p className="text-sm text-text-primary">{prescription.diagnosis}</p>
      </div>

      {prescription.notes && (
        <div>
          <p className="text-xs text-text-muted mb-0.5">Notes</p>
          <p className="text-sm text-text-secondary">{prescription.notes}</p>
        </div>
      )}

      <div>
        <p className="text-xs text-text-muted mb-2">
          Medications ({prescription.medications.length})
        </p>
        <div className="space-y-2">
          {prescription.medications.map((med, i) => (
            <div
              key={i}
              className="rounded-lg bg-bg-main border border-border p-3 grid grid-cols-2 gap-x-4 gap-y-2"
            >
              <div>
                <p className="text-[11px] text-text-muted">Name</p>
                <p className="text-sm font-medium text-text-primary">
                  {med.name}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-text-muted">Dosage</p>
                <p className="text-sm text-text-primary">{med.dosage}</p>
              </div>
              <div>
                <p className="text-[11px] text-text-muted">Frequency</p>
                <p className="text-sm text-text-primary">{med.frequency}</p>
              </div>
              <div>
                <p className="text-[11px] text-text-muted">Duration</p>
                <p className="text-sm text-text-primary">{med.duration}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-text-muted">
        Issued: {formatShortDate(prescription.issuedDate)}
        {prescription.version > 1 && ` · Version ${prescription.version}`}
      </p>
    </div>
  );
}

// ── AppointmentDetailModal ─────────────────────────────────────────────────
// Full appointment details + status actions + prescription (completed appts).
// Manages its own prescription fetch — prescLoading initialises to `true`
// for completed appointments so we never call setLoading(true) inside the
// effect body (avoids react-hooks/set-state-in-effect ESLint rule).

function AppointmentDetailModal({ appt, userId, onClose, onAction, acting }) {
  const isCompleted = appt.status === "completed";
  const isConfirmed = appt.status === "confirmed";
  const isVirtualConfirmed =
    appt.type === "VIRTUAL" && appt.status === "confirmed";

  // null = not yet loaded · "none" = loaded, no presc · object = has presc
  const [prescription, setPrescription] = useState(null);
  const [prescLoading, setPrescLoading] = useState(isCompleted);
  const [prescError, setPrescError] = useState("");

  // "none" | "create" | "edit"
  const [formMode, setFormMode] = useState("none");

  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  // Telemedicine state (doctor-only: join + end session)
  const [teleError, setTeleError] = useState("");
  const [endingSession, setEndingSession] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  // Medical records state (doctor read-only view)
  const canViewRecords = isConfirmed || isCompleted;
  const [records, setRecords] = useState(null);
  const [recordsLoading, setRecordsLoading] = useState(canViewRecords);
  const [recordsError, setRecordsError] = useState("");

  const handleEndSession = async (e) => {
    e.stopPropagation();
    setEndingSession(true);
    setTeleError("");
    try {
      await endSession(appt._id);
      setSessionEnded(true);
    } catch (err) {
      setTeleError(
        err.response?.data?.message ??
          "Failed to end session. Please try again.",
      );
    } finally {
      setEndingSession(false);
    }
  };

  // Fetch medical records for confirmed/completed appointments
  useEffect(() => {
    if (!canViewRecords || !appt.patientId) return;
    getPatientRecordsForDoctor(appt.patientId)
      .then((res) => setRecords(res.data?.data ?? []))
      .catch(() => setRecordsError("Failed to load medical records."))
      .finally(() => setRecordsLoading(false));
  }, [canViewRecords, appt.patientId]);

  const handleDownloadRecord = async (reportId, fileName) => {
    setRecordsError("");
    try {
      const res = await getPatientRecordSignedUrlForDoctor(
        appt.patientId,
        reportId,
      );
      const url = res.data?.data?.url;
      if (!url) throw new Error("No URL returned");
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      setRecordsError("Failed to download record. Please try again.");
    }
  };

  // Fetch prescription once on mount (completed appointments only)
  useEffect(() => {
    if (!isCompleted || !userId) return;
    getDoctorPrescriptions(userId)
      .then((res) => {
        const all = res.data?.data ?? [];
        const found = all.find((p) => p.appointmentId === appt._id);
        setPrescription(found ?? "none");
      })
      .catch(() => setPrescError("Failed to load prescription."))
      .finally(() => setPrescLoading(false));
  }, [isCompleted, userId, appt._id]);

  const handlePrescSaved = (saved) => {
    setPrescription(saved);
    setFormMode("none");
  };

  // PDF download — responseType:'blob' in doctorService; trigger via temp anchor
  const handleDownloadPdf = async () => {
    if (!prescription || prescription === "none") return;
    setPdfLoading(true);
    setPdfError("");
    try {
      const response = await downloadPrescriptionPdf(prescription._id);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prescription-${prescription._id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setPdfError("Failed to download PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  const actions = ACTIONS[appt.status] ?? [];
  const hasPrescription = prescription !== null && prescription !== "none";
  const rejectLabel = appt.status === "pending" ? "Reject" : "Cancel";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-bg-card rounded-2xl border border-border shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-text-primary">
            Appointment Details
          </h2>
          <CloseButton onClick={onClose} />
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5 space-y-5">
          {/* Status */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted uppercase tracking-wide">
              Status
            </p>
            <StatusBadge status={appt.status} />
          </div>

          {/* Date / time / type / patient */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-muted mb-0.5">Date</p>
              <p className="text-sm font-medium text-text-primary">
                {formatDate(appt.date)}
              </p>
            </div>
            {appt.timeSlot && (
              <div>
                <p className="text-xs text-text-muted mb-0.5">Time Slot</p>
                <p className="text-sm font-medium text-text-primary">
                  {appt.timeSlot}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-text-muted mb-0.5">Type</p>
              <p className="text-sm font-medium text-text-primary">
                {appt.type ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-0.5">Patient</p>
              <p className="text-sm font-medium text-text-primary leading-snug">
                {appt.patientName ?? appt.patientId ?? "—"}
              </p>
            </div>
          </div>

          {/* Patient notes */}
          {appt.notes && (
            <div className="rounded-lg bg-bg-main border border-border px-4 py-3">
              <p className="text-xs text-text-muted mb-1">Patient Notes</p>
              <p className="text-sm text-text-secondary">{appt.notes}</p>
            </div>
          )}

          {/* Appointment ID */}
          <div>
            <p className="text-xs text-text-muted mb-0.5">Appointment ID</p>
            <p className="text-xs font-mono text-text-muted break-all">
              {appt._id}
            </p>
          </div>

          {/* Virtual Consultation section — confirmed VIRTUAL appointments */}
          {isVirtualConfirmed && (
            <div className="border-t border-border pt-5 space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-text-primary">
                  Virtual Consultation
                </p>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: "rgba(62, 168, 197, 0.12)",
                    color: "var(--color-primary-soft)",
                    borderColor: "var(--color-primary-soft)",
                  }}
                >
                  VIRTUAL
                </span>
              </div>

              {teleError && <Alert type="error">{teleError}</Alert>}

              {sessionEnded ? (
                <div
                  className="rounded-lg border bg-bg-main px-4 py-3 flex items-center gap-2"
                  style={{ borderColor: "var(--color-success)" }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    style={{ color: "var(--color-success)" }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--color-success)" }}
                  >
                    Session ended successfully.
                  </p>
                </div>
              ) : (
                <div className="flex gap-3">
                  <TelemedicineButton
                    appointmentId={appt._id}
                    onError={setTeleError}
                    size="sm"
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                  />
                  <button
                    type="button"
                    onClick={handleEndSession}
                    disabled={endingSession}
                    className="flex-1 py-2 rounded-lg border border-error text-error text-sm font-semibold hover:bg-error-bg disabled:opacity-50 transition-colors"
                  >
                    {endingSession ? "Ending…" : "End Session"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          {actions.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-1">
              {actions.includes("confirm") && (
                <button
                  type="button"
                  onClick={() => onAction(appt._id, "confirmed")}
                  disabled={acting === appt._id}
                  className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {acting === appt._id ? "Saving…" : "Accept"}
                </button>
              )}
              {actions.includes("complete") && (
                <button
                  type="button"
                  onClick={() => onAction(appt._id, "completed")}
                  disabled={acting === appt._id}
                  className="px-5 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {acting === appt._id ? "Saving…" : "Mark Complete"}
                </button>
              )}
              {actions.includes("cancel") && (
                <button
                  type="button"
                  onClick={() => onAction(appt._id, "cancel")}
                  disabled={acting === appt._id}
                  className="px-5 py-2 rounded-lg border border-error text-error text-sm font-semibold hover:bg-error-bg disabled:opacity-50 transition-colors"
                >
                  {acting === appt._id ? "Processing…" : rejectLabel}
                </button>
              )}
            </div>
          )}

          {/* Prescription section — completed appointments only */}
          {isCompleted && (
            <div className="border-t border-border pt-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-text-primary">
                  Prescription
                </p>
                {hasPrescription && formMode === "none" && (
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setFormMode("edit")}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={pdfLoading}
                      className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
                    >
                      {pdfLoading ? "Downloading…" : "Download PDF"}
                    </button>
                  </div>
                )}
              </div>

              {prescError && <Alert type="error">{prescError}</Alert>}
              {pdfError && <Alert type="error">{pdfError}</Alert>}

              {prescLoading ? (
                <div className="py-8">
                  <Loader />
                </div>
              ) : formMode !== "none" ? (
                <PrescriptionForm
                  appointmentId={appt._id}
                  doctorId={userId}
                  patientId={appt.patientId}
                  existing={formMode === "edit" ? prescription : null}
                  onSaved={handlePrescSaved}
                  onCancel={() => setFormMode("none")}
                />
              ) : hasPrescription ? (
                <PrescriptionView prescription={prescription} />
              ) : (
                <div className="rounded-lg bg-bg-main border border-border px-4 py-6 text-center">
                  <p className="text-sm text-text-muted mb-3">
                    No prescription issued for this appointment yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFormMode("create")}
                    className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Write Prescription
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Medical Records — confirmed or completed appointments */}
          {canViewRecords && (
            <div className="border-t border-border pt-5">
              <p className="text-sm font-semibold text-text-primary mb-4">
                Patient Medical Records
              </p>

              {recordsError && <Alert type="error">{recordsError}</Alert>}

              {recordsLoading ? (
                <div className="py-6">
                  <Loader />
                </div>
              ) : !records || records.length === 0 ? (
                <div className="rounded-lg bg-bg-main border border-border px-4 py-6 text-center">
                  <p className="text-sm text-text-muted">
                    No medical records uploaded by this patient yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {records.map((r) => (
                    <div
                      key={r._id}
                      className="rounded-lg bg-bg-main border border-border px-4 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {r.fileName}
                        </p>
                        {r.description && (
                          <p className="text-xs text-text-muted truncate">
                            {r.description}
                          </p>
                        )}
                        <p className="text-xs text-text-muted mt-0.5">
                          {new Date(r.createdAt).toLocaleDateString("en-US", {
                            dateStyle: "medium",
                          })}
                          {r.fileSize
                            ? ` · ${(r.fileSize / 1024).toFixed(0)} KB`
                            : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadRecord(r._id, r.fileName)}
                        className="shrink-0 px-3 py-1.5 rounded-lg border border-primary text-primary text-xs font-semibold hover:bg-bg-card transition-colors"
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── AppointmentCard ────────────────────────────────────────────────────────
// Clicking the card opens the detail modal.
// Inline quick-action buttons stop propagation so they don't also trigger
// the card click handler.

function AppointmentCard({ appt, onAction, acting, onSelect }) {
  const actions = ACTIONS[appt.status] ?? [];
  const [cardTeleError, setCardTeleError] = useState("");

  return (
    <div
      className="rounded-xl border border-border bg-bg-card p-4 space-y-3 cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => onSelect(appt)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(appt)}
    >
      {/* Top row: date + status */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">
            {formatDate(appt.date)}
            {appt.timeSlot && (
              <span className="ml-1.5 font-normal text-text-muted">
                · {appt.timeSlot}
              </span>
            )}
          </p>
          <p className="text-xs text-text-secondary mt-0.5 font-medium">
            {appt.patientName ?? appt.patientId ?? "Patient"}
          </p>
        </div>
        <StatusBadge status={appt.status} />
      </div>

      {/* Detail row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-text-muted">Type</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-sm text-text-primary font-medium">
              {appt.type ?? "—"}
            </p>
          </div>
        </div>
        <div>
          <p className="text-xs text-text-muted">Patient</p>
          <p className="text-sm text-text-primary font-medium mt-0.5 truncate">
            {appt.patientName ?? appt.patientId ?? "—"}
          </p>
        </div>
      </div>

      {/* Patient notes */}
      {appt.notes && (
        <div className="rounded-lg bg-bg-main border border-border px-3 py-2">
          <p className="text-xs text-text-muted mb-0.5">Notes</p>
          <p className="text-sm text-text-secondary">{appt.notes}</p>
        </div>
      )}

      {/* Quick-action buttons — stop propagation prevents modal from opening */}
      {actions.length > 0 && (
        <div
          className="flex flex-wrap gap-2 pt-1"
          onClick={(e) => e.stopPropagation()}
        >
          {actions.includes("confirm") && (
            <button
              type="button"
              onClick={() => onAction(appt._id, "confirmed")}
              disabled={acting === appt._id}
              className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {acting === appt._id ? "Saving…" : "Accept"}
            </button>
          )}
          {actions.includes("complete") && (
            <button
              type="button"
              onClick={() => onAction(appt._id, "completed")}
              disabled={acting === appt._id}
              className="px-4 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {acting === appt._id ? "Saving…" : "Mark Complete"}
            </button>
          )}
          {actions.includes("cancel") && (
            <button
              type="button"
              onClick={() => onAction(appt._id, "cancel")}
              disabled={acting === appt._id}
              className="px-4 py-1.5 rounded-lg border border-error text-error text-xs font-semibold hover:bg-error-bg disabled:opacity-50 transition-colors"
            >
              {acting === appt._id
                ? "Processing…"
                : appt.status === "pending"
                  ? "Reject"
                  : "Cancel"}
            </button>
          )}
          {/* Join Session quick-action for confirmed virtual appointments */}
          {appt.type === "VIRTUAL" && appt.status === "confirmed" && (
            <TelemedicineButton
              appointmentId={appt._id}
              onError={setCardTeleError}
              size="sm"
            />
          )}
        </div>
      )}
      {/* Join Session for confirmed virtual appointments (no other quick-actions) */}
      {actions.length === 0 &&
        appt.type === "VIRTUAL" &&
        appt.status === "confirmed" && (
          <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
            <TelemedicineButton
              appointmentId={appt._id}
              onError={setCardTeleError}
              size="sm"
            />
          </div>
        )}
      {cardTeleError && (
        <p
          className="text-xs font-medium mt-1 px-1"
          style={{ color: "var(--color-error)" }}
        >
          {cardTeleError}
        </p>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function DoctorAppointments() {
  const { userId } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [acting, setActing] = useState(null);
  // Holds { id, action, label } while awaiting doctor's confirmation
  const [confirmAction, setConfirmAction] = useState(null);

  // Detail modal
  const [selectedAppt, setSelectedAppt] = useState(null);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchAppointments = useCallback(() => {
    setLoading(true);
    getDoctorAppointments()
      .then((res) => setAppointments(res.data?.data ?? []))
      .catch((err) =>
        setError(err.response?.data?.message ?? "Failed to load appointments."),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // ── Action handler ───────────────────────────────────────────────────────
  // Closes the detail modal first, then refreshes the list so the card shows
  // updated status. Doctor can tap the card again to act on its new state.

  const handleAction = async (id, action) => {
    setActing(id);
    setError("");
    setSuccess("");
    try {
      if (action === "cancel") {
        await cancelAppointment(id);
        setSuccess("Appointment cancelled.");
      } else {
        await updateAppointmentStatus(id, action);
        setSuccess(
          action === "confirmed"
            ? "Appointment accepted."
            : "Appointment marked as completed.",
        );
      }
      setSelectedAppt(null);
      fetchAppointments();
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to update appointment.");
    } finally {
      setActing(null);
      setConfirmAction(null);
    }
  };

  // For cancel/reject: open confirmation dialog first.
  // For accept/complete: fire immediately — no confirmation needed.
  const requestAction = (id, action, apptStatus) => {
    if (action === "cancel") {
      setConfirmAction({ id, action, apptStatus });
    } else {
      handleAction(id, action);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  // Exclude unpaid appointments — doctor only sees appointments that have
  // been paid for (or don't require payment).
  const visibleAppointments = appointments.filter(
    (a) => a.paymentStatus !== "unpaid",
  );

  const filtered =
    activeFilter === "all"
      ? visibleAppointments
      : visibleAppointments.filter((a) => a.status === activeFilter);

  const counts = FILTERS.reduce((acc, f) => {
    acc[f] =
      f === "all"
        ? visibleAppointments.length
        : visibleAppointments.filter((a) => a.status === f).length;
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Appointments
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Click any appointment to view details, manage status, or issue a
          prescription.
        </p>
      </div>

      {/* Feedback */}
      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setActiveFilter(f)}
            className={[
              "px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors",
              activeFilter === f
                ? "bg-primary text-white border-primary"
                : "bg-bg-card text-text-secondary border-border hover:border-primary hover:text-primary",
            ].join(" ")}
          >
            {FILTER_LABELS[f]}
            {counts[f] > 0 && (
              <span
                className={[
                  "ml-1.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                  activeFilter === f
                    ? "bg-white/25 text-white"
                    : "bg-primary/10 text-primary",
                ].join(" ")}
              >
                {counts[f]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20">
          <Loader />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card px-6 py-12 text-center text-sm text-text-muted">
          No {activeFilter === "all" ? "" : activeFilter + " "}appointments
          found.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((appt) => (
            <AppointmentCard
              key={appt._id}
              appt={appt}
              onAction={(id, action) => requestAction(id, action, appt.status)}
              acting={acting}
              onSelect={setSelectedAppt}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedAppt && (
        <AppointmentDetailModal
          appt={selectedAppt}
          userId={userId}
          onClose={() => setSelectedAppt(null)}
          onAction={(id, action) =>
            requestAction(id, action, selectedAppt.status)
          }
          acting={acting}
        />
      )}

      {/* Cancel / Reject confirmation dialog */}
      <ConfirmDialog
        open={!!confirmAction && confirmAction.action === "cancel"}
        icon="danger"
        title={
          confirmAction?.apptStatus === "pending"
            ? "Reject this Appointment?"
            : "Cancel this Appointment?"
        }
        message={
          confirmAction?.apptStatus === "pending"
            ? "The appointment request will be rejected and the patient will be notified."
            : "The confirmed appointment will be cancelled. The patient will be notified."
        }
        confirmLabel={
          confirmAction?.apptStatus === "pending"
            ? "Yes, Reject"
            : "Yes, Cancel"
        }
        cancelLabel="Keep It"
        loading={acting === confirmAction?.id}
        onConfirm={() => handleAction(confirmAction.id, confirmAction.action)}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
