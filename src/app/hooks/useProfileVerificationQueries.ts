import { useQuery } from '@tanstack/react-query';
import { profileVerificationApi } from '../services/profileVerificationApi';

export const verificationKeys = {
  myStatus: () => ['citizen', 'verification'] as const,
};

export function useMyVerificationStatus() {
  return useQuery({
    queryKey: verificationKeys.myStatus(),
    queryFn: () => profileVerificationApi.getMyStatus(),
    staleTime: 60_000,
  });
}
