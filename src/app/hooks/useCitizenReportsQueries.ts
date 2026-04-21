import { useQuery } from '@tanstack/react-query';
import { citizenReportsApi } from '../services/citizenReportsApi';

export const citizenReportsKeys = {
  myReports: () => ['citizen', 'myReports'] as const,
};

export function useMyReports() {
  return useQuery({
    queryKey: citizenReportsKeys.myReports(),
    queryFn: () => citizenReportsApi.getMyReports(),
    staleTime: 30_000,
  });
}
