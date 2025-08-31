/**
 * Wheel Strategy Detection Service
 * 
 * Analyzes Schwab positions to identify potential wheel strategies:
 * 1. Cash-Secured Put: Short put option only
 * 2. Covered Call: 100+ shares of stock + short call option
 * 3. Full Wheel: 100+ shares + short call + potential assignment history
 */

export interface WheelDetectionResult {
  ticker: string;
  strategy: 'cash_secured_put' | 'covered_call' | 'full_wheel' | 'naked_stock';
  confidence: 'high' | 'medium' | 'low';
  description: string;
  positions: Array<{
    type: 'stock' | 'call' | 'put';
    symbol: string;
    quantity: number;
    position: 'long' | 'short';
    strikePrice?: number;
    expirationDate?: string;
    marketValue: number;
  }>;
  recommendations?: string[];
  potentialActions?: Array<{
    action: string;
    description: string;
  }>;
}

// Type for a parsed position from any source (Schwab or manual)
interface ParsedPosition {
  id: string;
  symbol: string;
  shares: number;
  isOption: boolean;
  underlyingSymbol?: string;
  optionType?: 'Call' | 'Put';
  strikePrice?: number;
  expirationDate?: string;
  contracts?: number;
  marketValue: number;
  source: string;
}

export class WheelDetectionService {
  /**
   * Main detection method - analyzes all positions and groups by ticker
   */
  static detectWheelStrategies(positions: any[]): WheelDetectionResult[] {
    // Convert positions to our internal format, handling optional fields
    const parsedPositions: ParsedPosition[] = positions.map(p => ({
      id: p.id,
      symbol: p.symbol,
      shares: p.shares,
      isOption: p.isOption || false,
      underlyingSymbol: p.underlyingSymbol,
      optionType: p.optionType,
      strikePrice: p.strikePrice,
      expirationDate: p.expirationDate,
      contracts: p.contracts,
      marketValue: p.marketValue,
      source: p.source
    }));

    // Group positions by underlying ticker
    const groupedByTicker = this.groupPositionsByTicker(parsedPositions);
    
    const results: WheelDetectionResult[] = [];
    
    for (const [ticker, tickerPositions] of Object.entries(groupedByTicker)) {
      const detection = this.analyzeTickerPositions(ticker, tickerPositions);
      if (detection) {
        results.push(detection);
      }
    }
    
    // Sort by strategy complexity (full wheels first, then covered calls, then CSPs)
    return results.sort((a, b) => {
      const strategyOrder = { 'full_wheel': 0, 'covered_call': 1, 'cash_secured_put': 2, 'naked_stock': 3 };
      return strategyOrder[a.strategy] - strategyOrder[b.strategy];
    });
  }

  /**
   * Group positions by their underlying ticker symbol
   */
  private static groupPositionsByTicker(positions: ParsedPosition[]): Record<string, ParsedPosition[]> {
    const grouped: Record<string, ParsedPosition[]> = {};
    
    for (const position of positions) {
      const ticker = position.isOption ? position.underlyingSymbol! : position.symbol;
      if (!grouped[ticker]) {
        grouped[ticker] = [];
      }
      grouped[ticker].push(position);
    }
    
    return grouped;
  }

  /**
   * Analyze positions for a specific ticker to detect wheel strategies
   */
  private static analyzeTickerPositions(ticker: string, positions: ParsedPosition[]): WheelDetectionResult | null {
    const stockPositions = positions.filter(p => !p.isOption);
    const optionPositions = positions.filter(p => p.isOption);
    const callOptions = optionPositions.filter(p => p.optionType === 'Call');
    const putOptions = optionPositions.filter(p => p.optionType === 'Put');
    
    // Calculate total stock holdings
    const totalStockShares = stockPositions.reduce((sum, pos) => sum + pos.shares, 0);
    
    // Separate long/short options
    const shortCalls = callOptions.filter(p => (p.contracts || 0) < 0);
    const shortPuts = putOptions.filter(p => (p.contracts || 0) < 0);

    // Convert positions to standardized format
    const formattedPositions = positions.map(p => ({
      type: p.isOption ? (p.optionType === 'Call' ? 'call' : 'put') as 'call' | 'put' : 'stock' as 'stock',
      symbol: p.symbol,
      quantity: p.isOption ? Math.abs(p.contracts || 0) : Math.abs(p.shares),
      position: (p.isOption ? (p.contracts || 0) < 0 : p.shares > 0) ? 'short' : 'long' as 'long' | 'short',
      strikePrice: p.strikePrice,
      expirationDate: p.expirationDate,
      marketValue: p.marketValue
    }));

    // Detection logic
    if (this.isFullWheel(totalStockShares, shortCalls, shortPuts)) {
      return {
        ticker,
        strategy: 'full_wheel',
        confidence: 'high',
        description: `Complete wheel strategy: ${totalStockShares} shares with covered call and put-selling capability`,
        positions: formattedPositions,
        recommendations: [
          'Monitor covered call for expiration or early assignment',
          'Consider rolling call option if needed',
          'Look for opportunities to sell additional puts if assigned'
        ],
        potentialActions: [
          { action: 'roll_call', description: 'Roll covered call to later expiration' },
          { action: 'close_call', description: 'Buy back call option for profit' },
          { action: 'sell_put', description: 'Sell additional cash-secured puts' }
        ]
      };
    }
    
    if (this.isCoveredCall(totalStockShares, shortCalls)) {
      return {
        ticker,
        strategy: 'covered_call',
        confidence: 'high',
        description: `Covered call position: ${totalStockShares} shares with ${shortCalls.length} short call(s)`,
        positions: formattedPositions,
        recommendations: [
          'Monitor for potential assignment at expiration',
          'Consider rolling call if wanting to keep shares',
          'Could evolve into full wheel by selling puts'
        ],
        potentialActions: [
          { action: 'roll_call', description: 'Extend call expiration' },
          { action: 'sell_put', description: 'Start wheel by selling puts below current price' }
        ]
      };
    }
    
    if (this.isCashSecuredPut(shortPuts)) {
      return {
        ticker,
        strategy: 'cash_secured_put',
        confidence: 'high',
        description: `Cash-secured put position: ${shortPuts.length} short put(s) ${totalStockShares > 0 ? `with ${totalStockShares} existing shares` : ''}`,
        positions: formattedPositions,
        recommendations: [
          'Prepare for potential assignment',
          'Ensure sufficient cash to purchase shares',
          'Plan covered call strategy if assigned'
        ],
        potentialActions: [
          { action: 'manage_assignment', description: 'Prepare for potential share assignment' },
          { action: 'roll_put', description: 'Roll put to avoid assignment' }
        ]
      };
    }
    
    if (this.isNakedStock(totalStockShares, optionPositions)) {
      // Only suggest wheel for stocks in round lots (100+ shares)
      if (totalStockShares >= 100) {
        return {
          ticker,
          strategy: 'naked_stock',
          confidence: 'medium',
          description: `${totalStockShares} shares ready for wheel strategy`,
          positions: formattedPositions,
          recommendations: [
            'Consider selling covered calls to generate income',
            'Stock position is suitable for wheel strategy',
            'Could start with covered calls above current price'
          ],
          potentialActions: [
            { action: 'sell_call', description: 'Start covered call strategy' },
            { action: 'start_wheel', description: 'Begin full wheel strategy' }
          ]
        };
      }
    }
    
    return null;
  }

  /**
   * Detect full wheel: 100+ shares + short call + evidence of put selling
   */
  private static isFullWheel(stockShares: number, shortCalls: ParsedPosition[], shortPuts: ParsedPosition[]): boolean {
    return stockShares >= 100 && shortCalls.length > 0 && shortPuts.length > 0;
  }

  /**
   * Detect covered call: 100+ shares + short call(s)
   */
  private static isCoveredCall(stockShares: number, shortCalls: ParsedPosition[]): boolean {
    return stockShares >= 100 && shortCalls.length > 0;
  }

  /**
   * Detect cash-secured put: short put(s) 
   */
  private static isCashSecuredPut(shortPuts: ParsedPosition[]): boolean {
    return shortPuts.length > 0;
  }

  /**
   * Detect naked stock: stock holdings with no options
   */
  private static isNakedStock(stockShares: number, optionPositions: ParsedPosition[]): boolean {
    return stockShares > 0 && optionPositions.length === 0;
  }

  /**
   * Generate wheel creation suggestions based on detected patterns
   */
  static generateWheelSuggestions(detectionResult: WheelDetectionResult): Array<{
    title: string;
    description: string;
    action: string;
    params: Record<string, any>;
  }> {
    const suggestions = [];
    
    switch (detectionResult.strategy) {
      case 'cash_secured_put':
        suggestions.push({
          title: 'Create CSP Wheel Cycle',
          description: 'Track this cash-secured put as the beginning of a wheel strategy',
          action: 'create_csp_cycle',
          params: {
            ticker: detectionResult.ticker,
            puts: detectionResult.positions.filter(p => p.type === 'put' && p.position === 'short')
          }
        });
        break;
        
      case 'covered_call':
        suggestions.push({
          title: 'Convert to Covered Call Wheel',
          description: 'Track this covered call position as part of an ongoing wheel',
          action: 'create_cc_cycle',
          params: {
            ticker: detectionResult.ticker,
            stocks: detectionResult.positions.filter(p => p.type === 'stock'),
            calls: detectionResult.positions.filter(p => p.type === 'call' && p.position === 'short')
          }
        });
        break;
        
      case 'full_wheel':
        suggestions.push({
          title: 'Import Complete Wheel Strategy',
          description: 'Create a comprehensive wheel tracking for this complete position',
          action: 'create_full_wheel',
          params: {
            ticker: detectionResult.ticker,
            allPositions: detectionResult.positions
          }
        });
        break;
        
      case 'naked_stock':
        suggestions.push({
          title: 'Start Wheel Strategy',
          description: 'Begin a wheel strategy with your existing stock position',
          action: 'start_new_wheel',
          params: {
            ticker: detectionResult.ticker,
            shares: detectionResult.positions.find(p => p.type === 'stock')?.quantity || 0
          }
        });
        break;
    }
    
    return suggestions;
  }
}
