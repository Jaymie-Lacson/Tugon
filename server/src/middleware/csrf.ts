import { randomBytes } from "node:crypto";
import type { CookieOptions, Request, RequestHandler } from "express";
import { env } from "../config/env.js";

function shouldUseSecureCookie() {
  if (env.authCookieSecureMode === "always") {
    return true;
  }

  if (env.authCookieSecureMode === "never") {
    return false;
  }

  return env.nodeEnv === "production";
}

function csrfCookieOptions(): CookieOptions {
  return {
    httpOnly: false,
    sameSite: env.authCookieSameSite,
    secure: shouldUseSecureCookie(),
    path: "/",
    maxAge: env.authCookieMaxAgeSeconds * 1000,
  };
}

function readCookie(req: Request, name: string) {
  const value = (req as { cookies?: Record<string, unknown> }).cookies?.[name];
  return typeof value === "string" ? value.trim() : "";
}

function normalizeHeaderValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function ensureCsrfCookie(req: Request, res: Parameters<RequestHandler>[1]) {
  const existing = readCookie(req, env.csrfCookieName);
  if (existing) {
    return existing;
  }

  const generated = randomBytes(24).toString("hex");
  res.cookie(env.csrfCookieName, generated, csrfCookieOptions());
  return generated;
}

function hasBearerAuthorization(req: Request) {
  const header = normalizeHeaderValue(req.headers.authorization);
  return header.startsWith("Bearer ");
}

function requiresCsrfValidation(req: Request) {
  if (hasBearerAuthorization(req)) {
    return false;
  }

  const authCookie = readCookie(req, env.authCookieName);
  return authCookie.length > 0;
}

export const csrfProtectStateChangingRequests: RequestHandler = (req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method.toUpperCase())) {
    return next();
  }

  if (!requiresCsrfValidation(req)) {
    return next();
  }

  const cookieToken = readCookie(req, env.csrfCookieName);
  const headerToken = normalizeHeaderValue(req.headers[env.csrfHeaderName]);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ message: "CSRF validation failed." });
  }

  return next();
};
