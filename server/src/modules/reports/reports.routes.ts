import { Router } from "express";
import { prisma } from "../../config/prisma.js";
import { reportsService } from "./reports.service.js";

export const citizenReportsRouter = Router();

citizenReportsRouter.post("/reports", async (req, res) => {
  try {
    const authUser = req.authUser;
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const citizenUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        fullName: true,
      },
    });
    if (!citizenUser) {
      return res.status(401).json({ message: "Authenticated user not found." });
    }

    const result = await reportsService.create(
      { id: citizenUser.id, fullName: citizenUser.fullName },
      {
        type: req.body?.type,
        barangay: req.body?.barangay,
        district: req.body?.district,
        location: req.body?.location,
        description: req.body?.description,
        severity: req.body?.severity,
        affectedCount: req.body?.affectedCount ?? null,
        photoCount: req.body?.photoCount ?? 0,
        hasAudio: Boolean(req.body?.hasAudio),
      },
    );

    res.status(201).json(result);
  } catch (error) {
    const parsed = reportsService.parseError(error);
    res.status(parsed.status).json({ message: parsed.message });
  }
});

citizenReportsRouter.get("/reports", async (req, res) => {
  try {
    const authUser = req.authUser;
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const reports = await reportsService.listMine(authUser.id);
    res.status(200).json({ reports });
  } catch (error) {
    const parsed = reportsService.parseError(error);
    res.status(parsed.status).json({ message: parsed.message });
  }
});

citizenReportsRouter.get("/reports/:reportId", async (req, res) => {
  try {
    const authUser = req.authUser;
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const report = await reportsService.getMineById(authUser.id, req.params.reportId);
    res.status(200).json({ report });
  } catch (error) {
    const parsed = reportsService.parseError(error);
    res.status(parsed.status).json({ message: parsed.message });
  }
});
