/**
 * Unified API Service
 * Connects to the unified backend Position/Account data model
 */

import { getApiBaseUrl } from '../utils/apiConfig';

export interface UnifiedPosition {
    id: number | string; // Backend returns number, allow both for compatibility
    symbol: string;
    asset_type: 'EQUITY' | 'OPTION' | 'COLLECTIVE_INVESTMENT';
    long_quantity: number;
    short_quantity: number;
    market_value: number;
    average_price: number;
    current_price?: number;
    data_source: 'manual' | 'schwab' | 'fidelity' | 'schwab_import';
    status: string;
    account_id?: number;
    // Additional backend fields
    current_day_profit_loss?: number;
    last_updated?: string;
    // Option-specific fields
    underlying_symbol?: string; // From backend for options
    ticker?: string; // Alternative field name
    option_type?: 'Call' | 'Put';
    strike_price?: number;
    expiration_date?: string;
    contracts?: number;
    // Additional UI fields
    profitLoss?: number;
    profitLossPercent?: number;
}

export interface UnifiedAccount {
    id: string;
    account_number: string;
    account_type: string;
    brokerage: string;
    total_value: number;
    cash_balance: number;
    position_count: number;
    last_synced: string | null;
}

export interface RefreshSummary {
    success: boolean;
    message: string;
    summary: {
        total_positions: number;
        stocks_updated: number;
        stocks_failed?: number;
        options_updated: number;
        options_failed?: number;
        market_value_recalculated: number;
        update_timestamp: string;
        failed_symbols?: string[];
    };
}

class UnifiedApiService {


    /**
     * Get all positions from unified backend (corrected endpoint)
     */
    async getAllPositions(): Promise<{ total_positions: number; positions: UnifiedPosition[] }> {
        try {
            const baseUrl = getApiBaseUrl();
            const response = await fetch(`${baseUrl}/portfolio/positions`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching unified positions:', error);
            throw error;
        }
    }

    /**
     * Get stock positions (EQUITY + COLLECTIVE_INVESTMENT)
     */
    async getStockPositions(): Promise<UnifiedPosition[]> {
        try {
            const baseUrl = getApiBaseUrl();
            const response = await fetch(`${baseUrl}/portfolio/positions/stocks`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Backend returns direct array - no need to extract from wrapper
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error fetching stock positions:', error);
            throw error;
        }
    }

    /**
     * Get option positions with parsed data
     */
    async getOptionPositions(): Promise<UnifiedPosition[]> {
        try {
            const baseUrl = getApiBaseUrl();
            const response = await fetch(`${baseUrl}/portfolio/positions/options`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Backend returns direct array - no need to extract from wrapper
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error fetching option positions:', error);
            throw error;
        }
    }

    /**
     * Get all accounts
     */
    async getAllAccounts(): Promise<{ total_accounts: number; accounts: UnifiedAccount[] }> {
        try {
            const baseUrl = getApiBaseUrl();
            const response = await fetch(`${baseUrl}/portfolio/accounts`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching unified accounts:', error);
            throw error;
        }
    }

    /**
     * Import positions (Schwab CSV format)
     */
    async importPositions(importData: any): Promise<{ message: string; imported_count: number }> {
        try {
            const baseUrl = getApiBaseUrl();
            const response = await fetch(`${baseUrl}/portfolio/import/positions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(importData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error importing positions:', error);
            throw error;
        }
    }

    /**
     * Check backend health
     */
    async checkHealth(): Promise<{ status: string }> {
        try {
            const baseUrl = getApiBaseUrl();
            const response = await fetch(`${baseUrl}/health`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error checking backend health:', error);
            throw error;
        }
    }

    /**
     * Refresh all portfolio prices (stocks and options)
     */
    async refreshAllPrices(): Promise<RefreshSummary> {
        try {
            const baseUrl = getApiBaseUrl();
            const response = await fetch(`${baseUrl}/portfolio/refresh-all-prices`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error refreshing all prices:', error);
            throw error;
        }
    }

    /**
     * Refresh prices for selected positions only
     */
    async refreshSelectedPrices(positionIds: number[]): Promise<RefreshSummary> {
        try {
            const baseUrl = getApiBaseUrl();
            const response = await fetch(`${baseUrl}/portfolio/refresh-selected-prices`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(positionIds),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error refreshing selected prices:', error);
            throw error;
        }
    }
}

export const unifiedApi = new UnifiedApiService();
