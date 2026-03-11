import { getAuthSession } from "../utils/authSession";
import type { Role } from "./authApi";
import { apiErrorDebugStore, parseJsonResponse } from "./apiErrorDebug";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000/api";

async function authedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getAuthSession();
  if (!session?.token) {
    throw new Error("You must be logged in to continue.");
  }

  const method = (init?.method ?? "GET").toUpperCase();
  const url = `${API_BASE}${path}`;
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    const message = `Unable to reach the API server (${API_BASE}).`;
    const record = apiErrorDebugStore.recordNetworkError({
      method,
      url,
      message,
      error,
    });
    throw new Error(`${record.message} [status=${record.status} code=${record.code ?? record.statusText}]`);
  }

  return parseJsonResponse<T>(response, method, url);
}

export interface ApiAdminUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: Role;
  isPhoneVerified: boolean;
  barangayCode: string | null;
  barangayName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiAdminBarangay {
  id: string;
  code: string;
  name: string;
  boundaryGeojson: string | null;
  citizenCount: number;
  officialCount: number;
  totalReports: number;
  activeReports: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiAdminAnalyticsSummary {
  summary: {
    totalUsers: number;
    verifiedUsers: number;
    unverifiedUsers: number;
    totalReports: number;
    openReports: number;
  };
  usersByRole: Array<{ role: Role; count: number }>;
  reportsByStatus: Array<{ status: string; count: number }>;
  reportsByBarangay: Array<{ barangayCode: string; count: number }>;
}

export interface ApiAdminAuditLog {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  targetLabel: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface ApiAdminAuditLogsResponse {
  total: number;
  limit: number;
  offset: number;
  logs: ApiAdminAuditLog[];
}

export interface ApiAdminAuditLogsExportResponse {
  total: number;
  logs: ApiAdminAuditLog[];
}

export interface CreateAdminUserInput {
  fullName: string;
  phoneNumber: string;
  password: string;
  role: Role;
  barangayCode?: string;
  isPhoneVerified?: boolean;
}

export const superAdminApi = {
  createUser(input: CreateAdminUserInput) {
    return authedRequest<{ message: string; user: ApiAdminUser }>("/admin/users", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  getUsers(params?: { search?: string; role?: Role }) {
    const search = new URLSearchParams();
    if (params?.search) {
      search.set("search", params.search);
    }
    if (params?.role) {
      search.set("role", params.role);
    }

    const query = search.toString();
    return authedRequest<{ users: ApiAdminUser[] }>(`/admin/users${query ? `?${query}` : ""}`, {
      method: "GET",
    });
  },

  updateUserRole(userId: string, input: { role: Role; barangayCode?: string; isPhoneVerified?: boolean }) {
    return authedRequest<{ message: string; user: ApiAdminUser }>(`/admin/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  getBarangays() {
    return authedRequest<{ barangays: ApiAdminBarangay[] }>("/admin/barangays", {
      method: "GET",
    });
  },

  updateBarangayBoundary(barangayCode: string, boundaryGeojson: unknown) {
    return authedRequest<{ message: string; barangay: ApiAdminBarangay }>(
      `/admin/barangays/${barangayCode}/boundary`,
      {
        method: "PATCH",
        body: JSON.stringify({ boundaryGeojson }),
      },
    );
  },

  getAnalyticsSummary() {
    return authedRequest<ApiAdminAnalyticsSummary>("/admin/analytics/summary", {
      method: "GET",
    });
  },

  getAuditLogs(params?: {
    action?: string;
    targetType?: string;
    limit?: number;
    offset?: number;
    fromDate?: string;
    toDate?: string;
  }) {
    const search = new URLSearchParams();
    if (params?.action) {
      search.set("action", params.action);
    }
    if (params?.targetType) {
      search.set("targetType", params.targetType);
    }
    if (typeof params?.limit === "number") {
      search.set("limit", String(params.limit));
    }
    if (typeof params?.offset === "number") {
      search.set("offset", String(params.offset));
    }
    if (params?.fromDate) {
      search.set("fromDate", params.fromDate);
    }
    if (params?.toDate) {
      search.set("toDate", params.toDate);
    }

    const query = search.toString();
    return authedRequest<ApiAdminAuditLogsResponse>(`/admin/audit-logs${query ? `?${query}` : ""}`, {
      method: "GET",
    });
  },

  exportAuditLogs(params?: { action?: string; targetType?: string; fromDate?: string; toDate?: string }) {
    const search = new URLSearchParams();
    if (params?.action) {
      search.set("action", params.action);
    }
    if (params?.targetType) {
      search.set("targetType", params.targetType);
    }
    if (params?.fromDate) {
      search.set("fromDate", params.fromDate);
    }
    if (params?.toDate) {
      search.set("toDate", params.toDate);
    }

    const query = search.toString();
    return authedRequest<ApiAdminAuditLogsExportResponse>(`/admin/audit-logs/export${query ? `?${query}` : ""}`, {
      method: "GET",
    });
  },
};
