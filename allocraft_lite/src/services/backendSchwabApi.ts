/**
 * Backend-Proxied Schwab API Service
 * Routes all Schwab API calls through your Render backend
 * Backend manages all tokens and authentication
 */

import { fetchJson } from '../api/fastapiClient';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://allocraft-backend.onrender.com';

export interface SchwabAccount {
  accountId: string;
  type: string;
  roundTrips: number;
  isDayTrader: boolean;
  isClosingOnlyRestricted: boolean;
  positions: SchwabPosition[];
  initialBalances: {
    accruedInterest: number;
    availableFundsNonMarginableTrade: number;
    bondValue: number;
    buyingPower: number;
    cashBalance: number;
    cashAvailableForTrading: number;
    cashReceipts: number;
    dayTradingBuyingPower: number;
    dayTradingBuyingPowerCall: number;
    liquidationValue: number;
    totalCash: number;
    accountValue: number;
  };
}

export interface SchwabPosition {
  instrument: {
    symbol: string;
    cusip: string;
    description: string;
    assetType: string;
  };
  quantity: number;
  averagePrice: number;
  currentDayProfitLoss: number;
  currentDayProfitLossPercentage: number;
  longQuantity: number;
  shortQuantity: number;
  marketValue: number;
}

export class BackendSchwabApiService {
  /**
   * Get authorization URL from backend
   */
  async getAuthUrl(): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/schwab/auth-url`);
    if (!response.ok) {
      throw new Error(`Failed to get auth URL: ${response.statusText}`);
    }
    const data = await response.json();
    return data.auth_url;
  }

  /**
   * Start the OAuth flow by redirecting to backend auth URL
   */
  async initiateOAuth(): Promise<void> {
    try {
      const authUrl = await this.getAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to initiate OAuth:', error);
      throw error;
    }
  }

  /**
   * Get user's Schwab accounts through backend
   * Backend manages all token handling
   */
  async getAccounts(): Promise<SchwabAccount[]> {
    try {
      return await fetchJson('/schwab/accounts');
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }
  }

  /**
   * Get positions for a specific account through backend
   * Backend manages all token handling
   */
  async getPositions(accountId: string): Promise<SchwabPosition[]> {
    try {
      const data = await fetchJson(`/schwab/accounts/${accountId}/positions`);
      return data.securitiesAccount?.positions || [];
    } catch (error) {
      console.error('Error fetching positions:', error);
      throw error;
    }
  }

  /**
   * Check Schwab connection status
   */
  async getStatus(): Promise<{ connected: boolean, has_access_token: boolean, has_refresh_token: boolean, token_expires_at: string | null }> {
    try {
      return await fetchJson('/schwab/status');
    } catch (error) {
      console.error('Error checking Schwab status:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated with Schwab
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.connected;
    } catch (error) {
      return false;
    }
  }

  /**
   * Refresh access token using refresh token through backend
   */
  async refreshToken(): Promise<boolean> {
    try {
      await fetchJson('/schwab/refresh-token', { method: 'POST' });
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Disconnect from Schwab
   */
  async disconnect(): Promise<void> {
    try {
      await fetchJson('/schwab/disconnect', { method: 'DELETE' });
    } catch (error) {
      console.error('Error disconnecting from Schwab:', error);
      throw error;
    }
  }

  /**
   * Check backend health and configuration
   */
  async checkHealth(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/schwab/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    return await response.json();
  }
}

// Export singleton instance
export const backendSchwabApi = new BackendSchwabApiService();
