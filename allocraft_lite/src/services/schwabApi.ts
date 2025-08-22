/**
 * Schwab API Integration Service
 * Handles OAuth authentication and API calls to Charles Schwab
 */

// Schwab API Configuration
const SCHWAB_CONFIG = {
    // Production Schwab API endpoints
    authUrl: 'https://api.schwabapi.com/v1/oauth/authorize',
    tokenUrl: 'https://api.schwabapi.com/v1/oauth/token',
    baseUrl: 'https://api.schwabapi.com',
    // Trading and Account Management endpoints
    accountsEndpoint: 'https://api.schwabapi.com/trader/v1/accounts',
    positionsEndpoint: 'https://api.schwabapi.com/trader/v1/accounts',
    // Market Data endpoints  
    marketDataEndpoint: 'https://api.schwabapi.com/marketdata/v1',
    // These will be set from environment variables
    clientId: (import.meta as any).env?.VITE_SCHWAB_CLIENT_ID || 'z39NyhcZwoSlmpZNYstf38Fidd0V0HeTWGMfD9AhWGUj0uOG',
    clientSecret: (import.meta as any).env?.VITE_SCHWAB_CLIENT_SECRET || 'Ls1QL7VER1GENslDeoN8Wd8GhkEw5qxboS2OEIsZ6ANtCqxTGBW2ZY6KEcVLCTUU',
    redirectUri: (import.meta as any).env?.VITE_SCHWAB_REDIRECT_URI ||
        (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'https://allocraft.app/auth/callback')
};

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
        dayTradingEquityCall: number;
        equity: number;
        equityPercentage: number;
        liquidationValue: number;
        longMarketValue: number;
        longOptionMarketValue: number;
        longStockValue: number;
        maintenanceCall: number;
        maintenanceRequirement: number;
        margin: number;
        marginEquity: number;
        moneyMarketFund: number;
        mutualFundValue: number;
        regTCall: number;
        shortMarketValue: number;
        shortOptionMarketValue: number;
        shortStockValue: number;
        totalCash: number;
        isInCall: boolean;
        unsettledCash: number;
        pendingDeposits: number;
        marginBalance: number;
        shortBalance: number;
        accountValue: number;
    };
}

export class SchwabApiService {
    private accessToken: string | null = null;
    private refreshToken: string | null = null;
    private tokenExpiry: Date | null = null;

    constructor() {
        // Load tokens from localStorage if available
        this.loadTokensFromStorage();
    }

    /**
     * Start the OAuth flow by redirecting to Schwab's authorization page
     */
    initiateOAuth(): void {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: SCHWAB_CONFIG.clientId,
            redirect_uri: SCHWAB_CONFIG.redirectUri,
            scope: 'AccountsAndTrading readonly'  // Updated scope for account access
        });

        const authUrl = `${SCHWAB_CONFIG.authUrl}?${params.toString()}`;
        window.location.href = authUrl;
    }

    /**
     * Handle the OAuth callback with the authorization code
     */
    async handleOAuthCallback(code: string): Promise<boolean> {
        try {
            const response = await fetch(SCHWAB_CONFIG.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${btoa(`${SCHWAB_CONFIG.clientId}:${SCHWAB_CONFIG.clientSecret}`)}`
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: SCHWAB_CONFIG.redirectUri
                })
            });

            if (!response.ok) {
                throw new Error(`Token exchange failed: ${response.statusText}`);
            }

            const tokenData = await response.json();

            this.accessToken = tokenData.access_token;
            this.refreshToken = tokenData.refresh_token;
            this.tokenExpiry = new Date(Date.now() + (tokenData.expires_in * 1000));

            // Save tokens to localStorage
            this.saveTokensToStorage();

            return true;
        } catch (error) {
            console.error('OAuth callback error:', error);
            return false;
        }
    }

    /**
     * Refresh the access token using the refresh token
     */
    async refreshAccessToken(): Promise<boolean> {
        if (!this.refreshToken) {
            return false;
        }

        try {
            const response = await fetch(SCHWAB_CONFIG.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${btoa(`${SCHWAB_CONFIG.clientId}:${SCHWAB_CONFIG.clientSecret}`)}`
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshToken
                })
            });

            if (!response.ok) {
                throw new Error(`Token refresh failed: ${response.statusText}`);
            }

            const tokenData = await response.json();

            this.accessToken = tokenData.access_token;
            this.tokenExpiry = new Date(Date.now() + (tokenData.expires_in * 1000));

            this.saveTokensToStorage();
            return true;
        } catch (error) {
            console.error('Token refresh error:', error);
            return false;
        }
    }

    /**
     * Get account information including positions
     */
    async getAccounts(): Promise<SchwabAccount[]> {
        if (!await this.ensureValidToken()) {
            throw new Error('Authentication required');
        }

        try {
            const response = await fetch(`${SCHWAB_CONFIG.accountsEndpoint}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch accounts: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching accounts:', error);
            throw error;
        }
    }

    /**
     * Get positions for a specific account
     */
    async getAccountPositions(accountId: string): Promise<SchwabPosition[]> {
        if (!await this.ensureValidToken()) {
            throw new Error('Authentication required');
        }

        try {
            const response = await fetch(`${SCHWAB_CONFIG.positionsEndpoint}/${accountId}?fields=positions`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
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
        return this.accessToken !== null && this.tokenExpiry !== null && this.tokenExpiry > new Date();
    }

    /**
     * Logout and clear tokens
     */
    logout(): void {
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.clearTokensFromStorage();
    }

    /**
     * Ensure we have a valid access token, refresh if necessary
     */
    private async ensureValidToken(): Promise<boolean> {
        if (!this.accessToken) {
            return false;
        }

        // Check if token is expired or will expire in the next 5 minutes
        const fiveMinutesFromNow = new Date(Date.now() + (5 * 60 * 1000));
        if (this.tokenExpiry && this.tokenExpiry <= fiveMinutesFromNow) {
            return await this.refreshAccessToken();
        }

        return true;
    }

    /**
     * Save tokens to localStorage
     */
    private saveTokensToStorage(): void {
        try {
            localStorage.setItem('schwab_access_token', this.accessToken || '');
            localStorage.setItem('schwab_refresh_token', this.refreshToken || '');
            localStorage.setItem('schwab_token_expiry', this.tokenExpiry?.toISOString() || '');
        } catch (error) {
            console.warn('Failed to save tokens to localStorage:', error);
        }
    }

    /**
     * Load tokens from localStorage
     */
    private loadTokensFromStorage(): void {
        try {
            this.accessToken = localStorage.getItem('schwab_access_token');
            this.refreshToken = localStorage.getItem('schwab_refresh_token');
            const expiryStr = localStorage.getItem('schwab_token_expiry');
            this.tokenExpiry = expiryStr ? new Date(expiryStr) : null;
        } catch (error) {
            console.warn('Failed to load tokens from localStorage:', error);
        }
    }

    /**
     * Clear tokens from localStorage
     */
    private clearTokensFromStorage(): void {
        try {
            localStorage.removeItem('schwab_access_token');
            localStorage.removeItem('schwab_refresh_token');
            localStorage.removeItem('schwab_token_expiry');
        } catch (error) {
            console.warn('Failed to clear tokens from localStorage:', error);
        }
    }
}

// Export a singleton instance
export const schwabApi = new SchwabApiService();
