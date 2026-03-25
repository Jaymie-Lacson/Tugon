import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createIpRateLimiter } from "./middleware/rateLimit.js";
import { csrfProtectStateChangingRequests } from "./middleware/csrf.js";
import { apiRouter } from "./routes/index.js";

function parseAllowedOriginsFromEnv(rawValue: string | undefined) {
  return new Set(
    (rawValue ?? "")
      .split(",")
      .map((origin) => origin.trim().replace(/\/+$/, ""))
      .filter((origin) => origin.length > 0),
  );
}

function normalizeRequestOrigin(origin: string) {
  return origin.trim().replace(/\/+$/, "");
}

function resolveCorsAllowedOrigins(rawValue: string | undefined, nodeEnv: string | undefined) {
  const parsedOrigins = parseAllowedOriginsFromEnv(rawValue);

  if (parsedOrigins.has("*")) {
    throw new Error(
      "Invalid CORS_ALLOWED_ORIGINS: wildcard '*' is not allowed when credentials are enabled. Use exact origins.",
    );
  }

  if (parsedOrigins.size === 0 && nodeEnv !== "production") {
    parsedOrigins.add("http://localhost:5173");
    parsedOrigins.add("http://127.0.0.1:5173");
  }

  return parsedOrigins;
}

function parsePositiveInteger(rawValue: string | undefined, fallback: number) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

export function createApp() {
  const app = express();
  const corsAllowedOrigins = resolveCorsAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS, process.env.NODE_ENV);
  const authRateLimitWindowMs = parsePositiveInteger(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 60_000);
  const authRateLimitMaxRequests = parsePositiveInteger(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 30);
  const reportSubmitRateLimitWindowMs = parsePositiveInteger(
    process.env.REPORT_SUBMIT_RATE_LIMIT_WINDOW_MS,
    60_000,
  );
  const reportSubmitRateLimitMaxRequests = parsePositiveInteger(
    process.env.REPORT_SUBMIT_RATE_LIMIT_MAX_REQUESTS,
    10,
  );
  const defaultJsonBodyLimit = process.env.JSON_BODY_LIMIT_DEFAULT ?? "2mb";
  const reportSubmitJsonBodyLimit = process.env.JSON_BODY_LIMIT_REPORT_SUBMIT ?? "25mb";
  const verificationSubmitJsonBodyLimit = process.env.JSON_BODY_LIMIT_VERIFICATION_SUBMIT ?? "10mb";

  const defaultJsonParser = express.json({ limit: defaultJsonBodyLimit });
  const reportSubmitJsonParser = express.json({ limit: reportSubmitJsonBodyLimit });
  const verificationSubmitJsonParser = express.json({ limit: verificationSubmitJsonBodyLimit });

  const authRateLimiter = createIpRateLimiter({
    windowMs: authRateLimitWindowMs,
    maxRequests: authRateLimitMaxRequests,
    message: "Too many authentication requests. Please try again later.",
  });

  const reportSubmitRateLimiter = createIpRateLimiter({
    windowMs: reportSubmitRateLimitWindowMs,
    maxRequests: reportSubmitRateLimitMaxRequests,
    message: "Too many report submissions. Please try again later.",
  });

  app.use((req, res, next) => {
    const requestOriginHeader = req.headers.origin;

    // Requests without Origin (CLI tools, server-to-server, tests) should still work.
    if (!requestOriginHeader) {
      return next();
    }

    const requestOrigin = normalizeRequestOrigin(requestOriginHeader);

    if (corsAllowedOrigins.has(requestOrigin)) {
      return next();
    }

    return res.status(403).json({ message: "Origin not allowed by CORS policy." });
  });

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }
        callback(null, corsAllowedOrigins.has(normalizeRequestOrigin(origin)));
      },
      methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
      credentials: true,
    }),
  );
  app.use(helmet());
  app.use(cookieParser());

  app.use((req, res, next) => {
    if (req.method === "POST" && req.path === "/api/citizen/reports") {
      return reportSubmitJsonParser(req, res, next);
    }

    if (req.method === "POST" && req.path === "/api/citizen/verification-id") {
      return verificationSubmitJsonParser(req, res, next);
    }

    return defaultJsonParser(req, res, next);
  });

  app.use(csrfProtectStateChangingRequests);

  app.use("/api/auth", authRateLimiter);
  app.use("/api/citizen/reports", (req, res, next) => {
    if (req.method !== "POST") {
      return next();
    }
    return reportSubmitRateLimiter(req, res, next);
  });

  app.get("/", (_req, res) => {
    res.status(200).json({
      message: "TUGON server is running.",
    });
  });

  app.use("/api", apiRouter);

  return app;
}
