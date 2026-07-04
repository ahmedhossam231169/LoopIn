import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import type { ReactNode } from "react";

// زي ProtectedRoute بس بيتأكد كمان إن نوع الحساب Recruiter
export function RecruiterRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="font-mono text-sm text-mist-400">Loading session...</p>
      </main>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "RECRUITER") return <Navigate to="/feed" replace />;
  return <>{children}</>;
}
