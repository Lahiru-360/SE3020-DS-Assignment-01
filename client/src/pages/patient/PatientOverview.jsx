import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { getMyAppointments } from "../../api/patientService";
import Loader from "../../components/ui/Loader";
import Alert from "../../components/ui/Alert";
import StatusBadge from "../../components/ui/StatusBadge";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }) {
  return (
    <div
      className="rounded-xl border border-border bg-bg-card px-5 py-4 flex flex-col gap-1"
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
        {label}
      </span>
      <span className="text-2xl font-bold text-text-primary">{value}</span>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function PatientOverview() {
  const { userEmail } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyAppointments()
      .then((res) => setAppointments(res.data?.data ?? []))
      .catch((err) =>
        setError(err.response?.data?.message ?? "Failed to load overview."),
      )
      .finally(() => setLoading(false));
  }, []);

  // ── Derived stats ──────────────────────────────────────────────────────

  const stats = {
    total: appointments.length,
    pending: appointments.filter((a) => a.status === "pending").length,
    confirmed: appointments.filter((a) => a.status === "confirmed").length,
    completed: appointments.filter((a) => a.status === "completed").length,
    cancelled: appointments.filter((a) => a.status === "cancelled").length,
  };

  // Upcoming: pending + confirmed, soonest first
  const upcoming = [...appointments]
    .filter((a) => a.status === "pending" || a.status === "confirmed")
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="py-24">
        <Loader />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Overview</h1>
        <p className="text-sm text-text-muted mt-0.5">{userEmail}</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total"
          value={stats.total}
          accent="var(--color-primary)"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          accent="var(--color-warning)"
        />
        <StatCard
          label="Confirmed"
          value={stats.confirmed}
          accent="var(--color-primary-soft)"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          accent="var(--color-accent)"
        />
      </div>

      {/* Upcoming appointments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-primary">
            Upcoming Appointments
          </h2>
          <button
            type="button"
            onClick={() => navigate("/patient/appointments")}
            className="text-xs font-medium text-primary hover:underline"
          >
            View all
          </button>
        </div>

        {upcoming.length === 0 ? (
          <div className="rounded-xl border border-border bg-bg-card px-6 py-10 text-center">
            <p className="text-sm text-text-muted">No upcoming appointments.</p>
            <button
              type="button"
              onClick={() => navigate("/patient/appointments")}
              className="mt-4 px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Book an Appointment
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((appt) => (
              <div
                key={appt._id}
                className="rounded-xl border border-border bg-bg-card px-4 py-3 flex items-center justify-between gap-3"
              >
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
                    {appt.type ?? "PHYSICAL"} · Dr. ID: {appt.doctorId}
                  </p>
                </div>
                <StatusBadge status={appt.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => navigate("/patient/appointments")}
          className="rounded-xl border border-primary/30 bg-bg-card p-5 text-left hover:border-primary transition-colors"
        >
          <p className="text-sm font-semibold text-primary mb-1">
            Book Appointment
          </p>
          <p className="text-xs text-text-muted">
            Find a doctor and schedule a visit.
          </p>
        </button>
        <button
          type="button"
          onClick={() => navigate("/patient/settings")}
          className="rounded-xl border border-border bg-bg-card p-5 text-left hover:border-primary transition-colors"
        >
          <p className="text-sm font-semibold text-text-primary mb-1">
            My Profile
          </p>
          <p className="text-xs text-text-muted">
            Update your personal information.
          </p>
        </button>
      </div>
    </div>
  );
}
