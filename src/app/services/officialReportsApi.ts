import { getAuthSession } from "../utils/authSession";
import type { ApiCitizenReport, ApiTicketStatus } from "./citizenReportsApi";

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

export const officialReportsApi = {
  getReports() {
    return authedRequest<{ reports: ApiCitizenReport[] }>("/official/reports", {
      method: "GET",
    });
  },

  getReportById(reportId: string) {
    return authedRequest<{ report: ApiCitizenReport }>(`/official/reports/${reportId}`, {
      method: "GET",
    });
  },

  updateReportStatus(reportId: string, input: { status: ApiTicketStatus; note?: string }) {
    return authedRequest<{ message: string; report: ApiCitizenReport }>(
      `/official/reports/${reportId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    );
  },
};
