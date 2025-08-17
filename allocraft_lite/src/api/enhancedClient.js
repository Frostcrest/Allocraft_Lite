/**
 * Enhanced API client with React Query integration and error handling.
 * 
 * This module provides:
 * - Type-safe API calls with TypeScript
 * - Consistent error handling
 * - Request/response logging
 * - Automatic retries and caching via React Query
 * - Request deduplication
 */

import { QueryClient, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE, apiFetch } from './fastapiClient';

// Enhanced error handling
export class ApiError extends Error {
    constructor(message, status, code, context = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.context = context;
        this.timestamp = new Date().toISOString();
    }
}

// Query client with optimized defaults
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
            retry: (failureCount, error) => {
                // Don't retry on client errors
                if (error.status >= 400 && error.status < 500) return false;
                return failureCount < 3;
            },
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
        },
        mutations: {
            retry: 1,
        }
    }
});

// Query key factory for consistent cache keys
export const queryKeys = {
    // Wheel strategies
    cycles: ['wheel-cycles'],
    cycle: (id) => ['wheel-cycles', id],
    cycleEvents: (id) => ['wheel-cycles', id, 'events'],
    cycleLots: (id) => ['wheel-cycles', id, 'lots'],
    cycleMetrics: (id) => ['wheel-cycles', id, 'metrics'],

    // Stocks
    stocks: ['stocks'],
    stock: (id) => ['stocks', id],

    // Options
    options: ['options'],
    option: (id) => ['options', id],

    // Dashboard
    dashboard: ['dashboard'],

    // User
    user: ['user', 'me'],

    // Tickers
    tickers: ['tickers'],
    tickerPrice: (symbol) => ['tickers', symbol, 'price'],
    tickerExpiries: (symbol) => ['tickers', symbol, 'expiries'],
};

/**
 * Enhanced fetch with automatic error conversion and logging
 */
async function enhancedFetch(path, options = {}) {
    const startTime = performance.now();

    try {
        const response = await apiFetch(path, options);
        const duration = performance.now() - startTime;

        // Log successful requests in development
        if (import.meta.env.DEV) {
            console.log(`API ${options.method || 'GET'} ${path} - ${response.status} (${duration.toFixed(0)}ms)`);
        }

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { message: response.statusText };
            }

            throw new ApiError(
                errorData.message || errorData.detail || 'Request failed',
                response.status,
                errorData.code || 'API_ERROR',
                {
                    path,
                    method: options.method || 'GET',
                    duration,
                    ...errorData.context
                }
            );
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        }
        return response.text();

    } catch (error) {
        const duration = performance.now() - startTime;

        if (error instanceof ApiError) {
            throw error;
        }

        // Handle network errors
        throw new ApiError(
            error.message || 'Network error',
            0,
            'NETWORK_ERROR',
            { path, method: options.method || 'GET', duration }
        );
    }
}

// Enhanced wheel API with React Query hooks
export const useWheelCycles = (options = {}) => {
    return useQuery({
        queryKey: queryKeys.cycles,
        queryFn: () => enhancedFetch('/wheels/wheel-cycles'),
        ...options
    });
};

export const useWheelCycle = (cycleId, options = {}) => {
    return useQuery({
        queryKey: queryKeys.cycle(cycleId),
        queryFn: () => enhancedFetch(`/wheels/wheel-cycles/${cycleId}`),
        enabled: !!cycleId,
        ...options
    });
};

export const useWheelEvents = (cycleId, options = {}) => {
    return useQuery({
        queryKey: queryKeys.cycleEvents(cycleId),
        queryFn: () => enhancedFetch(`/wheels/wheel-events?cycle_id=${cycleId}`),
        enabled: !!cycleId,
        ...options
    });
};

export const useWheelLots = (cycleId, options = {}) => {
    return useQuery({
        queryKey: queryKeys.cycleLots(cycleId),
        queryFn: () => enhancedFetch(`/wheels/cycles/${cycleId}/lots`),
        enabled: !!cycleId,
        ...options
    });
};

export const useWheelMetrics = (cycleId, options = {}) => {
    return useQuery({
        queryKey: queryKeys.cycleMetrics(cycleId),
        queryFn: () => enhancedFetch(`/wheels/cycles/${cycleId}/metrics`),
        enabled: !!cycleId,
        ...options
    });
};

// Optimized hook for getting all wheel data for a ticker
export const useWheelDataForTicker = (ticker, options = {}) => {
    return useQuery({
        queryKey: ['wheel-data', ticker],
        queryFn: async () => {
            // This would call the new optimized endpoint
            return enhancedFetch(`/wheels/ticker/${ticker}/data`);
        },
        enabled: !!ticker,
        staleTime: 2 * 60 * 1000, // 2 minutes for aggregated data
        ...options
    });
};

// Mutation hooks for creating/updating data
export const useCreateWheelCycle = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (cycleData) => enhancedFetch('/wheels/wheel-cycles', {
            method: 'POST',
            body: JSON.stringify(cycleData)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries(queryKeys.cycles);
        },
        onError: (error) => {
            console.error('Failed to create wheel cycle:', error);
        }
    });
};

export const useCreateWheelEvent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (eventData) => enhancedFetch('/wheels/wheel-events', {
            method: 'POST',
            body: JSON.stringify(eventData)
        }),
        onSuccess: (data, variables) => {
            // Invalidate related queries
            queryClient.invalidateQueries(queryKeys.cycleEvents(variables.cycle_id));
            queryClient.invalidateQueries(queryKeys.cycleLots(variables.cycle_id));
            queryClient.invalidateQueries(queryKeys.cycleMetrics(variables.cycle_id));

            // Also invalidate ticker-level data if we have it
            queryClient.invalidateQueries(['wheel-data']);
        },
        onError: (error) => {
            console.error('Failed to create wheel event:', error);
        }
    });
};

export const useUpdateWheelEvent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ eventId, eventData }) => enhancedFetch(`/wheels/wheel-events/${eventId}`, {
            method: 'PUT',
            body: JSON.stringify(eventData)
        }),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries(queryKeys.cycleEvents(variables.eventData.cycle_id));
            queryClient.invalidateQueries(queryKeys.cycleLots(variables.eventData.cycle_id));
            queryClient.invalidateQueries(queryKeys.cycleMetrics(variables.eventData.cycle_id));
        }
    });
};

export const useRebuildLots = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (cycleId) => enhancedFetch(`/wheels/cycles/${cycleId}/rebuild-lots`, {
            method: 'POST'
        }),
        onSuccess: (data, cycleId) => {
            queryClient.invalidateQueries(queryKeys.cycleLots(cycleId));
            queryClient.invalidateQueries(queryKeys.cycleMetrics(cycleId));
        }
    });
};

// Stock hooks
export const useStocks = (options = {}) => {
    return useQuery({
        queryKey: queryKeys.stocks,
        queryFn: () => enhancedFetch('/stocks'),
        ...options
    });
};

export const useCreateStock = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (stockData) => enhancedFetch('/stocks', {
            method: 'POST',
            body: JSON.stringify(stockData)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries(queryKeys.stocks);
            queryClient.invalidateQueries(queryKeys.dashboard);
        }
    });
};

// Dashboard hooks
export const useDashboard = (options = {}) => {
    return useQuery({
        queryKey: queryKeys.dashboard,
        queryFn: () => enhancedFetch('/dashboard'),
        staleTime: 1 * 60 * 1000, // 1 minute
        ...options
    });
};

// User hooks
export const useUser = (options = {}) => {
    return useQuery({
        queryKey: queryKeys.user,
        queryFn: () => enhancedFetch('/auth/me'),
        retry: false, // Don't retry auth failures
        ...options
    });
};

// Utility hooks for common operations
export const useRefreshPrices = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (tickers = []) => enhancedFetch('/dashboard/refresh-prices', {
            method: 'POST',
            body: JSON.stringify({ tickers })
        }),
        onSuccess: () => {
            // Invalidate all price-related queries
            queryClient.invalidateQueries(queryKeys.stocks);
            queryClient.invalidateQueries(queryKeys.dashboard);
            queryClient.invalidateQueries(['wheel-data']);
        }
    });
};

// Prefetch utilities for performance
export const prefetchWheelData = (queryClient, ticker) => {
    return queryClient.prefetchQuery({
        queryKey: ['wheel-data', ticker],
        queryFn: () => enhancedFetch(`/wheels/ticker/${ticker}/data`),
        staleTime: 2 * 60 * 1000
    });
};

export const prefetchDashboard = (queryClient) => {
    return queryClient.prefetchQuery({
        queryKey: queryKeys.dashboard,
        queryFn: () => enhancedFetch('/dashboard'),
        staleTime: 1 * 60 * 1000
    });
};

// Error boundary helper
export const isApiError = (error) => error instanceof ApiError;

export const getErrorMessage = (error) => {
    if (isApiError(error)) {
        return error.message;
    }
    if (error?.message) {
        return error.message;
    }
    return 'An unexpected error occurred';
};

export const getErrorCode = (error) => {
    if (isApiError(error)) {
        return error.code;
    }
    return 'UNKNOWN_ERROR';
};
