import { HeartPulse, CalendarDays, Settings, Wallet } from "lucide-react";
import { useAuth } from "../context/useAuth";
import DashboardLayout from "../components/layout/DashboardLayout";

const MOTHER_NAV = [
  {
    label: "Overview",
    path: "/patient/overview",
    icon: <HeartPulse size={18} />,
  },
  {
    label: "Appointments",
    path: "/patient/appointments",
    icon: <CalendarDays size={18} />,
  },
  {
    label: "Payments",
    path: "/patient/payments",
    icon: <Wallet size={18} />,
  },
  {
    label: "Settings",
    path: "/patient/settings",
    icon: <Settings size={18} />,
  },
];

function User() {
  const { userRole } = useAuth();

  return (
    <DashboardLayout navItems={MOTHER_NAV}>
      <div className="w-full mx-auto max-w-3xl">
        <header className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary">
            Welcome
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-sm md:text-base text-text-secondary">
            You are logged in as{" "}
            <span className="font-semibold">{userRole}</span>.
          </p>
          <div className="mt-5 flex justify-center">
            <span className="h-1 w-20 rounded-full bg-primary" />
          </div>
        </header>

        <div className="rounded-xl border border-border bg-bg-card shadow-sm p-6 text-center">
          <p className="text-text-secondary">Placeholder page for Mothers.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default User;
