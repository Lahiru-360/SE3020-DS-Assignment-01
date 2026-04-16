import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  BarChart3,
  Settings,
} from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import AdminOverview from "./admin/AdminOverview";
import AdminUsers from "./admin/AdminUsers";
import AdminDoctors from "./admin/AdminDoctors";
import AdminAnalytics from "./admin/AdminAnalytics";
import AdminSettings from "./admin/AdminSettings";

// ── Navigation items ───────────────────────────────────────────────────────

const ADMIN_NAV = [
  {
    label: "Overview",
    path: "/admin/overview",
    icon: <LayoutDashboard size={18} />,
  },
  {
    label: "Users",
    path: "/admin/users",
    icon: <Users size={18} />,
  },
  {
    label: "Doctors",
    path: "/admin/doctors",
    icon: <Stethoscope size={18} />,
  },
  {
    label: "Analytics",
    path: "/admin/analytics",
    icon: <BarChart3 size={18} />,
  },
  {
    label: "Settings",
    path: "/admin/settings",
    icon: <Settings size={18} />,
  },
];

// ── Route → section map ────────────────────────────────────────────────────

const SECTION_MAP = {
  "/admin/overview": AdminOverview,
  "/admin/users": AdminUsers,
  "/admin/doctors": AdminDoctors,
  "/admin/analytics": AdminAnalytics,
  "/admin/settings": AdminSettings,
};

// ── Shell ──────────────────────────────────────────────────────────────────

function Admin() {
  const { pathname } = useLocation();
  const Section = SECTION_MAP[pathname] ?? AdminOverview;

  return (
    <DashboardLayout navItems={ADMIN_NAV}>
      <Section />
    </DashboardLayout>
  );
}

export default Admin;
