import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  TrendingUp,
  DollarSign,
  Target,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity,
  BarChart3,
  Settings
} from "lucide-react";
import { useWheelDetection, useWheelDetectionResults } from "@/api/enhancedClient";
import { formatCurrency } from "@/lib/utils";

/**
 * Strategy Detection Panel Component
 * Provides real-time analysis of positions for wheel opportunities
 */
const StrategyDetectionPanel = ({
  onDetectionComplete,
  positionsData = null,
  onManualDetection = null,
  autoRefresh = true,
  className = ""
}) => {
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [analysisStats, setAnalysisStats] = useState({
    totalOpportunities: 0,
    highConfidence: 0,
    strategiesByType: {},
    lastUpdated: null
  });

  // React Query hooks
  const wheelDetectionMutation = useWheelDetection();
  const {
    data: detectionResults,
    isLoading: resultsLoading,
    refetch: refetchResults
  } = useWheelDetectionResults({
    enabled: autoRefresh,
    refetchInterval: autoRefresh ? 30000 : false // 30 seconds during market hours
  });

  // Auto-refresh during market hours (9:30 AM - 4:00 PM EST)
  const isMarketHours = () => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Simple market hours check (9:30 AM - 4:00 PM, Mon-Fri)
    return day >= 1 && day <= 5 && hour >= 9 && hour < 16;
  };

  // Update analysis stats when detection results change
  useEffect(() => {
    if (detectionResults?.opportunities) {
      const opportunities = detectionResults.opportunities;
      const stats = {
        totalOpportunities: opportunities.length,
        highConfidence: opportunities.filter(op => op.confidence_score >= 80).length,
        strategiesByType: opportunities.reduce((acc, op) => {
          acc[op.strategy] = (acc[op.strategy] || 0) + 1;
          return acc;
        }, {}),
        lastUpdated: new Date().toISOString()
      };
      setAnalysisStats(stats);
    }
  }, [detectionResults]);

  const handleRunAnalysis = async () => {
    try {
      console.log('🔍 StrategyDetectionPanel: Starting manual analysis...');

      // Use parent-provided manual detection function if available
      if (onManualDetection) {
        console.log('🎯 Using parent manual detection function...');
        const result = await onManualDetection();
        setLastAnalysis(result);

        // Notify parent component
        if (onDetectionComplete) {
          onDetectionComplete(result);
        }
        return;
      }

      // Fallback to direct mutation with position data
      const detectionData = {
        min_confidence_score: 0,
        include_confidence_details: true,
        include_market_context: true,
        strategy_filters: [] // Include all strategies
      };

      // Include position data if provided
      if (positionsData) {
        detectionData.positions = positionsData.allPositions || [];
        detectionData.stocks = positionsData.stockPositions || [];
        detectionData.options = positionsData.optionPositions || [];

        console.log('📊 StrategyDetectionPanel: Using provided position data', {
          positionsCount: detectionData.positions.length,
          stocksCount: detectionData.stocks.length,
          optionsCount: detectionData.options.length
        });
      }

      const result = await wheelDetectionMutation.mutateAsync(detectionData);

      console.log('✅ StrategyDetectionPanel: Analysis complete', result);
      setLastAnalysis(result);

      // Notify parent component
      if (onDetectionComplete) {
        onDetectionComplete(result);
      }

      // Refresh cached results
      refetchResults();

    } catch (error) {
      console.error('❌ StrategyDetectionPanel: Analysis failed', error);
    }
  };

  const getStrategyIcon = (strategy) => {
    switch (strategy) {
      case 'full_wheel':
        return <Zap className="w-4 h-4 text-purple-600" />;
      case 'covered_call':
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
      case 'cash_secured_put':
        return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'naked_stock':
        return <Target className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStrategyColor = (strategy) => {
    switch (strategy) {
      case 'full_wheel':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'covered_call':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cash_secured_put':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'naked_stock':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const isLoading = wheelDetectionMutation.isPending || resultsLoading;

  return (
    <Card className={`bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl text-slate-900">Strategy Detection</CardTitle>
              <p className="text-slate-600 text-sm mt-1">
                AI-powered analysis of your positions for wheel opportunities
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isMarketHours() && autoRefresh && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Activity className="w-3 h-3 mr-1" />
                Live
              </Badge>
            )}
            <Button
              onClick={handleRunAnalysis}
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Analyze Positions
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Positions Data Summary */}
        {positionsData && (
          <div className="bg-white/50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-slate-900">Position Data Status</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-slate-600">All Positions</p>
                <p className="text-lg font-bold text-slate-900">
                  {positionsData.isLoading ? '...' : positionsData.allPositions?.length || 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-600">Stock Positions</p>
                <p className="text-lg font-bold text-slate-900">
                  {positionsData.isLoading ? '...' : positionsData.stockPositions?.length || 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-600">Option Positions</p>
                <p className="text-lg font-bold text-slate-900">
                  {positionsData.isLoading ? '...' : positionsData.optionPositions?.length || 0}
                </p>
              </div>
            </div>
            {positionsData.isError && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Position data error: {positionsData.error?.message || 'Unknown error'}
              </div>
            )}
          </div>
        )}

        {/* Analysis Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/70 rounded-lg p-4 border border-white/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Opportunities</p>
                <p className="text-2xl font-bold text-slate-900">{analysisStats.totalOpportunities}</p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white/70 rounded-lg p-4 border border-white/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">High Confidence</p>
                <p className="text-2xl font-bold text-green-600">{analysisStats.highConfidence}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white/70 rounded-lg p-4 border border-white/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Strategy Types</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Object.keys(analysisStats.strategiesByType).length}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white/70 rounded-lg p-4 border border-white/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Last Updated</p>
                <p className="text-sm font-medium text-slate-700">
                  {formatLastUpdated(analysisStats.lastUpdated)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-slate-500" />
            </div>
          </div>
        </div>

        {/* Strategy Breakdown */}
        {Object.keys(analysisStats.strategiesByType).length > 0 && (
          <div className="bg-white/50 rounded-lg p-4 border border-white/50">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Strategy Breakdown</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(analysisStats.strategiesByType).map(([strategy, count]) => (
                <Badge
                  key={strategy}
                  variant="outline"
                  className={`${getStrategyColor(strategy)} flex items-center gap-1`}
                >
                  {getStrategyIcon(strategy)}
                  <span className="capitalize">{strategy.replace('_', ' ')}</span>
                  <span className="ml-1 bg-white/50 px-1 rounded text-xs">{count}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Analysis Status */}
        {lastAnalysis && (
          <div className="bg-white/50 rounded-lg p-4 border border-white/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-slate-900">
                  Analysis Complete
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {new Date(lastAnalysis.analysis_date || Date.now()).toLocaleString()}
              </div>
            </div>
            {lastAnalysis.market_context && (
              <div className="mt-2 text-xs text-slate-600">
                Market Context: {lastAnalysis.market_context.session_type || 'Regular Hours'}
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {wheelDetectionMutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-900">Analysis Failed</span>
            </div>
            <p className="text-xs text-red-700 mt-1">
              {wheelDetectionMutation.error?.message || 'Unable to analyze positions. Please try again.'}
            </p>
          </div>
        )}

        {/* Auto-refresh indicator */}
        {autoRefresh && isMarketHours() && (
          <div className="text-center">
            <p className="text-xs text-slate-500">
              Auto-refreshing every 30 seconds during market hours
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StrategyDetectionPanel;
