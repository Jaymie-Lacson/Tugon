import { Router } from "express";
import type { CookieOptions } from "express";
import { env } from "../../config/env.js";
import { authService } from "./auth.service.js";
import { authenticate } from "../../middleware/auth.js";
import { ensureCsrfCookie } from "../../middleware/csrf.js";

export const authRouter = Router();

function shouldUseSecureCookie() {
  if (env.authCookieSecureMode === "always") {
    return true;
  }

  if (env.authCookieSecureMode === "never") {
    return false;
  }

  return env.nodeEnv === "production";
}

function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: env.authCookieSameSite,
    secure: shouldUseSecureCookie(),
    path: "/",
    maxAge: env.authCookieMaxAgeSeconds * 1000,
  };
}

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

authRouter.post("/resend-otp", async (req, res) => {
  try {
    const result = await authService.resendOtp({
      phoneNumber: req.body?.phoneNumber,
    });
    res.status(200).json(result);
  } catch (error) {
    const parsed = authService.parseAuthError(error);
    res.status(parsed.status).json({ message: parsed.message });
  }
});

authRouter.post("/verify-otp", async (req, res) => {
  try {
    const result = await authService.verifyOtp({
      phoneNumber: req.body?.phoneNumber,
      otpCode: req.body?.otpCode,
    });
    res.status(200).json(result);
  } catch (error) {
    const parsed = authService.parseAuthError(error);
    res.status(parsed.status).json({ message: parsed.message });
  }
});

authRouter.post("/forgot-password/request-otp", async (req, res) => {
  try {
    const result = await authService.requestPasswordResetOtp({
      phoneNumber: req.body?.phoneNumber,
    });
    res.status(200).json(result);
  } catch (error) {
    const parsed = authService.parseAuthError(error);
    res.status(parsed.status).json({ message: parsed.message });
  }
});

authRouter.post("/forgot-password/verify-otp", async (req, res) => {
  try {
    const result = await authService.verifyPasswordResetOtp({
      phoneNumber: req.body?.phoneNumber,
      otpCode: req.body?.otpCode,
    });
    res.status(200).json(result);
  } catch (error) {
    const parsed = authService.parseAuthError(error);
    res.status(parsed.status).json({ message: parsed.message });
  }
});

authRouter.post("/forgot-password/reset", async (req, res) => {
  try {
    const result = await authService.resetPassword({
      phoneNumber: req.body?.phoneNumber,
      password: req.body?.password,
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

    if (result.token) {
      res.cookie(env.authCookieName, result.token, authCookieOptions());
    }
    ensureCsrfCookie(req, res);

    if (!env.authReturnTokenInBody) {
      const { token: _token, ...body } = result;
      return res.status(200).json(body);
    }

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

    if (session.token) {
      res.cookie(env.authCookieName, session.token, authCookieOptions());
    }
    ensureCsrfCookie(req, res);

    if (!env.authReturnTokenInBody) {
      const { token: _token, ...body } = session;
      return res.status(200).json(body);
    }

    res.status(200).json(session);
  } catch (error) {
    const parsed = authService.parseAuthError(error);
    res.status(parsed.status).json({ message: parsed.message });
  }
});

authRouter.post("/logout", authenticate, async (req, res) => {
  try {
    const token = req.authToken ?? "";
    const result = await authService.logout(token);
    res.clearCookie(env.authCookieName, {
      ...authCookieOptions(),
      maxAge: undefined,
    });
    res.clearCookie(env.csrfCookieName, {
      ...authCookieOptions(),
      httpOnly: false,
      maxAge: undefined,
    });
    res.status(200).json(result);
  } catch (error) {
    const parsed = authService.parseAuthError(error);
    res.status(parsed.status).json({ message: parsed.message });
  }
});

authRouter.get("/csrf", (req, res) => {
  const token = ensureCsrfCookie(req, res);
  res.status(200).json({ csrfToken: token, headerName: env.csrfHeaderName });
});

authRouter.get("/me", authenticate, async (req, res) => {
  try {
    const userId = req.authUser?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized." });
    }
    const user = await authService.me(userId);
    ensureCsrfCookie(req, res);
    res.status(200).json({ user });
  } catch (error) {
    const parsed = authService.parseAuthError(error);
    res.status(parsed.status).json({ message: parsed.message });
  }
});
