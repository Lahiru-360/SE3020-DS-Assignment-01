import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function PublicOnlyRoute({ children }) {
  const { isAuthenticated, userRole } = useAuth();

  if (!isAuthenticated) return children;

  switch (userRole) {
    case "admin":
      return <Navigate to="/admin/overview" replace />;
    case "doctor":
      return <Navigate to="/doctor/overview" replace />;
    case "patient":
      return <Navigate to="/patient/overview" replace />;
    default:
      return children;
  }
}
