import type { RequestHandler } from "express";
import { authService } from "../modules/auth/auth.service.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        role: "CITIZEN" | "OFFICIAL" | "SUPER_ADMIN";
        phoneNumber: string;
      };
    }
  }
}

export const authenticate: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing bearer token." });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ message: "Missing bearer token." });
  }

  if (authService.isTokenRevoked(token)) {
    return res.status(401).json({ message: "Token is no longer valid." });
  }

  try {
    const payload = authService.verifyToken(token);
    req.authUser = {
      id: payload.sub,
      role: payload.role,
      phoneNumber: payload.phoneNumber,
    };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};
