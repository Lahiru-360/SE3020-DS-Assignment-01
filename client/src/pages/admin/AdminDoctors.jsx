import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, RefreshCw } from "lucide-react";
import {
  getPendingDoctors,
  approveDoctor,
  rejectDoctor,
} from "../../api/adminService";
import Loader from "../../components/ui/Loader";
import Alert from "../../components/ui/Alert";

// ── DoctorCard ─────────────────────────────────────────────────────────────

function PendingDoctorCard({ doctor, onApprove, onReject, actioning }) {
  const [confirmReject, setConfirmReject] = useState(false);
  const isActioning = actioning === doctor.userId;

  return (
    <div className="rounded-xl border border-border bg-bg-card p-5 space-y-4">
      {/* Top info */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="flex items-center justify-center w-11 h-11 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0 select-none">
            {doctor.firstName?.[0]?.toUpperCase() ?? "D"}
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              Dr. {doctor.firstName} {doctor.lastName}
            </p>
            {doctor.specialization && (
              <p className="text-xs text-text-muted mt-0.5">
                {doctor.specialization}
              </p>
            )}
          </div>
        </div>

        {/* Pending badge */}
        <span className="shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full border bg-warning-bg text-warning border-warning/30">
          Pending
        </span>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-bg-main px-4 py-3 text-xs">
        <div>
          <p className="text-text-muted mb-0.5">User ID</p>
          <p className="font-mono text-text-secondary break-all leading-snug">
            {doctor.userId}
          </p>
        </div>
        {doctor.consultationFee != null && (
          <div>
            <p className="text-text-muted mb-0.5">Consultation Fee</p>
            <p className="text-text-primary font-semibold">
              LKR {doctor.consultationFee}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      {confirmReject ? (
        <div className="rounded-xl border border-error/30 bg-error-bg p-4 space-y-3">
          <p className="text-sm font-semibold text-text-primary">
            Reject this doctor registration?
          </p>
          <p className="text-xs text-text-secondary">
            The account will be permanently removed. This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmReject(false)}
              className="flex-1 py-2 rounded-lg border border-border text-text-secondary text-sm font-semibold hover:border-primary hover:text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isActioning}
              onClick={() => onReject(doctor.userId)}
              className="flex-1 py-2 rounded-lg bg-error text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isActioning ? "Rejecting…" : "Yes, Reject"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            type="button"
            disabled={isActioning}
            onClick={() => onApprove(doctor.userId)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <CheckCircle size={15} />
            {isActioning ? "Approving…" : "Approve"}
          </button>
          <button
            type="button"
            disabled={isActioning}
            onClick={() => setConfirmReject(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-error text-error text-sm font-semibold hover:bg-error-bg disabled:opacity-50 transition-colors"
          >
            <XCircle size={15} />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actioning, setActioning] = useState(null);

  const fetchPending = useCallback(() => {
    setLoading(true);
    setError("");
    getPendingDoctors()
      .then((res) => setDoctors(res.data?.data ?? []))
      .catch(() => setError("Failed to load pending doctors."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = async (userId) => {
    setActioning(userId);
    setError("");
    setSuccess("");
    try {
      await approveDoctor(userId);
      setSuccess("Doctor approved and account activated.");
      fetchPending();
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to approve doctor.");
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async (userId) => {
    setActioning(userId);
    setError("");
    setSuccess("");
    try {
      await rejectDoctor(userId);
      setSuccess("Doctor registration rejected and removed.");
      fetchPending();
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to reject doctor.");
    } finally {
      setActioning(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            Doctor Approvals
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Review and approve or reject pending doctor registrations.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchPending}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold text-text-secondary hover:border-primary hover:text-primary disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {loading ? (
        <div className="py-20">
          <Loader />
        </div>
      ) : doctors.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card px-6 py-16 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-success-bg mx-auto mb-4">
            <CheckCircle size={28} className="text-success" />
          </div>
          <p className="text-sm font-semibold text-text-primary">All clear!</p>
          <p className="text-xs text-text-muted mt-1">
            There are no pending doctor approvals right now.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-text-muted">
            {doctors.length} doctor{doctors.length !== 1 ? "s" : ""} awaiting
            approval
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {doctors.map((doc) => (
              <PendingDoctorCard
                key={doc.userId ?? doc._id}
                doctor={doc}
                onApprove={handleApprove}
                onReject={handleReject}
                actioning={actioning}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
