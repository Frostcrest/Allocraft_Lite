/**
 * Backend-Proxied Schwab API Service
 * Routes all Schwab API calls through your Render backend
 * Backend manages all tokens and authentication
 */

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
    const response = await fetch(`${API_BASE_URL}/schwab/auth-url`, {
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('allocraft_token')}`,
        'Content-Type': 'application/json'
      }
    });
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
      const response = await fetch(`${API_BASE_URL}/schwab/accounts`, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('allocraft_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        return await response.json();
      } else if (response.status === 401 || response.status === 403) {
        throw new Error('Not authenticated with Allocraft');
      } else {
        throw new Error(`Failed to fetch accounts: ${response.statusText}`);
      }
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
      const response = await fetch(`${API_BASE_URL}/schwab/accounts/${accountId}/positions`, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('allocraft_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.securitiesAccount?.positions || [];
      } else if (response.status === 401 || response.status === 403) {
        throw new Error('Not authenticated with Allocraft');
      } else {
        throw new Error(`Failed to fetch positions: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
      throw error;
    }
  }

  /**
   * Check Schwab connection status
   */
  async getStatus(): Promise<{connected: boolean, has_access_token: boolean, has_refresh_token: boolean, token_expires_at: string | null}> {
    try {
      const response = await fetch(`${API_BASE_URL}/schwab/status`, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('allocraft_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        return await response.json();
      } else if (response.status === 401 || response.status === 403) {
        // User not authenticated with main app, return disconnected status
        return {
          connected: false,
          has_access_token: false, 
          has_refresh_token: false,
          token_expires_at: null
        };
      } else {
        throw new Error(`Status check failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error checking Schwab status:', error);
      // Return disconnected status on any error
      return {
        connected: false,
        has_access_token: false,
        has_refresh_token: false, 
        token_expires_at: null
      };
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
      const response = await fetch(`${API_BASE_URL}/schwab/refresh-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('allocraft_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.ok;
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
      const response = await fetch(`${API_BASE_URL}/schwab/disconnect`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('allocraft_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok && response.status !== 401 && response.status !== 403) {
        throw new Error(`Disconnect failed: ${response.statusText}`);
      }
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
