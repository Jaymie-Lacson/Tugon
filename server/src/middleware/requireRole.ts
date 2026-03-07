import type { RequestHandler } from "express";
import type { Role } from "../modules/auth/types.js";

export function requireRole(allowedRoles: Role[]) {
  const middleware: RequestHandler = (req, res, next) => {
    const userRole = req.authUser?.role;
    if (!userRole) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Forbidden for this role." });
    }

    next();
  };

  return middleware;
}
