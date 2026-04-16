import { useAuth } from "../../context/useAuth";

export default function AdminSettings() {
  const { userEmail, userRole } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Settings</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Admin account information.
        </p>
      </div>

      {/* Admin info card */}
      <div className="rounded-xl border border-border bg-bg-card p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary text-xl font-bold select-none shrink-0">
            {userEmail?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div>
            <p className="text-base font-semibold text-text-primary">
              {userEmail}
            </p>
            <p className="text-sm text-text-muted capitalize mt-0.5">
              {userRole}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-bg-main px-5 py-4 space-y-4">
          <div>
            <p className="text-xs text-text-muted mb-0.5">Email</p>
            <p className="text-sm font-medium text-text-primary">{userEmail}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-0.5">Role</p>
            <p className="text-sm font-medium text-text-primary capitalize">
              {userRole}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-bg-main px-5 py-4">
          <p className="text-sm text-text-secondary">
            Admin account settings such as password changes are managed directly
            in the Auth Service. Contact your system administrator for account
            modifications.
          </p>
        </div>
      </div>
    </div>
  );
}
