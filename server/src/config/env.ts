import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);

// Prefer server/.env and then fallback to workspace-root .env when available.
dotenv.config({ path: path.resolve(currentDir, "../../.env") });
dotenv.config({ path: path.resolve(currentDir, "../../../.env") });

const portFromEnv = Number(process.env.PORT ?? "4000");
const otpExpiryMinutesFromEnv = Number(process.env.OTP_EXPIRY_MINUTES ?? "5");

if (Number.isNaN(portFromEnv) || portFromEnv <= 0) {
  throw new Error("Invalid PORT environment variable.");
}

if (Number.isNaN(otpExpiryMinutesFromEnv) || otpExpiryMinutesFromEnv <= 0) {
  throw new Error("Invalid OTP_EXPIRY_MINUTES environment variable.");
}

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret.trim().length < 16) {
  throw new Error("JWT_SECRET must be set and at least 16 characters long.");
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: portFromEnv,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  otpExpiryMinutes: otpExpiryMinutesFromEnv,
};
