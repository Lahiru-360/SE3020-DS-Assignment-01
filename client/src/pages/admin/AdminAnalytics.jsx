import { useEffect, useState } from "react";
import { getAllUsers, getPendingDoctors } from "../../api/adminService";
import Loader from "../../components/ui/Loader";
import Alert from "../../components/ui/Alert";

// ── BarSegment ─────────────────────────────────────────────────────────────

function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-semibold text-text-secondary w-8 text-right">
        {pct}%
      </span>
    </div>
  );
}

// ── StatBlock ──────────────────────────────────────────────────────────────

function StatBlock({ label, value, color }) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <p className="text-2xl font-bold" style={{ color }}>
        {value ?? "—"}
      </p>
      <p className="text-xs text-text-muted mt-1">{label}</p>
    </div>
  );
}

// ── SectionCard ────────────────────────────────────────────────────────────

function SectionCard({ title, children }) {
  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [total, setTotal] = useState(0);
  const [totalDoctors, setTotalDoctors] = useState(0);
  const [totalPatients, setTotalPatients] = useState(0);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [totalActive, setTotalActive] = useState(0);
  const [totalInactive, setTotalInactive] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const [
          allRes,
          doctorsRes,
          patientsRes,
          adminsRes,
          activeRes,
          inactiveRes,
          pendingRes,
        ] = await Promise.all([
          getAllUsers({ limit: 1 }),
          getAllUsers({ role: "doctor", limit: 1 }),
          getAllUsers({ role: "patient", limit: 1 }),
          getAllUsers({ role: "admin", limit: 1 }),
          getAllUsers({ isActive: true, limit: 1 }),
          getAllUsers({ isActive: false, limit: 1 }),
          getPendingDoctors(),
        ]);

        setTotal(allRes.data?.data?.total ?? 0);
        setTotalDoctors(doctorsRes.data?.data?.total ?? 0);
        setTotalPatients(patientsRes.data?.data?.total ?? 0);
        setTotalAdmins(adminsRes.data?.data?.total ?? 0);
        setTotalActive(activeRes.data?.data?.total ?? 0);
        setTotalInactive(inactiveRes.data?.data?.total ?? 0);
        setPendingCount(
          Array.isArray(pendingRes.data?.data)
            ? pendingRes.data.data.length
            : 0,
        );
      } catch {
        setError("Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  if (loading) {
    return (
      <div className="py-20">
        <Loader />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Analytics</h1>
        <p className="text-sm text-text-muted mt-0.5">
          System-wide user metrics and health overview.
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* ── Summary stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatBlock
          label="Total Users"
          value={total}
          color="var(--color-primary)"
        />
        <StatBlock
          label="Active Accounts"
          value={totalActive}
          color="var(--color-success)"
        />
        <StatBlock
          label="Inactive Accounts"
          value={totalInactive}
          color="var(--color-error)"
        />
        <StatBlock
          label="Pending Approvals"
          value={pendingCount}
          color="var(--color-warning)"
        />
      </div>

      {/* ── User breakdown ───────────────────────────────────────────── */}
      <SectionCard title="Users by Role">
        <div className="space-y-5">
          {[
            {
              label: "Patients",
              value: totalPatients,
              color: "var(--color-accent)",
            },
            {
              label: "Doctors",
              value: totalDoctors,
              color: "var(--color-primary-soft)",
            },
            {
              label: "Admins",
              value: totalAdmins,
              color: "var(--color-primary)",
            },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-medium text-text-primary">{label}</p>
                <p className="text-sm font-semibold text-text-secondary">
                  {value}
                </p>
              </div>
              <ProgressBar value={value} max={total} color={color} />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Activity breakdown ───────────────────────────────────────── */}
      <SectionCard title="Account Activity">
        <div className="space-y-5">
          {[
            {
              label: "Active accounts",
              value: totalActive,
              color: "var(--color-success)",
            },
            {
              label: "Inactive / deactivated",
              value: totalInactive,
              color: "var(--color-error)",
            },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-medium text-text-primary">{label}</p>
                <p className="text-sm font-semibold text-text-secondary">
                  {value}
                </p>
              </div>
              <ProgressBar value={value} max={total} color={color} />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Doctor approval ──────────────────────────────────────────── */}
      <SectionCard title="Doctor Status">
        <div className="space-y-5">
          {[
            {
              label: "Approved doctors",
              value: totalDoctors - pendingCount,
              color: "var(--color-success)",
            },
            {
              label: "Pending approval",
              value: pendingCount,
              color: "var(--color-warning)",
            },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-medium text-text-primary">{label}</p>
                <p className="text-sm font-semibold text-text-secondary">
                  {value}
                </p>
              </div>
              <ProgressBar
                value={Math.max(0, value)}
                max={totalDoctors}
                color={color}
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
