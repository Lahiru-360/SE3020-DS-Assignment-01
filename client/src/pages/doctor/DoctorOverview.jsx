import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import {
  getDoctorAppointments,
  getDoctorAvailability,
} from "../../api/doctorService";
import Loader from "../../components/ui/Loader";
import Alert from "../../components/ui/Alert";
import StatusBadge from "../../components/ui/StatusBadge";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

//  Stat card

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

// Component

export default function DoctorOverview() {
  const { userEmail, userId } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true); // true on mount — fetches immediately
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    Promise.all([getDoctorAppointments(), getDoctorAvailability(userId)])
      .then(([apptRes, availRes]) => {
        setAppointments(apptRes.data?.data ?? []);
        setAvailability(availRes.data?.data ?? []);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ?? "Failed to load overview data.",
        );
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const stats = {
    total: appointments.length,
    pending: appointments.filter((a) => a.status === "pending").length,
    confirmed: appointments.filter((a) => a.status === "confirmed").length,
    completed: appointments.filter((a) => a.status === "completed").length,
    cancelled: appointments.filter((a) => a.status === "cancelled").length,
  };

  // Recent upcoming appointments (pending + confirmed, soonest first)
  const upcoming = [...appointments]
    .filter((a) => a.status === "pending" || a.status === "confirmed")
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  // Upcoming availability (next 3 dates)
  const upcomingAvail = [...availability]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/*  Welcome banner  */}
      <div className="rounded-xl bg-bg-card border border-border px-6 py-5">
        <h1 className="text-xl font-semibold text-text-primary">
          Welcome back, Doctor
        </h1>
        <p className="text-sm text-text-muted mt-0.5">{userEmail}</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/*  Stats  */}
      {loading ? (
        <div className="py-16">
          <Loader />
        </div>
      ) : (
        <>
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
              accent="var(--color-success)"
            />
          </div>

          {/*  Upcoming appointments  */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-text-primary">
                Upcoming Appointments
              </h2>
              <button
                onClick={() => navigate("/doctor/appointments")}
                className="text-xs font-medium text-primary hover:underline"
              >
                View all
              </button>
            </div>

            {upcoming.length === 0 ? (
              <div className="rounded-xl border border-border bg-bg-card px-5 py-8 text-center text-sm text-text-muted">
                No upcoming appointments.
              </div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((appt) => (
                  <div
                    key={appt._id}
                    className="flex items-center justify-between rounded-xl border border-border bg-bg-card px-4 py-3"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-text-primary">
                        {formatDate(appt.date)}{" "}
                        {appt.timeSlot && (
                          <span className="text-text-muted font-normal">
                            · {appt.timeSlot}
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-text-muted">
                        {appt.type ?? "—"}{" "}
                        {(appt.patientName ?? appt.patientId) &&
                          `· Patient: ${appt.patientName ?? appt.patientId}`}
                      </span>
                    </div>
                    <StatusBadge status={appt.status} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/*  Availability summary  */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-text-primary">
                Scheduled Availability
              </h2>
              <button
                onClick={() => navigate("/doctor/availability")}
                className="text-xs font-medium text-primary hover:underline"
              >
                Manage
              </button>
            </div>

            {upcomingAvail.length === 0 ? (
              <div className="rounded-xl border border-border bg-bg-card px-5 py-8 text-center text-sm text-text-muted">
                No availability scheduled.{" "}
                <button
                  onClick={() => navigate("/doctor/availability")}
                  className="text-primary hover:underline"
                >
                  Add availability
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingAvail.map((avail) => {
                  const morningSlots = avail.timeslots.filter(
                    (s) => s.phase === "morning",
                  );
                  const eveningSlots = avail.timeslots.filter(
                    (s) => s.phase === "evening",
                  );
                  return (
                    <div
                      key={avail._id ?? avail.date}
                      className="rounded-xl border border-border bg-bg-card px-4 py-3"
                    >
                      <p className="text-sm font-semibold text-text-primary mb-2">
                        {formatDate(avail.date)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {morningSlots.length > 0 && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1">
                            Morning · {morningSlots.length} slot
                            {morningSlots.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {eveningSlots.length > 0 && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 text-accent text-xs font-medium px-3 py-1">
                            Evening · {eveningSlots.length} slot
                            {eveningSlots.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
