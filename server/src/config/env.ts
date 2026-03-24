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
const otpMaxVerifyAttemptsFromEnv = Number(process.env.OTP_MAX_VERIFY_ATTEMPTS ?? "5");
const otpVerifyLockoutMinutesFromEnv = Number(process.env.OTP_VERIFY_LOCKOUT_MINUTES ?? "15");
const otpResendCooldownSecondsFromEnv = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? "60");
const evidenceMaxPhotoBytesFromEnv = Number(process.env.EVIDENCE_MAX_PHOTO_BYTES ?? "5242880");
const evidenceMaxAudioBytesFromEnv = Number(process.env.EVIDENCE_MAX_AUDIO_BYTES ?? "10485760");
const verificationIdMaxBytesFromEnv = Number(process.env.VERIFICATION_ID_MAX_BYTES ?? "5242880");
const authCookieNameFromEnv = (process.env.AUTH_COOKIE_NAME ?? "tugon.sid").trim();
const authCookieSecureModeFromEnv = (process.env.AUTH_COOKIE_SECURE_MODE ?? "auto").trim().toLowerCase();
const authCookieSameSiteFromEnv = (process.env.AUTH_COOKIE_SAME_SITE ?? "lax").trim().toLowerCase();
const authCookieMaxAgeSecondsFromEnv = Number(process.env.AUTH_COOKIE_MAX_AGE_SECONDS ?? "28800");
const authReturnTokenInBodyFromEnv = process.env.AUTH_RETURN_TOKEN_IN_BODY !== "0";
const semaphoreApiKeyFromEnv = (process.env.SEMAPHORE_API_KEY ?? "").trim();
const semaphoreSenderNameFromEnv = (process.env.SEMAPHORE_SENDER_NAME ?? "").trim();
const semaphoreApiUrlFromEnv = (process.env.SEMAPHORE_API_URL ?? "https://semaphore.co/api/v4/messages").trim();

if (Number.isNaN(portFromEnv) || portFromEnv <= 0) {
  throw new Error("Invalid PORT environment variable.");
}

if (Number.isNaN(otpExpiryMinutesFromEnv) || otpExpiryMinutesFromEnv <= 0) {
  throw new Error("Invalid OTP_EXPIRY_MINUTES environment variable.");
}

if (Number.isNaN(otpMaxVerifyAttemptsFromEnv) || otpMaxVerifyAttemptsFromEnv <= 0) {
  throw new Error("Invalid OTP_MAX_VERIFY_ATTEMPTS environment variable.");
}

if (Number.isNaN(otpVerifyLockoutMinutesFromEnv) || otpVerifyLockoutMinutesFromEnv <= 0) {
  throw new Error("Invalid OTP_VERIFY_LOCKOUT_MINUTES environment variable.");
}

if (Number.isNaN(otpResendCooldownSecondsFromEnv) || otpResendCooldownSecondsFromEnv < 0) {
  throw new Error("Invalid OTP_RESEND_COOLDOWN_SECONDS environment variable.");
}

if (Number.isNaN(evidenceMaxPhotoBytesFromEnv) || evidenceMaxPhotoBytesFromEnv <= 0) {
  throw new Error("Invalid EVIDENCE_MAX_PHOTO_BYTES environment variable.");
}

if (Number.isNaN(evidenceMaxAudioBytesFromEnv) || evidenceMaxAudioBytesFromEnv <= 0) {
  throw new Error("Invalid EVIDENCE_MAX_AUDIO_BYTES environment variable.");
}

if (Number.isNaN(verificationIdMaxBytesFromEnv) || verificationIdMaxBytesFromEnv <= 0) {
  throw new Error("Invalid VERIFICATION_ID_MAX_BYTES environment variable.");
}

if (!authCookieNameFromEnv) {
  throw new Error("Invalid AUTH_COOKIE_NAME environment variable.");
}

if (
  authCookieSecureModeFromEnv !== "auto"
  && authCookieSecureModeFromEnv !== "always"
  && authCookieSecureModeFromEnv !== "never"
) {
  throw new Error("Invalid AUTH_COOKIE_SECURE_MODE environment variable. Use 'auto', 'always', or 'never'.");
}

if (authCookieSameSiteFromEnv !== "lax" && authCookieSameSiteFromEnv !== "strict" && authCookieSameSiteFromEnv !== "none") {
  throw new Error("Invalid AUTH_COOKIE_SAME_SITE environment variable. Use 'lax', 'strict', or 'none'.");
}

if (Number.isNaN(authCookieMaxAgeSecondsFromEnv) || authCookieMaxAgeSecondsFromEnv <= 0) {
  throw new Error("Invalid AUTH_COOKIE_MAX_AGE_SECONDS environment variable.");
}

if (otpDeliveryModeFromEnv !== "mock" && otpDeliveryModeFromEnv !== "sms") {
  throw new Error("Invalid OTP_DELIVERY_MODE environment variable. Use 'mock' or 'sms'.");
}

if (otpDeliveryModeFromEnv === "sms" && !semaphoreApiKeyFromEnv) {
  throw new Error("SEMAPHORE_API_KEY must be set when OTP_DELIVERY_MODE is 'sms'.");
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
  otpMaxVerifyAttempts: otpMaxVerifyAttemptsFromEnv,
  otpVerifyLockoutMinutes: otpVerifyLockoutMinutesFromEnv,
  otpResendCooldownSeconds: otpResendCooldownSecondsFromEnv,
  evidenceMaxPhotoBytes: evidenceMaxPhotoBytesFromEnv,
  evidenceMaxAudioBytes: evidenceMaxAudioBytesFromEnv,
  verificationIdMaxBytes: verificationIdMaxBytesFromEnv,
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "incident-evidence",
  supabaseIdStorageBucket:
    (process.env.SUPABASE_ID_STORAGE_BUCKET || "").trim() ||
    process.env.SUPABASE_STORAGE_BUCKET ||
    "resident-ids",
  requireEvidenceStorageUpload: process.env.REQUIRE_EVIDENCE_STORAGE_UPLOAD === "1",
  requireVerificationIdStorageUpload: process.env.REQUIRE_VERIFICATION_ID_STORAGE_UPLOAD === "1",
  authCookieName: authCookieNameFromEnv,
  authCookieSecureMode: authCookieSecureModeFromEnv as "auto" | "always" | "never",
  authCookieSameSite: authCookieSameSiteFromEnv as "lax" | "strict" | "none",
  authCookieMaxAgeSeconds: authCookieMaxAgeSecondsFromEnv,
  authReturnTokenInBody: authReturnTokenInBodyFromEnv,
  semaphoreApiKey: semaphoreApiKeyFromEnv,
  semaphoreSenderName: semaphoreSenderNameFromEnv,
  semaphoreApiUrl: semaphoreApiUrlFromEnv,
  dssAiEnabled: process.env.DSS_AI_ENABLED === "1",
  dssAiProviderUrl: (process.env.DSS_AI_PROVIDER_URL || "https://openrouter.ai/api/v1/chat/completions").trim(),
  dssAiApiKey: (process.env.DSS_AI_API_KEY || "").trim(),
  dssAiModel: (process.env.DSS_AI_MODEL || "meta-llama/llama-3.1-8b-instruct:free").trim(),
  dssAiHttpReferer: (process.env.DSS_AI_HTTP_REFERER || "").trim(),
  dssAiAppName: (process.env.DSS_AI_APP_NAME || "TUGON DSS").trim(),
};
