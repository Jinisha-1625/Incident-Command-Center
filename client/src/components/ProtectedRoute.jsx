import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-slate-400">
        Restoring session…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
