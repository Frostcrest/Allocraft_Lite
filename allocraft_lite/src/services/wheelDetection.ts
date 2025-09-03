/**
 * Enhanced Wheel Strategy Detection Service
 * 
 * Analyzes unified position data to identify potential wheel strategies:
 * 1. Cash-Secured Put: Short put option only
 * 2. Covered Call: 100+ shares of stock + short call option
 * 3. Full Wheel: 100+ shares + short call + potential assignment history
 * 4. Naked Stock: Stock positions suitable for wheel strategies
 * 
 * Enhanced with unified data model integration, cash balance validation,
 * and sophisticated confidence scoring.
 */

export interface WheelDetectionOptions {
    // Enhanced detection options
    cashBalance?: number;
    accountType?: string;
    riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
    includeHistorical?: boolean;
    marketData?: MarketContextData;
}

export interface MarketContextData {
    // Optional market context for enhanced confidence scoring
    volatility?: number;
    marketTrend?: 'bullish' | 'bearish' | 'neutral';
    sector?: string;
    marketCap?: 'small' | 'mid' | 'large';
}

export interface WheelDetectionResult {
    ticker: string;
    strategy: 'cash_secured_put' | 'covered_call' | 'full_wheel' | 'naked_stock';
    confidence: 'high' | 'medium' | 'low';
    confidenceScore: number; // 0-100 numerical confidence score
    description: string;
    cashRequired?: number; // Required cash for CSP strategies
    cashValidated?: boolean; // Whether cash requirements are met
    riskAssessment: {
        level: 'low' | 'medium' | 'high';
        factors: string[];
        maxLoss?: number;
        assignmentRisk?: number; // 0-100 score
    };
    positions: Array<{
        type: 'stock' | 'call' | 'put';
        symbol: string;
        quantity: number; // Absolute quantity for display
        position: 'long' | 'short';
        strikePrice?: number;
        expirationDate?: string;
        daysToExpiration?: number;
        marketValue: number;
        rawQuantity?: number; // Preserve signed quantity for logic
        source: string; // Track data source
    }>;
    recommendations?: string[];
    potentialActions?: Array<{
        action: string;
        description: string;
        priority: 'high' | 'medium' | 'low';
    }>;
    marketContext?: MarketContextData;
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
     * Enhanced detection method with unified data model support
     */
    static detectWheelStrategies(
        positions: any[],
        options: WheelDetectionOptions = {}
    ): WheelDetectionResult[] {
        console.log('🎯 Starting enhanced wheel strategy detection with positions:', positions);
        console.log('🔧 Detection options:', options);

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
            source: p.source || 'unknown'
        }));

        console.log('📊 Parsed positions for analysis:', parsedPositions);

        // Group positions by underlying ticker
        const groupedByTicker = this.groupPositionsByTicker(parsedPositions);
        console.log('🏷️ Positions grouped by ticker:', Object.keys(groupedByTicker));

        const results: WheelDetectionResult[] = [];

        for (const [ticker, tickerPositions] of Object.entries(groupedByTicker)) {
            console.log(`\n🔍 Analyzing ${ticker} with ${tickerPositions.length} positions...`);
            const detection = this.analyzeTickerPositions(ticker, tickerPositions, options);
            if (detection) {
                console.log(`✅ ${ticker}: Strategy detected -`, detection.strategy);
                results.push(detection);
            } else {
                console.log(`❌ ${ticker}: No wheel strategy detected`);
            }
        }

        console.log(`\n🎯 Enhanced wheel detection complete: Found ${results.length} strategies`, results.map(r => `${r.ticker}:${r.strategy}`));

        // Sort by strategy complexity and confidence score
        return results.sort((a, b) => {
            const strategyOrder = { 'full_wheel': 0, 'covered_call': 1, 'cash_secured_put': 2, 'naked_stock': 3 };
            const strategyDiff = strategyOrder[a.strategy] - strategyOrder[b.strategy];
            if (strategyDiff !== 0) return strategyDiff;
            return b.confidenceScore - a.confidenceScore; // Higher confidence first
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
     * Enhanced analysis for ticker positions with unified data model support
     */
    private static analyzeTickerPositions(
        ticker: string,
        positions: ParsedPosition[],
        options: WheelDetectionOptions = {}
    ): WheelDetectionResult | null {
        console.log(`🔍 Analyzing ${ticker} positions for wheel strategies:`, positions);

        const stockPositions = positions.filter(p => !p.isOption);
        const optionPositions = positions.filter(p => p.isOption);
        const callOptions = optionPositions.filter(p => p.optionType === 'Call');
        const putOptions = optionPositions.filter(p => p.optionType === 'Put');

        // Calculate total stock holdings
        const totalStockShares = stockPositions.reduce((sum, pos) => sum + pos.shares, 0);

        // Separate long/short options - CRITICAL: Use signed values
        const shortCalls = callOptions.filter(p => (p.contracts || 0) < 0);
        const shortPuts = putOptions.filter(p => (p.contracts || 0) < 0);
        const longCalls = callOptions.filter(p => (p.contracts || 0) > 0);
        const longPuts = putOptions.filter(p => (p.contracts || 0) > 0);

        console.log(`📊 ${ticker} Position Analysis:`, {
            totalStockShares,
            shortCalls: shortCalls.length,
            shortPuts: shortPuts.length,
            longCalls: longCalls.length,
            longPuts: longPuts.length,
            shortCallDetails: shortCalls.map(c => ({ symbol: c.symbol, contracts: c.contracts, strike: c.strikePrice })),
            shortPutDetails: shortPuts.map(p => ({ symbol: p.symbol, contracts: p.contracts, strike: p.strikePrice }))
        });

        // Enhanced position formatting with unified data model support
        const formattedPositions = positions.map(p => {
            const isShortPosition = p.isOption ? (p.contracts || 0) < 0 : p.shares < 0;
            const rawQuantity = p.isOption ? (p.contracts || 0) : p.shares;
            const daysToExpiration = p.expirationDate ? this.calculateDaysToExpiration(p.expirationDate) : undefined;

            return {
                type: p.isOption ? (p.optionType === 'Call' ? 'call' : 'put') as 'call' | 'put' : 'stock' as 'stock',
                symbol: p.symbol,
                quantity: Math.abs(rawQuantity), // Only use abs for display purposes
                position: isShortPosition ? 'short' : 'long' as 'long' | 'short',
                strikePrice: p.strikePrice,
                expirationDate: p.expirationDate,
                daysToExpiration,
                marketValue: p.marketValue,
                rawQuantity: rawQuantity, // Preserve original signed quantity for logic
                source: p.source || 'unknown'
            };
        });

        // Enhanced detection logic with confidence scoring and risk assessment
        if (this.isFullWheel(totalStockShares, shortCalls, shortPuts)) {
            console.log(`✅ ${ticker}: Detected FULL WHEEL strategy`);
            const result = this.createFullWheelResult(ticker, formattedPositions, shortCalls, shortPuts, options);
            return result;
        }

        if (this.isCoveredCall(totalStockShares, shortCalls)) {
            console.log(`✅ ${ticker}: Detected COVERED CALL strategy`);
            const result = this.createCoveredCallResult(ticker, formattedPositions, totalStockShares, shortCalls, options);
            return result;
        }

        if (this.isCashSecuredPut(shortPuts)) {
            console.log(`✅ ${ticker}: Detected CASH-SECURED PUT strategy`);
            const result = this.createCashSecuredPutResult(ticker, formattedPositions, shortPuts, totalStockShares, options);
            return result;
        }

        if (this.isNakedStock(totalStockShares, optionPositions)) {
            // Only suggest wheel for stocks in round lots (100+ shares)
            if (totalStockShares >= 100) {
                console.log(`✅ ${ticker}: Detected NAKED STOCK ready for wheel strategy`);
                const result = this.createNakedStockResult(ticker, formattedPositions, totalStockShares, options);
                return result;
            }
        }

        console.log(`❌ ${ticker}: No wheel strategy detected`);
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

    // ===== ENHANCED HELPER METHODS =====

    /**
     * Calculate days to expiration from date string
     */
    private static calculateDaysToExpiration(expirationDate: string): number {
        const expDate = new Date(expirationDate);
        const today = new Date();
        const diffTime = expDate.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Calculate confidence score based on multiple factors
     */
    private static calculateConfidenceScore(
        strategy: string,
        positions: any[],
        cashRequired: number = 0,
        cashBalance: number = 0,
        marketContext?: MarketContextData
    ): { confidence: 'high' | 'medium' | 'low'; score: number } {
        let score = 50; // Base score

        // Strategy completeness
        switch (strategy) {
            case 'full_wheel':
                score += 30; // Complete strategy
                break;
            case 'covered_call':
                score += 20; // Partial strategy
                break;
            case 'cash_secured_put':
                score += 15; // Basic strategy
                break;
            case 'naked_stock':
                score += 10; // Potential strategy
                break;
        }

        // Cash validation (for CSP strategies)
        if (cashRequired > 0) {
            if (cashBalance >= cashRequired) {
                score += 15; // Sufficient cash
            } else if (cashBalance >= cashRequired * 0.5) {
                score += 5; // Partial cash coverage
            } else {
                score -= 10; // Insufficient cash
            }
        }

        // Days to expiration factor
        const optionPositions = positions.filter(p => p.daysToExpiration !== undefined);
        if (optionPositions.length > 0) {
            const avgDaysToExp = optionPositions.reduce((sum, p) => sum + (p.daysToExpiration || 0), 0) / optionPositions.length;
            if (avgDaysToExp > 30) {
                score += 10; // Good time horizon
            } else if (avgDaysToExp < 7) {
                score -= 15; // Close to expiration
            }
        }

        // Market context (if available)
        if (marketContext) {
            if (marketContext.volatility && marketContext.volatility > 0.3) {
                score += 5; // Higher volatility = better premiums
            }
            if (marketContext.marketTrend === 'bullish') {
                score += 5; // Bullish trend favors wheels
            }
        }

        // Ensure score is within bounds
        score = Math.max(0, Math.min(100, score));

        // Determine confidence level
        let confidence: 'high' | 'medium' | 'low';
        if (score >= 70) {
            confidence = 'high';
        } else if (score >= 40) {
            confidence = 'medium';
        } else {
            confidence = 'low';
        }

        return { confidence, score };
    }

    /**
     * Calculate cash required for CSP strategy
     */
    private static calculateCashRequired(shortPuts: ParsedPosition[]): number {
        return shortPuts.reduce((total, put) => {
            const contracts = Math.abs(put.contracts || 0);
            const strike = put.strikePrice || 0;
            return total + (contracts * strike * 100); // 100 shares per contract
        }, 0);
    }

    /**
     * Assess risk factors for a strategy
     */
    private static assessRisk(
        strategy: string,
        positions: any[],
        options: WheelDetectionOptions
    ): {
        level: 'low' | 'medium' | 'high';
        factors: string[];
        maxLoss?: number;
        assignmentRisk?: number;
    } {
        const factors: string[] = [];
        let level: 'low' | 'medium' | 'high' = 'medium';
        let assignmentRisk = 50; // Default 50%

        // Check days to expiration
        const shortOptions = positions.filter(p => p.position === 'short' && p.daysToExpiration !== undefined);
        if (shortOptions.length > 0) {
            const minDaysToExp = Math.min(...shortOptions.map(p => p.daysToExpiration || 365));
            if (minDaysToExp < 7) {
                factors.push('Options expiring within 7 days - high assignment risk');
                assignmentRisk = 80;
                level = 'high';
            } else if (minDaysToExp < 21) {
                factors.push('Options expiring within 3 weeks - moderate assignment risk');
                assignmentRisk = 60;
            }
        }

        // Risk tolerance adjustment
        if (options.riskTolerance === 'conservative') {
            factors.push('Conservative risk profile - consider safer strikes');
            if (level === 'medium') level = 'high';
        } else if (options.riskTolerance === 'aggressive') {
            factors.push('Aggressive risk profile - monitor positions closely');
        }

        // Strategy-specific risk factors
        switch (strategy) {
            case 'cash_secured_put':
                factors.push('Assignment would result in stock ownership');
                if (assignmentRisk > 70) {
                    factors.push('High probability of assignment at current levels');
                }
                break;
            case 'covered_call':
                factors.push('Call assignment would result in stock sale');
                break;
            case 'full_wheel':
                factors.push('Multiple assignment possibilities - complex management');
                if (level !== 'high') level = 'medium';
                break;
        }

        return { level, factors, assignmentRisk };
    }

    /**
     * Create enhanced Full Wheel result
     */
    private static createFullWheelResult(
        ticker: string,
        positions: any[],
        _shortCalls: ParsedPosition[],
        shortPuts: ParsedPosition[],
        options: WheelDetectionOptions
    ): WheelDetectionResult {
        const cashRequired = this.calculateCashRequired(shortPuts);
        const { confidence, score } = this.calculateConfidenceScore(
            'full_wheel',
            positions,
            cashRequired,
            options.cashBalance || 0,
            options.marketData
        );
        const riskAssessment = this.assessRisk('full_wheel', positions, options);

        return {
            ticker,
            strategy: 'full_wheel',
            confidence,
            confidenceScore: score,
            description: `Complete wheel strategy: ${positions.filter(p => p.type === 'stock')[0]?.quantity || 0} shares with covered call and put-selling capability`,
            cashRequired,
            cashValidated: options.cashBalance ? options.cashBalance >= cashRequired : undefined,
            riskAssessment,
            positions,
            recommendations: [
                'Monitor covered call for expiration or early assignment',
                'Consider rolling call option if needed',
                'Look for opportunities to sell additional puts if assigned'
            ],
            potentialActions: [
                { action: 'roll_call', description: 'Roll covered call to later expiration', priority: 'high' },
                { action: 'close_call', description: 'Buy back call option for profit', priority: 'medium' },
                { action: 'sell_put', description: 'Sell additional cash-secured puts', priority: 'low' }
            ],
            marketContext: options.marketData
        };
    }

    /**
     * Create enhanced Covered Call result
     */
    private static createCoveredCallResult(
        ticker: string,
        positions: any[],
        totalStockShares: number,
        _shortCalls: ParsedPosition[],
        options: WheelDetectionOptions
    ): WheelDetectionResult {
        const { confidence, score } = this.calculateConfidenceScore(
            'covered_call',
            positions,
            0,
            options.cashBalance || 0,
            options.marketData
        );
        const riskAssessment = this.assessRisk('covered_call', positions, options);

        const shortCallCount = positions.filter(p => p.type === 'call' && p.position === 'short').length;

        return {
            ticker,
            strategy: 'covered_call',
            confidence,
            confidenceScore: score,
            description: `Covered call position: ${totalStockShares} shares with ${shortCallCount} short call(s)`,
            riskAssessment,
            positions,
            recommendations: [
                'Monitor for potential assignment at expiration',
                'Consider rolling call if wanting to keep shares',
                'Could evolve into full wheel by selling puts'
            ],
            potentialActions: [
                { action: 'roll_call', description: 'Extend call expiration', priority: 'high' },
                { action: 'sell_put', description: 'Start wheel by selling puts below current price', priority: 'medium' }
            ],
            marketContext: options.marketData
        };
    }

    /**
     * Create enhanced Cash-Secured Put result
     */
    private static createCashSecuredPutResult(
        ticker: string,
        positions: any[],
        shortPuts: ParsedPosition[],
        totalStockShares: number,
        options: WheelDetectionOptions
    ): WheelDetectionResult {
        const cashRequired = this.calculateCashRequired(shortPuts);
        const { confidence, score } = this.calculateConfidenceScore(
            'cash_secured_put',
            positions,
            cashRequired,
            options.cashBalance || 0,
            options.marketData
        );
        const riskAssessment = this.assessRisk('cash_secured_put', positions, options);

        return {
            ticker,
            strategy: 'cash_secured_put',
            confidence,
            confidenceScore: score,
            description: `Cash-secured put position: ${shortPuts.length} short put(s) ${totalStockShares > 0 ? `with ${totalStockShares} existing shares` : ''}`,
            cashRequired,
            cashValidated: options.cashBalance ? options.cashBalance >= cashRequired : undefined,
            riskAssessment,
            positions,
            recommendations: [
                'Prepare for potential assignment',
                'Ensure sufficient cash to purchase shares',
                'Plan covered call strategy if assigned'
            ],
            potentialActions: [
                { action: 'manage_assignment', description: 'Prepare for potential share assignment', priority: 'high' },
                { action: 'roll_put', description: 'Roll put to avoid assignment', priority: 'medium' }
            ],
            marketContext: options.marketData
        };
    }

    /**
     * Create enhanced Naked Stock result
     */
    private static createNakedStockResult(
        ticker: string,
        positions: any[],
        totalStockShares: number,
        options: WheelDetectionOptions
    ): WheelDetectionResult {
        const { confidence, score } = this.calculateConfidenceScore(
            'naked_stock',
            positions,
            0,
            options.cashBalance || 0,
            options.marketData
        );
        const riskAssessment = this.assessRisk('naked_stock', positions, options);

        return {
            ticker,
            strategy: 'naked_stock',
            confidence,
            confidenceScore: score,
            description: `${totalStockShares} shares ready for wheel strategy`,
            riskAssessment,
            positions,
            recommendations: [
                'Consider selling covered calls to generate income',
                'Stock position is suitable for wheel strategy',
                'Could start with covered calls above current price'
            ],
            potentialActions: [
                { action: 'sell_call', description: 'Start covered call strategy', priority: 'high' },
                { action: 'start_wheel', description: 'Begin full wheel strategy', priority: 'medium' }
            ],
            marketContext: options.marketData
        };
    }
}
