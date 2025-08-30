/**
 * Enhanced API client with React Query integration and TypeScript support.
 */

import { QueryClient, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './fastapiClient';
import {
    Stock,
    Option,
    WheelCycle,
    WheelTickerData,
    CreateStockRequest,
    UpdateStockRequest,
    CreateOptionRequest,
    UpdateOptionRequest,
    CreateWheelEventRequest,
    StockSector
} from '../types';

// Enhanced error handling
export class ApiError extends Error {
    public status?: number;
    public code?: string;
    public context: Record<string, any>;
    public timestamp: string;

    constructor(message: string, status?: number, code?: string, context: Record<string, any> = {}) {
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
            gcTime: 10 * 60 * 1000, // 10 minutes
            retry: (failureCount, error) => {
                if (error instanceof ApiError && error.status && error.status >= 400 && error.status < 500) return false;
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

// Query key factory
export const queryKeys = {
    cycles: ['wheel-cycles'],
    stocks: ['stocks'],
    stockSectors: ['stocks', 'sectors'],
    options: ['options'],
    optionExpiries: ['options', 'expiries'],
};

/**
 * Enhanced fetch with proper TypeScript typing
 */
async function enhancedFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    try {
        const response = await apiFetch(path, options);

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
                errorData.code
            );
        }

        return await response.json();
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(
            error instanceof Error ? error.message : 'Network error',
            0,
            'NETWORK_ERROR'
        );
    }
}

// =====================
// STOCK HOOKS
// =====================

export const useStocks = () => {
    return useQuery<Stock[]>({
        queryKey: queryKeys.stocks,
        queryFn: () => enhancedFetch<Stock[]>('/stocks/')
    });
};

export const useStockSectors = () => {
    return useQuery<StockSector[]>({
        queryKey: queryKeys.stockSectors,
        queryFn: () => enhancedFetch<StockSector[]>('/stocks/sectors/')
    });
};

export const useCreateStock = () => {
    const queryClient = useQueryClient();

    return useMutation<Stock, ApiError, CreateStockRequest>({
        mutationFn: (stockData) => enhancedFetch<Stock>('/stocks/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stockData)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.stocks });
            queryClient.invalidateQueries({ queryKey: queryKeys.stockSectors });
        }
    });
};

export const useUpdateStock = () => {
    const queryClient = useQueryClient();

    return useMutation<Stock, ApiError, { id: number; data: UpdateStockRequest }>({
        mutationFn: ({ id, data }) => enhancedFetch<Stock>(`/stocks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.stocks });
            queryClient.invalidateQueries({ queryKey: queryKeys.stockSectors });
        }
    });
};

export const useDeleteStock = () => {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, number>({
        mutationFn: (id) => enhancedFetch(`/stocks/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.stocks });
            queryClient.invalidateQueries({ queryKey: queryKeys.stockSectors });
        }
    });
};

export const useRefreshStockPrices = () => {
    const queryClient = useQueryClient();

    return useMutation<{ updated: number }, ApiError>({
        mutationFn: () => enhancedFetch('/stocks/refresh-prices/', { method: 'POST' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.stocks });
        }
    });
};

// =====================
// OPTION HOOKS
// =====================

export const useOptions = () => {
    return useQuery<Option[]>({
        queryKey: queryKeys.options,
        queryFn: () => enhancedFetch<Option[]>('/options/')
    });
};

export const useOptionExpiries = () => {
    return useQuery<string[]>({
        queryKey: queryKeys.optionExpiries,
        queryFn: () => enhancedFetch<string[]>('/options/expiries/')
    });
};

export const useCreateOption = () => {
    const queryClient = useQueryClient();

    return useMutation<Option, ApiError, CreateOptionRequest>({
        mutationFn: (optionData) => enhancedFetch<Option>('/options/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(optionData)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.options });
            queryClient.invalidateQueries({ queryKey: queryKeys.optionExpiries });
        }
    });
};

export const useUpdateOption = () => {
    const queryClient = useQueryClient();

    return useMutation<Option, ApiError, { id: number; data: UpdateOptionRequest }>({
        mutationFn: ({ id, data }) => enhancedFetch<Option>(`/options/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.options });
        }
    });
};

export const useDeleteOption = () => {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, number>({
        mutationFn: (id) => enhancedFetch(`/options/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.options });
        }
    });
};

export const useRefreshOptionPrices = () => {
    const queryClient = useQueryClient();

    return useMutation<{ updated: number }, ApiError>({
        mutationFn: () => enhancedFetch('/options/refresh-prices/', { method: 'POST' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.options });
        }
    });
};

// =====================
// WHEEL HOOKS
// =====================

export const useWheelCycles = () => {
    return useQuery<WheelCycle[]>({
        queryKey: queryKeys.cycles,
        queryFn: () => enhancedFetch<WheelCycle[]>('/wheels/')
    });
};

export const useWheelDataForTicker = (ticker?: string) => {
    return useQuery<WheelTickerData>({
        queryKey: ['wheel-data', ticker],
        queryFn: () => enhancedFetch<WheelTickerData>(`/wheels/${ticker}/data`),
        enabled: !!ticker
    });
};

export const useCreateWheelEvent = () => {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, CreateWheelEventRequest>({
        mutationFn: (eventData) => enhancedFetch('/wheels/events/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.cycles });
        }
    });
};
