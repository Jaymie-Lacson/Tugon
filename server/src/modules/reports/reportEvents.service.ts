import { EventEmitter } from "node:events";
import type { TicketStatus } from "./types.js";

export type ReportEventAction = "created" | "status-updated" | "cancelled";

export interface ReportEventPayload {
  eventId: string;
  action: ReportEventAction;
  reportId: string;
  citizenUserId: string;
  routedBarangayCode: string;
  status: TicketStatus;
  updatedAt: string;
}

const REPORT_EVENT_NAME = "report-event";

class ReportsRealtimeService {
  private readonly events = new EventEmitter();

  publish(input: Omit<ReportEventPayload, "eventId">) {
    const payload: ReportEventPayload = {
      ...input,
      eventId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    };
    this.events.emit(REPORT_EVENT_NAME, payload);
  }

  subscribe(listener: (payload: ReportEventPayload) => void) {
    this.events.on(REPORT_EVENT_NAME, listener);
    return () => {
      this.events.off(REPORT_EVENT_NAME, listener);
    };
  }
}

export const reportsRealtimeService = new ReportsRealtimeService();
