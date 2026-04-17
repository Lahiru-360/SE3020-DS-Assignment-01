import { useEffect, useState, useCallback } from "react";
import { isPastDate, isSlotElapsed, todayInTZ } from "../../utils/timezone";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import {
  searchDoctors,
  getMyAppointments,
  cancelMyAppointment,
  getPatientPrescriptions,
  downloadPrescriptionPdf,
} from "../../api/patientService";
import Loader from "../../components/ui/Loader";
import Alert from "../../components/ui/Alert";
import StatusBadge from "../../components/ui/StatusBadge";
import FormInput from "../../components/ui/FormInput";
import StripeCheckout from "../../components/ui/StripeCheckout";
import TelemedicineButton from "../../components/ui/TelemedicineButton";
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

// ── PaymentStatusBadge ─────────────────────────────────────────────────────

const PAYMENT_STATUS_STYLES = {
  unpaid: {
    bg: "rgba(244, 167, 50, 0.12)",
    color: "var(--color-warning)",
    border: "var(--color-warning)",
    label: "Unpaid",
  },
  paid: {
    bg: "rgba(39, 174, 122, 0.12)",
    color: "var(--color-success)",
    border: "var(--color-success)",
    label: "Paid",
  },
  failed: {
    bg: "rgba(231, 76, 60, 0.12)",
    color: "var(--color-error)",
    border: "var(--color-error)",
    label: "Failed",
  },
  refunded: {
    bg: "rgba(26, 111, 168, 0.12)",
    color: "var(--color-primary)",
    border: "var(--color-primary)",
    label: "Refunded",
  },
};

function PaymentStatusBadge({ status }) {
  const key = (status || "unpaid").toLowerCase();
  const style = PAYMENT_STATUS_STYLES[key] || PAYMENT_STATUS_STYLES.unpaid;
  return (
    <span
      className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border"
      style={{
        backgroundColor: style.bg,
        color: style.color,
        borderColor: style.border,
      }}
    >
      {style.label}
    </span>
  );
}

/** Whether the appointment is eligible for payment */
function canPayAppointment(appt) {
  return appt.status === "confirmed" && appt.paymentStatus === "unpaid";
}

/** Whether the appointment allows retrying a failed payment */
function canRetryPayment(appt) {
  return appt.status === "confirmed" && appt.paymentStatus === "failed";
}

// ── CloseButton ────────────────────────────────────────────────────────────

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

// ── DoctorCard ─────────────────────────────────────────────────────────────
// Displays a doctor from search results. Clicking opens the booking modal.

function DoctorCard({ doctor, onSelect }) {
  return (
    <div
      className="rounded-xl border border-border bg-bg-card p-4 cursor-pointer hover:border-primary/50 transition-colors space-y-1"
      onClick={() => onSelect(doctor)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(doctor)}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-text-primary">
            Dr. {doctor.firstName} {doctor.lastName}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            {doctor.specialization}
          </p>
        </div>
        {doctor.isApproved && (
          <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success-bg text-success border border-success/30">
            Approved
          </span>
        )}
      </div>
      {doctor.consultationFee != null && (
        <p className="text-xs text-text-secondary">
          Consultation fee: LKR {doctor.consultationFee}
        </p>
      )}
      <p className="text-[11px] text-primary font-medium mt-1">Tap to book →</p>
    </div>
  );
}

// ── PrescriptionView ───────────────────────────────────────────────────────
// Read-only display of a prescription inside the appointment detail modal.

function PrescriptionView({ prescription, onDownload, pdfLoading }) {
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
          Medications ({prescription.medications?.length ?? 0})
        </p>
        <div className="space-y-2">
          {(prescription.medications ?? []).map((med, i) => (
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

      <button
        type="button"
        onClick={onDownload}
        disabled={pdfLoading}
        className="w-full py-2 rounded-lg border border-accent text-accent text-sm font-semibold hover:bg-success-bg disabled:opacity-50 transition-colors"
      >
        {pdfLoading ? "Downloading…" : "Download PDF"}
      </button>
    </div>
  );
}

// ── AppointmentDetailModal ─────────────────────────────────────────────────
// Shows full appointment info, cancel option, and prescription (if completed).
// Manages its own prescription fetch.

function AppointmentDetailModal({
  appt,
  userId,
  onClose,
  onCancel,
  cancelling,
  onPaymentSuccess,
}) {
  const isCompleted = appt.status === "completed";
  const isVirtualConfirmed =
    appt.type === "VIRTUAL" && appt.status === "confirmed";

  // null = loading · "none" = no prescription · object = has prescription
  const [prescription, setPrescription] = useState(null);
  const [prescLoading, setPrescLoading] = useState(isCompleted);
  const [prescError, setPrescError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  // Payment state
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  // Telemedicine state
  const [teleError, setTeleError] = useState("");

  const showPayBtn =
    !paymentDone && (canPayAppointment(appt) || canRetryPayment(appt));

  // Fetch prescription on mount (completed appointments only)
  useEffect(() => {
    if (!isCompleted || !userId) return;
    getPatientPrescriptions(userId)
      .then((res) => {
        const all = res.data?.data ?? [];
        const found = all.find((p) => p.appointmentId === appt._id);
        setPrescription(found ?? "none");
      })
      .catch(() => setPrescError("Failed to load prescription."))
      .finally(() => setPrescLoading(false));
  }, [isCompleted, userId, appt._id]);

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

  const hasPrescription = prescription !== null && prescription !== "none";
  const canCancel = appt.status === "pending" || appt.status === "confirmed";

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

          {/* Core details */}
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
                {appt.type ?? "PHYSICAL"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-0.5">Doctor</p>
              <p className="text-sm font-medium text-text-primary leading-snug">
                {appt.doctorName
                  ? `Dr. ${appt.doctorName}${appt.doctorSpecialization ? ` · ${appt.doctorSpecialization}` : ""}`
                  : "Unknown Doctor"}
              </p>
            </div>
          </div>

          {/* Patient notes */}
          {appt.notes && (
            <div className="rounded-lg bg-bg-main border border-border px-4 py-3">
              <p className="text-xs text-text-muted mb-1">Your Notes</p>
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

          {/* Virtual Consultation section — confirmed VIRTUAL appointments only */}
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
              <p className="text-xs text-text-muted">
                Your session is ready. Click below to join your doctor.
              </p>
              {teleError && <Alert type="error">{teleError}</Alert>}
              <TelemedicineButton
                appointmentId={appt._id}
                onError={setTeleError}
                size="md"
              />
            </div>
          )}

          {/* Payment section */}
          <div className="border-t border-border pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text-primary">Payment</p>
              <PaymentStatusBadge
                status={paymentDone ? "paid" : appt.paymentStatus}
              />
            </div>

            {!showStripeCheckout &&
              !paymentDone &&
              appt.consultationFee != null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Consultation Fee</span>
                  <span className="font-semibold text-text-primary">
                    {appt.currency ?? "LKR"}{" "}
                    {Number(appt.consultationFee).toLocaleString("en-LK")}
                  </span>
                </div>
              )}

            {paymentDone && (
              <div
                className="rounded-lg border bg-bg-main px-4 py-3 flex items-center gap-3"
                style={{ borderColor: "var(--color-success)" }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 shrink-0"
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
                  Payment completed! Your appointment will be confirmed shortly.
                </p>
              </div>
            )}

            {!paymentDone && showStripeCheckout && (
              <StripeCheckout
                appointment={appt}
                onSuccess={() => {
                  setPaymentDone(true);
                  setShowStripeCheckout(false);
                  onPaymentSuccess?.();
                }}
                onCancel={() => setShowStripeCheckout(false)}
              />
            )}

            {!paymentDone && !showStripeCheckout && showPayBtn && (
              <button
                type="button"
                onClick={() => setShowStripeCheckout(true)}
                className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors"
              >
                {canRetryPayment(appt) ? "Retry Payment" : "Pay Now"}
              </button>
            )}

            {!paymentDone && appt.paymentStatus === "paid" && (
              <p className="text-xs" style={{ color: "var(--color-success)" }}>
                Payment completed successfully.
              </p>
            )}
          </div>

          {/* Cancel button */}
          {canCancel && (
            <button
              type="button"
              onClick={() => onCancel(appt._id)}
              disabled={cancelling === appt._id}
              className="w-full py-2.5 rounded-lg border border-error text-error text-sm font-semibold hover:bg-error-bg disabled:opacity-50 transition-colors"
            >
              {cancelling === appt._id ? "Cancelling…" : "Cancel Appointment"}
            </button>
          )}

          {/* Prescription section */}
          {isCompleted && (
            <div className="border-t border-border pt-5">
              <p className="text-sm font-semibold text-text-primary mb-4">
                Prescription
              </p>

              {prescError && <Alert type="error">{prescError}</Alert>}
              {pdfError && <Alert type="error">{pdfError}</Alert>}

              {prescLoading ? (
                <div className="py-8">
                  <Loader />
                </div>
              ) : hasPrescription ? (
                <PrescriptionView
                  prescription={prescription}
                  onDownload={handleDownloadPdf}
                  pdfLoading={pdfLoading}
                />
              ) : (
                <div className="rounded-lg bg-bg-main border border-border px-4 py-6 text-center">
                  <p className="text-sm text-text-muted">
                    No prescription has been issued for this appointment yet.
                  </p>
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

function AppointmentCard({ appt, onSelect, onCancel, cancelling }) {
  const canCancel = appt.status === "pending" || appt.status === "confirmed";
  const showPay = canPayAppointment(appt) || canRetryPayment(appt);
  const [cardTeleError, setCardTeleError] = useState("");

  return (
    <div
      className="rounded-xl border border-border bg-bg-card p-4 space-y-3 cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => onSelect(appt)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(appt)}
    >
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
          <p className="text-xs text-text-muted mt-0.5">
            {appt.type ?? "PHYSICAL"}
            {appt.consultationFee != null && (
              <span className="ml-2">
                · {appt.currency ?? "LKR"}{" "}
                {Number(appt.consultationFee).toLocaleString("en-LK")}
              </span>
            )}
          </p>
          {appt.doctorName && (
            <p className="text-xs text-text-secondary mt-0.5 font-medium">
              Dr. {appt.doctorName}
              {appt.doctorSpecialization && (
                <span className="font-normal text-text-muted">
                  {" "}
                  · {appt.doctorSpecialization}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusBadge status={appt.status} />
          <PaymentStatusBadge status={appt.paymentStatus} />
        </div>
      </div>

      {appt.notes && (
        <p className="text-xs text-text-secondary line-clamp-2">{appt.notes}</p>
      )}

      <div
        className="flex items-center justify-end gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {showPay && (
          <button
            type="button"
            onClick={() => onSelect(appt)}
            className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors"
          >
            {canRetryPayment(appt) ? "Retry Payment" : "Pay Now"}
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            onClick={() => onCancel(appt._id)}
            disabled={cancelling === appt._id}
            className="px-4 py-1.5 rounded-lg border border-error text-error text-xs font-semibold hover:bg-error-bg disabled:opacity-50 transition-colors"
          >
            {cancelling === appt._id ? "Cancelling…" : "Cancel"}
          </button>
        )}
        {appt.type === "VIRTUAL" && appt.status === "confirmed" && (
          <TelemedicineButton
            appointmentId={appt._id}
            onError={setCardTeleError}
            size="sm"
          />
        )}
      </div>
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

// ── Constants ──────────────────────────────────────────────────────────────

const TABS = ["appointments", "doctors"];
const APPT_FILTERS = ["all", "pending", "confirmed", "completed", "cancelled"];
const FILTER_LABELS = {
  all: "All",
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

// ── Main page ──────────────────────────────────────────────────────────────

export default function PatientAppointments() {
  const { userId } = useAuth();

  // ── Tab state ─────────────────────────────────────────────────────────
  const [tab, setTab] = useState("appointments");

  // ── Appointments state ────────────────────────────────────────────────
  const [appointments, setAppointments] = useState([]);
  const [apptLoading, setApptLoading] = useState(true);
  const [apptError, setApptError] = useState("");
  const [apptSuccess, setApptSuccess] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  // Pending-cancel confirmation — holds the appointment ID awaiting user OK
  const [confirmCancelId, setConfirmCancelId] = useState(null);

  // ── Doctor search state ───────────────────────────────────────────────
  const [searchName, setSearchName] = useState("");
  const [searchSpec, setSearchSpec] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const navigate = useNavigate();

  // ── Fetch appointments ────────────────────────────────────────────────

  const fetchAppointments = useCallback(() => {
    setApptLoading(true);
    getMyAppointments()
      .then((res) => setAppointments(res.data?.data ?? []))
      .catch((err) =>
        setApptError(
          err.response?.data?.message ?? "Failed to load appointments.",
        ),
      )
      .finally(() => setApptLoading(false));
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // ── Cancel handler ────────────────────────────────────────────────────

  const handleCancel = async (id) => {
    setCancelling(id);
    setApptError("");
    setApptSuccess("");
    try {
      await cancelMyAppointment(id);
      setApptSuccess("Appointment cancelled.");
      setSelectedAppt(null);
      fetchAppointments();
    } catch (err) {
      setApptError(
        err.response?.data?.message ?? "Failed to cancel appointment.",
      );
    } finally {
      setCancelling(null);
      setConfirmCancelId(null);
    }
  };

  // Opens the confirmation dialog instead of cancelling immediately
  const requestCancel = (id) => setConfirmCancelId(id);

  // ── Doctor search ─────────────────────────────────────────────────────────

  const loadDoctors = useCallback(async ({ name = "", spec = "" } = {}) => {
    setSearchError("");
    setSearchLoading(true);
    try {
      const res = await searchDoctors({
        name: name.trim() || undefined,
        specialization: spec.trim() || undefined,
      });
      setDoctors(res.data?.data ?? []);
      setHasSearched(true);
    } catch (err) {
      setSearchError(
        err.response?.data?.message ?? "Failed to load doctors.",
      );
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Auto-load all doctors when the tab is first opened
  useEffect(() => {
    if (tab === "doctors" && !hasSearched) {
      loadDoctors();
    }
  }, [tab, hasSearched, loadDoctors]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadDoctors({ name: searchName, spec: searchSpec });
  };

  // ── Derived ──────────────────────────────────────────────────────────

  // Hide expired unpaid appointments (past dates or elapsed today slots)
  const today = todayInTZ();
  const visibleAppointments = appointments.filter((a) => {
    if (a.paymentStatus !== "unpaid") return true;
    const dateStr = a.date?.slice(0, 10);
    if (isPastDate(dateStr)) return false;          // past date
    if (dateStr === today && isSlotElapsed(a.timeSlot)) return false; // today, slot gone
    return true;
  });

  const filtered =
    filter === "all"
      ? visibleAppointments
      : visibleAppointments.filter((a) => a.status === filter);

  const counts = APPT_FILTERS.reduce((acc, f) => {
    acc[f] =
      f === "all"
        ? visibleAppointments.length
        : visibleAppointments.filter((a) => a.status === f).length;
    return acc;
  }, {});

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Appointments
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Manage your appointments or find a doctor to book a new one.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={[
              "px-5 py-2.5 text-sm font-semibold capitalize border-b-2 transition-colors -mb-px",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text-primary",
            ].join(" ")}
          >
            {t === "doctors" ? "Find a Doctor" : "My Appointments"}
          </button>
        ))}
      </div>

      {/* ── MY APPOINTMENTS TAB ──────────────────────────────────────── */}
      {tab === "appointments" && (
        <div className="space-y-5">
          {apptError && <Alert type="error">{apptError}</Alert>}
          {apptSuccess && <Alert type="success">{apptSuccess}</Alert>}

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2">
            {APPT_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={[
                  "px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                  filter === f
                    ? "bg-primary text-white border-primary"
                    : "bg-bg-card text-text-secondary border-border hover:border-primary hover:text-primary",
                ].join(" ")}
              >
                {FILTER_LABELS[f]}
                {counts[f] > 0 && (
                  <span
                    className={[
                      "ml-1.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                      filter === f
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

          {apptLoading ? (
            <div className="py-20">
              <Loader />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-bg-card px-6 py-12 text-center">
              <p className="text-sm text-text-muted">
                No {filter === "all" ? "" : filter + " "}appointments found.
              </p>
              <button
                type="button"
                onClick={() => setTab("doctors")}
                className="mt-4 px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Find a Doctor
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((appt) => (
                <AppointmentCard
                  key={appt._id}
                  appt={appt}
                  onSelect={setSelectedAppt}
                  onCancel={requestCancel}
                  cancelling={cancelling}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FIND A DOCTOR TAB ────────────────────────────────────────── */}
      {tab === "doctors" && (
        <div className="space-y-5">
          {searchError && <Alert type="error">{searchError}</Alert>}

          {/* Search form */}
          <form
            onSubmit={handleSearch}
            noValidate
            className="rounded-xl border border-border bg-bg-card p-5 space-y-4"
          >
            <p className="text-sm font-semibold text-text-primary">
              Search Doctors
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput
                id="search-name"
                label="Doctor Name"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="e.g. Nimal"
              />
              <FormInput
                id="search-spec"
                label="Specialization"
                value={searchSpec}
                onChange={(e) => setSearchSpec(e.target.value)}
                placeholder="e.g. Cardiology"
              />
            </div>
            <button
              type="submit"
              disabled={searchLoading}
              className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {searchLoading ? "Searching…" : "Search"}
            </button>
          </form>

          {/* Results */}
          {searchLoading ? (
            <div className="py-10">
              <Loader />
            </div>
          ) : !hasSearched ? (
            <div className="rounded-xl border border-border bg-bg-card px-6 py-10 text-center">
              <p className="text-sm font-semibold text-text-primary mb-1">Find a Doctor</p>
              <p className="text-sm text-text-muted">
                Enter a doctor&rsquo;s name or specialization above and press Search.
              </p>
            </div>
          ) : hasSearched && doctors.length === 0 ? (
            <div className="rounded-xl border border-border bg-bg-card px-6 py-10 text-center">
              <p className="text-sm text-text-muted">
                No doctors found. Try a different name or specialization.
              </p>
            </div>
          ) : doctors.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-text-muted">
                {doctors.length} doctor{doctors.length !== 1 ? "s" : ""} found
              </p>
              {doctors.map((doc) => (
                <DoctorCard
                  key={doc.userId ?? doc._id}
                  doctor={doc}
                  onSelect={(d) =>
                    navigate(`/patient/doctors/${d.userId}`, {
                      state: { doctor: d },
                    })
                  }
                />
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* Appointment detail modal */}
      {selectedAppt && (
        <AppointmentDetailModal
          appt={selectedAppt}
          userId={userId}
          onClose={() => setSelectedAppt(null)}
          onCancel={requestCancel}
          cancelling={cancelling}
          onPaymentSuccess={fetchAppointments}
        />
      )}

      {/* Cancel confirmation dialog */}
      <ConfirmDialog
        open={!!confirmCancelId}
        icon="danger"
        title="Cancel Appointment?"
        message="This action cannot be undone. The appointment will be cancelled and you may not be able to rebook the same slot."
        confirmLabel="Yes, Cancel It"
        cancelLabel="Keep Appointment"
        loading={cancelling === confirmCancelId}
        onConfirm={() => handleCancel(confirmCancelId)}
        onCancel={() => setConfirmCancelId(null)}
      />
    </div>
  );
}
