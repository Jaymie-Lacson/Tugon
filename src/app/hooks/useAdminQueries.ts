import { useQuery } from '@tanstack/react-query';
import { superAdminApi } from '../services/superAdminApi';

export const adminKeys = {
  summary: () => ['admin', 'summary'] as const,
  barangays: () => ['admin', 'barangays'] as const,
  auditLogs: (params?: object) => ['admin', 'auditLogs', params ?? {}] as const,
  users: (params?: object) => ['admin', 'users', params ?? {}] as const,
  notifications: () => ['admin', 'notifications'] as const,
};

export function useAdminSummary() {
  return useQuery({
    queryKey: adminKeys.summary(),
    queryFn: () => superAdminApi.getAnalyticsSummary(),
    staleTime: 60_000,
  });
}

export function useAdminBarangays() {
  return useQuery({
    queryKey: adminKeys.barangays(),
    queryFn: () => superAdminApi.getBarangays(),
    staleTime: 5 * 60_000,
  });
}

export function useAdminAuditLogs(params: Parameters<typeof superAdminApi.getAuditLogs>[0]) {
  return useQuery({
    queryKey: adminKeys.auditLogs(params),
    queryFn: () => superAdminApi.getAuditLogs(params),
  });
}

export function useAdminUsers(params: Parameters<typeof superAdminApi.getUsers>[0]) {
  return useQuery({
    queryKey: adminKeys.users(params),
    queryFn: () => superAdminApi.getUsers(params),
    staleTime: 60_000,
  });
}

export function useAdminNotifications(enabled: boolean) {
  return useQuery({
    queryKey: adminKeys.notifications(),
    queryFn: () => superAdminApi.getNotifications(),
    enabled,
    staleTime: 30_000,
  });
}
