import { Router, type Request } from "express";
import multer from "multer";
import { env } from "../../config/env.js";
import { verificationService } from "./verification.service.js";

export const citizenVerificationRouter = Router();
export const officialVerificationRouter = Router();

const verificationIdUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: env.verificationIdMaxBytes,
  },
}).single("idImage");

function isMultipartRequest(contentType: string | undefined): boolean {
  return typeof contentType === "string" && contentType.toLowerCase().includes("multipart/form-data");
}

function mapVerificationPayload(req: Request) {
  if (!isMultipartRequest(req.headers["content-type"])) {
    return {
      fileName: req.body?.fileName,
      mimeType: req.body?.mimeType,
      dataUrl: req.body?.dataUrl,
    };
  }

  const file = req.file as Express.Multer.File | undefined;
  if (!file) {
    return {
      fileName: req.body?.fileName,
      mimeType: req.body?.mimeType,
      dataUrl: req.body?.dataUrl,
    };
  }

  return {
    fileName: file.originalname,
    mimeType: file.mimetype,
    bytes: file.buffer,
  };
}

citizenVerificationRouter.get("/verification-status", async (req, res) => {
  try {
    const citizenUserId = req.authUser?.id;
    if (!citizenUserId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const payload = await verificationService.getCitizenStatus(citizenUserId);
    return res.status(200).json(payload);
  } catch (error) {
    const parsed = verificationService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

// Backward-compatible alias for older clients expecting /verification.
citizenVerificationRouter.get("/verification", async (req, res) => {
  try {
    const citizenUserId = req.authUser?.id;
    if (!citizenUserId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const payload = await verificationService.getCitizenStatus(citizenUserId);
    return res.status(200).json(payload);
  } catch (error) {
    const parsed = verificationService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

citizenVerificationRouter.post("/verification-id", verificationIdUpload, async (req, res) => {
  try {
    const citizenUserId = req.authUser?.id;
    if (!citizenUserId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const payload = await verificationService.submitCitizenId(citizenUserId, mapVerificationPayload(req));

    return res.status(200).json(payload);
  } catch (error) {
    const parsed = verificationService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

officialVerificationRouter.get("/verifications", async (req, res) => {
  try {
    const actorUserId = req.authUser?.id;
    if (!actorUserId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const payload = await verificationService.listPending(actorUserId);
    return res.status(200).json(payload);
  } catch (error) {
    const parsed = verificationService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});

officialVerificationRouter.patch("/verifications/:citizenUserId", async (req, res) => {
  try {
    const actorUserId = req.authUser?.id;
    if (!actorUserId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const payload = await verificationService.decide(actorUserId, req.params.citizenUserId, {
      decision: req.body?.decision,
      reason: req.body?.reason,
      notes: req.body?.notes,
    });

    return res.status(200).json(payload);
  } catch (error) {
    const parsed = verificationService.parseError(error);
    return res.status(parsed.status).json({ message: parsed.message });
  }
});
