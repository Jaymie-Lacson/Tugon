import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { citizenReportsRouter, officialReportsRouter } from "../modules/reports/reports.routes.js";
import { adminRouter } from "../modules/admin/admin.routes.js";
import { citizenVerificationRouter, officialVerificationRouter } from "../modules/verification/verification.routes.js";
import { getIpRateLimiterDiagnostics } from "../middleware/rateLimit.js";
import { getImageKitReadiness } from "../modules/storage/imagekit.service.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  const storage = getImageKitReadiness();

  res.status(200).json({
    ok: true,
    service: "tugon-server",
    timestamp: new Date().toISOString(),
    reliability: {
      ipRateLimiter: getIpRateLimiterDiagnostics(),
    },
    storage,
  });
});

apiRouter.get("/health/storage", (_req, res) => {
  const storage = getImageKitReadiness();
  const statusCode = storage.configured ? 200 : 503;

  res.status(statusCode).json({
    ok: storage.configured,
    storage,
  });
});

apiRouter.use("/auth", authRouter);

apiRouter.use(
  "/citizen",
  authenticate,
  requireRole(["CITIZEN"]),
  citizenReportsRouter,
);

apiRouter.use(
  "/citizen",
  authenticate,
  requireRole(["CITIZEN"]),
  citizenVerificationRouter,
);

apiRouter.use(
  "/official",
  authenticate,
  requireRole(["OFFICIAL", "SUPER_ADMIN"]),
  officialReportsRouter,
);

apiRouter.use(
  "/official",
  authenticate,
  requireRole(["OFFICIAL"]),
  officialVerificationRouter,
);

apiRouter.use(
  "/admin",
  authenticate,
  requireRole(["SUPER_ADMIN"]),
  adminRouter,
);

apiRouter.get(
  "/official/ping",
  authenticate,
  requireRole(["OFFICIAL", "SUPER_ADMIN"]),
  (_req, res) => {
    res.status(200).json({ ok: true, message: "Official access confirmed." });
  },
);
