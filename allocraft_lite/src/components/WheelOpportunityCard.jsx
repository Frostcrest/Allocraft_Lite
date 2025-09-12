import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  TrendingUp,
  DollarSign,
  Target,
  AlertCircle,
  Info,
  Plus,
  Eye,
  Calendar,
  Percent,
  TrendingDown,
  Coins,
  Activity
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

/**
 * Wheel Opportunity Card Component
 * Displays individual wheel opportunities with strategy details and actions
 */
const WheelOpportunityCard = ({
  opportunity,
  onCreateWheel,
  onViewDetails,
  className = ""
}) => {
  if (!opportunity) {
    return null;
  }

  const {
    ticker,
    strategy,
    confidence_score = 0,
    confidence_level = 'low',
    positions = [],
    potential_income = 0,
    risk_assessment = {},
    recommendations = [],
    days_to_expiration,
    market_context = {}
  } = opportunity;

  // Strategy configuration
  const getStrategyConfig = (strategy) => {
    const configs = {
      full_wheel: {
        icon: <Zap className="w-5 h-5 text-white" />,
        bgGradient: "bg-gradient-to-br from-purple-600 to-purple-700",
        borderColor: "border-purple-200",
        badgeStyle: "bg-purple-100 text-purple-800 border-purple-200",
        title: "Full Wheel Strategy",
        description: "Complete wheel cycle with stocks and options"
      },
      covered_call: {
        icon: <TrendingUp className="w-5 h-5 text-white" />,
        bgGradient: "bg-gradient-to-br from-blue-600 to-blue-700",
        borderColor: "border-blue-200",
        badgeStyle: "bg-blue-100 text-blue-800 border-blue-200",
        title: "Covered Call",
        description: "Generate income from existing stock positions"
      },
      cash_secured_put: {
        icon: <DollarSign className="w-5 h-5 text-white" />,
        bgGradient: "bg-gradient-to-br from-green-600 to-green-700",
        borderColor: "border-green-200",
        badgeStyle: "bg-green-100 text-green-800 border-green-200",
        title: "Cash Secured Put",
        description: "Acquire stocks at desired price with premium income"
      },
      naked_stock: {
        icon: <Target className="w-5 h-5 text-white" />,
        bgGradient: "bg-gradient-to-br from-yellow-600 to-yellow-700",
        borderColor: "border-yellow-200",
        badgeStyle: "bg-yellow-100 text-yellow-800 border-yellow-200",
        title: "Stock Position",
        description: "Ready for wheel strategy initiation"
      }
    };

    return configs[strategy] || configs.naked_stock;
  };

  const strategyConfig = getStrategyConfig(strategy);

  // Confidence level styling
  const getConfidenceStyle = (confidence_level, score) => {
    if (score >= 80) {
      return { style: "bg-emerald-100 text-emerald-800 border-emerald-200", label: "High" };
    } else if (score >= 60) {
      return { style: "bg-amber-100 text-amber-800 border-amber-200", label: "Medium" };
    } else {
      return { style: "bg-red-100 text-red-800 border-red-200", label: "Low" };
    }
  };

  const confidenceStyle = getConfidenceStyle(confidence_level, confidence_score);

  // Helper function to detect if a position is actually an option based on symbol pattern
  const isOptionBySymbol = (symbol) => {
    // Option symbols contain expiration dates and strike prices
    // Examples: 'GOOG 260618C00250000', 'AAPL 230120P00150000'
    return /\s+\d{6}[CP]\d{8}/.test(symbol);
  };

  // Format position summary
  const getPositionSummary = (positions) => {
    console.log(`🔍 WheelOpportunityCard Debug - ${ticker}:`, {
      positionsReceived: positions,
      positionsType: typeof positions,
      positionsLength: Array.isArray(positions) ? positions.length : 'not array',
      positionsStructure: Array.isArray(positions) && positions.length > 0 ? positions[0] : 'empty'
    });

    if (!Array.isArray(positions) || positions.length === 0) {
      console.log(`❌ ${ticker}: No positions data available`);
      return { shares: 0, options: 0, totalValue: 0 };
    }

    // Enhanced position filtering - detect options by symbol pattern even if type is wrong
    const stockPositions = positions.filter(p => {
      const isStockByType = (p.type === 'stock' || p.instrument_type === 'stock' || p.asset_type === 'EQUITY');
      const isNotOptionBySymbol = !isOptionBySymbol(p.symbol || '');
      return isStockByType && isNotOptionBySymbol;
    });

    const optionPositions = positions.filter(p => {
      const isOptionByType = (p.type === 'option' || p.type === 'call' || p.type === 'put' ||
        p.instrument_type === 'option' || p.asset_type === 'OPTION');
      const hasOptionSymbolPattern = isOptionBySymbol(p.symbol || '');
      return isOptionByType || hasOptionSymbolPattern; // Include if either type says option OR symbol pattern matches
    });

    console.log(`📊 ${ticker}: Enhanced position filtering:`, {
      totalPositions: positions.length,
      stockPositions: stockPositions.length,
      optionPositions: optionPositions.length,
      stockSymbols: stockPositions.map(p => p.symbol),
      optionSymbols: optionPositions.map(p => p.symbol),
      optionPositionTypes: optionPositions.map(p => p.type || p.instrument_type || p.asset_type)
    });

    const shares = stockPositions.reduce((sum, p) => sum + (p.quantity || p.shares || 0), 0);

    // Count actual option contracts, handling multiple data structures
    const options = optionPositions.reduce((sum, p) => {
      let contracts = 0;
      if (p.long_quantity !== undefined && p.short_quantity !== undefined) {
        // Backend unified position structure: use absolute difference
        contracts = Math.abs(p.long_quantity - p.short_quantity);
        console.log(`📈 ${ticker}: Using long/short quantities: ${p.long_quantity} - ${p.short_quantity} = ${contracts}`);
      } else if (p.quantity !== undefined) {
        // Backend EnhancedPosition structure: quantity is already absolute
        contracts = Math.abs(p.quantity);
        console.log(`📈 ${ticker}: Using quantity field: ${p.quantity} = ${contracts} (symbol: ${p.symbol})`);
      } else if (p.contracts !== undefined) {
        // Frontend/alternative structure: contracts field
        contracts = Math.abs(p.contracts);
        console.log(`📈 ${ticker}: Using contracts field: ${p.contracts} = ${contracts}`);
      } else {
        console.log(`⚠️ ${ticker}: No quantity field found in position:`, p);
      }
      return sum + contracts;
    }, 0);

    const totalValue = positions.reduce((sum, p) => sum + (p.market_value || p.value || 0), 0);

    const summary = { shares, options, totalValue };
    console.log(`✅ ${ticker}: Final position summary:`, summary);
    return summary;
  };

  const positionSummary = getPositionSummary(positions);

  // Format recommendations
  const getPrimaryRecommendation = (recommendations) => {
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      return "Analyze this opportunity";
    }

    return recommendations[0]?.action || recommendations[0] || "Create wheel strategy";
  };

  const primaryRecommendation = getPrimaryRecommendation(recommendations);

  return (
    <Card className={`hover:shadow-lg transition-all duration-200 ${strategyConfig.borderColor} border-2 ${className}`}>
      {/* Card Header with Strategy Info */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${strategyConfig.bgGradient}`}>
              {strategyConfig.icon}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{ticker}</h3>
              <p className="text-sm text-slate-600">{strategyConfig.title}</p>
            </div>
          </div>

          {/* Confidence Badge */}
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={confidenceStyle.style}>
              <Percent className="w-3 h-3 mr-1" />
              {confidenceStyle.label} ({confidence_score}%)
            </Badge>
            {days_to_expiration && (
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {days_to_expiration}d exp
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Strategy Description */}
        <p className="text-sm text-slate-600 leading-relaxed">
          {strategyConfig.description}
        </p>

        {/* Position Summary */}
        <div className="bg-slate-50 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-1">
            <Activity className="w-4 h-4" />
            Position Summary
          </h4>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="text-center">
              <div className="text-slate-600">Shares</div>
              <div className="font-semibold text-slate-900">{positionSummary.shares.toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-600">Options</div>
              <div className="font-semibold text-slate-900">{positionSummary.options}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-600">Value</div>
              <div className="font-semibold text-slate-900">
                {formatCurrency(positionSummary.totalValue)}
              </div>
            </div>
          </div>
        </div>

        {/* Potential Income & Risk */}
        <div className="flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
          <div>
            <div className="text-sm text-slate-600">Potential Income</div>
            <div className="text-lg font-bold text-green-700">
              {formatCurrency(potential_income)}
            </div>
          </div>
          {risk_assessment?.level && (
            <Badge
              variant="outline"
              className={
                risk_assessment.level === 'low' ? 'bg-green-50 text-green-700 border-green-200' :
                  risk_assessment.level === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    'bg-red-50 text-red-700 border-red-200'
              }
            >
              Risk: {risk_assessment.level}
            </Badge>
          )}
        </div>

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-1">
              <Info className="w-4 h-4" />
              Recommendation
            </h4>
            <p className="text-sm text-blue-800">{primaryRecommendation}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => onCreateWheel && onCreateWheel(opportunity)}
            className={`flex-1 ${strategyConfig.bgGradient} hover:opacity-90 transition-opacity`}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Wheel
          </Button>
          <Button
            variant="outline"
            onClick={() => onViewDetails && onViewDetails(opportunity)}
            className="px-3"
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>

        {/* Market Context (if available) */}
        {market_context?.session_type && (
          <div className="text-xs text-slate-500 flex items-center gap-1 pt-1">
            <Coins className="w-3 h-3" />
            Market: {market_context.session_type}
            {market_context.volatility && ` • Volatility: ${market_context.volatility}`}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WheelOpportunityCard;
