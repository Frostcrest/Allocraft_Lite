import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schwabApi, SchwabAccount, SchwabPosition } from '@/services/schwabApi';

// Query keys for Schwab API
export const schwabQueryKeys = {
  accounts: ['schwab-accounts'],
  positions: (accountId: string) => ['schwab-positions', accountId],
  auth: ['schwab-auth-status']
};

/**
 * Hook to check Schwab authentication status
 */
export function useSchwabAuth() {
  return useQuery({
    queryKey: schwabQueryKeys.auth,
    queryFn: () => ({
      isAuthenticated: schwabApi.isAuthenticated(),
      timestamp: Date.now()
    }),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Check every minute
  });
}

/**
 * Hook to initiate Schwab OAuth flow
 */
export function useSchwabLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      schwabApi.initiateOAuth();
      return Promise.resolve();
    },
    onSuccess: () => {
      // Invalidate auth status after login attempt
      queryClient.invalidateQueries({ queryKey: schwabQueryKeys.auth });
    }
  });
}

/**
 * Hook to logout from Schwab
 */
export function useSchwabLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      schwabApi.logout();
      return Promise.resolve();
    },
    onSuccess: () => {
      // Clear all Schwab-related queries
      queryClient.removeQueries({ queryKey: ['schwab'] });
      queryClient.invalidateQueries({ queryKey: schwabQueryKeys.auth });
    }
  });
}

/**
 * Hook to fetch Schwab accounts
 */
export function useSchwabAccounts() {
  const { data: auth } = useSchwabAuth();

  return useQuery<SchwabAccount[]>({
    queryKey: schwabQueryKeys.accounts,
    queryFn: () => schwabApi.getAccounts(),
    enabled: auth?.isAuthenticated ?? false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry if authentication is required
      if (error?.message?.includes('Authentication required')) {
        return false;
      }
      return failureCount < 2;
    }
  });
}

/**
 * Hook to fetch positions for a specific account
 */
export function useSchwabPositions(accountId: string) {
  const { data: auth } = useSchwabAuth();

  return useQuery<SchwabPosition[]>({
    queryKey: schwabQueryKeys.positions(accountId),
    queryFn: () => schwabApi.getAccountPositions(accountId),
    enabled: !!(auth?.isAuthenticated && accountId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      if (error?.message?.includes('Authentication required')) {
        return false;
      }
      return failureCount < 2;
    }
  });
}

/**
 * Hook to refresh Schwab data
 */
export function useRefreshSchwabData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Invalidate all Schwab queries to force refetch
      await queryClient.invalidateQueries({ queryKey: ['schwab'] });
      return Promise.resolve();
    }
  });
}
