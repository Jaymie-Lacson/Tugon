import React from "react";
import { Navigate } from "react-router";
import type { Role } from "../services/authApi";
import { getAuthSession } from "../utils/authSession";
import { resolveRoleGuardRedirect } from "../utils/navigationGuards";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = getAuthSession();
  const redirectPath = resolveRoleGuardRedirect(session, ["CITIZEN", "OFFICIAL", "SUPER_ADMIN"], "/auth/login");

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
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
  const redirectPath = resolveRoleGuardRedirect(session, roles, fallbackPath);
  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}
