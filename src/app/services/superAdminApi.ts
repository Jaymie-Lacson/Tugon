import { getAuthSession } from "../utils/authSession";
import type { Role } from "./authApi";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000/api";

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
    const message = typeof payload?.message === "string" ? payload.message : "Request failed.";
    throw new Error(message);
  }

  return payload as T;
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
};
