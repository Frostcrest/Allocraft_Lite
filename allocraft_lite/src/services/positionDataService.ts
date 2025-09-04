/**
 * Position Data Service
 * 
 * Provides a centralized way to access positions across the application
 * Updated to use the unified data model
 */

import { unifiedApi } from './unifiedApi';

export interface PositionData {
    id: string;
    symbol: string;
    shares: number;
    costBasis: number;
    marketPrice: number;
    marketValue: number;
    profitLoss: number;
    profitLossPercent: number;
    source: 'manual' | 'schwab' | 'schwab_import';
    accountType?: string;
    accountNumber?: string;
    // Option-specific fields
    isOption?: boolean;
    underlyingSymbol?: string;
    optionType?: 'Call' | 'Put';
    strikePrice?: number;
    expirationDate?: string;
    contracts?: number;
}

// Option symbol parser for formats like "HIMS 251017P00037000"
const parseOptionSymbol = (symbol: string) => {
    // Match pattern: TICKER YYMMDDCPPPPPPPP or TICKER YYMMDDPPPPPPPPP
    const optionMatch = symbol.match(/^([A-Z]+)\s+(\d{6})([CP])(\d{8})$/);

    if (!optionMatch) {
        return { isOption: false, underlyingSymbol: symbol };
    }

    const [, underlying, dateStr, optionType, strikeStr] = optionMatch;

    // Parse date (YYMMDD)
    const year = 2000 + parseInt(dateStr.substring(0, 2));
    const month = parseInt(dateStr.substring(2, 4));
    const day = parseInt(dateStr.substring(4, 6));
    const expirationDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    // Parse strike price (last 8 digits, divide by 1000)
    const strikePrice = parseInt(strikeStr) / 1000;

    return {
        isOption: true,
        underlyingSymbol: underlying,
        optionType: optionType === 'C' ? 'Call' : 'Put',
        strikePrice,
        expirationDate,
        displaySymbol: `${underlying} ${expirationDate} ${optionType === 'C' ? 'Call' : 'Put'} $${strikePrice}`
    };
};

// Transform Schwab position data to our standard format
const transformSchwabPosition = (pos: any, accountNumber: string, accountType: string, index: number): PositionData | null => {
    try {
        // Safely extract values with fallbacks
        const instrument = pos.instrument || {};
        const symbol = instrument.symbol || instrument.cusip || `UNKNOWN_${index}`;
        const longQuantity = parseFloat(pos.longQuantity || 0);
        const shortQuantity = parseFloat(pos.shortQuantity || 0);

        // Determine if this is a long or short position and the net quantity
        const isShortPosition = shortQuantity > 0;
        const isLongPosition = longQuantity > 0;

        // Skip positions with no quantity
        if (longQuantity === 0 && shortQuantity === 0) {
            return null;
        }

        // Calculate the signed quantity (positive for long, negative for short)
        const quantity = isLongPosition ? longQuantity : -shortQuantity;

        const marketValue = parseFloat(pos.marketValue || 0);

        // Use the appropriate average price based on position type
        let averagePrice;
        if (isShortPosition) {
            averagePrice = parseFloat(pos.averageShortPrice || pos.taxLotAverageShortPrice || pos.averagePrice || 0);
        } else {
            averagePrice = parseFloat(pos.averageLongPrice || pos.taxLotAverageLongPrice || pos.averagePrice || 0);
        }

        // For short positions, the market price calculation is different
        const marketPrice = Math.abs(quantity) > 0 ? Math.abs(marketValue) / Math.abs(quantity) : 0;

        // Calculate P&L - for short positions, this works differently
        let profitLoss;
        if (isShortPosition) {
            // For short options: profit when current price < sold price
            // Use shortOpenProfitLoss if available, otherwise calculate
            profitLoss = parseFloat(pos.shortOpenProfitLoss || 0) || (averagePrice * Math.abs(quantity) * 100) - Math.abs(marketValue);
        } else {
            // For long options: profit when current price > bought price
            // Use longOpenProfitLoss if available, otherwise calculate
            profitLoss = parseFloat(pos.longOpenProfitLoss || 0) || marketValue - (averagePrice * Math.abs(quantity) * 100);
        }

        const costBasis = averagePrice * Math.abs(quantity) * 100; // Total cost basis
        const profitLossPercent = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

        // Parse option information
        const optionInfo = parseOptionSymbol(symbol);

        const basePosition: PositionData = {
            id: `schwab-${accountNumber}-${symbol}-${index}`,
            symbol: symbol,
            shares: quantity, // This will be negative for short positions
            costBasis: averagePrice,
            marketPrice: marketPrice,
            marketValue: marketValue,
            profitLoss: profitLoss,
            profitLossPercent: profitLossPercent,
            source: 'schwab' as const,
            accountType: accountType,
            accountNumber: accountNumber
        };

        // Add option-specific fields if it's an option
        if (optionInfo.isOption) {
            return {
                ...basePosition,
                isOption: true,
                underlyingSymbol: optionInfo.underlyingSymbol,
                optionType: optionInfo.optionType as 'Call' | 'Put',
                strikePrice: optionInfo.strikePrice,
                expirationDate: optionInfo.expirationDate,
                contracts: quantity / 100, // Convert shares to contracts (will be negative for short)
            };
        }

        return basePosition;
    } catch (error) {
        console.error('Error transforming position:', error, pos);
        return null;
    }
};

export class PositionDataService {
    private static cachedPositions: PositionData[] = [];
    private static lastFetch: Date | null = null;
    private static readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

    /**
     * Parse option symbol to extract strike price and expiration date
     * Format: "GOOG  260618C00250000" -> strike: 250, expiration: "2026-06-18"
     */
    private static parseOptionSymbol(symbol: string): { strikePrice?: number; expirationDate?: string } {
        try {
            // Match pattern like "GOOG  260618C00250000"
            const match = symbol.match(/^([A-Z]+)\s+(\d{6})([CP])(\d{8})$/);
            if (!match) {
                console.warn(`Could not parse option symbol: ${symbol}`);
                return {};
            }

            const [, ticker, dateStr, optionType, strikeStr] = match;

            // Parse date (YYMMDD)
            const year = 2000 + parseInt(dateStr.substring(0, 2));
            const month = dateStr.substring(2, 4);
            const day = dateStr.substring(4, 6);
            const expirationDate = `${year}-${month}-${day}`;

            // Parse strike price (divide by 1000)
            const strikePrice = parseInt(strikeStr) / 1000;

            return { strikePrice, expirationDate };
        } catch (error) {
            console.warn(`Error parsing option symbol ${symbol}:`, error);
            return {};
        }
    }

    /**
     * Get all positions from unified model (cached for 5 minutes)
     */
    static async getSchwabPositions(forceRefresh = false): Promise<PositionData[]> {
        const now = new Date();

        // Return cached data if still fresh and not forcing refresh
        if (!forceRefresh && this.lastFetch && this.cachedPositions.length > 0) {
            const timeSinceLastFetch = now.getTime() - this.lastFetch.getTime();
            if (timeSinceLastFetch < this.CACHE_DURATION_MS) {
                console.log('🔄 Returning cached positions');
                return this.cachedPositions;
            }
        }

        try {
            // console.log('🔍 Fetching positions from unified API...');

            // Get both stock and option positions from unified API
            const [stockPositions, optionPositions] = await Promise.all([
                unifiedApi.getStockPositions(),
                unifiedApi.getOptionPositions()
            ]);

            // Transform unified positions to PositionData interface
            const transformedPositions: PositionData[] = [];

            // Add stock positions
            stockPositions.forEach(pos => {
                const shares = (pos.long_quantity || 0) - (pos.short_quantity || 0);
                const marketValue = pos.market_value || 0;
                const costBasis = pos.average_price || 0;
                const profitLoss = marketValue - (costBasis * Math.abs(shares));
                const profitLossPercent = costBasis > 0 ? ((pos.current_price || 0) - costBasis) / costBasis * 100 : 0;

                transformedPositions.push({
                    id: pos.id?.toString() || `unified-${pos.symbol}`,
                    symbol: pos.symbol,
                    shares: shares,
                    costBasis: costBasis,
                    marketPrice: pos.current_price || 0,
                    marketValue: marketValue,
                    profitLoss: profitLoss,
                    profitLossPercent: profitLossPercent,
                    source: 'schwab' as const,
                    accountType: 'Securities',
                    accountNumber: pos.account_id?.toString() || 'Unknown',
                    isOption: false
                });
            });

            // Add option positions with enhanced logging
            optionPositions.forEach(pos => {
                const contracts = (pos.long_quantity || 0) - (pos.short_quantity || 0);
                const shares = contracts * 100; // Convert contracts to shares
                const marketValue = pos.market_value || 0;
                const costBasis = pos.average_price || 0;
                const profitLoss = marketValue - (costBasis * Math.abs(contracts) * 100);
                const profitLossPercent = costBasis > 0 ? ((pos.current_price || 0) - costBasis) / costBasis * 100 : 0;

                // Parse option symbol to extract strike and expiration
                const { strikePrice, expirationDate } = this.parseOptionSymbol(pos.symbol);

                // 🔧 CRITICAL FIX: Log position signs for debugging
                console.log(`🔍 Option Position: ${pos.symbol}`, {
                    longQty: pos.long_quantity,
                    shortQty: pos.short_quantity,
                    netContracts: contracts,
                    isShort: contracts < 0,
                    optionType: pos.option_type,
                    parsedStrike: strikePrice,
                    parsedExpiration: expirationDate
                });

                transformedPositions.push({
                    id: pos.id?.toString() || `unified-option-${pos.symbol}`,
                    symbol: pos.symbol,
                    shares: shares,
                    costBasis: costBasis,
                    marketPrice: pos.current_price || 0,
                    marketValue: marketValue,
                    profitLoss: profitLoss,
                    profitLossPercent: profitLossPercent,
                    source: 'schwab' as const,
                    accountType: 'Securities',
                    accountNumber: pos.account_id?.toString() || 'Unknown',
                    isOption: true,
                    underlyingSymbol: pos.underlying_symbol || pos.symbol.split(' ')[0], // Use underlying_symbol field from backend
                    optionType: pos.option_type as 'Call' | 'Put',
                    strikePrice: strikePrice || pos.strike_price, // Use parsed strike or fallback to backend
                    expirationDate: expirationDate || pos.expiration_date, // Use parsed expiration or fallback to backend
                    contracts: contracts  // 🔧 FIXED: Preserve signed contracts for wheel detection
                });
            });

            // Update cache
            this.cachedPositions = transformedPositions;
            this.lastFetch = now;

            // console.log(`✅ Successfully loaded ${transformedPositions.length} positions from unified API`);
            return transformedPositions;

        } catch (error) {
            console.error('❌ Error loading positions from unified API:', error);
            return [];
        }
    }

    /**
     * Force a fresh sync of positions (simply refresh from unified API)
     */
    static async forceSyncPositions(): Promise<PositionData[]> {
        try {
            console.log('🔄 Forcing fresh sync of positions...');

            // Clear cache to force fresh fetch
            this.cachedPositions = [];
            this.lastFetch = null;

            // Fetch fresh data from unified API
            return await this.getSchwabPositions(true);

        } catch (error) {
            console.error('❌ Error forcing sync:', error);
            throw error;
        }
    }

    /**
     * Get positions grouped by underlying ticker
     */
    static async getPositionsGroupedByTicker(forceRefresh = false): Promise<Record<string, { stocks: PositionData[], options: PositionData[] }>> {
        const positions = await this.getSchwabPositions(forceRefresh);

        return positions.reduce((groups, position) => {
            const key = position.isOption ? position.underlyingSymbol! : position.symbol;
            if (!groups[key]) {
                groups[key] = { stocks: [], options: [] };
            }

            if (position.isOption) {
                groups[key].options.push(position);
            } else {
                groups[key].stocks.push(position);
            }

            return groups;
        }, {} as Record<string, { stocks: PositionData[], options: PositionData[] }>);
    }

    /**
     * Get positions for a specific ticker
     */
    static async getPositionsForTicker(ticker: string, forceRefresh = false): Promise<{ stocks: PositionData[], options: PositionData[] }> {
        const groupedPositions = await this.getPositionsGroupedByTicker(forceRefresh);
        return groupedPositions[ticker] || { stocks: [], options: [] };
    }

    /**
     * Check if user has any positions (from unified API)
     */
    static async hasAnyPositions(): Promise<boolean> {
        try {
            const positions = await this.getSchwabPositions();
            return positions.length > 0;
        } catch (error) {
            console.error('Error checking for positions:', error);
            return false;
        }
    }

    /**
     * Get all positions from unified API
     */
    static async getAllPositions(): Promise<PositionData[]> {
        return await this.getSchwabPositions();
    }

    /**
     * Get positions grouped by underlying ticker (all sources)
     */
    static async getAllPositionsGroupedByTicker(): Promise<Record<string, { stocks: PositionData[], options: PositionData[] }>> {
        const positions = await this.getAllPositions();

        return positions.reduce((groups, position) => {
            const key = position.isOption ? position.underlyingSymbol! : position.symbol;
            if (!groups[key]) {
                groups[key] = { stocks: [], options: [] };
            }

            if (position.isOption) {
                groups[key].options.push(position);
            } else {
                groups[key].stocks.push(position);
            }

            return groups;
        }, {} as Record<string, { stocks: PositionData[], options: PositionData[] }>);
    }

    /**
     * Check if user is connected to Schwab (simplified for unified model)
     */
    static async isConnectedToSchwab(): Promise<boolean> {
        try {
            const positions = await this.getSchwabPositions();
            return positions.length > 0;
        } catch (error) {
            console.error('Error checking connection status:', error);
            return false;
        }
    }

    /**
     * Clear cached positions (useful when user disconnects)
     */
    static clearCache(): void {
        this.cachedPositions = [];
        this.lastFetch = null;
    }
}
