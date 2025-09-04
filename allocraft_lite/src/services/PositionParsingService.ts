/**
 * Position Parsing Service
 * 
 * Advanced service for parsing position symbols and extracting wheel-relevant data.
 * Handles various option symbol formats, stock positions, and covered call scenarios.
 */

export interface ParsedPositionData {
  ticker: string;
  optionType?: 'CALL' | 'PUT';
  strike?: number;
  expiration?: string;
  expirationDate?: Date;
  daysToExpiration?: number;
  isOption: boolean;
  originalSymbol: string;
  confidence: 'high' | 'medium' | 'low';
  errors: string[];
}

export interface TickerOpportunityGroup {
  ticker: string;
  totalShares: number;
  availableStrategies: {
    covered_call?: {
      available: boolean;
      maxContracts: number;
      shortCalls: any[];
      description: string;
    };
    poor_mans_covered_call?: {
      available: boolean;
      longCalls: any[];
      description: string;
    };
    buy_100_shares?: {
      available: boolean;
      currentPrice: number;
      description: string;
    };
    cash_secured_put?: {
      available: boolean;
      shortPuts: any[];
      description: string;
    };
  };
  sourcePositions: any[];
  confidence: 'high' | 'medium' | 'low';
}

export interface WheelOpportunityFromPosition {
  id: string;
  ticker: string;
  strategy: 'covered_call' | 'cash_secured_put' | 'full_wheel';
  confidence: 'high' | 'medium' | 'low';
  description: string;
  prefilledData: {
    ticker: string;
    strategyType: string;
    strikePrice?: number;
    expirationDate?: string;
    contractCount?: number;
    premium?: number;
    positionSize?: number;
    notes?: string;
  };
  sourcePositions: any[];
  potentialIncome?: number;
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
}

export class PositionParsingService {
  /**
   * Get ticker opportunity groups with multiple strategy options
   */
  static getTickerOpportunityGroups(positions: any[]): TickerOpportunityGroup[] {
    console.log('🔬 Getting ticker opportunity groups from positions:', positions.length);

    const groupedByTicker: Record<string, any[]> = {};
    
    // Group positions by underlying ticker
    positions.forEach(position => {
      let ticker: string;
      
      if (position.underlying_symbol) {
        ticker = position.underlying_symbol;
      } else if (position.symbol) {
        const parsed = position.asset_type === 'OPTION' 
          ? this.parseOptionSymbol(position.symbol)
          : this.parseStockSymbol(position.symbol);
        ticker = parsed.ticker;
      } else {
        return;
      }
      
      if (!groupedByTicker[ticker]) {
        groupedByTicker[ticker] = [];
      }
      groupedByTicker[ticker].push(position);
    });

    console.log('📈 Ticker groups found:', Object.keys(groupedByTicker));

    // Analyze each ticker for available strategies
    return Object.entries(groupedByTicker).map(([ticker, tickerPositions]) => {
      return this.analyzeTickerStrategies(ticker, tickerPositions);
    }).filter(group => Object.keys(group.availableStrategies).length > 0);
  }

  private static analyzeTickerStrategies(ticker: string, positions: any[]): TickerOpportunityGroup {
    const stockPositions = positions.filter(p => p.asset_type === 'EQUITY');
    const optionPositions = positions.filter(p => p.asset_type === 'OPTION');
    
    // Calculate total stock shares
    const totalShares = stockPositions.reduce((sum, pos) => {
      return sum + (pos.long_quantity || 0) - (pos.short_quantity || 0);
    }, 0);

    const shortCalls = optionPositions.filter(opt => 
      opt.option_type === 'CALL' && opt.short_quantity > 0
    );
    
    const longCalls = optionPositions.filter(opt => 
      opt.option_type === 'CALL' && opt.long_quantity > 0
    );
    
    const shortPuts = optionPositions.filter(opt =>
      opt.option_type === 'PUT' && opt.short_quantity > 0
    );

    const availableStrategies: TickerOpportunityGroup['availableStrategies'] = {};

    // 1. Covered Call (need 100+ shares)
    if (totalShares >= 100) {
      availableStrategies.covered_call = {
        available: true,
        maxContracts: Math.floor(totalShares / 100),
        shortCalls: shortCalls,
        description: `Sell calls against ${totalShares} shares`
      };
    }

    // 2. Poor Man's Covered Call (need long calls)
    if (longCalls.length > 0) {
      availableStrategies.poor_mans_covered_call = {
        available: true,
        longCalls: longCalls,
        description: `Use long calls as synthetic stock`
      };
    }

    // 3. Buy 100 Shares (always available)
    availableStrategies.buy_100_shares = {
      available: true,
      currentPrice: stockPositions[0]?.market_value / (stockPositions[0]?.long_quantity || 1) || 0,
      description: `Purchase 100 shares to start wheel`
    };

    // 4. Cash-Secured Put (if we have short puts)
    if (shortPuts.length > 0) {
      availableStrategies.cash_secured_put = {
        available: true,
        shortPuts: shortPuts,
        description: `Manage existing short puts`
      };
    }

    return {
      ticker,
      totalShares,
      availableStrategies,
      sourcePositions: positions,
      confidence: totalShares >= 100 || shortCalls.length > 0 || shortPuts.length > 0 ? 'high' : 'medium'
    };
  }

  /**
   * Analyze positions to identify wheel opportunities
   */
  static identifyWheelOpportunities(positions: any[]): WheelOpportunityFromPosition[] {
    console.log('🔬 PositionParsingService.identifyWheelOpportunities called with:', {
      positionsCount: positions?.length,
      firstPosition: positions?.[0]
    });

    const opportunities: WheelOpportunityFromPosition[] = [];
    const groupedByTicker: Record<string, any[]> = {};
    
    // Group positions by underlying ticker
    positions.forEach(position => {
      let ticker: string;
      
      // Extract ticker from position - use underlying_symbol first, then parse symbol
      if (position.underlying_symbol) {
        ticker = position.underlying_symbol;
      } else if (position.symbol) {
        // Fallback to parsing the symbol
        const parsed = position.asset_type === 'OPTION' 
          ? this.parseOptionSymbol(position.symbol)
          : this.parseStockSymbol(position.symbol);
        ticker = parsed.ticker;
      } else {
        return; // Skip if no symbol
      }
      
      if (!groupedByTicker[ticker]) {
        groupedByTicker[ticker] = [];
      }
      groupedByTicker[ticker].push(position);
    });
    
    console.log('📈 Positions grouped by ticker:', groupedByTicker);
    
    // Analyze each ticker group for wheel opportunities
    Object.entries(groupedByTicker).forEach(([ticker, tickerPositions]) => {
      const tickerOpportunities = this.analyzeTickerForOpportunities(ticker, tickerPositions);
      opportunities.push(...tickerOpportunities);
    });

    console.log('✅ Final opportunities identified:', opportunities);
    
    return opportunities.sort((a, b) => {
      // Sort by confidence and potential income
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      const confDiff = confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
      if (confDiff !== 0) return confDiff;
      
      return (b.potentialIncome || 0) - (a.potentialIncome || 0);
    });
  }

  private static analyzeTickerForOpportunities(ticker: string, positions: any[]): WheelOpportunityFromPosition[] {
    const opportunities: WheelOpportunityFromPosition[] = [];
    
    console.log(`🔍 Analyzing ${ticker} positions:`, positions);
    
    // Separate stock and option positions based on asset_type
    const stockPositions = positions.filter(p => p.asset_type === 'EQUITY');
    const optionPositions = positions.filter(p => p.asset_type === 'OPTION');
    
    // Calculate total stock shares (long_quantity - short_quantity)
    const totalShares = stockPositions.reduce((sum, pos) => {
      const netQuantity = (pos.long_quantity || 0) - (pos.short_quantity || 0);
      return sum + netQuantity;
    }, 0);
    
    // Analyze option positions for wheel opportunities
    const shortCalls = optionPositions.filter(opt => 
      opt.option_type === 'CALL' && opt.short_quantity > 0
    );
    
    const shortPuts = optionPositions.filter(opt =>
      opt.option_type === 'PUT' && opt.short_quantity > 0
    );
    
    console.log(`🔧 ${ticker} - Stock: ${stockPositions.length}, Short calls: ${shortCalls.length}, Short puts: ${shortPuts.length}`);
    
    // 1. Covered Call Opportunity (need stock + short call)
    if (totalShares >= 100 && shortCalls.length > 0) {
      shortCalls.forEach(shortCall => {
        const contractsCanCover = Math.floor(totalShares / 100);
        const maxContracts = Math.min(contractsCanCover, shortCall.short_quantity);
        
        opportunities.push({
          id: `covered_call_${ticker}_${shortCall.id}`,
          ticker,
          strategy: 'covered_call',
          confidence: 'high',
          description: `Covered call: ${totalShares} shares + short ${shortCall.strike_price} call`,
          prefilledData: {
            ticker,
            strategyType: 'covered_call',
            strikePrice: shortCall.strike_price,
            expirationDate: shortCall.expiration_date.split('T')[0],
            contractCount: maxContracts,
            premium: shortCall.average_price || 0,
            notes: `Covered call from existing positions: ${shortCall.symbol}`
          },
          sourcePositions: [shortCall, ...stockPositions],
          potentialIncome: maxContracts * 100 * (shortCall.average_price || 2.50),
          riskAssessment: {
            level: 'low',
            factors: ['Limited upside if called away', 'Keep premium if expires OTM']
          }
        });
      });
    }
    
    // 2. Cash-Secured Put Opportunity
    if (shortPuts.length > 0) {
      shortPuts.forEach(shortPut => {
        opportunities.push({
          id: `cash_secured_put_${ticker}_${shortPut.id}`,
          ticker,
          strategy: 'cash_secured_put',
          confidence: 'medium',
          description: `Cash-secured put: Short ${shortPut.strike_price} put`,
          prefilledData: {
            ticker,
            strategyType: 'cash_secured_put',
            strikePrice: shortPut.strike_price,
            expirationDate: shortPut.expiration_date.split('T')[0],
            contractCount: shortPut.short_quantity,
            premium: shortPut.average_price || 0,
            positionSize: shortPut.strike_price * shortPut.short_quantity * 100,
            notes: `Cash-secured put from existing position: ${shortPut.symbol}`
          },
          sourcePositions: [shortPut],
          potentialIncome: shortPut.short_quantity * 100 * (shortPut.average_price || 2.00),
          riskAssessment: {
            level: 'medium',
            factors: ['Obligation to buy shares at strike', 'Keep premium if expires OTM']
          }
        });
      });
    }
    
    console.log(`✅ Generated ${opportunities.length} opportunities for ${ticker}`);
    return opportunities;
  }

  /**
   * Parse option symbol to extract components
   */
  static parseOptionSymbol(symbol: string): ParsedPositionData {
    const errors: string[] = [];
    let ticker = '';
    let strike = 0;
    let expiration = '';
    let optionType: 'CALL' | 'PUT' | undefined;
    let confidence: 'high' | 'medium' | 'low' = 'low';

    try {
      // Handle standard format: "GOOG  250117C00170000" or "GOOG250117C00170000"
      const cleanSymbol = symbol.replace(/\s+/g, '');
      
      // Extract ticker (letters at the beginning)
      const tickerMatch = cleanSymbol.match(/^([A-Z]+)/);
      if (tickerMatch) {
        ticker = tickerMatch[1];
      }

      // Extract date, option type, and strike
      const optionMatch = cleanSymbol.match(/(\d{6})([CP])(\d{8})$/);
      if (optionMatch) {
        const [, dateStr, typeStr, strikeStr] = optionMatch;
        
        // Parse expiration date (YYMMDD format)
        const year = 2000 + parseInt(dateStr.substring(0, 2));
        const month = dateStr.substring(2, 4);
        const day = dateStr.substring(4, 6);
        expiration = `${year}-${month}-${day}`;
        
        // Parse option type
        optionType = typeStr === 'C' ? 'CALL' : 'PUT';
        
        // Parse strike price (in thousandths)
        strike = parseInt(strikeStr) / 1000;
        
        confidence = 'high';
      } else {
        errors.push('Could not parse option symbol format');
        confidence = 'low';
      }
    } catch (error) {
      errors.push(`Error parsing symbol: ${error instanceof Error ? error.message : String(error)}`);
      confidence = 'low';
    }

    return {
      ticker,
      optionType,
      strike,
      expiration,
      expirationDate: expiration ? new Date(expiration) : undefined,
      daysToExpiration: expiration ? Math.ceil((new Date(expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : undefined,
      isOption: true,
      originalSymbol: symbol,
      confidence,
      errors
    };
  }

  /**
   * Parse stock symbol to extract ticker
   */
  static parseStockSymbol(symbol: string): ParsedPositionData {
    return {
      ticker: symbol.replace(/\s+/g, ''),
      isOption: false,
      originalSymbol: symbol,
      confidence: 'high',
      errors: []
    };
  }

  /**
   * Format expiration date for display
   */
  static formatExpirationDate(date: string | Date): string {
    if (!date) return 'N/A';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  }
}
