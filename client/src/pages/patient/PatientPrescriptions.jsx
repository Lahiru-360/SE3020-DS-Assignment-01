import { useEffect, useState } from "react";
import { useAuth } from "../../context/useAuth";
import {
  getPatientPrescriptions,
  downloadPrescriptionPdf,
} from "../../api/patientService";
import Loader from "../../components/ui/Loader";
import Alert from "../../components/ui/Alert";
import StatusBadge from "../../components/ui/StatusBadge";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { dateStyle: "medium" });
}

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

//  PrescriptionDetailModal
// Scrollable modal showing full prescription with PDF download.

function PrescriptionDetailModal({ prescription, onClose }) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  const handleDownloadPdf = async () => {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-bg-card rounded-2xl border border-border shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Prescription
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Issued: {formatDate(prescription.issuedDate)}
            </p>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-5">
          {pdfError && <Alert type="error">{pdfError}</Alert>}

          {/* Diagnosis */}
          <div>
            <p className="text-xs text-text-muted mb-0.5">Diagnosis</p>
            <p className="text-sm text-text-primary font-medium">
              {prescription.diagnosis}
            </p>
          </div>

          {/* Notes */}
          {prescription.notes && (
            <div className="rounded-lg bg-bg-main border border-border px-4 py-3">
              <p className="text-xs text-text-muted mb-1">
                Doctor&apos;s Notes
              </p>
              <p className="text-sm text-text-secondary">
                {prescription.notes}
              </p>
            </div>
          )}

          {/* Medications */}
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

          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-text-muted mb-0.5">Appointment ID</p>
              <p className="font-mono text-text-secondary break-all">
                {prescription.appointmentId}
              </p>
            </div>
            {prescription.version > 1 && (
              <div>
                <p className="text-text-muted mb-0.5">Version</p>
                <p className="text-text-secondary">{prescription.version}</p>
              </div>
            )}
          </div>

          {/* Download */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="w-full py-2.5 rounded-lg border border-accent text-accent text-sm font-semibold hover:bg-success-bg disabled:opacity-50 transition-colors"
          >
            {pdfLoading ? "Downloading…" : "Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

//  PrescriptionCard

function PrescriptionCard({ prescription, onSelect }) {
  return (
    <div
      className="rounded-xl border border-border bg-bg-card p-4 space-y-3 cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => onSelect(prescription)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(prescription)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">
            {prescription.diagnosis}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            Issued: {formatDate(prescription.issuedDate)}
          </p>
          {prescription.doctorName && (
            <p className="text-xs text-text-secondary mt-0.5 font-medium">
              Dr. {prescription.doctorName}
            </p>
          )}
        </div>
        <StatusBadge status="completed" />
      </div>

      <p className="text-xs text-text-secondary">
        {prescription.medications?.length ?? 0} medication
        {(prescription.medications?.length ?? 0) !== 1 ? "s" : ""}
      </p>

      <p className="text-[11px] text-primary font-medium">
        Tap to view details →
      </p>
    </div>
  );
}

//  Main page

export default function PatientPrescriptions() {
  const { userId } = useAuth();

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!userId) return;
    getPatientPrescriptions(userId)
      .then((res) => setPrescriptions(res.data?.data ?? []))
      .catch((err) =>
        setError(
          err.response?.data?.message ?? "Failed to load prescriptions.",
        ),
      )
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Prescriptions
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Prescriptions issued by your doctors for completed appointments.
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <div className="py-24">
          <Loader />
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card px-6 py-16 text-center">
          <p className="text-sm text-text-muted">
            You have no prescriptions yet. Prescriptions appear here after a
            doctor completes an appointment and issues one.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((rx) => (
            <PrescriptionCard
              key={rx._id}
              prescription={rx}
              onSelect={setSelected}
            />
          ))}
        </div>
      )}

      {selected && (
        <PrescriptionDetailModal
          prescription={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
