import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createIpRateLimiter } from "./middleware/rateLimit.js";
import { apiRouter } from "./routes/index.js";

function parseAllowedOriginsFromEnv(rawValue: string | undefined) {
  return new Set(
    (rawValue ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  );
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
  const corsAllowedOrigins = parseAllowedOriginsFromEnv(process.env.CORS_ALLOWED_ORIGINS);
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
    const requestOrigin = req.headers.origin;

    // Requests without Origin (CLI tools, server-to-server, tests) should still work.
    if (!requestOrigin) {
      return next();
    }

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
        callback(null, corsAllowedOrigins.has(origin));
      },
      methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );
  app.use(helmet());
  app.use(express.json({ limit: "25mb" }));

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
