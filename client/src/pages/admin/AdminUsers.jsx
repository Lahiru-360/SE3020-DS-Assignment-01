import { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  getAllUsers,
  getUserById,
  deactivateUser,
  activateUser,
  deleteUser,
} from "../../api/adminService";
import Loader from "../../components/ui/Loader";
import Alert from "../../components/ui/Alert";
import FormInput from "../../components/ui/FormInput";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
      <X size={16} />
    </button>
  );
}

// ── RoleBadge ──────────────────────────────────────────────────────────────

const ROLE_STYLES = {
  admin: "bg-primary/10 text-primary border-primary/30",
  doctor: "bg-primary-soft/15 text-primary-soft border-primary-soft/30",
  patient: "bg-accent/10 text-accent border-accent/30",
};

function RoleBadge({ role }) {
  return (
    <span
      className={[
        "text-[11px] font-semibold px-2.5 py-0.5 rounded-full border capitalize",
        ROLE_STYLES[role] ?? "bg-bg-main text-text-muted border-border",
      ].join(" ")}
    >
      {role}
    </span>
  );
}

// ── StatusBadge (active / inactive) ───────────────────────────────────────

function ActiveBadge({ isActive }) {
  return (
    <span
      className={[
        "text-[11px] font-semibold px-2.5 py-0.5 rounded-full border",
        isActive
          ? "bg-success-bg text-success border-success/30"
          : "bg-error-bg text-error border-error/30",
      ].join(" ")}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

// ── UserDetailModal ────────────────────────────────────────────────────────

function UserDetailModal({
  userId,
  onClose,
  onDeactivate,
  onActivate,
  onDelete,
  actioning,
}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setLoading(true);
    getUserById(userId)
      .then((res) => setUser(res.data?.data ?? null))
      .catch(() => setError("Failed to load user details."))
      .finally(() => setLoading(false));
  }, [userId]);

  const isActioning = actioning === userId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-bg-card rounded-2xl border border-border shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-text-primary">
            User Details
          </h2>
          <CloseButton onClick={onClose} />
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-5">
          {loading ? (
            <div className="py-10">
              <Loader />
            </div>
          ) : error ? (
            <Alert type="error">{error}</Alert>
          ) : !user ? (
            <p className="text-sm text-text-muted text-center py-6">
              User not found.
            </p>
          ) : (
            <>
              {/* Avatar + identity */}
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary text-xl font-bold select-none shrink-0">
                  {user.email?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary break-all">
                    {user.email}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <RoleBadge role={user.role} />
                    <ActiveBadge isActive={user.isActive} />
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-bg-main p-4">
                <div>
                  <p className="text-[11px] text-text-muted mb-0.5">User ID</p>
                  <p className="text-xs font-mono text-text-secondary break-all leading-snug">
                    {user._id}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-text-muted mb-0.5">Role</p>
                  <p className="text-sm font-medium text-text-primary capitalize">
                    {user.role}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-text-muted mb-0.5">
                    Registered
                  </p>
                  <p className="text-sm font-medium text-text-primary">
                    {formatDate(user.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-text-muted mb-0.5">
                    Last Login
                  </p>
                  <p className="text-sm font-medium text-text-primary">
                    {formatDateTime(user.lastLogin)}
                  </p>
                </div>
              </div>

              {/* Actions — not for admin accounts */}
              {user.role !== "admin" && (
                <div className="space-y-3">
                  {user.isActive ? (
                    <button
                      type="button"
                      disabled={isActioning}
                      onClick={() => onDeactivate(user._id)}
                      className="w-full py-2.5 rounded-lg border border-warning text-warning text-sm font-semibold hover:bg-warning-bg disabled:opacity-50 transition-colors"
                    >
                      {isActioning ? "Processing…" : "Deactivate Account"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isActioning}
                      onClick={() => onActivate(user._id)}
                      className="w-full py-2.5 rounded-lg border border-success text-success text-sm font-semibold hover:bg-success-bg disabled:opacity-50 transition-colors"
                    >
                      {isActioning ? "Processing…" : "Activate Account"}
                    </button>
                  )}

                  {confirmDelete ? (
                    <div className="rounded-xl border border-error/30 bg-error-bg p-4 space-y-3">
                      <p className="text-sm text-text-primary font-semibold">
                        Permanently delete this account?
                      </p>
                      <p className="text-xs text-text-secondary">
                        This action cannot be undone. The user and all
                        associated data will be removed.
                      </p>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="flex-1 py-2 rounded-lg border border-border text-text-secondary text-sm font-semibold hover:border-primary hover:text-primary transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isActioning}
                          onClick={() => onDelete(user._id)}
                          className="flex-1 py-2 rounded-lg bg-error text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                          {isActioning ? "Deleting…" : "Yes, Delete"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="w-full py-2.5 rounded-lg border border-error text-error text-sm font-semibold hover:bg-error-bg transition-colors"
                    >
                      Delete Account
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Constants ──────────────────────────────────────────────────────────────

const ROLE_FILTERS = ["all", "doctor", "patient", "admin"];
const ROLE_LABELS = {
  all: "All Roles",
  doctor: "Doctors",
  patient: "Patients",
  admin: "Admins",
};
const STATUS_FILTERS = ["all", "active", "inactive"];
const STATUS_LABELS = {
  all: "All Status",
  active: "Active",
  inactive: "Inactive",
};
const PAGE_SIZE = 15;

// ── Main page ──────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [emailSearch, setEmailSearch] = useState("");
  const [committedEmail, setCommittedEmail] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Detail modal
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [actioning, setActioning] = useState(null);

  // ── Fetch ─────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(() => {
    setLoading(true);
    setError("");

    const params = {
      page,
      limit: PAGE_SIZE,
      ...(roleFilter !== "all" && { role: roleFilter }),
      ...(statusFilter !== "all" && { isActive: statusFilter === "active" }),
      ...(committedEmail.trim() && { email: committedEmail.trim() }),
    };

    getAllUsers(params)
      .then((res) => {
        const d = res.data?.data ?? {};
        setUsers(d.users ?? []);
        setTotal(d.total ?? 0);
        setTotalPages(d.totalPages ?? 1);
      })
      .catch(() => setError("Failed to load users."))
      .finally(() => setLoading(false));
  }, [page, roleFilter, statusFilter, committedEmail]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [roleFilter, statusFilter, committedEmail]);

  // ── Action handlers ───────────────────────────────────────────────────

  const handleDeactivate = async (userId) => {
    setActioning(userId);
    setSuccess("");
    setError("");
    try {
      await deactivateUser(userId);
      setSuccess("User deactivated successfully.");
      setSelectedUserId(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to deactivate user.");
    } finally {
      setActioning(null);
    }
  };

  const handleActivate = async (userId) => {
    setActioning(userId);
    setSuccess("");
    setError("");
    try {
      await activateUser(userId);
      setSuccess("User activated successfully.");
      setSelectedUserId(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to activate user.");
    } finally {
      setActioning(null);
    }
  };

  const handleDelete = async (userId) => {
    setActioning(userId);
    setSuccess("");
    setError("");
    try {
      await deleteUser(userId);
      setSuccess("User deleted successfully.");
      setSelectedUserId(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to delete user.");
    } finally {
      setActioning(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          User Management
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          {total > 0 ? `${total} users registered` : "Manage all system users."}
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-bg-card p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
          <input
            type="text"
            value={emailSearch}
            onChange={(e) => setEmailSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setCommittedEmail(emailSearch);
            }}
            placeholder="Search by email… (press Enter)"
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm bg-bg-main text-text-primary border border-border placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
          />
          {emailSearch && (
            <button
              type="button"
              onClick={() => {
                setEmailSearch("");
                setCommittedEmail("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Role + status filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-wrap gap-1.5">
            {ROLE_FILTERS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={[
                  "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                  roleFilter === r
                    ? "bg-primary text-white border-primary"
                    : "bg-bg-main text-text-secondary border-border hover:border-primary hover:text-primary",
                ].join(" ")}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={[
                  "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                  statusFilter === s
                    ? "bg-primary text-white border-primary"
                    : "bg-bg-main text-text-secondary border-border hover:border-primary hover:text-primary",
                ].join(" ")}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
        {loading ? (
          <div className="py-16">
            <Loader />
          </div>
        ) : users.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-text-muted">
              No users match the current filters.
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[1fr_100px_90px_100px_90px] gap-4 px-5 py-3 border-b border-border bg-bg-main">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                Email
              </p>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                Role
              </p>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                Status
              </p>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                Registered
              </p>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide text-right">
                Actions
              </p>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border">
              {users.map((user) => (
                <div
                  key={user._id}
                  className="flex flex-col sm:grid sm:grid-cols-[1fr_100px_90px_100px_90px] gap-2 sm:gap-4 px-5 py-4 hover:bg-bg-main/60 transition-colors"
                >
                  {/* Email + initials */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 select-none">
                      {user.email?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <p className="text-sm font-medium text-text-primary truncate">
                      {user.email}
                    </p>
                  </div>

                  <div className="flex items-center sm:block">
                    <RoleBadge role={user.role} />
                  </div>

                  <div className="flex items-center sm:block">
                    <ActiveBadge isActive={user.isActive} />
                  </div>

                  <div className="flex items-center sm:block">
                    <p className="text-sm text-text-secondary">
                      {formatDate(user.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center sm:justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedUserId(user._id)}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-text-secondary hover:border-primary hover:text-primary transition-colors"
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Pagination ───────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">
            Page {page} of {totalPages} · {total} users
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-border text-text-secondary hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-border text-text-secondary hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onDeactivate={handleDeactivate}
          onActivate={handleActivate}
          onDelete={handleDelete}
          actioning={actioning}
        />
      )}
    </div>
  );
}
