import { useState } from "react";
import axiosInstance from "../api/axiosInstance";
import { AuthContext } from "./authContextStore";

function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const stored = localStorage.getItem("hc_token");
    if (!stored) return null;
    const payload = decodeToken(stored);
    if (!payload) {
      localStorage.removeItem("hc_token");
      return null;
    }
    return stored;
  });

  const [userRole, setUserRole] = useState(() => {
    const stored = localStorage.getItem("hc_token");
    if (!stored) return null;
    return decodeToken(stored)?.role ?? null;
  });

  const [userEmail, setUserEmail] = useState(() => {
    const stored = localStorage.getItem("hc_token");
    if (!stored) return null;
    return decodeToken(stored)?.email ?? null;
  });

  const [userId, setUserId] = useState(() => {
    const stored = localStorage.getItem("hc_token");
    if (!stored) return null;
    return decodeToken(stored)?.userId ?? null;
  });

  const loading = false;

  const login = async (email, password) => {
    const response = await axiosInstance.post("/auth/login", { email, password });

    const { accessToken, refreshToken } = response.data.data;

    localStorage.setItem("hc_token", accessToken);
    localStorage.setItem("hc_refresh_token", refreshToken);
    setToken(accessToken);

    const payload = decodeToken(accessToken);
    const role = payload?.role ?? null;

    setUserRole(role);
    setUserEmail(payload?.email ?? null);
    setUserId(payload?.userId ?? null);

    return { role };
  };

  const logout = () => {
    localStorage.removeItem("hc_token");
    localStorage.removeItem("hc_refresh_token");
    setToken(null);
    setUserRole(null);
    setUserEmail(null);
    setUserId(null);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, userRole, userEmail, userId, token, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
