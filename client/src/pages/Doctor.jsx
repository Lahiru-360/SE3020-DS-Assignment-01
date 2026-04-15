import { Stethoscope, CalendarDays, Settings } from "lucide-react";
import { useAuth } from "../context/useAuth";
import DashboardLayout from "../components/layout/DashboardLayout";

const DOCTOR_NAV = [
  {
    label: "Overview",
    path: "/doctor/overview",
    icon: <Stethoscope size={18} />,
  },
  {
    label: "Availability",
    path: "/doctor/availability",
    icon: <CalendarDays size={18} />,
  },
  {
    label: "Appointments",
    path: "/doctor/appointments",
    icon: <CalendarDays size={18} />,
  },
  {
    label: "Settings",
    path: "/doctor/settings",
    icon: <Settings size={18} />,
  },
];

function Doctor() {
  const { userRole } = useAuth();

  return (
    <DashboardLayout navItems={DOCTOR_NAV}>
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
          <p className="text-text-secondary">Placeholder page for Doctors.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Doctor;
