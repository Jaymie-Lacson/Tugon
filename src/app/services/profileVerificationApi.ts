import { getAuthSession } from "../utils/authSession";
import { withSecurityHeaders } from "../utils/requestSecurity";

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000/api").replace(
  /\/+$/,
  "",
);

async function authedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getAuthSession();
  if (!session?.user) {
    throw new Error("You must be logged in to continue.");
  }

  const headers = withSecurityHeaders({
    "Content-Type": "application/json",
    ...(init?.headers ?? {}),
  }, { method: init?.method, token: session.token });

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers,
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to process selected ID image."));
    image.src = src;
  });
}

async function combineIdImages(frontFile: File, backFile: File): Promise<string> {
  const [frontDataUrl, backDataUrl] = await Promise.all([
    fileToDataUrl(frontFile),
    fileToDataUrl(backFile),
  ]);

  const [frontImage, backImage] = await Promise.all([
    loadImage(frontDataUrl),
    loadImage(backDataUrl),
  ]);

  const width = Math.max(frontImage.width, backImage.width);
  const scaleFront = width / frontImage.width;
  const scaleBack = width / backImage.width;
  const frontHeight = Math.round(frontImage.height * scaleFront);
  const backHeight = Math.round(backImage.height * scaleBack);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = frontHeight + backHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to process selected ID image.");
  }

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(frontImage, 0, 0, width, frontHeight);
  ctx.drawImage(backImage, 0, frontHeight, width, backHeight);

  return canvas.toDataURL("image/jpeg", 0.9);
}

export interface CitizenVerificationState {
  isVerified: boolean;
  idImageUrl: string | null;
  idImagePreviewUrl?: string | null;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED" | "REUPLOAD_REQUESTED" | null;
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

  async submitMyId(frontFile: File, backFile: File) {
    const dataUrl = await combineIdImages(frontFile, backFile);

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
        fileName: `combined-${Date.now()}-${frontFile.name.replace(/\.[^.]+$/, "")}-and-${backFile.name}`,
        mimeType: "image/jpeg",
        dataUrl,
      }),
    });
  },
};
