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
const otpDeliveryModeFromEnv = (process.env.OTP_DELIVERY_MODE ?? "mock").toLowerCase();

if (Number.isNaN(portFromEnv) || portFromEnv <= 0) {
  throw new Error("Invalid PORT environment variable.");
}

if (Number.isNaN(otpExpiryMinutesFromEnv) || otpExpiryMinutesFromEnv <= 0) {
  throw new Error("Invalid OTP_EXPIRY_MINUTES environment variable.");
}

if (otpDeliveryModeFromEnv !== "mock" && otpDeliveryModeFromEnv !== "sms") {
  throw new Error("Invalid OTP_DELIVERY_MODE environment variable. Use 'mock' or 'sms'.");
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
  otpDeliveryMode: otpDeliveryModeFromEnv as "mock" | "sms",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "incident-evidence",
  supabaseIdStorageBucket:
    (process.env.SUPABASE_ID_STORAGE_BUCKET || "").trim() ||
    process.env.SUPABASE_STORAGE_BUCKET ||
    "resident-ids",
  requireEvidenceStorageUpload: process.env.REQUIRE_EVIDENCE_STORAGE_UPLOAD === "1",
  dssAiEnabled: process.env.DSS_AI_ENABLED === "1",
  dssAiProviderUrl: (process.env.DSS_AI_PROVIDER_URL || "https://openrouter.ai/api/v1/chat/completions").trim(),
  dssAiApiKey: (process.env.DSS_AI_API_KEY || "").trim(),
  dssAiModel: (process.env.DSS_AI_MODEL || "meta-llama/llama-3.1-8b-instruct:free").trim(),
  dssAiHttpReferer: (process.env.DSS_AI_HTTP_REFERER || "").trim(),
  dssAiAppName: (process.env.DSS_AI_APP_NAME || "TUGON DSS").trim(),
};
