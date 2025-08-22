/**
 * Backend-Proxied Schwab API Service
 * Routes all Schwab API calls through your Render backend
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
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    // Load tokens from localStorage if available
    this.loadTokensFromStorage();
  }

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
   * Handle OAuth callback (tokens are managed by backend)
   */
  async handleOAuthCallback(code: string): Promise<boolean> {
    try {
      // The backend handles the token exchange in its callback endpoint
      // Frontend just needs to check if authentication was successful
      const response = await fetch(`${API_BASE_URL}/schwab/callback?code=${code}`);
      return response.ok;
    } catch (error) {
      console.error('OAuth callback handling failed:', error);
      return false;
    }
  }

  /**
   * Get user's Schwab accounts through backend
   */
  async getAccounts(): Promise<SchwabAccount[]> {
    try {
      if (!this.accessToken && !await this.refreshTokenIfNeeded()) {
        throw new Error('Not authenticated with Schwab');
      }

      const response = await fetch(`${API_BASE_URL}/schwab/accounts?access_token=${this.accessToken}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('allocraft_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401 && await this.refreshTokenIfNeeded()) {
          // Retry with refreshed token
          return this.getAccounts();
        }
        throw new Error(`Failed to fetch accounts: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }
  }

  /**
   * Get positions for a specific account through backend
   */
  async getPositions(accountId: string): Promise<SchwabPosition[]> {
    try {
      if (!this.accessToken && !await this.refreshTokenIfNeeded()) {
        throw new Error('Not authenticated with Schwab');
      }

      const response = await fetch(
        `${API_BASE_URL}/schwab/accounts/${accountId}/positions?access_token=${this.accessToken}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('allocraft_token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401 && await this.refreshTokenIfNeeded()) {
          // Retry with refreshed token
          return this.getPositions(accountId);
        }
        throw new Error(`Failed to fetch positions: ${response.statusText}`);
      }

      const data = await response.json();
      return data.securitiesAccount?.positions || [];
    } catch (error) {
      console.error('Error fetching positions:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.tokenExpiry && this.tokenExpiry > new Date();
  }

  /**
   * Refresh access token using refresh token through backend
   */
  async refreshTokenIfNeeded(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    if (this.tokenExpiry && this.tokenExpiry > new Date()) {
      return true; // Token still valid
    }

    try {
      const response = await fetch(`${API_BASE_URL}/schwab/refresh-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('allocraft_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: this.refreshToken })
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const tokens = await response.json();
      this.saveTokens(tokens);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      return false;
    }
  }

  /**
   * Logout from Schwab
   */
  logout(): void {
    this.clearTokens();
  }

  /**
   * Save tokens to localStorage
   */
  private saveTokens(tokens: any): void {
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    this.tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

    if (this.accessToken) localStorage.setItem('schwab_access_token', this.accessToken);
    if (this.refreshToken) localStorage.setItem('schwab_refresh_token', this.refreshToken);
    localStorage.setItem('schwab_token_expiry', this.tokenExpiry.toISOString());
  }

  /**
   * Load tokens from localStorage
   */
  private loadTokensFromStorage(): void {
    this.accessToken = localStorage.getItem('schwab_access_token');
    this.refreshToken = localStorage.getItem('schwab_refresh_token');
    const expiryStr = localStorage.getItem('schwab_token_expiry');
    this.tokenExpiry = expiryStr ? new Date(expiryStr) : null;
  }

  /**
   * Clear all tokens
   */
  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;

    localStorage.removeItem('schwab_access_token');
    localStorage.removeItem('schwab_refresh_token');
    localStorage.removeItem('schwab_token_expiry');
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
