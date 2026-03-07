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
  saveOtp(otpRecord: OtpRecord) {
    otpByPhone.set(normalizePhone(otpRecord.phoneNumber), {
      ...otpRecord,
      phoneNumber: normalizePhone(otpRecord.phoneNumber),
    });
  },
  getOtp(phone: string) {
    return otpByPhone.get(normalizePhone(phone));
  },
};
