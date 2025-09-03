/**
 * Frontend P&L Calculation Utilities
 * 
 * Provides client-side P&L calculations and formatting utilities
 * for option positions and portfolio analytics.
 */

export interface OptionPosition {
  contracts: number;
  averagePrice: number;
  currentPrice: number;
  optionType: 'CALL' | 'PUT';
  strikePrice?: number;
  symbol?: string;
}

export interface PnLResult {
  profitLoss: number;
  profitLossPercent: number;
  marketValue: number;
  costBasis: number;
  isProfit: boolean;
}

export interface StrategyPnLResult extends PnLResult {
  strategyType?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  breakevenPrice?: number;
  maxProfit?: number;
  timeDecayImpact?: 'positive' | 'negative' | 'neutral';
}

/**
 * Calculate basic P&L for option positions
 */
export function calculateOptionPnL(position: OptionPosition): PnLResult {
  const { contracts, averagePrice, currentPrice } = position;
  const absContracts = Math.abs(contracts);
  const multiplier = 100; // Standard option contract multiplier

  // Calculate cost basis and market value
  const costBasis = averagePrice * absContracts * multiplier;
  const marketValue = currentPrice * absContracts * multiplier;

  // Calculate P&L based on position type
  let profitLoss: number;
  if (contracts > 0) {
    // Long position: profit when current > average
    profitLoss = marketValue - costBasis;
  } else {
    // Short position: profit when current < average
    profitLoss = costBasis - marketValue;
  }

  // Calculate percentage
  const profitLossPercent = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

  return {
    profitLoss: Math.round(profitLoss * 100) / 100,
    profitLossPercent: Math.round(profitLossPercent * 100) / 100,
    marketValue: Math.round(marketValue * 100) / 100,
    costBasis: Math.round(costBasis * 100) / 100,
    isProfit: profitLoss >= 0
  };
}

/**
 * Calculate strategy-specific P&L with additional insights
 */
export function calculateStrategyPnL(
  position: OptionPosition,
  strategyType?: string
): StrategyPnLResult {
  const basicPnL = calculateOptionPnL(position);
  const { contracts, averagePrice, optionType, strikePrice } = position;

  let strategyInsights: Partial<StrategyPnLResult> = {
    strategyType: strategyType || 'unknown',
    riskLevel: 'medium',
    timeDecayImpact: 'neutral'
  };

  // Add strategy-specific calculations
  if (strategyType === 'wheel' && optionType === 'PUT' && contracts < 0) {
    // Cash-secured put (wheel start)
    strategyInsights = {
      strategyType: 'wheel',
      riskLevel: 'low',
      timeDecayImpact: 'positive',
      breakevenPrice: strikePrice ? strikePrice - averagePrice : undefined,
      maxProfit: averagePrice * Math.abs(contracts) * 100
    };
  } else if (strategyType === 'covered_call' && optionType === 'CALL' && contracts < 0) {
    // Covered call
    strategyInsights = {
      strategyType: 'covered_call',
      riskLevel: 'low',
      timeDecayImpact: 'positive',
      breakevenPrice: strikePrice ? strikePrice + averagePrice : undefined,
      maxProfit: averagePrice * Math.abs(contracts) * 100
    };
  } else if (strategyType === 'pmcc') {
    // Poor Man's Covered Call
    strategyInsights = {
      strategyType: 'pmcc',
      riskLevel: 'medium',
      timeDecayImpact: 'neutral'
    };
  }

  return {
    ...basicPnL,
    ...strategyInsights
  };
}

/**
 * Format currency values for display
 */
export function formatCurrency(value: number): string {
  if (value === 0) return '$0.00';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Format percentage values for display
 */
export function formatPercent(value: number): string {
  if (value === 0) return '0.00%';

  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value / 100);
}

/**
 * Get color class for P&L display based on profit/loss
 */
export function getPnLColorClass(profitLoss: number): string {
  if (profitLoss > 0) {
    return 'text-green-600';
  } else if (profitLoss < 0) {
    return 'text-red-600';
  } else {
    return 'text-slate-600';
  }
}

/**
 * Get background color class for P&L badges
 */
export function getPnLBadgeClass(profitLoss: number): string {
  if (profitLoss > 0) {
    return 'bg-green-100 text-green-800 border-green-300';
  } else if (profitLoss < 0) {
    return 'bg-red-100 text-red-800 border-red-300';
  } else {
    return 'bg-slate-100 text-slate-800 border-slate-300';
  }
}

/**
 * Get strategy badge styling
 */
export function getStrategyBadgeClass(strategyType: string): string {
  const strategyColors: Record<string, string> = {
    'wheel': 'bg-purple-100 text-purple-800 border-purple-300',
    'covered_call': 'bg-blue-100 text-blue-800 border-blue-300',
    'pmcc': 'bg-green-100 text-green-800 border-green-300',
    'long_option': 'bg-orange-100 text-orange-800 border-orange-300',
    'naked': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'unknown': 'bg-slate-100 text-slate-800 border-slate-300'
  };

  return strategyColors[strategyType] || strategyColors['unknown'];
}

/**
 * Calculate portfolio-level P&L metrics
 */
export function calculatePortfolioPnL(positions: OptionPosition[]): {
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  totalMarketValue: number;
  totalCostBasis: number;
  winningPositions: number;
  losingPositions: number;
  winRate: number;
} {
  let totalProfitLoss = 0;
  let totalMarketValue = 0;
  let totalCostBasis = 0;
  let winningPositions = 0;
  let losingPositions = 0;

  positions.forEach(position => {
    const pnl = calculateOptionPnL(position);
    totalProfitLoss += pnl.profitLoss;
    totalMarketValue += pnl.marketValue;
    totalCostBasis += pnl.costBasis;

    if (pnl.profitLoss > 0) {
      winningPositions++;
    } else if (pnl.profitLoss < 0) {
      losingPositions++;
    }
  });

  const totalProfitLossPercent = totalCostBasis > 0 ? (totalProfitLoss / totalCostBasis) * 100 : 0;
  const winRate = positions.length > 0 ? (winningPositions / positions.length) * 100 : 0;

  return {
    totalProfitLoss: Math.round(totalProfitLoss * 100) / 100,
    totalProfitLossPercent: Math.round(totalProfitLossPercent * 100) / 100,
    totalMarketValue: Math.round(totalMarketValue * 100) / 100,
    totalCostBasis: Math.round(totalCostBasis * 100) / 100,
    winningPositions,
    losingPositions,
    winRate: Math.round(winRate * 100) / 100
  };
}

/**
 * Validate P&L calculation against backend data
 */
export function validatePnLCalculation(
  frontendPnL: PnLResult,
  backendPnL: any,
  tolerance: number = 0.01
): boolean {
  const profitLossDiff = Math.abs(frontendPnL.profitLoss - (backendPnL.profit_loss || 0));
  const marketValueDiff = Math.abs(frontendPnL.marketValue - (backendPnL.market_value || 0));

  return profitLossDiff <= tolerance && marketValueDiff <= tolerance;
}
