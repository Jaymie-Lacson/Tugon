import { withSecurityHeaders } from "../utils/requestSecurity";

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
  token?: string;
  user: SessionUser;
}

export interface OtpDispatchResponse {
  message: string;
  phoneNumber: string;
  expiresInSeconds: number;
}

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;

function resolveApiBase() {
  const configured = (viteEnv?.VITE_API_BASE_URL ?? "/api").trim();
  if (!configured) {
    return "/api";
  }

  const withoutTrailingSlash = configured.replace(/\/+$/, "");

  // Accept common shorthand values like ":4000/api" or "localhost:4000/api".
  const leadingPortMatch = withoutTrailingSlash.match(/^:(\d+)(\/.*)?$/);
  if (leadingPortMatch) {
    const path = leadingPortMatch[2] ?? "";
    return `http://localhost:${leadingPortMatch[1]}${path}`;
  }

  if (/^localhost:\d+/i.test(withoutTrailingSlash)) {
    return `http://${withoutTrailingSlash}`;
  }

  return withoutTrailingSlash;
}

const API_BASE = resolveApiBase();

type CsrfBootstrap = {
  csrfToken: string;
  headerName: string;
};

let cachedCsrf: CsrfBootstrap | null = null;

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isCsrfValidationFailure(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const message = (payload as { message?: unknown }).message;
  return typeof message === "string" && message.trim().toLowerCase() === "csrf validation failed.";
}

function requiresCsrfHeader(method: string | undefined) {
  const normalized = (method ?? "GET").toUpperCase();
  return normalized === "POST" || normalized === "PUT" || normalized === "PATCH" || normalized === "DELETE";
}

async function fetchCsrfBootstrap(forceRefresh = false): Promise<CsrfBootstrap> {
  if (!forceRefresh && cachedCsrf) {
    return cachedCsrf;
  }

  const requestCsrf = () =>
    fetch(`${API_BASE}/auth/csrf`, {
      method: "GET",
      credentials: "include",
      headers: withSecurityHeaders({}, { method: "GET" }),
    });

  let response: Response;

  try {
    response = await requestCsrf();
  } catch {
    throw new Error(
      `Unable to reach the API server (${API_BASE}). Check VITE_API_BASE_URL and make sure the backend is running.`,
    );
  }

  // Startup race guard: Vite proxy can return transient 5xx while backend boots.
  if (!response.ok && response.status >= 500) {
    await sleep(500);
    try {
      response = await requestCsrf();
    } catch {
      throw new Error(
        `Unable to reach the API server (${API_BASE}). Check VITE_API_BASE_URL and make sure the backend is running.`,
      );
    }
  }

  if (!response.ok) {
    throw new Error(
      response.status >= 500
        ? "Unable to initialize secure session. API returned a server error. Check backend logs and try again."
        : "Unable to initialize secure session. Please try again.",
    );
  }

  const payload = (await response.json().catch(() => ({}))) as Partial<CsrfBootstrap>;
  const csrfToken = typeof payload.csrfToken === "string" ? payload.csrfToken.trim() : "";
  const headerName = typeof payload.headerName === "string" ? payload.headerName.trim() : "";

  if (!csrfToken || !headerName) {
    throw new Error("Unable to initialize secure session. Please try again.");
  }

  cachedCsrf = { csrfToken, headerName };
  return cachedCsrf;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return requestWithRetry<T>(path, init, false);
}

async function requestWithRetry<T>(path: string, init: RequestInit | undefined, hasRetried: boolean): Promise<T> {
  const method = init?.method;
  const headers = new Headers(
    withSecurityHeaders(
      {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      { method },
    ),
  );

  if (requiresCsrfHeader(method) && path !== "/auth/csrf") {
    const bootstrap = await fetchCsrfBootstrap();
    if (!headers.has(bootstrap.headerName)) {
      headers.set(bootstrap.headerName, bootstrap.csrfToken);
    }
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      ...init,
      headers,
    });
  } catch {
    throw new Error(
      `Unable to reach the API server (${API_BASE}). Check VITE_API_BASE_URL and make sure the backend is running.`,
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Recover once when token/header is stale relative to the CSRF cookie.
    if (!hasRetried && response.status === 403 && requiresCsrfHeader(method) && path !== "/auth/csrf" && isCsrfValidationFailure(payload)) {
      await fetchCsrfBootstrap(true);
      return requestWithRetry<T>(path, init, true);
    }

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
  requestPasswordResetOtp(input: { phoneNumber: string }) {
    return request<OtpDispatchResponse>("/auth/forgot-password/request-otp", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  verifyPasswordResetOtp(input: { phoneNumber: string; otpCode: string }) {
    return request<{ verified: boolean; phoneNumber: string; message: string }>("/auth/forgot-password/verify-otp", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  resetPassword(input: { phoneNumber: string; password: string }) {
    return request<{ message: string }>("/auth/forgot-password/reset", {
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
  logout(token?: string) {
    return request<{ message: string }>("/auth/logout", {
      method: "POST",
      headers: withSecurityHeaders({}, { method: "POST", token }),
    });
  },
  me(token?: string) {
    return request<{ user: SessionUser }>("/auth/me", {
      method: "GET",
      headers: withSecurityHeaders({}, { method: "GET", token }),
    });
  },
  csrf() {
    return request<{ csrfToken: string; headerName: string }>("/auth/csrf", {
      method: "GET",
    });
  },
};
