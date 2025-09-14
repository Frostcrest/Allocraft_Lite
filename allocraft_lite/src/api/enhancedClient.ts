/**
 * Enhanced API client with React Query integration and TypeScript support.
 */

// Silent logging function for API client
const apiLog = (...args: any[]) => {
    // Logging disabled for cleaner console
    // apiLog('[API]', ...args);
    void args; // Suppress unused parameter warning
};

import { QueryClient, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './fastapiClient';
import { getCachedApiBaseUrl } from '../utils/apiConfig';
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
    CreateWheelCycleRequest,
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
    wheelDetection: ['wheel-detection'],
    wheelDetectionResults: ['wheel-detection', 'results'],
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
 * Enhanced fetch with comprehensive diagnostic logging
 */
async function enhancedFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const requestId = Math.random().toString(36).substr(2, 9);
    const startTime = performance.now();

    // Disabled for cleaner console: console.group(`🔄 [${requestId}] API Request: ${path}`);
    apiLog('📊 Request Details:', {
        path,
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body ? 'Present' : 'None',
        timestamp: new Date().toISOString()
    });

    try {
        apiLog('📡 Calling apiFetch...');
        const response = await apiFetch(path, options);
        const responseTime = performance.now() - startTime;

        apiLog('📨 Response received:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            url: response.url,
            responseTime: `${responseTime.toFixed(2)}ms`
        });

        if (!response.ok) {
            apiLog('❌ Response not OK, parsing error data...');
            let errorData;
            try {
                errorData = await response.json();
                apiLog('📋 Error data:', errorData);
            } catch (parseError) {
                apiLog('⚠️ Failed to parse error response:', parseError);
                errorData = { message: response.statusText };
            }

            const apiError = new ApiError(
                errorData.message || errorData.detail || 'Request failed',
                response.status,
                errorData.code,
                { path, responseTime, errorData }
            );

            apiLog('🚨 Throwing ApiError:', apiError);
            // Disabled for cleaner console: console.groupEnd();
            throw apiError;
        }

        apiLog('✅ Parsing successful response...');
        const data = await response.json();
        apiLog('📦 Response data preview:', {
            type: Array.isArray(data) ? 'Array' : typeof data,
            keys: typeof data === 'object' ? Object.keys(data) : 'N/A',
            length: Array.isArray(data) ? data.length :
                (data && typeof data === 'object' && 'length' in data) ? data.length : 'N/A'
        });

        // Disabled for cleaner console: console.groupEnd();
        return data;
    } catch (error) {
        const responseTime = performance.now() - startTime;
        apiLog('💥 Request failed:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            responseTime: `${responseTime.toFixed(2)}ms`,
            path
        });
        // Disabled for cleaner console: console.groupEnd();

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
        queryFn: () => enhancedFetch<WheelCycle[]>('/wheels/wheel-cycles')
    });
};

/**
 * Hook for wheel detection from positions
 * Analyzes positions and detects wheel opportunities using the new detection endpoint
 */
export const useWheelDetection = () => {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, any>({
        mutationFn: async (detectionParams = {}) => {
            apiLog('🔍 useWheelDetection: Starting position analysis...', detectionParams);

            // Format request data according to WheelDetectionRequest model
            const requestData = {
                account_id: detectionParams.account_id || null,
                specific_tickers: detectionParams.specific_tickers || [],
                options: {
                    risk_tolerance: detectionParams.risk_tolerance || "moderate",
                    include_historical: detectionParams.include_historical || false,
                    cash_balance: detectionParams.cash_balance || null,
                    ...detectionParams.options
                }
            };

            const result = await enhancedFetch('/wheels/detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            apiLog('✅ useWheelDetection: Analysis complete', {
                opportunitiesFound: result?.length || 0,
                result: result
            });

            return result;
        },
        onSuccess: (data) => {
            apiLog('🎯 useWheelDetection: Detection successful', {
                resultsCount: data?.length || 0,
                results: data
            });

            // Optionally invalidate related queries
            queryClient.invalidateQueries({ queryKey: queryKeys.positions });
        },
        onError: (error) => {
            apiLog('❌ useWheelDetection: Detection failed', error);
        }
    });
};

/**
 * Hook for auto-refreshing wheel detection results
 * Provides cached detection results with optional auto-refresh during market hours
 */
export const useWheelDetectionResults = (options: {
    enabled?: boolean;
    refetchInterval?: number;
} = {}) => {
    const { enabled = true, refetchInterval = 30000 } = options;

    return useQuery<any>({
        queryKey: queryKeys.wheelDetectionResults,
        queryFn: async () => {
            apiLog('🔄 useWheelDetectionResults: Fetching cached results...');

            // This could fetch cached results from backend if available
            // For now, return empty results to indicate no cached data
            return {
                opportunities: [],
                analysis_date: null,
                market_context: null,
                cache_status: 'no_cache'
            };
        },
        enabled,
        refetchInterval: enabled ? refetchInterval : false,
        staleTime: 2 * 60 * 1000, // 2 minutes
        retry: 1
    });
};

export const useCreateWheelCycle = () => {
    const queryClient = useQueryClient();

    return useMutation<WheelCycle, ApiError, CreateWheelCycleRequest>({
        mutationFn: (wheelData) => enhancedFetch('/wheels/wheel-cycles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(wheelData)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.cycles });
        }
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
// WHEEL MANAGEMENT SERVICE HOOKS
// =====================

/**
 * Hook for updating wheel parameters through service layer
 */
export const useUpdateWheel = () => {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, { wheelId: string | number; updates: any }>({
        mutationFn: async ({ wheelId, updates }) => {
            const { WheelManagementService } = await import('../services/WheelManagementService.ts');
            return WheelManagementService.updateWheel(wheelId, updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.cycles });
        }
    });
};

/**
 * Hook for rolling wheel options through service layer
 */
export const useRollWheel = () => {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, { wheelId: string | number; rollData: any }>({
        mutationFn: async ({ wheelId, rollData }) => {
            const { WheelManagementService } = await import('../services/WheelManagementService');
            return WheelManagementService.rollWheel(wheelId, rollData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.cycles });
        }
    });
};

/**
 * Hook for closing wheel strategies through service layer
 */
export const useCloseWheel = () => {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, { wheelId: string | number; closeData: any }>({
        mutationFn: async ({ wheelId, closeData }) => {
            const { WheelManagementService } = await import('../services/WheelManagementService');
            return WheelManagementService.closeWheel(wheelId, closeData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.cycles });
        }
    });
};

/**
 * Hook for getting comprehensive wheel details through service layer
 */
export const useWheelDetails = (wheelId?: string | number) => {
    return useQuery<any>({
        queryKey: ['wheel-details', wheelId],
        queryFn: async () => {
            const { WheelManagementService } = await import('../services/WheelManagementService');
            return WheelManagementService.getWheelDetails(wheelId!);
        },
        enabled: !!wheelId,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
};

/**
 * Hook for getting wheel events through service layer
 */
export const useWheelEvents = (wheelId?: string | number) => {
    return useQuery<any[]>({
        queryKey: ['wheel-events', wheelId],
        queryFn: async () => {
            const { WheelManagementService } = await import('../services/WheelManagementService');
            return WheelManagementService.getWheelEvents(wheelId!);
        },
        enabled: !!wheelId,
        staleTime: 1 * 60 * 1000, // 1 minute
    });
};

/**
 * Hook for updating wheel status through service layer
 */
export const useUpdateWheelStatus = () => {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, { wheelId: string | number; status: string; context?: any }>({
        mutationFn: async ({ wheelId, status, context }) => {
            const { WheelManagementService } = await import('../services/WheelManagementService');
            return WheelManagementService.updateWheelStatus(wheelId, status, context);
        },
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

            const apiBaseUrl = await getCachedApiBaseUrl();
            const response = await fetch(`${apiBaseUrl}/auth/login`, {
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
            const apiBaseUrl = await getCachedApiBaseUrl();

            // First, register the user
            const signupResponse = await fetch(`${apiBaseUrl}/auth/register`, {
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

            const loginResponse = await fetch(`${apiBaseUrl}/auth/login`, {
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
        queryFn: async () => {
            apiLog('🔍 useStockPositions: Starting fetch...');
            const response = await enhancedFetch<{ value: UnifiedPosition[]; Count: number }>('/portfolio/positions/stocks');
            apiLog('📊 useStockPositions: Raw response:', response);
            console.log('[Schwab API] /portfolio/positions/stocks result:', response);

            // Backend returns { "value": [...], "Count": 7 } - extract the array
            if (response.value && Array.isArray(response.value)) {
                apiLog(`✅ useStockPositions: Extracted ${response.value.length} positions`);
                return response.value;
            }

            // Fallback if response is already an array
            if (Array.isArray(response)) {
                apiLog(`✅ useStockPositions: Direct array with ${response.length} positions`);
                return response;
            }

            console.warn('⚠️ useStockPositions: Unexpected response format, returning empty array');
            return [];
        },
        staleTime: 3 * 60 * 1000,
    });
};

/**
 * Get option positions with parsed data
 */
export const useOptionPositions = () => {
    return useQuery<UnifiedPosition[]>({
        queryKey: queryKeys.optionPositions,
        queryFn: async () => {
            apiLog('🔍 useOptionPositions: Starting fetch...');
            const response = await enhancedFetch<{ value: UnifiedPosition[]; Count: number }>('/portfolio/positions/options');
            apiLog('📊 useOptionPositions: Raw response:', response);
            console.log('[Schwab API] /portfolio/positions/options result:', response);

            // Backend returns { "value": [...], "Count": 16 } - extract the array
            if (response.value && Array.isArray(response.value)) {
                apiLog(`✅ useOptionPositions: Extracted ${response.value.length} positions`);
                return response.value;
            }

            // Fallback if response is already an array
            if (Array.isArray(response)) {
                apiLog(`✅ useOptionPositions: Direct array with ${response.length} positions`);
                return response;
            }

            console.warn('⚠️ useOptionPositions: Unexpected response format, returning empty array');
            return [];
        },
        staleTime: 3 * 60 * 1000,
    });
};

/**
 * Get portfolio summary with accounts and totals (optional endpoint)
 */
export const usePortfolioSummary = () => {
    return useQuery<{ accounts: UnifiedAccount[]; total_accounts: number }>({
        queryKey: queryKeys.portfolioSummary,
        queryFn: () => enhancedFetch<{ accounts: UnifiedAccount[]; total_accounts: number }>('/portfolio/summary'),
        staleTime: 5 * 60 * 1000, // 5 minutes for summary data
        retry: false, // Don't retry if endpoint doesn't exist
        enabled: false, // Disable this query since endpoint is not implemented
    });
};

/**
 * Import positions from JSON export
 */
export const useImportPositions = () => {
    const queryClient = useQueryClient();

    return useMutation<{ imported_count: number }, ApiError, any>({
        mutationFn: (importData) => enhancedFetch('/portfolio/import/positions', {
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
    return useQuery<{ status: string; message?: string }>({
        queryKey: ['backend', 'health'],
        queryFn: () => enhancedFetch<{ status: string; message?: string }>('/healthz'),
        staleTime: 1 * 60 * 1000, // 1 minute
        retry: 1, // Only retry once for health checks
    });
};

/**
 * Combined positions hook with comprehensive diagnostics
 */
export const usePositionsData = () => {
    apiLog('🎯 usePositionsData: Initializing data hooks...');

    const allPositions = useAllPositions();
    const stockPositions = useStockPositions();
    const optionPositions = useOptionPositions();
    const portfolioSummary = usePortfolioSummary();

    apiLog('📊 usePositionsData: Hook states:', {
        allPositions: {
            isLoading: allPositions.isLoading,
            isError: allPositions.isError,
            dataCount: allPositions.data?.positions?.length || 0,
            error: allPositions.error?.message
        },
        stockPositions: {
            isLoading: stockPositions.isLoading,
            isError: stockPositions.isError,
            dataCount: stockPositions.data?.length || 0,
            error: stockPositions.error?.message
        },
        optionPositions: {
            isLoading: optionPositions.isLoading,
            isError: optionPositions.isError,
            dataCount: optionPositions.data?.length || 0,
            error: optionPositions.error?.message
        }
    });

    // Log any errors in detail
    if (allPositions.isError) {
        apiLog('🚨 allPositions error:', allPositions.error);
    }
    if (stockPositions.isError) {
        apiLog('🚨 stockPositions error:', stockPositions.error);
    }
    if (optionPositions.isError) {
        apiLog('🚨 optionPositions error:', optionPositions.error);
    }

    const result = {
        allPositions: allPositions.data?.positions || [],
        stockPositions: stockPositions.data || [],
        optionPositions: optionPositions.data || [],
        portfolioSummary: portfolioSummary.data,
        isLoading: allPositions.isLoading || stockPositions.isLoading || optionPositions.isLoading,
        isError: allPositions.isError || stockPositions.isError || optionPositions.isError, // Exclude portfolioSummary.isError
        error: allPositions.error || stockPositions.error || optionPositions.error, // Exclude portfolioSummary.error
        refetch: () => {
            apiLog('🔄 usePositionsData: Refetching all data...');
            allPositions.refetch();
            stockPositions.refetch();
            optionPositions.refetch();
            // portfolioSummary.refetch(); // Skip refetch since it's disabled
        }
    };

    apiLog('✅ usePositionsData: Final result:', {
        allPositionsCount: result.allPositions.length,
        stockPositionsCount: result.stockPositions.length,
        optionPositionsCount: result.optionPositions.length,
        isLoading: result.isLoading,
        isError: result.isError,
        errorMessage: result.error?.message
    });

    return result;
};
