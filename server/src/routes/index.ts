import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { citizenReportsRouter, officialReportsRouter } from "../modules/reports/reports.routes.js";
import { adminRouter } from "../modules/admin/admin.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "tugon-server",
    timestamp: new Date().toISOString(),
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
  "/official",
  authenticate,
  requireRole(["OFFICIAL", "SUPER_ADMIN"]),
  officialReportsRouter,
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
