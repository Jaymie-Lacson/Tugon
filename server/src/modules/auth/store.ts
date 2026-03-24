import type { OtpRecord } from "./types.js";

const otpByPhone = new Map<string, OtpRecord>();
const revokedTokens = new Set<string>();

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export const authStore = {
  normalizePhone,
  otpByPhone,
  revokedTokens,
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
