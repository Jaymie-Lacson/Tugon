import { Router } from "express";
import { authService } from "./auth.service.js";
import { authenticate } from "../../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  try {
    const result = await authService.register({
      fullName: req.body?.fullName,
      phoneNumber: req.body?.phoneNumber,
      barangayCode: req.body?.barangayCode,
      role: req.body?.role,
    });
    res.status(201).json(result);
  } catch (error) {
    const parsed = authService.parseAuthError(error);
    res.status(parsed.status).json({ message: parsed.message });
  }
});

authRouter.post("/resend-otp", (req, res) => {
  try {
    const result = authService.resendOtp({
      phoneNumber: req.body?.phoneNumber,
    });
    res.status(200).json(result);
  } catch (error) {
    const parsed = authService.parseAuthError(error);
    res.status(parsed.status).json({ message: parsed.message });
  }
});

authRouter.post("/verify-otp", (req, res) => {
  try {
    const result = authService.verifyOtp({
      phoneNumber: req.body?.phoneNumber,
      otpCode: req.body?.otpCode,
    });
    res.status(200).json(result);
  } catch (error) {
    const parsed = authService.parseAuthError(error);
    res.status(parsed.status).json({ message: parsed.message });
  }
});

authRouter.post("/create-password", async (req, res) => {
  try {
    const result = await authService.createPassword({
      phoneNumber: req.body?.phoneNumber,
      password: req.body?.password,
    });
    res.status(200).json(result);
  } catch (error) {
    const parsed = authService.parseAuthError(error);
    res.status(parsed.status).json({ message: parsed.message });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const session = await authService.login({
      phoneNumber: req.body?.phoneNumber,
      password: req.body?.password,
    });
    res.status(200).json(session);
  } catch (error) {
    const parsed = authService.parseAuthError(error);
    res.status(parsed.status).json({ message: parsed.message });
  }
});

authRouter.post("/logout", authenticate, (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const result = authService.logout(token);
    res.status(200).json(result);
  } catch (error) {
    const parsed = authService.parseAuthError(error);
    res.status(parsed.status).json({ message: parsed.message });
  }
});

authRouter.get("/me", authenticate, async (req, res) => {
  try {
    const userId = req.authUser?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized." });
    }
    const user = await authService.me(userId);
    res.status(200).json({ user });
  } catch (error) {
    const parsed = authService.parseAuthError(error);
    res.status(parsed.status).json({ message: parsed.message });
  }
});
