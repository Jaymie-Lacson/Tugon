import type { OtpRecord } from "./types.js";

const otpByPhone = new Map<string, OtpRecord>();
const revokedTokens = new Map<string, number>();
const MAX_REVOKED_TOKENS = 20_000;

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export const authStore = {
  normalizePhone,
  otpByPhone,
  revokedTokens,
  pruneRevokedTokens(nowMs = Date.now()) {
    for (const [token, expiresAtMs] of revokedTokens.entries()) {
      if (expiresAtMs <= nowMs) {
        revokedTokens.delete(token);
      }
    }

    if (revokedTokens.size <= MAX_REVOKED_TOKENS) {
      return;
    }

    // Delete oldest insertions first until the map is within its cap.
    const entriesToTrim = revokedTokens.size - MAX_REVOKED_TOKENS;
    let trimmed = 0;

    for (const token of revokedTokens.keys()) {
      revokedTokens.delete(token);
      trimmed += 1;
      if (trimmed >= entriesToTrim) {
        break;
      }
    }
  },
  addRevokedToken(token: string, expiresAtMs: number) {
    this.pruneRevokedTokens();
    revokedTokens.set(token, expiresAtMs);
  },
  isTokenRevoked(token: string) {
    const expiresAtMs = revokedTokens.get(token);
    if (!expiresAtMs) {
      return false;
    }

    if (expiresAtMs <= Date.now()) {
      revokedTokens.delete(token);
      return false;
    }

    return true;
  },
  otpKey(phone: string, purpose: OtpRecord["purpose"]) {
    return `${normalizePhone(phone)}:${purpose}`;
  },
  saveOtp(otpRecord: OtpRecord) {
    otpByPhone.set(this.otpKey(otpRecord.phoneNumber, otpRecord.purpose), {
      ...otpRecord,
      phoneNumber: normalizePhone(otpRecord.phoneNumber),
    });
  },
  getOtp(phone: string, purpose: OtpRecord["purpose"] = "REGISTRATION") {
    return otpByPhone.get(this.otpKey(phone, purpose));
  },
  deleteOtp(phone: string, purpose: OtpRecord["purpose"]) {
    otpByPhone.delete(this.otpKey(phone, purpose));
  },
};
