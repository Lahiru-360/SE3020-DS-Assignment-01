import axios from "axios";

const axiosInstance = axios.create({
  // Set VITE_API_BASE_URL=http://localhost:5000/api in your .env file.
  // The fallback targets the API Gateway running locally.
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:30500/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT to every request
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("hc_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — clear tokens and redirect to login.
// Skip auth endpoints so their errors are handled locally by each page.
const AUTH_ENDPOINTS = [
  "/auth/login",
  "/auth/register/patient",
  "/auth/register/doctor",
  "/auth/forgot-password",
  "/auth/reset-password",
];

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? "";
    const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => url.includes(path));

    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem("hc_token");
      localStorage.removeItem("hc_refresh_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
