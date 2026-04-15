import { lazy } from "react";

const Login = lazy(() => import("../pages/Login"));
const Register = lazy(() => import("../pages/Register"));
const ForgotPassword = lazy(() => import("../pages/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/ResetPassword"));
const Admin = lazy(() => import("../pages/Admin"));
const NotFound = lazy(() => import("../pages/NotFound"));
const User = lazy(() => import("../pages/Mother"));
const Doctor = lazy(() => import("../pages/Doctor"));
const PatientBookingPage = lazy(
  () => import("../pages/patient/PatientBookingPage"),
);

export const appRoutes = [
  {
    path: "/",
    component: Login,
    requiresAuth: false,
    publicOnly: true,
    hideChrome: true,
  },
  {
    path: "/login",
    component: Login,
    requiresAuth: false,
    publicOnly: true,
    hideChrome: true,
  },
  {
    path: "/register",
    component: Register,
    requiresAuth: false,
    publicOnly: true,
    hideChrome: true,
  },
  {
    path: "/forgot-password",
    component: ForgotPassword,
    requiresAuth: false,
    publicOnly: true,
    hideChrome: true,
  },
  {
    path: "/reset-password",
    component: ResetPassword,
    requiresAuth: false,
    publicOnly: true,
    hideChrome: true,
  },
  {
    path: "/admin/overview",
    component: Admin,
    requiresAuth: true,
    allowedRoles: ["admin"],
    hideChrome: true,
  },
  {
    path: "/admin/users",
    component: Admin,
    requiresAuth: true,
    allowedRoles: ["admin"],
    hideChrome: true,
  },
  {
    path: "/admin/doctors",
    component: Admin,
    requiresAuth: true,
    allowedRoles: ["admin"],
    hideChrome: true,
  },
  {
    path: "/admin/analytics",
    component: Admin,
    requiresAuth: true,
    allowedRoles: ["admin"],
    hideChrome: true,
  },
  {
    path: "/admin/settings",
    component: Admin,
    requiresAuth: true,
    allowedRoles: ["admin"],
    hideChrome: true,
  },
  {
    path: "/doctor/overview",
    component: Doctor,
    requiresAuth: true,
    allowedRoles: ["doctor"],
    hideChrome: true,
  },
  {
    path: "/doctor/availability",
    component: Doctor,
    requiresAuth: true,
    allowedRoles: ["doctor"],
    hideChrome: true,
  },
  {
    path: "/doctor/appointments",
    component: Doctor,
    requiresAuth: true,
    allowedRoles: ["doctor"],
    hideChrome: true,
  },
  {
    path: "/doctor/settings",
    component: Doctor,
    requiresAuth: true,
    allowedRoles: ["doctor"],
    hideChrome: true,
  },
  {
    path: "/patient/overview",
    component: User,
    requiresAuth: true,
    allowedRoles: ["patient"],
    hideChrome: true,
  },
  {
    path: "/patient/appointments",
    component: User,
    requiresAuth: true,
    allowedRoles: ["patient"],
    hideChrome: true,
  },
  {
    path: "/patient/prescriptions",
    component: User,
    requiresAuth: true,
    allowedRoles: ["patient"],
    hideChrome: true,
  },
  {
    path: "/patient/payments",
    component: User,
    requiresAuth: true,
    allowedRoles: ["patient"],
    hideChrome: true,
  },
  {
    path: "/patient/settings",
    component: User,
    requiresAuth: true,
    allowedRoles: ["patient"],
    hideChrome: true,
  },
  {
    path: "/patient/doctors/:doctorId",
    component: PatientBookingPage,
    requiresAuth: true,
    allowedRoles: ["patient"],
    hideChrome: true,
  },
  {
    path: "*",
    component: NotFound,
    requiresAuth: false,
  },
];
