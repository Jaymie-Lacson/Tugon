import type { RequestHandler } from "express";
import { env, shouldAllowBearerAuth } from "../config/env.js";
import { authService } from "../modules/auth/auth.service.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        role: "CITIZEN" | "OFFICIAL" | "SUPER_ADMIN";
        phoneNumber: string;
      };
      authToken?: string;
    }
  }
}

function extractBearerToken(authHeader: string | undefined) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return "";
  }

  return authHeader.slice(7).trim();
}

function extractCookieToken(req: Express.Request) {
  const cookieValue = (req as { cookies?: Record<string, unknown> }).cookies?.[env.authCookieName];
  return typeof cookieValue === "string" ? cookieValue.trim() : "";
}

export const authenticate: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const bearerToken = extractBearerToken(authHeader);
  const cookieToken = extractCookieToken(req);

  if (cookieToken && bearerToken) {
    return res.status(400).json({ message: "Provide either cookie session or bearer authorization, not both." });
  }

  if (bearerToken && !shouldAllowBearerAuth()) {
    return res.status(401).json({ message: "Bearer authorization is disabled for this deployment." });
  }

  const token = cookieToken || bearerToken;

  if (!token) {
    return res.status(401).json({ message: "Missing authentication token." });
  }

  try {
    const payload = authService.verifyToken(token);

    if (await authService.isTokenRevoked(token, payload)) {
      return res.status(401).json({ message: "Token is no longer valid." });
    }

    req.authUser = {
      id: payload.sub,
      role: payload.role,
      phoneNumber: payload.phoneNumber,
    };
    req.authToken = token;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};
