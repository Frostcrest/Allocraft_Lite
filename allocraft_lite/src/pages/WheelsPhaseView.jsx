import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWheelPhaseCycles, usePhasePerformanceMetrics } from "@/api/wheelPhaseClient";
import { 
  RotateCcw, 
  TrendingUp, 
  Target, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  Eye,
  Settings,
  RefreshCw,
  DollarSign,
  Calendar,
  Activity,
  Loader2
} from "lucide-react";

// Individual ticker phase card component
const TickerPhaseCard = ({ tickerData }) => {
  // Transform real backend data to match expected structure
  const {
    ticker,
    current_stock_price: stockPrice,
    total_pnl: totalPnL,
    created_at,
    lifetime_earnings: lifetimeEarnings = {},
    current_phase
  } = tickerData;

  // Calculate days active
  const activeDays = created_at ? Math.floor((Date.now() - new Date(created_at)) / (1000 * 60 * 60 * 24)) : 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  // Calculate total lifetime earnings across all phases
  const totalLifetimeEarnings = Object.values(lifetimeEarnings).reduce((sum, amount) => sum + (amount || 0), 0);

  const getPhaseContent = (phaseNum) => {
    const isActive = current_phase === phaseNum;
    const phaseKey = `phase${phaseNum}`;
    const earnings = lifetimeEarnings[phaseKey] || 0;

    const phaseNames = {
      1: 'Cash-Secured Put',
      2: '100 Shares Acquired', 
      3: 'Covered Call',
      4: 'Shares Called Away'
    };

    const phaseColors = {
      1: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', textMuted: 'text-blue-600' },
      2: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', textMuted: 'text-green-600' },
      3: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', textMuted: 'text-yellow-600' },
      4: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', textMuted: 'text-purple-600' }
    };

    const colors = phaseColors[phaseNum];

    return (
      <div className="space-y-2">
        <div className="font-medium text-sm">{phaseNames[phaseNum]}</div>
        
        {/* Lifetime Earnings */}
        <div className={`${colors.bg} rounded-md p-2 border ${colors.border}`}>
          <div className={`text-xs font-medium ${colors.textMuted}`}>Lifetime Earnings</div>
          <div className={`text-lg font-bold ${colors.text}`}>
            {formatCurrency(earnings)}
          </div>
        </div>

        {/* Status Indicator */}
        <div className={`text-xs ${isActive ? 'text-green-600 font-semibold' : 'text-slate-500'}`}>
          {isActive ? '● Active Phase' : '○ Completed/Inactive'}
        </div>
      </div>
    );
  };

  return (
    <Card className="mb-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-2xl font-bold text-slate-900">{ticker}</CardTitle>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-slate-500" />
                <span className="font-medium">${stockPrice}</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="w-4 h-4 text-slate-500" />
                <span className={`font-semibold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-slate-600">{activeDays}d active</span>
              </div>
              {/* Lifetime Earnings Badge */}
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded-lg px-3 py-1">
                <div className="text-xs font-medium text-green-800">Lifetime Earnings</div>
                <div className="text-lg font-bold text-green-700">
                  {formatCurrency(totalLifetimeEarnings)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(phaseNum => (
            <div key={phaseNum} className="p-3 bg-slate-50 rounded-lg">
              {getPhaseContent(phaseNum)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Main Wheels Phase View Component
export default function WheelsPhaseView() {
  const [selectedView, setSelectedView] = useState('phase');

  // Fetch real wheel cycles data
  const {
    data: wheelCycles = [],
    isLoading: cyclesLoading,
    error: cyclesError,
    refetch: refetchCycles
  } = useWheelPhaseCycles();

  // Fetch performance metrics
  const {
    data: performanceMetrics = {},
    isLoading: metricsLoading,
    error: metricsError
  } = usePhasePerformanceMetrics();

  const isLoading = cyclesLoading || metricsLoading;
  const hasError = cyclesError || metricsError;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const getTotalStats = () => {
    const activeCount = wheelCycles.length;
    const totalPnL = wheelCycles.reduce((sum, ticker) => sum + (ticker.total_pnl || 0), 0);
    const totalLifetimeEarnings = wheelCycles.reduce((sum, ticker) => {
      const tickerLifetime = Object.values(ticker.lifetime_earnings || {}).reduce((s, amt) => s + amt, 0);
      return sum + tickerLifetime;
    }, 0);
    
    const phaseDistribution = {
      phase1: wheelCycles.filter(t => t.current_phase === 1).length,
      phase2: wheelCycles.filter(t => t.current_phase === 2).length,
      phase3: wheelCycles.filter(t => t.current_phase === 3).length,
      phase4: wheelCycles.filter(t => t.current_phase === 4).length,
    };
    
    return { activeCount, totalPnL, totalLifetimeEarnings, phaseDistribution };
  };

  const { activeCount, totalPnL, totalLifetimeEarnings, phaseDistribution } = getTotalStats();

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-lg">Loading wheel cycles...</span>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="p-8 space-y-6">
        <Card className="text-center py-12 border-red-200 bg-red-50">
          <CardContent>
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-red-900 mb-2">Error Loading Data</h3>
            <p className="text-red-700 mb-6">
              {cyclesError?.message || metricsError?.message || 'Failed to load wheel cycle data'}
            </p>
            <Button onClick={() => { refetchCycles(); }} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Wheel Phase Management</h1>
          <p className="text-slate-600 mt-1">Track wheel strategies across the 4-phase lifecycle</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={refetchCycles}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Prices
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-slate-900">{activeCount}</div>
                <div className="text-sm text-slate-600">Active Tickers</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-green-600" />
              <div>
                <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalPnL)}
                </div>
                <div className="text-sm text-slate-600">Total P&L</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-emerald-600" />
              <div>
                <div className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(totalLifetimeEarnings)}
                </div>
                <div className="text-sm text-slate-600">Lifetime Earnings</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-lg font-bold text-slate-900 mb-2">Phase Distribution</div>
              <div className="grid grid-cols-4 gap-1 text-xs">
                <div className="text-center">
                  <div className="font-semibold text-blue-600">{phaseDistribution.phase1}</div>
                  <div className="text-slate-500">P1</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-600">{phaseDistribution.phase2}</div>
                  <div className="text-slate-500">P2</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-yellow-600">{phaseDistribution.phase3}</div>
                  <div className="text-slate-500">P3</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-purple-600">{phaseDistribution.phase4}</div>
                  <div className="text-slate-500">P4</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phase Legend */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="font-medium text-blue-900">4-Phase Wheel Lifecycle</div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Phase 1: Sell Cash-Secured Put</span>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-600" />
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Phase 2: 100 Shares Acquired</span>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-600" />
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span>Phase 3: Sell Covered Call</span>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-600" />
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span>Phase 4: Shares Called Away</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ticker Phase Cards */}
      <div className="space-y-4">
        {wheelCycles.map((tickerData) => (
          <TickerPhaseCard key={tickerData.ticker} tickerData={tickerData} />
        ))}
      </div>

      {/* Empty State for No Active Wheels */}
      {wheelCycles.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Target className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Active Wheel Strategies</h3>
            <p className="text-slate-600 mb-6">
              Start your first wheel strategy to see the phase progression here.
            </p>
            <Button>
              <TrendingUp className="w-4 h-4 mr-2" />
              Create Your First Wheel
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
