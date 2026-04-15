import { useLocation } from "react-router-dom";
import {
  Stethoscope,
  CalendarDays,
  ClipboardList,
  Settings,
} from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import DoctorOverview from "./doctor/DoctorOverview";
import DoctorAvailability from "./doctor/DoctorAvailability";
import DoctorAppointments from "./doctor/DoctorAppointments";
import DoctorSettings from "./doctor/DoctorSettings";

// ── Navigation items ───────────────────────────────────────────────────────

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
    icon: <ClipboardList size={18} />,
  },
  {
    label: "Settings",
    path: "/doctor/settings",
    icon: <Settings size={18} />,
  },
];

// ── Route → section map ────────────────────────────────────────────────────

const SECTION_MAP = {
  "/doctor/overview": DoctorOverview,
  "/doctor/availability": DoctorAvailability,
  "/doctor/appointments": DoctorAppointments,
  "/doctor/settings": DoctorSettings,
};

// ── Shell ──────────────────────────────────────────────────────────────────

function Doctor() {
  const { pathname } = useLocation();
  const Section = SECTION_MAP[pathname] ?? DoctorOverview;

  return (
    <DashboardLayout navItems={DOCTOR_NAV}>
      <Section />
    </DashboardLayout>
  );
}

export default Doctor;
