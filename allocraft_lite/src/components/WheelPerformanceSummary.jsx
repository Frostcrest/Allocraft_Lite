import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  BarChart3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Calculator
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

/**
 * Wheel Performance Summary Widget
 * Displays key performance metrics for wheel strategies
 */
const WheelPerformanceSummary = ({
  opportunities = [],
  cycles = [],
  stockPositions = [],
  optionPositions = [],
  className = ""
}) => {
  const [performanceMetrics, setPerformanceMetrics] = useState({
    totalWheels: 0,
    activeCycles: 0,
    totalPotentialIncome: 0,
    averageConfidence: 0,
    totalPnL: 0,
    monthlyIncome: 0,
    successRate: 0,
    riskLevel: 'medium'
  });

  // Calculate performance metrics
  const metrics = useMemo(() => {
    // Basic counts
    const totalWheels = opportunities.length;
    const activeCycles = cycles.length;
    
    // Potential income from opportunities
    const totalPotentialIncome = opportunities.reduce((sum, op) => 
      sum + (op.potential_income || 0), 0
    );
    
    // Average confidence score
    const averageConfidence = totalWheels > 0 
      ? Math.round(opportunities.reduce((sum, op) => sum + (op.confidence_score || 0), 0) / totalWheels)
      : 0;

    // Calculate basic P&L from positions
    const calculateBasicPnL = () => {
      let totalPnL = 0;
      
      // Stock positions P&L (simplified)
      stockPositions.forEach(position => {
        if (position.cost_basis && position.current_price && position.shares_owned) {
          const pnl = (position.current_price - position.cost_basis) * position.shares_owned;
          totalPnL += pnl;
        }
      });

      // Option positions P&L (simplified - would need more complex calculation in real app)
      optionPositions.forEach(position => {
        if (position.market_value && position.cost_basis) {
          totalPnL += (position.market_value - position.cost_basis);
        }
      });

      return totalPnL;
    };

    const totalPnL = calculateBasicPnL();

    // Estimate monthly income (simplified calculation)
    const monthlyIncome = opportunities.reduce((sum, op) => {
      const daysToExpiration = op.days_to_expiration || 30;
      const monthlyRate = 30 / Math.max(daysToExpiration, 1);
      return sum + ((op.potential_income || 0) * monthlyRate);
    }, 0);

    // Success rate calculation (simplified)
    const highConfidenceOps = opportunities.filter(op => (op.confidence_score || 0) >= 80).length;
    const successRate = totalWheels > 0 ? Math.round((highConfidenceOps / totalWheels) * 100) : 0;

    // Risk level assessment
    const avgRiskLevel = opportunities.reduce((sum, op) => {
      const risk = op.risk_assessment?.level || 'medium';
      return sum + (risk === 'low' ? 1 : risk === 'medium' ? 2 : 3);
    }, 0) / Math.max(totalWheels, 1);
    
    const riskLevel = avgRiskLevel <= 1.5 ? 'low' : avgRiskLevel <= 2.5 ? 'medium' : 'high';

    return {
      totalWheels,
      activeCycles,
      totalPotentialIncome,
      averageConfidence,
      totalPnL,
      monthlyIncome,
      successRate,
      riskLevel
    };
  }, [opportunities, cycles, stockPositions, optionPositions]);

  useEffect(() => {
    setPerformanceMetrics(metrics);
  }, [metrics]);

  // Risk level styling
  const getRiskLevelStyle = (level) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className={`bg-gradient-to-r from-green-50 to-blue-50 border-green-200 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-600 to-blue-600 rounded-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl text-slate-900">Performance Summary</CardTitle>
              <p className="text-slate-600 text-sm mt-1">
                Key metrics for your wheel strategies
              </p>
            </div>
          </div>
          
          <Badge 
            variant="outline" 
            className={getRiskLevelStyle(performanceMetrics.riskLevel)}
          >
            {performanceMetrics.riskLevel.charAt(0).toUpperCase() + performanceMetrics.riskLevel.slice(1)} Risk
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Performance Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Wheels */}
          <div className="bg-white/70 rounded-lg p-4 border border-white/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Opportunities</p>
                <p className="text-2xl font-bold text-slate-900">
                  {performanceMetrics.totalWheels}
                </p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          {/* Active Cycles */}
          <div className="bg-white/70 rounded-lg p-4 border border-white/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Cycles</p>
                <p className="text-2xl font-bold text-purple-600">
                  {performanceMetrics.activeCycles}
                </p>
              </div>
              <Activity className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          {/* Potential Income */}
          <div className="bg-white/70 rounded-lg p-4 border border-white/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Potential Income</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(performanceMetrics.totalPotentialIncome)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>

          {/* Average Confidence */}
          <div className="bg-white/70 rounded-lg p-4 border border-white/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Avg Confidence</p>
                <p className="text-2xl font-bold text-blue-600">
                  {performanceMetrics.averageConfidence}%
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Advanced Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total P&L */}
          <div className="bg-white/50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${performanceMetrics.totalPnL >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {performanceMetrics.totalPnL >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-slate-600">Total P&L</p>
                <p className={`text-lg font-bold ${performanceMetrics.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(performanceMetrics.totalPnL)}
                </p>
              </div>
            </div>
          </div>

          {/* Monthly Income Estimate */}
          <div className="bg-white/50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Monthly Est.</p>
                <p className="text-lg font-bold text-purple-600">
                  {formatCurrency(performanceMetrics.monthlyIncome)}
                </p>
              </div>
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-white/50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calculator className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Success Rate</p>
                <p className="text-lg font-bold text-blue-600">
                  {performanceMetrics.successRate}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        {performanceMetrics.totalWheels > 0 && (
          <div className="bg-white/50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Performance Insights
            </h4>
            <div className="space-y-2 text-sm">
              {performanceMetrics.averageConfidence >= 80 && (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="w-4 h-4" />
                  High average confidence ({performanceMetrics.averageConfidence}%) indicates strong opportunities
                </div>
              )}
              {performanceMetrics.totalPotentialIncome > 1000 && (
                <div className="flex items-center gap-2 text-blue-700">
                  <DollarSign className="w-4 h-4" />
                  Significant income potential identified: {formatCurrency(performanceMetrics.totalPotentialIncome)}
                </div>
              )}
              {performanceMetrics.riskLevel === 'high' && (
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-4 h-4" />
                  High average risk level - consider risk management strategies
                </div>
              )}
              {performanceMetrics.totalWheels > 0 && performanceMetrics.activeCycles === 0 && (
                <div className="flex items-center gap-2 text-yellow-700">
                  <Clock className="w-4 h-4" />
                  {performanceMetrics.totalWheels} opportunities detected but no active cycles - consider starting wheel strategies
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WheelPerformanceSummary;
