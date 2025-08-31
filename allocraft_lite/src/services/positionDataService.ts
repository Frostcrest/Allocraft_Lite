/**
 * Position Data Service
 * 
 * Provides a centralized way to access Schwab positions across the application
 */

import { backendSchwabApi } from './backendSchwabApi';

export interface PositionData {
  id: string;
  symbol: string;
  shares: number;
  costBasis: number;
  marketPrice: number;
  marketValue: number;
  profitLoss: number;
  profitLossPercent: number;
  source: 'manual' | 'schwab';
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
   * Get all Schwab positions (cached for 5 minutes)
   */
  static async getSchwabPositions(forceRefresh = false): Promise<PositionData[]> {
    const now = new Date();
    
    // Return cached data if still fresh and not forcing refresh
    if (!forceRefresh && this.lastFetch && this.cachedPositions.length > 0) {
      const timeSinceLastFetch = now.getTime() - this.lastFetch.getTime();
      if (timeSinceLastFetch < this.CACHE_DURATION_MS) {
        console.log('🔄 Returning cached Schwab positions');
        return this.cachedPositions;
      }
    }

    try {
      console.log('🔍 Fetching fresh Schwab positions...');

      // Check if user is connected to Schwab
      const status = await backendSchwabApi.getStatus();
      if (!status.connected) {
        console.log('❌ User not connected to Schwab');
        return [];
      }

      // Get account summaries
      const accountSummaries = await backendSchwabApi.getAccountSummaries();
      if (!Array.isArray(accountSummaries) || accountSummaries.length === 0) {
        console.log('❌ No Schwab account summaries found');
        return [];
      }

      // Get full account details for each account using hash values
      const allPositions: PositionData[] = [];

      for (const accountSummary of accountSummaries) {
        try {
          // Get full account details using the hash value
          const accountDetails = await backendSchwabApi.getAccountByHash(accountSummary.hashValue);
          const securitiesAccount = accountDetails.securitiesAccount;
          
          if (!securitiesAccount || !securitiesAccount.positions) {
            console.log(`ℹ️ No positions found in account ${accountSummary.accountNumber}`);
            continue;
          }

          const accountNumber = securitiesAccount.accountNumber;
          const accountType = 'Securities';

          // Transform positions
          const transformedPositions = securitiesAccount.positions
            .map((pos: any, index: number) =>
              transformSchwabPosition(pos, accountNumber, accountType, index)
            )
            .filter((pos: PositionData | null) => pos !== null) as PositionData[];

          allPositions.push(...transformedPositions);
        } catch (error) {
          console.error(`❌ Error fetching details for account ${accountSummary.accountNumber}:`, error);
          continue;
        }
      }

      console.log(`✅ Loaded ${allPositions.length} Schwab positions`);
      
      // Update cache
      this.cachedPositions = allPositions;
      this.lastFetch = now;
      
      return allPositions;
    } catch (error) {
      console.error('❌ Error loading Schwab positions:', error);
      return [];
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
   * Check if user is connected to Schwab
   */
  static async isConnectedToSchwab(): Promise<boolean> {
    try {
      const status = await backendSchwabApi.getStatus();
      return status.connected;
    } catch (error) {
      console.error('Error checking Schwab status:', error);
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
