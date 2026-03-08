import { Router } from "express";
import { adminService } from "./admin.service.js";

export const adminRouter = Router();

adminRouter.post("/users", async (req, res) => {
  try {
    const payload = await adminService.createUser({
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
    const payload = await adminService.updateBarangayBoundary(
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
