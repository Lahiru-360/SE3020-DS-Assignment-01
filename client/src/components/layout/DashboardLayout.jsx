import { useState } from "react";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ navItems = [], children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        navItems={navItems}
        isOpen={sidebarOpen}
        onOpen={() => setSidebarOpen(true)}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main content ──────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-bg-main" id="main-content">
        {/* Mobile top-bar: just the hamburger */}
        <div className="sticky top-0 z-20 flex items-center h-14 px-4 border-b border-border bg-bg-main md:hidden">
          <button
            className="
              flex items-center justify-center w-9 h-9 rounded-lg
              border border-border
              bg-bg-card
              text-text-primary
              transition-colors hover:bg-primary-soft hover:text-primary
            "
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
            aria-controls="dashboard-sidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
