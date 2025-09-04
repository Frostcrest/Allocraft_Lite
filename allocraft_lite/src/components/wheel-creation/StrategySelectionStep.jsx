import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, TrendingUp, TrendingDown, RotateCcw, Target,
  ArrowDown, ArrowUp, Shield, DollarSign, Zap,
  AlertCircle, CheckCircle2, Info
} from "lucide-react";

/**
 * StrategySelectionStep - First step in wheel creation wizard
 * Allows users to select strategy type and target ticker
 */
export default function StrategySelectionStep({
  formData,
  updateFormData,
  validationErrors,
  isQuickMode = false,
  prefilledData = null
}) {
  // console.log('📋 StrategySelectionStep rendering:', { formData, isQuickMode });

  const [tickerSearch, setTickerSearch] = useState(formData.ticker || '');
  const [selectedStrategy, setSelectedStrategy] = useState(formData.strategyType || '');

  // Sync local state with formData when it changes (e.g., coming from previous step)
  useEffect(() => {
    if (formData.ticker && formData.ticker !== tickerSearch) {
      console.log('📥 Syncing ticker from formData:', formData.ticker);
      setTickerSearch(formData.ticker);
    }
    if (formData.strategyType && formData.strategyType !== selectedStrategy) {
      console.log('📥 Syncing strategy from formData:', formData.strategyType);
      setSelectedStrategy(formData.strategyType);
    }
  }, [formData.ticker, formData.strategyType]);

  // Available wheel strategies with detailed information
  const strategies = [
    {
      id: 'covered_call',
      name: 'Covered Call',
      description: 'Sell call options against existing stock positions',
      icon: ArrowDown,
      color: 'green',
      requirements: ['Own 100+ shares per contract'],
      benefits: ['Generate income from stock holdings', 'Lower risk profile'],
      riskLevel: 'Low',
      expectedReturn: 'Low-Medium',
      marketCondition: 'Neutral to Slightly Bullish',
      complexity: 'Beginner',
      minCapital: '$1,000 - $5,000'
    },
    {
      id: 'cash_secured_put',
      name: 'Cash-Secured Put',
      description: 'Sell put options with cash backing to potentially acquire stock',
      icon: ArrowUp,
      color: 'blue',
      requirements: ['Cash equal to 100 shares x strike price'],
      benefits: ['Earn premium while waiting to buy stock', 'Enter positions at target prices'],
      riskLevel: 'Low-Medium',
      expectedReturn: 'Low-Medium',
      marketCondition: 'Neutral to Bullish',
      complexity: 'Beginner',
      minCapital: '$2,000 - $10,000'
    },
    {
      id: 'full_wheel',
      name: 'Full Wheel Strategy',
      description: 'Complete cycle: Cash-secured puts → Stock ownership → Covered calls',
      icon: RotateCcw,
      color: 'purple',
      requirements: ['Significant capital for full cycles'],
      benefits: ['Maximize income potential', 'Systematic approach'],
      riskLevel: 'Medium',
      expectedReturn: 'Medium-High',
      marketCondition: 'Any (adaptive)',
      complexity: 'Intermediate',
      minCapital: '$5,000 - $25,000'
    },
    {
      id: 'poor_mans_covered_call',
      name: "Poor Man's Covered Call",
      description: 'Use long-term calls (LEAPS) instead of stock for covered calls',
      icon: Target,
      color: 'orange',
      requirements: ['LEAPS options available', 'Understanding of complex options'],
      benefits: ['Lower capital requirement', 'Leverage benefits'],
      riskLevel: 'Medium-High',
      expectedReturn: 'Medium-High',
      marketCondition: 'Bullish',
      complexity: 'Advanced',
      minCapital: '$1,000 - $3,000'
    }
  ];

  // Popular tickers with wheel suitability data
  const popularTickers = [
    { symbol: 'AAPL', name: 'Apple Inc.', suitability: 95, liquidity: 'Excellent', volatility: 'Medium' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', suitability: 92, liquidity: 'Excellent', volatility: 'Low' },
    { symbol: 'TSLA', name: 'Tesla Inc.', suitability: 88, liquidity: 'Excellent', volatility: 'High' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', suitability: 90, liquidity: 'Excellent', volatility: 'High' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', suitability: 87, liquidity: 'Excellent', volatility: 'Medium' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', suitability: 89, liquidity: 'Excellent', volatility: 'Medium' },
    { symbol: 'META', name: 'Meta Platforms Inc.', suitability: 85, liquidity: 'Excellent', volatility: 'High' },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF', suitability: 95, liquidity: 'Excellent', volatility: 'Low' }
  ];

  // Update form data when selections change
  useEffect(() => {
    const updatedData = {
      strategyType: selectedStrategy,
      strategy: selectedStrategy, // Also set strategy field for compatibility
      ticker: tickerSearch.toUpperCase()
    };
    console.log('📝 StrategySelectionStep updating form data:', updatedData);
    updateFormData(updatedData);
  }, [selectedStrategy, tickerSearch, updateFormData]);

  // Handle strategy selection
  const handleStrategySelect = (strategyId) => {
    setSelectedStrategy(strategyId);
  };

  // Handle ticker selection
  const handleTickerSelect = (ticker) => {
    setTickerSearch(ticker);
  };

  // Get strategy details
  const getStrategyById = (id) => strategies.find(s => s.id === id);
  const selectedStrategyData = getStrategyById(selectedStrategy);

  // Risk level colors
  const getRiskColor = (level) => {
    switch (level.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'low-medium': return 'text-yellow-600 bg-yellow-100';
      case 'medium': return 'text-orange-600 bg-orange-100';
      case 'medium-high': return 'text-red-600 bg-red-100';
      case 'high': return 'text-red-700 bg-red-200';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  return (
    <div className="space-y-8">
      {/* Step Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Choose Your Wheel Strategy
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Select the type of wheel strategy that matches your goals and risk tolerance,
          then specify the ticker symbol you want to trade.
        </p>
      </div>

      {/* Quick Mode Notice */}
      {isQuickMode && prefilledData && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">Pre-selected from Opportunity</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            Strategy and ticker pre-filled from detected opportunity. You can change these if needed.
          </p>
        </div>
      )}

      {/* Strategy Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Label className="text-lg font-semibold text-slate-900">
            Strategy Type
          </Label>
          {validationErrors.strategyType && (
            <Badge variant="destructive" className="text-xs">
              {validationErrors.strategyType}
            </Badge>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {strategies.map((strategy) => {
            const Icon = strategy.icon;
            const isSelected = selectedStrategy === strategy.id;

            return (
              <button
                key={strategy.id}
                onClick={() => handleStrategySelect(strategy.id)}
                className={`
                  p-4 border-2 rounded-xl text-left transition-all duration-200
                  hover:shadow-lg hover:scale-[1.02]
                  ${isSelected
                    ? `border-${strategy.color}-500 bg-${strategy.color}-50 shadow-lg`
                    : 'border-slate-200 bg-white hover:border-slate-300'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div className={`
                    p-2 rounded-lg
                    ${isSelected
                      ? `bg-${strategy.color}-100`
                      : 'bg-slate-100'
                    }
                  `}>
                    <Icon className={`
                      w-5 h-5
                      ${isSelected
                        ? `text-${strategy.color}-600`
                        : 'text-slate-600'
                      }
                    `} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-slate-900">
                        {strategy.name}
                      </h3>
                      {isSelected && (
                        <CheckCircle2 className={`w-5 h-5 text-${strategy.color}-600`} />
                      )}
                    </div>

                    <p className="text-sm text-slate-600 mb-3">
                      {strategy.description}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center gap-4 text-xs">
                        <span className={`px-2 py-1 rounded ${getRiskColor(strategy.riskLevel)}`}>
                          {strategy.riskLevel} Risk
                        </span>
                        <span className="text-slate-500">
                          {strategy.complexity}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500">
                        Capital: {strategy.minCapital}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Strategy Details Panel */}
        {selectedStrategyData && (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="font-semibold text-slate-900 mb-4">
              {selectedStrategyData.name} Details
            </h4>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <h5 className="font-medium text-slate-700 mb-2">Requirements</h5>
                  <ul className="space-y-1">
                    {selectedStrategyData.requirements.map((req, index) => (
                      <li key={index} className="text-sm text-slate-600 flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h5 className="font-medium text-slate-700 mb-2">Benefits</h5>
                  <ul className="space-y-1">
                    {selectedStrategyData.benefits.map((benefit, index) => (
                      <li key={index} className="text-sm text-slate-600 flex items-center gap-2">
                        <TrendingUp className="w-3 h-3 text-blue-600" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Expected Return:</span>
                    <div className="font-medium text-slate-900">
                      {selectedStrategyData.expectedReturn}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Market Condition:</span>
                    <div className="font-medium text-slate-900">
                      {selectedStrategyData.marketCondition}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800">
                    <Info className="w-4 h-4" />
                    <span className="font-medium text-sm">Strategy Tip</span>
                  </div>
                  <p className="text-xs text-amber-700 mt-1">
                    {selectedStrategyData.id === 'covered_call' &&
                      "Best for generating income from stocks you plan to hold long-term."
                    }
                    {selectedStrategyData.id === 'cash_secured_put' &&
                      "Ideal for entering stock positions at your desired price while earning premium."
                    }
                    {selectedStrategyData.id === 'full_wheel' &&
                      "Combines both strategies for maximum income potential but requires more capital."
                    }
                    {selectedStrategyData.id === 'poor_mans_covered_call' &&
                      "Advanced strategy that reduces capital requirements but increases complexity."
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ticker Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Label className="text-lg font-semibold text-slate-900">
            Target Ticker
          </Label>
          {validationErrors.ticker && (
            <Badge variant="destructive" className="text-xs">
              {validationErrors.ticker}
            </Badge>
          )}
        </div>

        {/* Ticker Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Enter ticker symbol (e.g., AAPL, MSFT, TSLA)"
            value={tickerSearch}
            onChange={(e) => setTickerSearch(e.target.value.toUpperCase())}
            className="pl-10 text-lg font-mono"
            maxLength={6}
          />
        </div>

        {/* Popular Tickers */}
        <div>
          <h4 className="font-medium text-slate-700 mb-3">Popular Wheel Tickers</h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {popularTickers.map((ticker) => (
              <button
                key={ticker.symbol}
                onClick={() => handleTickerSelect(ticker.symbol)}
                className={`
                  p-3 border rounded-lg text-left transition-all duration-200
                  hover:shadow-md hover:border-blue-300
                  ${tickerSearch === ticker.symbol
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900">{ticker.symbol}</span>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${ticker.suitability >= 90 ? 'bg-green-100 text-green-700' :
                        ticker.suitability >= 85 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-slate-100 text-slate-700'
                      }`}
                  >
                    {ticker.suitability}%
                  </Badge>
                </div>

                <p className="text-xs text-slate-600 mb-2">{ticker.name}</p>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{ticker.liquidity}</span>
                  <span>•</span>
                  <span>{ticker.volatility} Vol</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Ticker Validation Info */}
        {tickerSearch && tickerSearch.length >= 2 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">Ticker: {tickerSearch}</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Make sure this ticker has liquid options and fits your portfolio strategy.
              We'll validate options availability in the next step.
            </p>
          </div>
        )}
      </div>

      {/* Summary */}
      {selectedStrategy && tickerSearch && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-900">Strategy Selection Complete</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Ready to configure {getStrategyById(selectedStrategy)?.name} for {tickerSearch}.
            Click "Next" to set up parameters and position sizing.
          </p>
        </div>
      )}
    </div>
  );
}
