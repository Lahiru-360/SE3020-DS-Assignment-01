import { useLocation } from "react-router-dom";
import {
  HeartPulse,
  CalendarDays,
  Settings,
  Wallet,
  ClipboardList,
} from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import PatientOverview from "./patient/PatientOverview";
import PatientAppointments from "./patient/PatientAppointments";
import PatientPrescriptions from "./patient/PatientPrescriptions";
import PatientPayments from "./patient/PatientPayments";
import PatientSettings from "./patient/PatientSettings";

// ── Navigation items ───────────────────────────────────────────────────────

const PATIENT_NAV = [
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
    label: "Prescriptions",
    path: "/patient/prescriptions",
    icon: <ClipboardList size={18} />,
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

// ── Route → section map ────────────────────────────────────────────────────

const SECTION_MAP = {
  "/patient/overview": PatientOverview,
  "/patient/appointments": PatientAppointments,
  "/patient/prescriptions": PatientPrescriptions,
  "/patient/payments": PatientPayments,
  "/patient/settings": PatientSettings,
};

// ── Shell ──────────────────────────────────────────────────────────────────

function Patient() {
  const { pathname } = useLocation();
  const Section = SECTION_MAP[pathname] ?? PatientOverview;

  return (
    <DashboardLayout navItems={PATIENT_NAV}>
      <Section />
    </DashboardLayout>
  );
}

export default Patient;
