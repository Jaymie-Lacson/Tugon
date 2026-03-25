import { Router, type Request, type Response } from "express";
import multer from "multer";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { reportsService } from "./reports.service.js";
import { geofencingService } from "../map/geofencing.service.js";

export const citizenReportsRouter = Router();
export const officialReportsRouter = Router();

const citizenReportUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 3,
    // Multer has a single per-file cap. Use the larger configured limit here,
    // then enforce kind-specific size limits in evidenceStorageService.
    fileSize: Math.max(env.evidenceMaxPhotoBytes, env.evidenceMaxAudioBytes),
  },
}).fields([
  { name: "photos", maxCount: 2 },
  { name: "audio", maxCount: 1 },
]);

function runCitizenReportUpload(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    citizenReportUpload(req, res, (error?: unknown) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function parseCitizenReportUploadError(error: unknown): { status: number; message: string } | null {
  if (!(error instanceof multer.MulterError)) {
    return null;
  }

  if (error.code === "LIMIT_FILE_SIZE") {
    return {
      status: 400,
      message: "Evidence file exceeds maximum allowed size.",
    };
  }

  if (error.code === "LIMIT_FILE_COUNT") {
    return {
      status: 400,
      message: "Too many evidence files attached. You can upload up to 2 photos and 1 audio file.",
    };
  }

  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    return {
      status: 400,
      message: "Unexpected evidence file field. Use only photos and audio fields.",
    };
  }

  return {
    status: 400,
    message: "Invalid evidence upload payload.",
  };
}

function isMultipartReportRequest(req: Request) {
  return req.is("multipart/form-data") === "multipart/form-data";
}

function normalizeBooleanInput(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }

  return Boolean(value);
}

function mapReportBody(req: Request) {
  if (!isMultipartReportRequest(req)) {
    return {
      category: req.body?.category,
      subcategory: req.body?.subcategory,
      requiresMediation: normalizeBooleanInput(req.body?.requiresMediation),
      mediationWarning:
        typeof req.body?.mediationWarning === "string" ? req.body.mediationWarning : null,
      latitude: Number(req.body?.latitude),
      longitude: Number(req.body?.longitude),
      location: req.body?.location,
      description: req.body?.description,
      severity: req.body?.severity,
      affectedCount: req.body?.affectedCount ?? null,
      photoCount: req.body?.photoCount ?? 0,
      hasAudio: normalizeBooleanInput(req.body?.hasAudio),
      photos: Array.isArray(req.body?.photos)
        ? req.body.photos
            .filter((item: unknown) => Boolean(item && typeof item === "object"))
            .map((item: { fileName?: unknown; mimeType?: unknown; dataUrl?: unknown }) => ({
              fileName: typeof item.fileName === "string" ? item.fileName : undefined,
              mimeType: typeof item.mimeType === "string" ? item.mimeType : undefined,
              dataUrl: typeof item.dataUrl === "string" ? item.dataUrl : "",
            }))
        : [],
      audio:
        req.body?.audio && typeof req.body.audio === "object"
          ? {
              fileName:
                typeof req.body.audio.fileName === "string" ? req.body.audio.fileName : undefined,
              mimeType:
                typeof req.body.audio.mimeType === "string" ? req.body.audio.mimeType : undefined,
              dataUrl: typeof req.body.audio.dataUrl === "string" ? req.body.audio.dataUrl : "",
            }
          : null,
    };
  }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const photoFiles = files?.photos ?? [];
  const audioFiles = files?.audio ?? [];
  const audioFile = audioFiles[0];

  return {
    category: req.body?.category,
    subcategory: req.body?.subcategory,
    requiresMediation: normalizeBooleanInput(req.body?.requiresMediation),
    mediationWarning: typeof req.body?.mediationWarning === "string" ? req.body.mediationWarning : null,
    latitude: Number(req.body?.latitude),
    longitude: Number(req.body?.longitude),
    location: req.body?.location,
    description: req.body?.description,
    severity: req.body?.severity,
    affectedCount: req.body?.affectedCount ?? null,
    photoCount: Number(req.body?.photoCount ?? photoFiles.length ?? 0),
    hasAudio: normalizeBooleanInput(req.body?.hasAudio) || Boolean(audioFile),
    photos: photoFiles.map((file) => ({
      fileName: file.originalname,
      mimeType: file.mimetype,
      bytes: file.buffer,
    })),
    audio: audioFile
      ? {
          fileName: audioFile.originalname,
          mimeType: audioFile.mimetype,
          bytes: audioFile.buffer,
        }
      : null,
  };
}

citizenReportsRouter.post("/reports", async (req, res) => {
  try {
    await runCitizenReportUpload(req, res);

    const authUser = req.authUser;
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const citizenUser = await (prisma.user as any).findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        fullName: true,
        isVerified: true,
        isBanned: true,
        verificationStatus: true,
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
      {
        id: citizenUser.id,
        fullName: citizenUser.fullName,
        barangayCode: citizenBarangayCode,
        isVerified: (citizenUser as { isVerified?: boolean }).isVerified,
        isBanned: (citizenUser as { isBanned?: boolean }).isBanned,
        verificationStatus: (citizenUser as { verificationStatus?: "PENDING" | "APPROVED" | "REJECTED" | null }).verificationStatus ?? null,
      },
      mapReportBody(req),
    );

    res.status(201).json(result);
  } catch (error) {
    const uploadError = parseCitizenReportUploadError(error);
    if (uploadError) {
      return res.status(uploadError.status).json({ message: uploadError.message });
    }

    const parsed = reportsService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
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

citizenReportsRouter.get("/reports/geofence-check", async (req, res) => {
  try {
    const authUser = req.authUser;
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const latitude = Number(req.query?.latitude);
    const longitude = Number(req.query?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ message: "Valid latitude and longitude are required." });
    }

    const citizenUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
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

    const citizenBarangayCode = citizenUser?.citizenProfile?.barangay?.code;
    if (!citizenBarangayCode) {
      return res.status(403).json({ message: "Citizen barangay profile is required to submit reports." });
    }

    const routedBarangay = await geofencingService.resolveBarangayFromCoordinates(latitude, longitude);
    const isCrossBarangay = routedBarangay.code !== citizenBarangayCode;

    return res.status(200).json({
      isAllowed: true,
      isCrossBarangay,
      routedBarangayCode: routedBarangay.code,
      citizenBarangayCode,
      message: isCrossBarangay
        ? `Pinned location belongs to Barangay ${routedBarangay.code}. Your report will be accepted and classified as a cross-barangay incident.`
        : undefined,
    });
  } catch (error) {
    const parsed = geofencingService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

officialReportsRouter.get("/reports/geofence-debug", async (req, res) => {
  try {
    const authUser = req.authUser;
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    if (authUser.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Only super admins can access geofence diagnostics." });
    }

    const latitude = Number(req.query?.latitude);
    const longitude = Number(req.query?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ message: "Valid latitude and longitude are required." });
    }

    const diagnostics = await geofencingService.debugClassification(latitude, longitude);
    return res.status(200).json(diagnostics);
  } catch (error) {
    const parsed = geofencingService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
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

citizenReportsRouter.patch("/reports/:reportId/cancel", async (req, res) => {
  try {
    const authUser = req.authUser;
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const report = await reportsService.cancelMine(authUser.id, req.params.reportId);
    return res.status(200).json({ message: "Report cancelled successfully.", report });
  } catch (error) {
    const parsed = reportsService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
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

officialReportsRouter.post("/reports/templates/:templateId/generate", async (req, res) => {
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

    const generated = await reportsService.generateTemplateReport(
      {
        role: user.role,
        barangayCode: user.officialProfile?.barangay?.code ?? null,
      },
      req.params.templateId,
    );

    return res.status(200).json({
      message: "Report template generated.",
      templateId: generated.templateId,
      generatedAt: generated.generatedAt,
      fileName: generated.fileName,
      preview: generated.content.split("\n").slice(0, 6),
    });
  } catch (error) {
    const parsed = reportsService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

officialReportsRouter.get("/reports/templates/:templateId/export", async (req, res) => {
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

    const generated = await reportsService.generateTemplateReport(
      {
        role: user.role,
        barangayCode: user.officialProfile?.barangay?.code ?? null,
      },
      req.params.templateId,
    );

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${generated.fileName}"`);
    return res.status(200).send(generated.content);
  } catch (error) {
    const parsed = reportsService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

async function handleExportAllReports(req: Request, res: Response) {
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

    const exported = await reportsService.exportAllReportsCsv({
      role: user.role,
      barangayCode: user.officialProfile?.barangay?.code ?? null,
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${exported.fileName}"`);
    return res.status(200).send(exported.csv);
  } catch (error) {
    const parsed = reportsService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
}

officialReportsRouter.get("/reports/history/export", handleExportAllReports);

// Backward-compatible alias.
officialReportsRouter.get("/reports/export-all", handleExportAllReports);

officialReportsRouter.get("/reports/:reportId/export", async (req, res) => {
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

    const exported = await reportsService.exportSingleReportExcel(
      {
        role: user.role,
        barangayCode: user.officialProfile?.barangay?.code ?? null,
      },
      req.params.reportId,
    );

    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${exported.fileName}"`);
    return res.status(200).send(exported.content);
  } catch (error) {
    const parsed = reportsService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

officialReportsRouter.post("/reports/dss/actions", async (req, res) => {
  try {
    const authUser = req.authUser;
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
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

    const action = await reportsService.submitDssAction(
      {
        role: user.role,
        fullName: user.fullName,
        barangayCode: user.officialProfile?.barangay?.code ?? null,
      },
      {
        actionType: req.body?.actionType,
        recommendationTitle: req.body?.recommendationTitle,
        notes: req.body?.notes,
      },
    );

    return res.status(200).json({ message: "DSS action submitted.", action });
  } catch (error) {
    const parsed = reportsService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

officialReportsRouter.get("/reports/dss/recommendations", async (req, res) => {
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

    const result = await reportsService.getDssRecommendations({
      role: user.role,
      barangayCode: user.officialProfile?.barangay?.code ?? null,
    });

    return res.status(200).json(result);
  } catch (error) {
    const parsed = reportsService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

officialReportsRouter.get("/alerts", async (req, res) => {
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

    const alerts = await reportsService.listAlertsForOfficial({
      role: user.role,
      barangayCode: user.officialProfile?.barangay?.code ?? null,
    });

    return res.status(200).json({ alerts });
  } catch (error) {
    const parsed = reportsService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

officialReportsRouter.get("/heatmap", async (req, res) => {
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

    const query = req.query;
    const heatmap = await reportsService.listHeatmapForOfficial(
      {
        role: user.role,
        barangayCode: user.officialProfile?.barangay?.code ?? null,
      },
      {
        category: typeof query.category === "string" ? query.category : undefined,
        fromDate: typeof query.fromDate === "string" ? query.fromDate : undefined,
        toDate: typeof query.toDate === "string" ? query.toDate : undefined,
        days: typeof query.days === "string" ? Number(query.days) : undefined,
        threshold: typeof query.threshold === "string" ? Number(query.threshold) : undefined,
        cellSize: typeof query.cellSize === "string" ? Number(query.cellSize) : undefined,
      },
    );

    return res.status(200).json(heatmap);
  } catch (error) {
    const parsed = reportsService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

officialReportsRouter.patch("/alerts/:alertId/read", async (req, res) => {
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

    const alert = await reportsService.markAlertRead(
      {
        role: user.role,
        barangayCode: user.officialProfile?.barangay?.code ?? null,
      },
      req.params.alertId,
    );

    return res.status(200).json({ message: "Alert marked as read.", alert });
  } catch (error) {
    const parsed = reportsService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});
