import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WheelManagementService } from '../services/WheelManagementService';

/**
 * Custom React Query hooks for wheel status tracking functionality
 * 
 * Provides optimized data fetching, caching, and mutation handling
 * for all status-related operations with automatic invalidation.
 */

// Hook for fetching wheel status history
export function useWheelStatusHistory(wheelId, options = {}) {
    return useQuery({
        queryKey: ['wheel-status-history', wheelId],
        queryFn: () => WheelManagementService.getStatusHistory(wheelId),
        enabled: !!wheelId,
        staleTime: 30000, // Consider data fresh for 30 seconds
        cacheTime: 300000, // Cache for 5 minutes
        ...options
    });
}

// Hook for auto-detecting wheel status
export function useWheelStatusDetection() {
    return useMutation({
        mutationFn: (wheelId) => WheelManagementService.detectWheelStatus(wheelId),
        onError: (error) => {
            console.error('Status detection failed:', error);
        }
    });
}

// Hook for updating wheel status
export function useWheelStatusUpdate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ wheelId, status, metadata }) =>
            WheelManagementService.updateWheelStatus(wheelId, status, metadata),
        onSuccess: (data, variables) => {
            // Invalidate and refetch related queries
            queryClient.invalidateQueries(['wheel-status-history', variables.wheelId]);
            queryClient.invalidateQueries(['wheels']); // Refresh main wheels list
            queryClient.invalidateQueries(['wheel', variables.wheelId]); // Refresh specific wheel
        },
        onError: (error) => {
            console.error('Status update failed:', error);
        }
    });
}

// Hook for bulk status updates
export function useBulkStatusUpdate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (updates) =>
            Promise.all(
                updates.map(({ wheelId, status, metadata }) =>
                    WheelManagementService.updateWheelStatus(wheelId, status, metadata)
                )
            ),
        onSuccess: (data, variables) => {
            // Invalidate queries for all affected wheels
            variables.forEach(({ wheelId }) => {
                queryClient.invalidateQueries(['wheel-status-history', wheelId]);
                queryClient.invalidateQueries(['wheel', wheelId]);
            });
            queryClient.invalidateQueries(['wheels']);
        },
        onError: (error) => {
            console.error('Bulk status update failed:', error);
        }
    });
}

// Hook for auto-updating all wheel statuses
export function useAutoUpdateAllWheels() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => WheelManagementService.autoUpdateAllWheelStatuses(),
        onSuccess: () => {
            // Invalidate all wheel-related queries since this affects all wheels
            queryClient.invalidateQueries(['wheels']);
            queryClient.invalidateQueries(['wheel-status-history']);
        },
        onError: (error) => {
            console.error('Auto-update all wheels failed:', error);
        }
    });
}

// Hook for fetching status transition validation
export function useStatusTransitionValidation(currentStatus, newStatus, metadata) {
    return useQuery({
        queryKey: ['status-transition-validation', currentStatus, newStatus, metadata],
        queryFn: () => WheelManagementService.validateStatusTransitionAdvanced(
            currentStatus,
            newStatus,
            metadata
        ),
        enabled: !!(currentStatus && newStatus && currentStatus !== newStatus),
        staleTime: 60000, // Validation rules don't change often
        cacheTime: 300000
    });
}

// Hook for fetching wheel status analytics
export function useWheelStatusAnalytics(timeRange = '30d') {
    return useQuery({
        queryKey: ['wheel-status-analytics', timeRange],
        queryFn: () => WheelManagementService.getStatusAnalytics(timeRange),
        staleTime: 300000, // Analytics can be cached longer
        cacheTime: 600000
    });
}

// Hook for real-time status monitoring
export function useStatusMonitoring(enabled = true, interval = 60000) {
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: ['status-monitoring'],
        queryFn: () => WheelManagementService.getStatusMonitoringData(),
        enabled,
        refetchInterval: interval,
        refetchIntervalInBackground: false,
        onSuccess: (data) => {
            // If there are status changes detected, invalidate related queries
            if (data?.changes_detected) {
                queryClient.invalidateQueries(['wheels']);
                data.changed_wheels?.forEach(wheelId => {
                    queryClient.invalidateQueries(['wheel', wheelId]);
                    queryClient.invalidateQueries(['wheel-status-history', wheelId]);
                });
            }
        }
    });
}

// Hook for status-based filtering and sorting
export function useWheelsByStatus(status, sortBy = 'last_updated') {
    return useQuery({
        queryKey: ['wheels-by-status', status, sortBy],
        queryFn: () => WheelManagementService.getWheelsByStatus(status, sortBy),
        enabled: !!status,
        staleTime: 30000,
        cacheTime: 300000
    });
}

// Hook for status change notifications
export function useStatusChangeNotifications() {
    return useQuery({
        queryKey: ['status-change-notifications'],
        queryFn: () => WheelManagementService.getStatusChangeNotifications(),
        refetchInterval: 30000, // Check for notifications every 30 seconds
        refetchIntervalInBackground: false
    });
}

// Hook for status history export
export function useStatusHistoryExport() {
    return useMutation({
        mutationFn: (params) => WheelManagementService.exportStatusHistory(params),
        onError: (error) => {
            console.error('Status history export failed:', error);
        }
    });
}
