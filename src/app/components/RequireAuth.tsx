import React from "react";
import { Navigate } from "react-router";
import type { Role } from "../services/authApi";
import { getAuthSession, hasRequiredRole } from "../utils/authSession";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = getAuthSession();
  if (!session?.token) {
    return <Navigate to="/auth/login" replace />;
  }
  return <>{children}</>;
}

export function RequireRole({
  children,
  roles,
  fallbackPath,
}: {
  children: React.ReactNode;
  roles: Role[];
  fallbackPath: string;
}) {
  const session = getAuthSession();
  if (!session?.token) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!hasRequiredRole(roles)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
