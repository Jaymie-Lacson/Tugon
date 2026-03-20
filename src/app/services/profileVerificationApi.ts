import { getAuthSession } from "../utils/authSession";

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000/api").replace(
  /\/+$/,
  "",
);

async function authedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getAuthSession();
  if (!session?.token) {
    throw new Error("You must be logged in to continue.");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Your session has expired. Please log in again.");
    }

    if (response.status === 404) {
      throw new Error("Verification endpoint is not available on the current backend deployment.");
    }

    const message = typeof payload?.message === "string" ? payload.message : "Request failed.";
    throw new Error(message);
  }

  return payload as T;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      if (!value) {
        reject(new Error("Unable to read selected file."));
        return;
      }
      resolve(value);
    };
    reader.onerror = () => reject(new Error("Unable to read selected file."));
    reader.readAsDataURL(file);
  });
}

export interface CitizenVerificationState {
  isVerified: boolean;
  idImageUrl: string | null;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  rejectionReason: string | null;
  verifiedAt: string | null;
  isBanned: boolean;
  bannedReason: string | null;
}

export const profileVerificationApi = {
  async getMyStatus() {
    try {
      return await authedRequest<{ verification: CitizenVerificationState }>("/citizen/verification-status", {
        method: "GET",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed.";
      if (!/not available on the current backend deployment/i.test(message)) {
        throw error;
      }

      // Compatibility fallback for deployments still exposing legacy route naming.
      return authedRequest<{ verification: CitizenVerificationState }>("/citizen/verification", {
        method: "GET",
      });
    }
  },

  async submitMyId(file: File) {
    const dataUrl = await fileToDataUrl(file);

    return authedRequest<{
      message: string;
      verification: {
        isVerified: boolean;
        idImageUrl: string | null;
        verificationStatus: "PENDING";
      };
    }>("/citizen/verification-id", {
      method: "POST",
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        dataUrl,
      }),
    });
  },
};
