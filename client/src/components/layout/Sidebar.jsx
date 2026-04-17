import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

export default function Sidebar({ navItems = [], isOpen, onClose }) {
  const { userEmail, userRole, logout } = useAuth();
  const navigate = useNavigate();

  // Derive initials from the email username (e.g. "jane.doe@..." → "JD")
  const initials = userEmail
    ? userEmail
        .split("@")[0]
        .split(/[._-]/)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  const displayRole = userRole
    ? userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase()
    : "";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      {/* ── Mobile backdrop ───────────────────────────────── */}
      <div
        className={`
          fixed inset-0 z-19 bg-black/40
          transition-opacity duration-300
          hidden max-md:block
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* ── Sidebar panel ─────────────────────────────────── */}
      <aside
        id="dashboard-sidebar"
        aria-label="Dashboard navigation"
        className={`
          w-60 shrink-0 z-40
          flex flex-col h-screen
          bg-bg-card
          border-r border-border
          transition-transform duration-300 ease-in-out
          max-md:fixed max-md:inset-y-0 max-md:left-0
          max-md:shadow-[4px_0_24px_rgba(201,74,106,0.12)]
          ${isOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"}
        `}
      >
        {/* ── Brand header ──────────────────────────────────── */}
        <div className="flex items-center justify-center px-4 h-16 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-3xl leading-none text-primary"
              style={{
                fontFamily: "'Dancing Script', cursive",
                fontWeight: 700,
              }}
            >
              Care Link
            </span>
          </div>
          {/* Close — mobile only */}
          <button
            className="
              flex items-center justify-center w-8 h-8 rounded-lg
              border border-border
              bg-transparent text-text-secondary
              transition-colors hover:bg-primary-soft hover:text-primary
              md:hidden
            "
            onClick={onClose}
            aria-label="Close navigation menu"
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
        </div>

        {/* ── User identity card ────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border shrink-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0 select-none">
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-text-primary truncate leading-tight">
              {userEmail ?? "—"}
            </span>
            <span className="text-xs text-text-muted mt-0.5 leading-tight">
              {displayRole}
            </span>
          </div>
        </div>

        {/* ── Nav items — scrollable middle ─────────────────── */}
        <nav
          className="flex-1 overflow-y-auto py-3 px-3"
          aria-label="Sidebar navigation"
        >
          <ul className="list-none m-0 p-0 flex flex-col gap-1" role="list">
            {navItems.map(({ label, path, icon }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  end
                  onClick={onClose}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px]",
                      "text-sm font-medium no-underline transition-colors whitespace-nowrap",
                      isActive
                        ? "bg-primary text-white font-semibold hover:opacity-90"
                        : "text-text-secondary hover:bg-primary/8 hover:text-primary",
                    ].join(" ")
                  }
                >
                  <span
                    className="flex items-center justify-center shrink-0 w-4.5 h-4.5"
                    aria-hidden="true"
                  >
                    {icon}
                  </span>
                  <span className="flex-1 truncate">{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Logout — pinned to bottom ─────────────────────── */}
        <div className="px-3 py-4 border-t border-border shrink-0">
          <button
            onClick={handleLogout}
            className="
              group w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px]
              text-sm font-medium transition-colors
              text-text-secondary
              hover:bg-primary/8 hover:text-primary
              cursor-pointer
            "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4.5 w-4.5 shrink-0 transition-transform group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
