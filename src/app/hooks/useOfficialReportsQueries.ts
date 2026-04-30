import { useQuery } from '@tanstack/react-query';
import { officialReportsApi } from '../services/officialReportsApi';

export const officialReportsKeys = {
  reports: (search = '') => ['official', 'reports', search] as const,
  reportById: (id: string) => ['official', 'reports', id] as const,
  alerts: () => ['official', 'alerts'] as const,
  heatmap: (params?: object) => ['official', 'heatmap', params ?? {}] as const,
  verifications: () => ['official', 'verifications'] as const,
  dss: () => ['official', 'dss'] as const,
};

export function useOfficialReports(params?: { search?: string }) {
  return useQuery({
    queryKey: officialReportsKeys.reports(params?.search),
    queryFn: () => officialReportsApi.getReports(params),
    staleTime: 30_000,
  });
}

export function useOfficialReportById(reportId: string | null) {
  return useQuery({
    queryKey: officialReportsKeys.reportById(reportId ?? ''),
    queryFn: () => officialReportsApi.getReportById(reportId!),
    enabled: !!reportId,
    staleTime: 60_000,
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: officialReportsKeys.alerts(),
    queryFn: () => officialReportsApi.getAlerts(),
    staleTime: 60_000,
  });
}

export function useHeatmap(params?: Parameters<typeof officialReportsApi.getHeatmap>[0]) {
  return useQuery({
    queryKey: officialReportsKeys.heatmap(params),
    queryFn: () => officialReportsApi.getHeatmap(params),
    staleTime: 5 * 60_000,
  });
}

export function usePendingVerifications() {
  return useQuery({
    queryKey: officialReportsKeys.verifications(),
    queryFn: () => officialReportsApi.getPendingVerifications(),
    staleTime: 60_000,
  });
}

export function useDssRecommendations() {
  return useQuery({
    queryKey: officialReportsKeys.dss(),
    queryFn: () => officialReportsApi.getDssRecommendations(),
    staleTime: 2 * 60_000,
  });
}
