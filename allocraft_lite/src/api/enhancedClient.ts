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
import { UnifiedPosition, UnifiedAccount } from '../services/unifiedApi';

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
    dashboard: ['dashboard'],
    user: ['user', 'profile'],
    positions: ['positions'],
    stockPositions: ['positions', 'stocks'],
    optionPositions: ['positions', 'options'],
    portfolioSummary: ['portfolio', 'summary']
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
        queryFn: () => enhancedFetch<Option[]>('/portfolio/options')
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

// =====================
// DASHBOARD HOOKS
// =====================

export const useDashboardSnapshot = () => {
    return useQuery<any>({
        queryKey: queryKeys.dashboard,
        queryFn: () => enhancedFetch('/dashboard/snapshot'),
        staleTime: 2 * 60 * 1000, // 2 minutes - refresh more frequently for dashboard
    });
};

export const useDashboardData = () => {
    const stocks = useStocks();
    const options = useOptions();
    const wheels = useWheelCycles();
    const snapshot = useDashboardSnapshot();

    return {
        stocks: stocks.data || [],
        options: options.data || [],
        wheels: wheels.data || [],
        snapshot: snapshot.data,
        isLoading: stocks.isLoading || options.isLoading || wheels.isLoading || snapshot.isLoading,
        error: stocks.error || options.error || wheels.error || snapshot.error,
        refetch: () => {
            stocks.refetch();
            options.refetch();
            wheels.refetch();
            snapshot.refetch();
        }
    };
};

// =====================
// USER/AUTH HOOKS
// =====================

export const useUser = () => {
    return useQuery<any>({
        queryKey: queryKeys.user,
        queryFn: () => {
            const token = sessionStorage.getItem("allocraft_token");
            if (!token) throw new ApiError("Not authenticated", 401, "AUTH_REQUIRED");
            return enhancedFetch('/auth/me', { 
                headers: { Authorization: `Bearer ${token}` } 
            });
        },
        retry: (failureCount, error) => {
            // Don't retry on auth errors
            if (error instanceof ApiError && error.status === 401) return false;
            return failureCount < 2;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes - user data doesn't change often
    });
};

export const useLogout = () => {
    const queryClient = useQueryClient();
    
    return useMutation<void, ApiError, void>({
        mutationFn: () => {
            // Clear session storage
            sessionStorage.removeItem("allocraft_token");
            // Redirect to login
            window.location.href = "/login";
            return Promise.resolve();
        },
        onSuccess: () => {
            // Clear all cached data on logout
            queryClient.clear();
        }
    });
};

export const useLogin = () => {
    const queryClient = useQueryClient();
    
    return useMutation<{ access_token: string }, ApiError, { username: string; password: string }>({
        mutationFn: async ({ username, password }) => {
            const form = new URLSearchParams();
            form.append('username', username);
            form.append('password', password);
            
            const response = await fetch(`http://127.0.0.1:8000/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: form,
            });
            
            if (!response.ok) {
                let errorMessage = 'Login failed';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch {
                    errorMessage = await response.text() || errorMessage;
                }
                throw new ApiError(errorMessage, response.status, 'LOGIN_FAILED');
            }
            
            return await response.json();
        },
        onSuccess: (data) => {
            // Store the token
            sessionStorage.setItem('allocraft_token', data.access_token);
            // Signal post-login loading state for the dashboard
            try { 
                sessionStorage.setItem('allocraft_post_login_loading', '1'); 
            } catch { }
            // Invalidate user cache to refetch after login
            queryClient.invalidateQueries({ queryKey: queryKeys.user });
        }
    });
};

export const useSignup = () => {
    const queryClient = useQueryClient();
    
    return useMutation<{ access_token: string }, ApiError, { username: string; email: string; password: string }>({
        mutationFn: async ({ username, email, password }) => {
            // First, register the user
            const signupResponse = await fetch(`http://127.0.0.1:8000/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });
            
            if (!signupResponse.ok) {
                let errorMessage = 'Signup failed';
                try {
                    const errorData = await signupResponse.json();
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch {
                    errorMessage = await signupResponse.text() || errorMessage;
                }
                throw new ApiError(errorMessage, signupResponse.status, 'SIGNUP_FAILED');
            }
            
            // Auto-login after signup
            const form = new URLSearchParams();
            form.append('username', username);
            form.append('password', password);
            
            const loginResponse = await fetch(`http://127.0.0.1:8000/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: form,
            });
            
            if (!loginResponse.ok) {
                throw new ApiError('Signup successful but auto-login failed', loginResponse.status, 'AUTO_LOGIN_FAILED');
            }
            
            return await loginResponse.json();
        },
        onSuccess: (data) => {
            // Store the token
            sessionStorage.setItem('allocraft_token', data.access_token);
            // Signal post-login loading state for the dashboard
            try { 
                sessionStorage.setItem('allocraft_post_login_loading', '1'); 
            } catch { }
            // Invalidate user cache to refetch after login
            queryClient.invalidateQueries({ queryKey: queryKeys.user });
        }
    });
};

// =====================
// POSITION HOOKS (UNIFIED BACKEND)
// =====================

/**
 * Get all positions from unified backend
 */
export const useAllPositions = () => {
    return useQuery<{ total_positions: number; positions: UnifiedPosition[] }>({
        queryKey: queryKeys.positions,
        queryFn: () => enhancedFetch<{ total_positions: number; positions: UnifiedPosition[] }>('/portfolio/positions'),
        staleTime: 3 * 60 * 1000, // 3 minutes - positions change frequently
    });
};

/**
 * Get stock positions (EQUITY + COLLECTIVE_INVESTMENT)
 */
export const useStockPositions = () => {
    return useQuery<UnifiedPosition[]>({
        queryKey: queryKeys.stockPositions,
        queryFn: () => enhancedFetch<UnifiedPosition[]>('/portfolio/stocks'),
        staleTime: 3 * 60 * 1000,
    });
};

/**
 * Get option positions with parsed data
 */
export const useOptionPositions = () => {
    return useQuery<UnifiedPosition[]>({
        queryKey: queryKeys.optionPositions,
        queryFn: () => enhancedFetch<UnifiedPosition[]>('/portfolio/options'),
        staleTime: 3 * 60 * 1000,
    });
};

/**
 * Get portfolio summary with accounts and totals
 */
export const usePortfolioSummary = () => {
    return useQuery<{ accounts: UnifiedAccount[]; total_accounts: number }>({
        queryKey: queryKeys.portfolioSummary,
        queryFn: () => enhancedFetch<{ accounts: UnifiedAccount[]; total_accounts: number }>('/portfolio/summary'),
        staleTime: 5 * 60 * 1000, // 5 minutes for summary data
    });
};

/**
 * Import positions from JSON export
 */
export const useImportPositions = () => {
    const queryClient = useQueryClient();

    return useMutation<{ imported_count: number }, ApiError, any>({
        mutationFn: (importData) => enhancedFetch('/portfolio/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(importData)
        }),
        onSuccess: () => {
            // Invalidate all position-related queries
            queryClient.invalidateQueries({ queryKey: queryKeys.positions });
            queryClient.invalidateQueries({ queryKey: queryKeys.stockPositions });
            queryClient.invalidateQueries({ queryKey: queryKeys.optionPositions });
            queryClient.invalidateQueries({ queryKey: queryKeys.portfolioSummary });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
        }
    });
};

/**
 * Check backend health for unified API
 */
export const useBackendHealth = () => {
    return useQuery<{ status: string; message: string }>({
        queryKey: ['backend', 'health'],
        queryFn: () => enhancedFetch<{ status: string; message: string }>('/health'),
        staleTime: 1 * 60 * 1000, // 1 minute
        retry: 1, // Only retry once for health checks
    });
};

/**
 * Combined positions hook for easy consumption
 */
export const usePositionsData = () => {
    const allPositions = useAllPositions();
    const stockPositions = useStockPositions();
    const optionPositions = useOptionPositions();
    const portfolioSummary = usePortfolioSummary();

    return {
        allPositions: allPositions.data?.positions || [],
        stockPositions: stockPositions.data || [],
        optionPositions: optionPositions.data || [],
        portfolioSummary: portfolioSummary.data,
        isLoading: allPositions.isLoading || stockPositions.isLoading || optionPositions.isLoading || portfolioSummary.isLoading,
        isError: allPositions.isError || stockPositions.isError || optionPositions.isError || portfolioSummary.isError,
        error: allPositions.error || stockPositions.error || optionPositions.error || portfolioSummary.error,
        refetch: () => {
            allPositions.refetch();
            stockPositions.refetch();
            optionPositions.refetch();
            portfolioSummary.refetch();
        }
    };
};
