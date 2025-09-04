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
  async getStatus(): Promise<{ connected: boolean, has_access_token: boolean, has_refresh_token: boolean, token_expires_at: string | null }> {
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

// Add new methods for stored position management

export const getStoredPositions = async (fresh: boolean = false) => {
  try {
    const response = await fetch(`${API_BASE_URL}/schwab/positions?fresh=${fresh}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('allocraft_token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get stored positions: ${response.status}`);
    }

    const data = await response.json();
    console.log('📊 Stored positions retrieved:', data);
    return data;
  } catch (error) {
    console.error('❌ Error getting stored positions:', error);
    throw error;
  }
};

export const syncPositions = async (force: boolean = false) => {
  try {
    console.log(`🔄 ${force ? 'Force ' : ''}syncing positions...`);

    const response = await fetch(`${API_BASE_URL}/schwab/sync?force=${force}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('allocraft_token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to sync positions: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Position sync completed:', data);
    return data;
  } catch (error) {
    console.error('❌ Error syncing positions:', error);
    throw error;
  }
};

export const getSyncStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/schwab/sync-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('allocraft_token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get sync status: ${response.status}`);
    }

    const data = await response.json();
    console.log('📋 Sync status retrieved:', data);
    return data;
  } catch (error) {
    console.error('❌ Error getting sync status:', error);
    throw error;
  }
};

// ========================================
// MOCK DATA FUNCTIONS FOR DEVELOPMENT
// ========================================

export const getMockPositions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/schwab/mock/positions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get mock positions: ${response.status}`);
    }

    const data = await response.json();
    console.log('🎭 Mock positions retrieved:', data);
    return data;
  } catch (error) {
    console.error('❌ Error getting mock positions:', error);
    throw error;
  }
};

export const loadMockData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/schwab/mock/load-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load mock data: ${response.status}`);
    }

    const data = await response.json();
    console.log('🎭 Mock data loaded successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Error loading mock data:', error);
    throw error;
  }
};

export const mockSyncPositions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/schwab/mock/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to mock sync positions: ${response.status}`);
    }

    const data = await response.json();
    console.log('🎭 Mock sync completed:', data);
    return data;
  } catch (error) {
    console.error('❌ Error with mock sync:', error);
    throw error;
  }
};

// Export positions (for production use)
export const exportPositions = async () => {
  try {
    console.log('🔄 Starting position export...');

    const response = await fetch(`${API_BASE_URL}/schwab/export/positions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`📡 Export response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Export response error:', errorText);
      throw new Error(`Failed to export positions: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📤 Positions exported successfully!');
    console.log(`📊 Export summary: ${data.export_info?.total_accounts || 0} accounts, ${data.export_info?.total_positions || 0} positions`);

    // Log data structure for debugging
    if (data.accounts && data.accounts.length > 0) {
      console.log('🏦 Sample account structure:', {
        account_keys: Object.keys(data.accounts[0]),
        first_account: data.accounts[0].account_number,
        position_count: data.accounts[0].positions?.length || 0
      });

      if (data.accounts[0].positions && data.accounts[0].positions.length > 0) {
        console.log('📈 Sample position structure:', {
          position_keys: Object.keys(data.accounts[0].positions[0]),
          first_position: data.accounts[0].positions[0].symbol
        });
      }
    }

    return data;
  } catch (error) {
    console.error('❌ Error exporting positions:', error);
    throw error;
  }
};

// Import positions (for development use)
export const importPositions = async (importData: any) => {
  try {
    console.log('🔄 Starting position import...');
    console.log('📋 Import data summary:', {
      accounts: importData.accounts?.length || 0,
      total_positions: importData.export_info?.total_positions || 0,
      export_timestamp: importData.export_info?.export_timestamp
    });

    // Validate import data structure
    if (!importData.accounts || !Array.isArray(importData.accounts)) {
      throw new Error('Invalid import data: missing accounts array');
    }

    // console.log('📡 Sending import request...');
    const response = await fetch(`${API_BASE_URL}/schwab/import/positions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(importData),
    });

    console.log(`📡 Import response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Import response error:', errorText);
      throw new Error(`Failed to import positions: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📥 Positions imported successfully!');
    console.log(`📊 Import result: ${data.accounts_created || 0} accounts, ${data.positions_created || 0} positions`);
    return data;
  } catch (error) {
    console.error('❌ Error importing positions:', error);
    throw error;
  }
};

// Helper function to check if we're in development mode
export const isDevelopmentMode = (): boolean => {
  return API_BASE_URL.includes('localhost') ||
    API_BASE_URL.includes('127.0.0.1') ||
    (import.meta as any).env?.DEV === true;
};
