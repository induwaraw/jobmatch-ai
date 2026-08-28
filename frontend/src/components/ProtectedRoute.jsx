import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import Container from "./ui/Container";

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Container className="py-24">
        <p className="inline-flex items-center gap-2.5 text-muted">
          <Loader2 size={17} strokeWidth={2} className="animate-spin" aria-hidden="true" />
          Checking your session...
        </p>
      </Container>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
