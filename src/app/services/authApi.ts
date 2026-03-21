export type Role = "CITIZEN" | "OFFICIAL" | "SUPER_ADMIN";

export interface SessionUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: Role;
  barangayCode?: string;
  isPhoneVerified: boolean;
  isVerified: boolean;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED" | "REUPLOAD_REQUESTED" | null;
  verificationRejectionReason: string | null;
  idImageUrl: string | null;
  isBanned: boolean;
}

export interface AuthSession {
  token: string;
  user: SessionUser;
}

export interface OtpDispatchResponse {
  message: string;
  phoneNumber: string;
  expiresInSeconds: number;
  devOtpCode?: string;
}

const API_BASE =
  ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000/api").replace(
    /\/+$/,
    "",
  );

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      ...init,
    });
  } catch {
    throw new Error(
      `Unable to reach the API server (${API_BASE}). Check VITE_API_BASE_URL and make sure the backend is running.`,
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = typeof payload?.message === "string" ? payload.message : "Request failed.";
    throw new Error(message);
  }

  return payload as T;
}

export const authApi = {
  register(input: { fullName: string; phoneNumber: string; barangayCode: string }) {
    return request<OtpDispatchResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  resendOtp(input: { phoneNumber: string }) {
    return request<OtpDispatchResponse>("/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  verifyOtp(input: { phoneNumber: string; otpCode: string }) {
    return request<{ verified: boolean; phoneNumber: string; message: string }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  createPassword(input: { phoneNumber: string; password: string }) {
    return request<AuthSession>("/auth/create-password", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  login(input: { phoneNumber: string; password: string }) {
    return request<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
