/**
 * Backend-Proxied Schwab API Service
 * Routes all Schwab API calls through your Render backend
 * Backend manages all tokens and authentication
 */

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://allocraft-backend.onrender.com';

// Account list response interface (from GET /accounts)
export interface SchwabAccountSummary {
  accountNumber: string;
  hashValue: string;
}

// Individual account response interface (from GET /accounts/{hashValue})
export interface SchwabAccount {
  securitiesAccount: {
    accountNumber: string;
    type: string;
    roundTrips: number;
    isDayTrader: boolean;
    isClosingOnlyRestricted: boolean;
    pfcbFlag: boolean;
    positions?: SchwabPosition[];
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
      dayTradingEquityCall: number;
      equity: number;
      equityPercentage: number;
      liquidationValue: number;
      longMarginValue: number;
      longOptionMarketValue: number;
      longStockValue: number;
      maintenanceCall: number;
      maintenanceRequirement: number;
      margin: number;
      marginEquity: number;
      moneyMarketFund: number;
      mutualFundValue: number;
      regTCall: number;
      shortMarginValue: number;
      shortOptionMarketValue: number;
      shortStockValue: number;
      totalCash: number;
      isInCall: boolean;
      pendingDeposits: number;
      marginBalance: number;
      shortBalance: number;
      accountValue: number;
    };
    currentBalances: {
      accruedInterest: number;
      cashBalance: number;
      cashReceipts: number;
      longOptionMarketValue: number;
      liquidationValue: number;
      longMarketValue: number;
      moneyMarketFund: number;
      savings: number;
      shortMarketValue: number;
      pendingDeposits: number;
      mutualFundValue: number;
      bondValue: number;
      shortOptionMarketValue: number;
      availableFunds: number;
      availableFundsNonMarginableTrade: number;
      buyingPower: number;
      buyingPowerNonMarginableTrade: number;
      dayTradingBuyingPower: number;
      equity: number;
      equityPercentage: number;
      longMarginValue: number;
      maintenanceCall: number;
      maintenanceRequirement: number;
      marginBalance: number;
      regTCall: number;
      shortBalance: number;
      shortMarginValue: number;
      sma: number;
    };
    projectedBalances: {
      availableFunds: number;
      availableFundsNonMarginableTrade: number;
      buyingPower: number;
      dayTradingBuyingPower: number;
      dayTradingBuyingPowerCall: number;
      maintenanceCall: number;
      regTCall: number;
      isInCall: boolean;
      stockBuyingPower: number;
    };
  };
  aggregatedBalance: {
    currentLiquidationValue: number;
    liquidationValue: number;
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
   * Get accounts with positions included
   */
  async getAccountsWithPositions(): Promise<SchwabAccount[]> {
    console.log('🔍 Fetching accounts with positions from backend...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/schwab/accounts-with-positions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('allocraft_token')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📡 Backend accounts-with-positions response status: ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.log(`❌ Backend error response: ${JSON.stringify(errorData)}`);
        throw new Error(`Failed to fetch accounts with positions: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ Accounts with positions data received:`, data);
      
      return data;
    } catch (error) {
      console.error('❌ Error fetching accounts with positions:', error);
      throw error;
    }
  }

  /**
   * Get user's Schwab account summaries (returns accountNumber and hashValue)
   */
  async getAccountSummaries(): Promise<SchwabAccountSummary[]> {
    try {
      console.log('🔍 Fetching Schwab account summaries from backend...');
      const response = await fetch(`${API_BASE_URL}/schwab/accounts`, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('allocraft_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Backend account summaries response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Account summaries data received:', data);
        return data;
      } else if (response.status === 401 || response.status === 403) {
        const errorText = await response.text();
        console.log('❌ Authentication error:', errorText);
        throw new Error('Authentication failed');
      } else {
        const errorText = await response.text();
        console.log('❌ Backend error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error fetching account summaries:', error);
      throw error;
    }
  }

  /**
   * Get full account details by hash value
   */
  async getAccountByHash(hashValue: string): Promise<SchwabAccount> {
    try {
      console.log(`🔍 Fetching account details for hash: ${hashValue}`);
      const response = await fetch(`${API_BASE_URL}/schwab/accounts/${hashValue}`, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('allocraft_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📡 Backend account details response status: ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.log(`❌ Backend error response: ${JSON.stringify(errorData)}`);
        throw new Error(`Failed to fetch account details: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Account details received:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Error fetching account details:', error);
      throw error;
    }
  }

  /**
   * Get user's Schwab accounts through backend (legacy method)
   * Backend manages all token handling
   */
  async getAccounts(): Promise<SchwabAccount[]> {
    try {
      console.log('🔍 Fetching Schwab accounts from backend...');
      const response = await fetch(`${API_BASE_URL}/schwab/accounts`, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('allocraft_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Backend accounts response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Accounts data received:', data);
        return data;
      } else if (response.status === 401 || response.status === 403) {
        const errorText = await response.text();
        console.error('❌ Authentication error:', errorText);
        throw new Error('Not authenticated with Allocraft');
      } else {
        const errorText = await response.text();
        console.error('❌ Backend error response:', errorText);
        throw new Error(`Failed to fetch accounts: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error fetching accounts:', error);
      throw error;
    }
  }

  /**
   * Get positions for a specific account through backend
   * Backend manages all token handling
   */
  async getPositions(accountId: string): Promise<SchwabPosition[]> {
    try {
      console.log(`🔍 Fetching positions for account ${accountId}...`);
      const response = await fetch(`${API_BASE_URL}/schwab/accounts/${accountId}/positions`, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('allocraft_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📡 Backend positions response status for ${accountId}:`, response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Positions data received for ${accountId}:`, data);
        const positions = data.securitiesAccount?.positions || [];
        console.log(`📊 Extracted ${positions.length} positions for ${accountId}`);
        return positions;
      } else if (response.status === 401 || response.status === 403) {
        const errorText = await response.text();
        console.error('❌ Authentication error:', errorText);
        throw new Error('Not authenticated with Allocraft');
      } else {
        const errorText = await response.text();
        console.error(`❌ Backend error response for ${accountId}:`, errorText);
        throw new Error(`Failed to fetch positions: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Error fetching positions for ${accountId}:`, error);
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
