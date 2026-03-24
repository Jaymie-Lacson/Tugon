import { Router } from "express";
import { adminService } from "./admin.service.js";

export const adminRouter = Router();

adminRouter.post("/users", async (req, res) => {
  try {
    const actorUserId = req.authUser?.id;
    if (!actorUserId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const payload = await adminService.createUser({
      actorUserId,
      fullName: req.body?.fullName,
      phoneNumber: req.body?.phoneNumber,
      password: req.body?.password,
      role: req.body?.role,
      barangayCode: req.body?.barangayCode,
      isPhoneVerified: req.body?.isPhoneVerified,
    });
    return res.status(201).json(payload);
  } catch (error) {
    const parsed = adminService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

adminRouter.get("/users", async (req, res) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const role = typeof req.query.role === "string" ? req.query.role : undefined;

    const payload = await adminService.listUsers({
      search,
      role,
    });
    return res.status(200).json(payload);
  } catch (error) {
    const parsed = adminService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

adminRouter.get("/notifications", async (req, res) => {
  try {
    const payload = await adminService.listNotifications({
      recipientUserId: req.authUser?.id,
      limit: typeof req.query.limit === "string" ? Number(req.query.limit) : undefined,
    });
    return res.status(200).json(payload);
  } catch (error) {
    const parsed = adminService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

adminRouter.patch("/notifications/read-all", async (req, res) => {
  try {
    const payload = await adminService.markAllNotificationsRead({
      recipientUserId: req.authUser?.id,
    });
    return res.status(200).json(payload);
  } catch (error) {
    const parsed = adminService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

adminRouter.patch("/notifications/:notificationId/read", async (req, res) => {
  try {
    const payload = await adminService.markNotificationRead({
      recipientUserId: req.authUser?.id,
      notificationId: req.params.notificationId,
    });
    return res.status(200).json(payload);
  } catch (error) {
    const parsed = adminService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

adminRouter.get("/audit-logs", async (req, res) => {
  try {
    const action = typeof req.query.action === "string" ? req.query.action : undefined;
    const targetType = typeof req.query.targetType === "string" ? req.query.targetType : undefined;
    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
    const offset = typeof req.query.offset === "string" ? Number(req.query.offset) : undefined;
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === "string" ? req.query.toDate : undefined;

    const payload = await adminService.listAuditLogs({
      action,
      targetType,
      limit,
      offset,
      fromDate,
      toDate,
    });
    return res.status(200).json(payload);
  } catch (error) {
    const parsed = adminService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

adminRouter.get("/audit-logs/export", async (req, res) => {
  try {
    const action = typeof req.query.action === "string" ? req.query.action : undefined;
    const targetType = typeof req.query.targetType === "string" ? req.query.targetType : undefined;
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === "string" ? req.query.toDate : undefined;

    const payload = await adminService.exportAuditLogs({
      action,
      targetType,
      fromDate,
      toDate,
    });
    return res.status(200).json(payload);
  } catch (error) {
    const parsed = adminService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

adminRouter.patch("/users/:userId/role", async (req, res) => {
  try {
    const actorUserId = req.authUser?.id;
    if (!actorUserId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const payload = await adminService.updateUserRole(actorUserId, req.params.userId, {
      role: req.body?.role,
      barangayCode: req.body?.barangayCode,
      isPhoneVerified: req.body?.isPhoneVerified,
    });

    return res.status(200).json(payload);
  } catch (error) {
    const parsed = adminService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

adminRouter.get("/barangays", async (_req, res) => {
  try {
    const payload = await adminService.listBarangays();
    return res.status(200).json(payload);
  } catch (error) {
    const parsed = adminService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

adminRouter.patch("/barangays/:barangayCode/boundary", async (req, res) => {
  try {
    const actorUserId = req.authUser?.id;
    if (!actorUserId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const payload = await adminService.updateBarangayBoundary(
      actorUserId,
      req.params.barangayCode,
      req.body?.boundaryGeojson,
    );
    return res.status(200).json(payload);
  } catch (error) {
    const parsed = adminService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

adminRouter.get("/analytics/summary", async (_req, res) => {
  try {
    const payload = await adminService.getAnalyticsSummary();
    return res.status(200).json(payload);
  } catch (error) {
    const parsed = adminService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});
