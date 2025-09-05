import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, AlertTriangle, Info, Eye, DollarSign,
  Calendar, Hash, Target, Shield, Settings, TrendingUp,
  TrendingDown, Clock, Percent, RotateCcw, Zap,
  FileText, Bell, Edit
} from "lucide-react";

/**
 * ReviewConfirmationStep - Final step in wheel creation wizard
 * Review all parameters and confirm wheel strategy creation
 */
export default function ReviewConfirmationStep({
  formData,
  updateFormData,
  validationErrors,
  isQuickMode = false,
  prefilledData = null
}) {
  const [scenarioAnalysis, setScenarioAnalysis] = useState({
    bullish: {},
    bearish: {},
    neutral: {}
  });

  // Calculate comprehensive strategy metrics
  useEffect(() => {
    const calculateScenarios = () => {
      const strike = parseFloat(formData.strikePrice) || 0;
      const premium = parseFloat(formData.premium) || 0;
      const contracts = parseInt(formData.contractCount) || 1;
      const positionSize = parseFloat(formData.positionSize) || 0;

      // Assume current stock price is around strike for calculations
      const assumedCurrentPrice = strike * (formData.strategyType === 'covered_call' ? 0.95 : 1.05);

      const scenarios = {
        bullish: { priceMove: 1.15, label: '+15%' },
        neutral: { priceMove: 1.0, label: 'No Change' },
        bearish: { priceMove: 0.85, label: '-15%' }
      };

      const results = {};

      Object.keys(scenarios).forEach(scenario => {
        const newPrice = assumedCurrentPrice * scenarios[scenario].priceMove;
        let profit = 0;
        let outcome = '';

        switch (formData.strategyType) {
          case 'covered_call':
            if (newPrice > strike) {
              // Called away - keep premium + capital gains up to strike
              profit = premium * contracts * 100 + (strike - assumedCurrentPrice) * contracts * 100;
              outcome = 'Stock called away - full profit realized';
            } else {
              // Keep stock and premium
              profit = premium * contracts * 100 + (newPrice - assumedCurrentPrice) * contracts * 100;
              outcome = 'Keep stock and premium - can sell more calls';
            }
            break;

          case 'cash_secured_put':
            if (newPrice < strike) {
              // Assigned - own stock at strike price
              profit = premium * contracts * 100 - (strike - newPrice) * contracts * 100;
              outcome = 'Assigned stock - begin covered call phase';
            } else {
              // Premium profit only
              profit = premium * contracts * 100;
              outcome = 'Keep premium - can sell more puts';
            }
            break;

          case 'full_wheel':
            // Simplified calculation for wheel strategy
            if (newPrice < strike * 0.95) {
              profit = premium * contracts * 100 - (strike - newPrice) * contracts * 100;
              outcome = 'Put phase - stock assigned, start covered calls';
            } else if (newPrice > strike * 1.05) {
              profit = premium * contracts * 100 + (strike * 0.05) * contracts * 100;
              outcome = 'Call phase - stock called away, restart with puts';
            } else {
              profit = premium * contracts * 100;
              outcome = 'Neutral - collect premium and continue cycle';
            }
            break;

          default:
            profit = premium * contracts * 100;
            outcome = 'Premium collected';
        }

        results[scenario] = {
          ...scenarios[scenario],
          newPrice: Math.round(newPrice * 100) / 100,
          profit: Math.round(profit),
          profitPercent: positionSize > 0 ? Math.round((profit / positionSize) * 10000) / 100 : 0,
          outcome
        };
      });

      setScenarioAnalysis(results);
    };

    calculateScenarios();
  }, [formData]);

  // Strategy type display mapping
  const getStrategyDisplay = (type) => {
    const strategies = {
      'covered_call': { name: 'Covered Call', icon: TrendingDown, color: 'green' },
      'cash_secured_put': { name: 'Cash-Secured Put', icon: TrendingUp, color: 'blue' },
      'full_wheel': { name: 'Full Wheel Strategy', icon: RotateCcw, color: 'purple' },
      'poor_mans_covered_call': { name: "Poor Man's Covered Call", icon: Target, color: 'orange' }
    };
    return strategies[type] || { name: type, icon: Target, color: 'slate' };
  };

  const strategyDisplay = getStrategyDisplay(formData.strategyType);
  const StrategyIcon = strategyDisplay.icon;

  // Risk level assessment
  const getRiskAssessment = () => {
    const strike = parseFloat(formData.strikePrice) || 0;
    const premium = parseFloat(formData.premium) || 0;
    const contracts = parseInt(formData.contractCount) || 1;
    const positionSize = parseFloat(formData.positionSize) || 0;

    const potentialReturn = positionSize > 0 ? (premium * contracts * 100 / positionSize) * 100 : 0;
    const maxRisk = formData.strategyType === 'cash_secured_put' ?
      (strike * contracts * 100) - (premium * contracts * 100) : positionSize;

    let riskLevel = 'Low';
    let riskColor = 'text-green-600 bg-green-100';
    let riskWarnings = [];

    if (potentialReturn > 15) {
      riskLevel = 'High';
      riskColor = 'text-red-600 bg-red-100';
      riskWarnings.push('Very high potential return may indicate elevated risk');
    } else if (potentialReturn > 8) {
      riskLevel = 'Medium-High';
      riskColor = 'text-orange-600 bg-orange-100';
      riskWarnings.push('Above-average return expectation');
    } else if (potentialReturn > 4) {
      riskLevel = 'Medium';
      riskColor = 'text-yellow-600 bg-yellow-100';
    }

    if (maxRisk > 50000) {
      riskWarnings.push('Large capital allocation requires careful monitoring');
    }

    if (contracts > 10) {
      riskWarnings.push('High number of contracts increases position concentration');
    }

    return { riskLevel, riskColor, riskWarnings, potentialReturn, maxRisk };
  };

  const riskAssessment = getRiskAssessment();

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate days to expiration
  const getDaysToExpiration = () => {
    if (!formData.expirationDate) return 0;
    const expiry = new Date(formData.expirationDate);
    const today = new Date();
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-8">
      {/* Step Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Review & Confirm Strategy
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Review all parameters, understand the risks, and confirm your wheel strategy creation.
          Once created, you can monitor and manage the strategy from your dashboard.
        </p>
      </div>

      {/* Strategy Summary Card */}
      <div className="p-6 bg-white border-2 border-slate-200 rounded-xl shadow-lg">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 bg-${strategyDisplay.color}-100 rounded-lg`}>
              <StrategyIcon className={`w-6 h-6 text-${strategyDisplay.color}-600`} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {strategyDisplay.name}
              </h3>
              <p className="text-slate-600">
                {formData.ticker} • {formatDate(formData.expirationDate)} • {getDaysToExpiration()} days
              </p>
            </div>
          </div>

          <Badge className={riskAssessment.riskColor}>
            {riskAssessment.riskLevel} Risk
          </Badge>
        </div>

        {/* Key Parameters Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Strike Price</span>
            </div>
            <div className="text-lg font-bold text-slate-900">
              ${formData.strikePrice}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Contracts</span>
            </div>
            <div className="text-lg font-bold text-slate-900">
              {formData.contractCount}
            </div>
            <p className="text-xs text-slate-500">
              {formData.contractCount * 100} shares
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Premium</span>
            </div>
            <div className="text-lg font-bold text-slate-900">
              ${formData.premium}
            </div>
            <p className="text-xs text-slate-500">
              {formatCurrency(parseFloat(formData.premium || 0) * formData.contractCount * 100)} total
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Expiration</span>
            </div>
            <div className="text-lg font-bold text-slate-900">
              {getDaysToExpiration()}d
            </div>
            <p className="text-xs text-slate-500">
              {formatDate(formData.expirationDate)}
            </p>
          </div>
        </div>

        {/* Risk Management Settings */}
        <div className="border-t border-slate-200 pt-4">
          <h4 className="font-medium text-slate-900 mb-3">Risk Management</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            {formData.stopLoss && (
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-600" />
                <span>Stop Loss: {formData.stopLoss}%</span>
              </div>
            )}
            {formData.profitTarget && (
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-green-600" />
                <span>Profit Target: {formData.profitTarget}%</span>
              </div>
            )}
            {formData.maxDays && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Max Days: {formData.maxDays}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-600" />
              <span>Auto-Roll: {formData.autoRoll ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scenario Analysis */}
      <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Scenario Analysis
        </h3>

        <div className="grid gap-4 lg:grid-cols-3">
          {Object.entries(scenarioAnalysis).map(([scenario, data]) => (
            <div key={scenario} className="p-4 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-slate-900 capitalize">{scenario}</h4>
                <Badge variant="outline" className="text-xs">
                  {data.label}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Stock Price:</span>
                  <span className="font-medium">${data.newPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">P&L:</span>
                  <span className={`font-medium ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(data.profit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Return:</span>
                  <span className={`font-medium ${data.profitPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.profitPercent}%
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-600">
                  {data.outcome}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Warnings */}
      {riskAssessment.riskWarnings.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="font-medium text-amber-900">Risk Considerations</span>
          </div>
          <ul className="space-y-1">
            {riskAssessment.riskWarnings.map((warning, index) => (
              <li key={index} className="text-sm text-amber-700 flex items-center gap-2">
                <div className="w-1 h-1 bg-amber-600 rounded-full"></div>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Additional Notes */}
      {formData.notes && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-900">Strategy Notes</span>
          </div>
          <p className="text-sm text-blue-800">
            {formData.notes}
          </p>
        </div>
      )}

      {/* Final Confirmation */}
      <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="font-semibold text-green-900">Ready to Create Wheel Strategy</span>
        </div>

        <p className="text-sm text-green-800 mb-4">
          Your {strategyDisplay.name} strategy for {formData.ticker} is configured and ready for creation.
          You can monitor progress, adjust parameters, and manage the strategy from your dashboard.
        </p>

        <div className="flex items-center gap-4 text-xs text-green-700">
          <div className="flex items-center gap-1">
            <Bell className="w-3 h-3" />
            <span>Notifications: {formData.notifications ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="flex items-center gap-1">
            <RotateCcw className="w-3 h-3" />
            <span>Auto-Roll: {formData.autoRoll ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>Risk Management: {(formData.stopLoss || formData.profitTarget) ? 'Active' : 'Manual'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
