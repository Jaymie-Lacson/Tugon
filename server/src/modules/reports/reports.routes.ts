import { Router } from "express";
import { prisma } from "../../config/prisma.js";
import { reportsService } from "./reports.service.js";

export const citizenReportsRouter = Router();
export const officialReportsRouter = Router();

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
        citizenProfile: {
          select: {
            barangay: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });
    if (!citizenUser) {
      return res.status(401).json({ message: "Authenticated user not found." });
    }

    const citizenBarangayCode = citizenUser.citizenProfile?.barangay?.code;
    if (!citizenBarangayCode) {
      return res.status(403).json({ message: "Citizen barangay profile is required to submit reports." });
    }

    const result = await reportsService.create(
      { id: citizenUser.id, fullName: citizenUser.fullName, barangayCode: citizenBarangayCode },
      {
        type: req.body?.type,
        latitude: Number(req.body?.latitude),
        longitude: Number(req.body?.longitude),
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

officialReportsRouter.get("/reports", async (req, res) => {
  try {
    const authUser = req.authUser;
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        role: true,
        officialProfile: {
          select: {
            barangay: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ message: "Authenticated user not found." });
    }

    const reports = await reportsService.listForOfficial({
      role: user.role,
      barangayCode: user.officialProfile?.barangay?.code ?? null,
    });

    return res.status(200).json({ reports });
  } catch (error) {
    const parsed = reportsService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

officialReportsRouter.get("/reports/:reportId", async (req, res) => {
  try {
    const authUser = req.authUser;
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        role: true,
        officialProfile: {
          select: {
            barangay: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ message: "Authenticated user not found." });
    }

    const report = await reportsService.getForOfficialById(
      {
        role: user.role,
        barangayCode: user.officialProfile?.barangay?.code ?? null,
      },
      req.params.reportId,
    );

    return res.status(200).json({ report });
  } catch (error) {
    const parsed = reportsService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

officialReportsRouter.patch("/reports/:reportId/status", async (req, res) => {
  try {
    const authUser = req.authUser;
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        role: true,
        fullName: true,
        officialProfile: {
          select: {
            barangay: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ message: "Authenticated user not found." });
    }

    const report = await reportsService.updateStatus(
      {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        barangayCode: user.officialProfile?.barangay?.code ?? null,
      },
      req.params.reportId,
      {
        status: req.body?.status,
        note: req.body?.note,
      },
    );

    return res.status(200).json({ message: "Report status updated.", report });
  } catch (error) {
    const parsed = reportsService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});
