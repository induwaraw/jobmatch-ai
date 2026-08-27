import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import Container from "./ui/Container";

/**
 * Gate for the signed in screens. While the stored token is being checked we
 * hold the layout rather than flashing the login page at someone who is in
 * fact signed in.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Container className="py-20">
        <p className="text-muted">Checking your session...</p>
      </Container>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
