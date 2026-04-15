import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Stethoscope, UserCheck, Clock } from "lucide-react";
import { getAllUsers, getPendingDoctors } from "../../api/adminService";
import Loader from "../../components/ui/Loader";
import Alert from "../../components/ui/Alert";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── StatCard ───────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, accent, onClick }) {
  return (
    <div
      className={[
        "rounded-xl border border-border bg-bg-card p-5 space-y-3",
        onClick
          ? "cursor-pointer hover:border-primary/50 transition-colors"
          : "",
      ].join(" ")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <div className="flex items-center justify-between">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg"
          style={{ background: accent + "1a" }}
        >
          <Icon size={20} style={{ color: accent }} />
        </div>
        {sub != null && <span className="text-xs text-text-muted">{sub}</span>}
      </div>
      <div>
        <p className="text-2xl font-bold text-text-primary">{value ?? "—"}</p>
        <p className="text-sm text-text-muted mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AdminOverview() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [totalDoctors, setTotalDoctors] = useState(null);
  const [totalPatients, setTotalPatients] = useState(null);
  const [totalUsers, setTotalUsers] = useState(null);
  const [pendingCount, setPendingCount] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError("");
      try {
        const [doctorsRes, patientsRes, allRes, pendingRes] = await Promise.all(
          [
            getAllUsers({ role: "doctor", limit: 1 }),
            getAllUsers({ role: "patient", limit: 1 }),
            getAllUsers({ limit: 5 }),
            getPendingDoctors(),
          ],
        );

        setTotalDoctors(doctorsRes.data?.data?.total ?? 0);
        setTotalPatients(patientsRes.data?.data?.total ?? 0);
        setTotalUsers(allRes.data?.data?.total ?? 0);
        setPendingCount(
          Array.isArray(pendingRes.data?.data)
            ? pendingRes.data.data.length
            : 0,
        );
        setRecentUsers(allRes.data?.data?.users ?? []);
      } catch {
        setError("Failed to load dashboard stats.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="py-20">
        <Loader />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Admin Overview
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          System-wide statistics and quick access.
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={totalUsers}
          accent="var(--color-primary)"
          onClick={() => navigate("/admin/users")}
        />
        <StatCard
          icon={Stethoscope}
          label="Registered Doctors"
          value={totalDoctors}
          accent="var(--color-primary-soft)"
          onClick={() => navigate("/admin/users")}
        />
        <StatCard
          icon={UserCheck}
          label="Registered Patients"
          value={totalPatients}
          accent="var(--color-accent)"
          onClick={() => navigate("/admin/users")}
        />
        <StatCard
          icon={Clock}
          label="Pending Approvals"
          value={pendingCount}
          sub={pendingCount > 0 ? "Needs action" : undefined}
          accent="var(--color-warning)"
          onClick={() => navigate("/admin/doctors")}
        />
      </div>

      {/* ── Recent users ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">
            Recent Registrations
          </h2>
          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            className="text-xs text-primary font-semibold hover:underline"
          >
            View all →
          </button>
        </div>

        {recentUsers.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-text-muted">No users found.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentUsers.map((user) => (
              <div
                key={user._id}
                className="flex items-center justify-between px-5 py-3 gap-4"
              >
                {/* Avatar + email */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 select-none">
                    {user.email?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {user.email}
                    </p>
                    <p className="text-xs text-text-muted capitalize">
                      {user.role}
                    </p>
                  </div>
                </div>

                {/* Status + date */}
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={[
                      "text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                      user.isActive
                        ? "bg-success-bg text-success border-success/30"
                        : "bg-error-bg text-error border-error/30",
                    ].join(" ")}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                  <p className="text-xs text-text-muted hidden sm:block">
                    {formatDate(user.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick actions ────────────────────────────────────────────────── */}
      {pendingCount > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning-bg px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-text-primary">
              {pendingCount} doctor{pendingCount !== 1 ? "s" : ""} awaiting
              approval
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              Review their profiles and approve or reject their registration.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/admin/doctors")}
            className="shrink-0 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Review Now
          </button>
        </div>
      )}
    </div>
  );
}
