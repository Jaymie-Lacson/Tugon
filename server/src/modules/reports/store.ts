import type { CitizenReportRecord } from "./types.js";

const reportsById = new Map<string, CitizenReportRecord>();
const reportsByCitizenUserId = new Map<string, string[]>();
let reportSequence = 1;

function getCurrentYear() {
  return new Date().getFullYear();
}

function nextReportId() {
  const id = `MY-${getCurrentYear()}-${String(reportSequence).padStart(4, "0")}`;
  reportSequence += 1;
  return id;
}

export const reportsStore = {
  nextReportId,
  save(report: CitizenReportRecord) {
    reportsById.set(report.id, report);

    const existingIds = reportsByCitizenUserId.get(report.citizenUserId) ?? [];
    if (!existingIds.includes(report.id)) {
      reportsByCitizenUserId.set(report.citizenUserId, [report.id, ...existingIds]);
    }
  },
  listByCitizenUserId(citizenUserId: string) {
    const ids = reportsByCitizenUserId.get(citizenUserId) ?? [];
    return ids
      .map((id) => reportsById.get(id))
      .filter((report): report is CitizenReportRecord => Boolean(report));
  },
  getById(reportId: string) {
    return reportsById.get(reportId);
  },
};
