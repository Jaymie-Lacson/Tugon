import { Router } from "express";
import { verificationService } from "./verification.service.js";

export const officialVerificationRouter = Router();

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
