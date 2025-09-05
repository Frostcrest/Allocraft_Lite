import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar, DollarSign, Hash, Target, Shield, Settings,
  AlertCircle, CheckCircle2, Info, TrendingUp, Calculator,
  Clock, Percent, ArrowUp, ArrowDown
} from "lucide-react";

/**
 * ParameterConfigurationStep - Second step in wheel creation wizard
 * Configure strike prices, expiration dates, position sizing, and risk management
 */
export default function ParameterConfigurationStep({
  formData,
  updateFormData,
  validationErrors,
  isQuickMode = false,
  prefilledData = null
}) {
  // Local state for calculations and validations
  const [calculations, setCalculations] = useState({
    maxRisk: 0,
    potentialIncome: 0,
    breakeven: 0,
    returnOnCapital: 0
  });

  // Strategy-specific parameter sets
  const getStrategyConfig = (strategyType) => {
    switch (strategyType) {
      case 'covered_call':
        return {
          requiresStock: true,
          optionType: 'call',
          direction: 'sell',
          parameters: ['strikePrice', 'expirationDate', 'contractCount', 'premium']
        };
      case 'cash_secured_put':
        return {
          requiresCash: true,
          optionType: 'put',
          direction: 'sell',
          parameters: ['strikePrice', 'expirationDate', 'contractCount', 'premium', 'positionSize']
        };
      case 'full_wheel':
        return {
          requiresCash: true,
          optionType: 'both',
          direction: 'sell',
          parameters: ['strikePrice', 'expirationDate', 'contractCount', 'premium', 'positionSize']
        };
      case 'poor_mans_covered_call':
        return {
          requiresLeaps: true,
          optionType: 'call',
          direction: 'both',
          parameters: ['strikePrice', 'expirationDate', 'contractCount', 'premium', 'leapStrike']
        };
      default:
        return {
          parameters: ['strikePrice', 'expirationDate', 'contractCount', 'premium']
        };
    }
  };

  const strategyConfig = getStrategyConfig(formData.strategyType);

  // Common expiration dates (next 8 Fridays + monthly)
  const getExpirationDates = () => {
    const dates = [];
    const today = new Date();

    // Weekly Friday expirations for next 8 weeks
    for (let i = 1; i <= 8; i++) {
      const friday = new Date(today);
      friday.setDate(today.getDate() + (5 - today.getDay() + 7 * i) % 7 + 7 * (i - 1));
      dates.push({
        date: friday.toISOString().split('T')[0],
        label: `${friday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${i}w)`,
        type: 'weekly',
        dte: Math.ceil((friday - today) / (1000 * 60 * 60 * 24))
      });
    }

    // Monthly expirations for next 6 months
    for (let i = 1; i <= 6; i++) {
      const monthlyDate = new Date(today.getFullYear(), today.getMonth() + i, 15);
      // Find third Friday of the month
      const firstDay = new Date(monthlyDate.getFullYear(), monthlyDate.getMonth(), 1);
      const firstFriday = new Date(firstDay);
      firstFriday.setDate(1 + (5 - firstDay.getDay() + 7) % 7);
      const thirdFriday = new Date(firstFriday);
      thirdFriday.setDate(firstFriday.getDate() + 14);

      dates.push({
        date: thirdFriday.toISOString().split('T')[0],
        label: `${thirdFriday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${i}m)`,
        type: 'monthly',
        dte: Math.ceil((thirdFriday - today) / (1000 * 60 * 60 * 24))
      });
    }

    return dates.filter(d => d.dte > 0).sort((a, b) => a.dte - b.dte);
  };

  const expirationDates = getExpirationDates();

  // Calculate strategy metrics
  useEffect(() => {
    const calculateMetrics = () => {
      const strike = parseFloat(formData.strikePrice) || 0;
      const premium = parseFloat(formData.premium) || 0;
      const contracts = parseInt(formData.contractCount) || 1;
      const positionSize = parseFloat(formData.positionSize) || 0;

      let maxRisk = 0;
      let potentialIncome = premium * contracts * 100; // Options are per 100 shares
      let breakeven = 0;
      let returnOnCapital = 0;

      switch (formData.strategyType) {
        case 'covered_call':
          maxRisk = positionSize - (strike * contracts * 100); // Opportunity cost
          breakeven = positionSize / (contracts * 100); // Cost basis per share
          returnOnCapital = positionSize > 0 ? (potentialIncome / positionSize) * 100 : 0;
          break;

        case 'cash_secured_put':
          maxRisk = (strike * contracts * 100) - potentialIncome;
          breakeven = strike - premium;
          returnOnCapital = (strike * contracts * 100) > 0 ? (potentialIncome / (strike * contracts * 100)) * 100 : 0;
          break;

        case 'full_wheel':
          maxRisk = (strike * contracts * 100) - potentialIncome;
          breakeven = strike - premium;
          returnOnCapital = (strike * contracts * 100) > 0 ? (potentialIncome / (strike * contracts * 100)) * 100 : 0;
          break;
      }

      setCalculations({
        maxRisk: Math.round(maxRisk),
        potentialIncome: Math.round(potentialIncome),
        breakeven: Math.round(breakeven * 100) / 100,
        returnOnCapital: Math.round(returnOnCapital * 100) / 100
      });
    };

    calculateMetrics();
  }, [formData.strikePrice, formData.premium, formData.contractCount, formData.positionSize, formData.strategyType]);

  // Handle form field updates
  const handleFieldUpdate = (field, value) => {
    updateFormData({ [field]: value });
  };

  // Quick parameter suggestions based on strategy
  const getParameterSuggestions = () => {
    const suggestions = {
      covered_call: {
        strikePrice: "10-20% above current stock price",
        expirationDate: "15-45 days for optimal theta decay",
        premium: "0.5-2% of stock price for good income"
      },
      cash_secured_put: {
        strikePrice: "5-15% below current stock price",
        expirationDate: "15-45 days for optimal theta decay",
        premium: "1-3% of strike price for good income"
      },
      full_wheel: {
        strikePrice: "Start with puts 5-15% below current price",
        expirationDate: "15-45 days for consistent income",
        premium: "Target 1-2% monthly return on capital"
      }
    };

    return suggestions[formData.strategyType] || {};
  };

  const suggestions = getParameterSuggestions();

  return (
    <div className="space-y-8">
      {/* Step Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Configure Strategy Parameters
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Set up the specific details for your {formData.strategyType?.replace('_', ' ')} strategy on {formData.ticker}.
          Use the suggestions below as starting points.
        </p>
      </div>

      {/* Quick Mode Notice */}
      {isQuickMode && prefilledData && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-900">Smart Parameters Detected</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Parameters pre-filled based on current market conditions and opportunity analysis.
          </p>
        </div>
      )}

      {/* Core Parameters */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Basic Parameters */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Core Parameters
          </h3>

          {/* Strike Price */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="strikePrice" className="font-medium">
                Strike Price ($)
              </Label>
              {validationErrors.strikePrice && (
                <Badge variant="destructive" className="text-xs">
                  {validationErrors.strikePrice}
                </Badge>
              )}
            </div>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="strikePrice"
                type="number"
                placeholder="175.00"
                value={formData.strikePrice}
                onChange={(e) => handleFieldUpdate('strikePrice', e.target.value)}
                className="pl-10"
                step="0.50"
                min="0"
              />
            </div>
            {suggestions.strikePrice && (
              <p className="text-xs text-blue-600 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {suggestions.strikePrice}
              </p>
            )}
          </div>

          {/* Expiration Date */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="expirationDate" className="font-medium">
                Expiration Date
              </Label>
              {validationErrors.expirationDate && (
                <Badge variant="destructive" className="text-xs">
                  {validationErrors.expirationDate}
                </Badge>
              )}
            </div>

            {/* Quick Date Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              {expirationDates.slice(0, 6).map((exp) => (
                <Button
                  key={exp.date}
                  variant={formData.expirationDate === exp.date ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFieldUpdate('expirationDate', exp.date)}
                  className="text-xs p-2"
                >
                  {exp.label}
                </Button>
              ))}
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="expirationDate"
                type="date"
                value={formData.expirationDate}
                onChange={(e) => handleFieldUpdate('expirationDate', e.target.value)}
                className="pl-10"
              />
            </div>
            {suggestions.expirationDate && (
              <p className="text-xs text-blue-600 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {suggestions.expirationDate}
              </p>
            )}
          </div>

          {/* Contract Count */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="contractCount" className="font-medium">
                Number of Contracts
              </Label>
              {validationErrors.contractCount && (
                <Badge variant="destructive" className="text-xs">
                  {validationErrors.contractCount}
                </Badge>
              )}
            </div>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="contractCount"
                type="number"
                placeholder="1"
                value={formData.contractCount}
                onChange={(e) => handleFieldUpdate('contractCount', e.target.value)}
                className="pl-10"
                min="1"
                max="100"
              />
            </div>
            <p className="text-xs text-slate-500">
              Each contract represents 100 shares
            </p>
          </div>

          {/* Premium */}
          <div className="space-y-2">
            <Label htmlFor="premium" className="font-medium">
              Expected Premium ($)
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="premium"
                type="number"
                placeholder="2.50"
                value={formData.premium}
                onChange={(e) => handleFieldUpdate('premium', e.target.value)}
                className="pl-10"
                step="0.01"
                min="0"
              />
            </div>
            {suggestions.premium && (
              <p className="text-xs text-blue-600 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {suggestions.premium}
              </p>
            )}
          </div>

          {/* Position Size (for strategies that require it) */}
          {strategyConfig.requiresCash && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="positionSize" className="font-medium">
                  Cash Position Size ($)
                </Label>
                {validationErrors.positionSize && (
                  <Badge variant="destructive" className="text-xs">
                    {validationErrors.positionSize}
                  </Badge>
                )}
              </div>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="positionSize"
                  type="number"
                  placeholder="10000"
                  value={formData.positionSize}
                  onChange={(e) => handleFieldUpdate('positionSize', e.target.value)}
                  className="pl-10"
                  step="100"
                  min="0"
                />
              </div>
              <p className="text-xs text-slate-500">
                Cash required to secure the put options
              </p>
            </div>
          )}
        </div>

        {/* Right Column - Risk Management & Advanced */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Risk Management
          </h3>

          {/* Stop Loss */}
          <div className="space-y-2">
            <Label htmlFor="stopLoss" className="font-medium">
              Stop Loss (%)
            </Label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="stopLoss"
                type="number"
                placeholder="50"
                value={formData.stopLoss}
                onChange={(e) => handleFieldUpdate('stopLoss', e.target.value)}
                className="pl-10"
                step="5"
                min="0"
                max="100"
              />
            </div>
            <p className="text-xs text-slate-500">
              Close position if loss exceeds this percentage
            </p>
          </div>

          {/* Profit Target */}
          <div className="space-y-2">
            <Label htmlFor="profitTarget" className="font-medium">
              Profit Target (%)
            </Label>
            <div className="relative">
              <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="profitTarget"
                type="number"
                placeholder="50"
                value={formData.profitTarget}
                onChange={(e) => handleFieldUpdate('profitTarget', e.target.value)}
                className="pl-10"
                step="5"
                min="0"
                max="100"
              />
            </div>
            <p className="text-xs text-slate-500">
              Close position when profit reaches this target
            </p>
          </div>

          {/* Max Days */}
          <div className="space-y-2">
            <Label htmlFor="maxDays" className="font-medium">
              Maximum Days to Hold
            </Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="maxDays"
                type="number"
                placeholder="45"
                value={formData.maxDays}
                onChange={(e) => handleFieldUpdate('maxDays', e.target.value)}
                className="pl-10"
                step="1"
                min="1"
                max="365"
              />
            </div>
            <p className="text-xs text-slate-500">
              Maximum time to hold position regardless of P&L
            </p>
          </div>

          {/* Auto Roll Setting */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="autoRoll" className="font-medium">
                Auto-Roll on Expiration
              </Label>
              <Switch
                id="autoRoll"
                checked={formData.autoRoll}
                onCheckedChange={(checked) => handleFieldUpdate('autoRoll', checked)}
              />
            </div>
            <p className="text-xs text-slate-500">
              Automatically roll options to next expiration if not assigned
            </p>
          </div>

          {/* Notifications */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications" className="font-medium">
                Enable Notifications
              </Label>
              <Switch
                id="notifications"
                checked={formData.notifications}
                onCheckedChange={(checked) => handleFieldUpdate('notifications', checked)}
              />
            </div>
            <p className="text-xs text-slate-500">
              Get alerts for assignments, expirations, and target hits
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="font-medium">
              Strategy Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this wheel strategy..."
              value={formData.notes}
              onChange={(e) => handleFieldUpdate('notes', e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Calculations Panel */}
      <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Strategy Calculations
        </h3>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="p-4 bg-white border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-slate-700">Potential Income</span>
            </div>
            <div className="text-xl font-bold text-green-600">
              ${calculations.potentialIncome.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Total premium income
            </p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDown className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-slate-700">Max Risk</span>
            </div>
            <div className="text-xl font-bold text-red-600">
              ${calculations.maxRisk.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Maximum potential loss
            </p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-slate-700">Breakeven</span>
            </div>
            <div className="text-xl font-bold text-blue-600">
              ${calculations.breakeven}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Breakeven price level
            </p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-slate-700">Return on Capital</span>
            </div>
            <div className="text-xl font-bold text-purple-600">
              {calculations.returnOnCapital}%
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Expected return percentage
            </p>
          </div>
        </div>

        {/* Risk Warning */}
        {calculations.returnOnCapital > 10 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="font-medium text-amber-900">High Return Warning</span>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              Returns above 10% may indicate higher risk. Consider reducing position size or adjusting parameters.
            </p>
          </div>
        )}
      </div>

      {/* Parameter Summary */}
      {formData.strikePrice && formData.expirationDate && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">Parameters Configured</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            {formData.strategyType.replace('_', ' ')} for {formData.ticker} -
            ${formData.strikePrice} strike, {formData.contractCount} contract(s),
            expires {new Date(formData.expirationDate).toLocaleDateString()}.
            Proceed to review and confirm your wheel strategy.
          </p>
        </div>
      )}
    </div>
  );
}
