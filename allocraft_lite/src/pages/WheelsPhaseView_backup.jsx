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

// Mock data for prototype with lifetime earnings tracking
const mockTickerData = [
  {
    ticker: 'AAPL',
    stockPrice: 150.25,
    totalPnL: 342.50,
    activeDays: 18,
    lifetimeEarnings: {
      phase1: 1247.50, // Total from 8 expired CSPs: $152 + $165 + $143 + $189 + $178 + $156 + $132 + $132.50
      phase2: 0, // No outright sales yet (shares acquired via assignment)
      phase3: 892.75, // Total from 5 covered calls: $320 + $285 + $187.75 + $45 + $55 (rolled/expired/bought back)
      phase4: 1500.00 // Total from 2 completed cycles: $700 + $800 profit on called away shares
    },
    phases: {
      phase1: {
        status: 'complete',
        type: 'cash_secured_put',
        premium: 152.00,
        strikePrice: 148.00,
        expiration: '2025-09-15',
        completedDate: '2025-09-15',
        contracts: 1,
        currentCycle: {
          premium: 152.00,
          contracts: 1
        },
        lifetimeStats: {
          totalContracts: 8,
          totalPremium: 1247.50,
          expiredWorthless: 7,
          assigned: 1,
          avgPremiumPerContract: 155.94
        }
      },
      phase2: {
        status: 'complete',
        type: 'assignment',
        shares: 100,
        assignmentPrice: 148.00,
        assignedDate: '2025-09-16',
        costBasis: 14800,
        lifetimeStats: {
          totalSharesAssigned: 300, // From 3 different assignments
          totalSharesPurchased: 0, // No outright purchases
          totalSharesSold: 200, // 2 lots sold for profit
          avgAssignmentPrice: 145.67,
          outrighSaleProfit: 0 // No outright sales this phase
        }
      },
      phase3: {
        status: 'active',
        type: 'covered_call',
        premium: 3.20,
        strikePrice: 155.00,
        expiration: '2025-10-17',
        contracts: 1,
        daysToExpiry: 12,
        currentCycle: {
          premium: 3.20,
          contracts: 1,
          strikePrice: 155.00
        },
        lifetimeStats: {
          totalContracts: 5,
          totalPremium: 892.75,
          expiredWorthless: 2,
          calledAway: 2,
          buyToClosed: 1,
          avgPremiumPerContract: 178.55
        }
      },
      phase4: {
        status: 'pending',
        type: 'call_away',
        targetPrice: 155.00,
        projectedProfit: 420.00,
        lifetimeStats: {
          totalSharesCalledAway: 200,
          totalCallAwayProfit: 1500.00, // Strike price vs cost basis profit
          avgProfitPerShare: 7.50,
          completedCycles: 2
        }
      }
    }
  },
  {
    ticker: 'MSFT',
    stockPrice: 412.85,
    totalPnL: 890.75,
    activeDays: 32,
    lifetimeEarnings: {
      phase1: 2134.50, // Total from 4 CSPs
      phase2: 850.00, // Profit from 1 outright sale: sold 100 shares at $418.50, cost basis $410
      phase3: 1567.25, // Total from 3 covered calls
      phase4: 2400.00 // Profit from 1 completed cycle
    },
    phases: {
      phase1: {
        status: 'complete',
        type: 'cash_secured_put',
        premium: 445.00,
        strikePrice: 405.00,
        expiration: '2025-08-15',
        completedDate: '2025-08-15',
        contracts: 1,
        currentCycle: {
          premium: 445.00,
          contracts: 1
        },
        lifetimeStats: {
          totalContracts: 4,
          totalPremium: 2134.50,
          expiredWorthless: 3,
          assigned: 1,
          avgPremiumPerContract: 533.63
        }
      },
      phase2: {
        status: 'complete',
        type: 'assignment',
        shares: 100,
        assignmentPrice: 405.00,
        assignedDate: '2025-08-16',
        costBasis: 40500,
        lifetimeStats: {
          totalSharesAssigned: 100,
          totalSharesPurchased: 100, // Bought 100 shares outright at $410
          totalSharesSold: 100, // Sold 100 shares at $418.50
          avgAssignmentPrice: 405.00,
          outrightSaleProfit: 850.00 // $418.50 - $410.00 = $8.50 per share
        }
      },
      phase3: {
        status: 'monitoring',
        type: 'covered_call',
        premium: 8.50,
        strikePrice: 420.00,
        expiration: '2025-10-17',
        contracts: 1,
        daysToExpiry: 12,
        currentValue: 2.10,
        currentCycle: {
          premium: 8.50,
          contracts: 1,
          strikePrice: 420.00
        },
        lifetimeStats: {
          totalContracts: 3,
          totalPremium: 1567.25,
          expiredWorthless: 1,
          calledAway: 1,
          buyToClosed: 0,
          avgPremiumPerContract: 522.42
        }
      },
      phase4: {
        status: 'likely',
        type: 'call_away',
        targetPrice: 420.00,
        projectedProfit: 1500.00,
        probability: 85,
        lifetimeStats: {
          totalSharesCalledAway: 100,
          totalCallAwayProfit: 2400.00,
          avgProfitPerShare: 24.00,
          completedCycles: 1
        }
      }
    }
  },
  {
    ticker: 'TSLA',
    stockPrice: 238.45,
    totalPnL: -45.25,
    activeDays: 8,
    lifetimeEarnings: {
      phase1: 567.80, // Total from 3 CSPs (2 expired, 1 active)
      phase2: 0, // No assignments or sales yet
      phase3: 0, // No covered calls yet
      phase4: 0 // No call aways yet
    },
    phases: {
      phase1: {
        status: 'active',
        type: 'cash_secured_put',
        premium: 12.80,
        strikePrice: 240.00,
        expiration: '2025-10-17',
        contracts: 1,
        daysToExpiry: 12,
        currentValue: 3.50,
        currentCycle: {
          premium: 12.80,
          contracts: 1
        },
        lifetimeStats: {
          totalContracts: 3,
          totalPremium: 567.80, // $275 + $280 + $12.80 (current)
          expiredWorthless: 2,
          assigned: 0,
          avgPremiumPerContract: 189.27
        }
      },
      phase2: {
        status: 'pending',
        type: 'assignment',
        requiredCash: 24000,
        probabilityAssignment: 65,
        lifetimeStats: {
          totalSharesAssigned: 0,
          totalSharesPurchased: 0,
          totalSharesSold: 0,
          avgAssignmentPrice: 0,
          outrightSaleProfit: 0
        }
      },
      phase3: {
        status: 'pending',
        type: 'covered_call',
        lifetimeStats: {
          totalContracts: 0,
          totalPremium: 0,
          expiredWorthless: 0,
          calledAway: 0,
          buyToClosed: 0,
          avgPremiumPerContract: 0
        }
      },
      phase4: {
        status: 'pending',
        type: 'call_away',
        lifetimeStats: {
          totalSharesCalledAway: 0,
          totalCallAwayProfit: 0,
          avgProfitPerShare: 0,
          completedCycles: 0
        }
      }
    }
  }
];

// Phase indicator component
const PhaseIndicator = ({ phase, status, isActive = false }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'complete': return 'bg-green-500 border-green-500 text-white';
      case 'active': return 'bg-blue-500 border-blue-500 text-white';
      case 'monitoring': return 'bg-yellow-500 border-yellow-500 text-white';
      case 'likely': return 'bg-orange-500 border-orange-500 text-white';
      case 'pending': return 'bg-slate-200 border-slate-300 text-slate-600';
      default: return 'bg-slate-100 border-slate-200 text-slate-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete': return <CheckCircle className="w-4 h-4" />;
      case 'active': return <Activity className="w-4 h-4" />;
      case 'monitoring': return <Clock className="w-4 h-4" />;
      case 'likely': return <TrendingUp className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className={`
      relative rounded-lg border-2 p-3 text-center transition-all duration-200
      ${getStatusColor(status)}
      ${isActive ? 'ring-2 ring-blue-300 ring-offset-2' : ''}
    `}>
      <div className="flex items-center justify-center mb-2">
        {getStatusIcon(status)}
      </div>
      <div className="text-xs font-medium">
        Phase {phase}
      </div>
    </div>
  );
};

// Individual ticker phase card
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
      
      case 2:
        return (
          <div className="space-y-2">
            <div className="font-medium text-sm">100 Shares</div>
            
            {/* Lifetime Earnings */}
            <div className="bg-blue-50 rounded-md p-2 border border-blue-200">
              <div className="text-xs font-medium text-blue-800">Lifetime Earnings</div>
              <div className="text-lg font-bold text-blue-700">
                {formatCurrency(lifetimeEarnings.phase2 || 0)}
              </div>
              {phaseData.lifetimeStats && (
                <div className="text-xs text-blue-600 space-y-1">
                  <div>{phaseData.lifetimeStats.totalSharesAssigned} assigned</div>
                  <div>{phaseData.lifetimeStats.totalSharesSold} sold</div>
                  {phaseData.lifetimeStats.outrightSaleProfit > 0 && (
                    <div>Sale profit: {formatCurrency(phaseData.lifetimeStats.outrightSaleProfit)}</div>
                  )}
                </div>
              )}
            </div>

            {/* Current Status */}
            {phaseData.status === 'complete' ? (
              <>
                <div className="text-green-600 font-semibold">{phaseData.shares} shares</div>
                <div className="text-xs text-slate-500">@ ${phaseData.assignmentPrice}</div>
                <div className="text-xs text-slate-500">Assigned {phaseData.assignedDate}</div>
              </>
            ) : phaseData.status === 'pending' ? (
              <>
                <div className="text-slate-600">Assignment Expected</div>
                <div className="text-xs text-slate-500">Cash Required: {formatCurrency(phaseData.requiredCash)}</div>
                <div className="text-xs text-slate-500">Probability: {phaseData.probabilityAssignment}%</div>
              </>
            ) : (
              <div className="text-xs text-slate-500">Awaiting Assignment</div>
            )}
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-2">
            <div className="font-medium text-sm">Covered Call</div>
            
            {/* Lifetime Earnings */}
            <div className="bg-yellow-50 rounded-md p-2 border border-yellow-200">
              <div className="text-xs font-medium text-yellow-800">Lifetime Earnings</div>
              <div className="text-lg font-bold text-yellow-700">
                {formatCurrency(lifetimeEarnings.phase3 || 0)}
              </div>
              {phaseData.lifetimeStats && phaseData.lifetimeStats.totalContracts > 0 && (
                <div className="text-xs text-yellow-600 space-y-1">
                  <div>{phaseData.lifetimeStats.totalContracts} calls sold</div>
                  <div>Avg: {formatCurrency(phaseData.lifetimeStats.avgPremiumPerContract || 0)}/contract</div>
                </div>
              )}
            </div>

            {/* Current Status */}
            {phaseData.status === 'active' || phaseData.status === 'monitoring' ? (
              <>
                <div className={`font-semibold ${phaseData.status === 'monitoring' ? 'text-yellow-600' : 'text-blue-600'}`}>
                  {formatCurrency(phaseData.premium)} Premium
                </div>
                <div className="text-xs text-slate-500">Strike: ${phaseData.strikePrice}</div>
                <div className="text-xs text-slate-500">Expires: {phaseData.expiration}</div>
                {phaseData.currentValue && (
                  <div className="text-xs text-green-600">
                    Current: {formatCurrency(phaseData.currentValue)}
                  </div>
                )}
              </>
            ) : phaseData.status === 'pending' && lifetimeEarnings.phase3 === 0 ? (
              <div className="text-xs text-slate-500">Ready to Sell</div>
            ) : (
              <div className="text-xs text-slate-500">No Active Calls</div>
            )}
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-2">
            <div className="font-medium text-sm">Called Away</div>
            
            {/* Lifetime Earnings */}
            <div className="bg-purple-50 rounded-md p-2 border border-purple-200">
              <div className="text-xs font-medium text-purple-800">Lifetime Earnings</div>
              <div className="text-lg font-bold text-purple-700">
                {formatCurrency(lifetimeEarnings.phase4 || 0)}
              </div>
              {phaseData.lifetimeStats && phaseData.lifetimeStats.completedCycles > 0 && (
                <div className="text-xs text-purple-600 space-y-1">
                  <div>{phaseData.lifetimeStats.totalSharesCalledAway} shares called</div>
                  <div>{phaseData.lifetimeStats.completedCycles} cycles completed</div>
                  <div>Avg: {formatCurrency(phaseData.lifetimeStats.avgProfitPerShare || 0)}/share</div>
                </div>
              )}
            </div>

            {/* Current Status */}
            {phaseData.status === 'likely' ? (
              <>
                <div className="text-orange-600 font-semibold">Assignment Likely</div>
                <div className="text-xs text-slate-500">Target: ${phaseData.targetPrice}</div>
                <div className="text-xs text-green-600">
                  Profit: {formatCurrency(phaseData.projectedProfit)}
                </div>
                <div className="text-xs text-slate-500">Prob: {phaseData.probability}%</div>
              </>
            ) : phaseData.status === 'pending' && lifetimeEarnings.phase4 > 0 ? (
              <>
                <div className="text-slate-600">Cycle Complete</div>
                <div className="text-xs text-slate-500">Target: ${phaseData.targetPrice}</div>
                <div className="text-xs text-green-600">
                  Est. Profit: {formatCurrency(phaseData.projectedProfit)}
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-500">Cycle Pending</div>
            )}
          </div>
        );
      
      default:
        return <div className="text-xs text-slate-500">-</div>;
    }
  };

  const getPhaseActions = (phaseNum, phaseData) => {
    if (!phaseData) return null;

    switch (phaseNum) {
      case 1:
        if (phaseData.status === 'active') {
          return (
            <div className="flex gap-1 mt-2">
              <Button size="sm" variant="outline" className="text-xs px-2 py-1">
                <Eye className="w-3 h-3 mr-1" />
                Monitor
              </Button>
              <Button size="sm" variant="outline" className="text-xs px-2 py-1">
                <Settings className="w-3 h-3 mr-1" />
                Close
              </Button>
            </div>
          );
        }
        return (
          <Button size="sm" variant="outline" className="text-xs px-2 py-1 mt-2">
            <Eye className="w-3 h-3 mr-1" />
            Details
          </Button>
        );
      
      case 2:
        return (
          <Button size="sm" variant="outline" className="text-xs px-2 py-1 mt-2">
            <Target className="w-3 h-3 mr-1" />
            Manage
          </Button>
        );
      
      case 3:
        if (phaseData.status === 'active' || phaseData.status === 'monitoring') {
          return (
            <div className="flex gap-1 mt-2">
              <Button size="sm" variant="outline" className="text-xs px-2 py-1">
                <RotateCcw className="w-3 h-3 mr-1" />
                Roll
              </Button>
              <Button size="sm" variant="outline" className="text-xs px-2 py-1">
                <Settings className="w-3 h-3 mr-1" />
                Close
              </Button>
            </div>
          );
        }
        return (
          <Button size="sm" variant="outline" className="text-xs px-2 py-1 mt-2">
            <TrendingUp className="w-3 h-3 mr-1" />
            Create
          </Button>
        );
      
      case 4:
        return (
          <Button size="sm" variant="outline" className="text-xs px-2 py-1 mt-2">
            <Eye className="w-3 h-3 mr-1" />
            Options
          </Button>
        );
      
      default:
        return null;
    }
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
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            <Button size="sm" variant="outline">
              <Settings className="w-4 h-4 mr-1" />
              Manage
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          {/* Phase 1 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <PhaseIndicator 
                phase={1} 
                status={phases.phase1?.status || 'pending'}
                isActive={phases.phase1?.status === 'active'}
              />
              {phases.phase2?.status && (
                <ArrowRight className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div className="min-h-[180px] p-3 bg-slate-50 rounded-lg">
              {getPhaseContent(1, phases.phase1, tickerData)}
              {getPhaseActions(1, phases.phase1)}
            </div>
          </div>

          {/* Phase 2 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <PhaseIndicator 
                phase={2} 
                status={phases.phase2?.status || 'pending'}
                isActive={phases.phase2?.status === 'active'}
              />
              {phases.phase3?.status && (
                <ArrowRight className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div className="min-h-[180px] p-3 bg-slate-50 rounded-lg">
              {getPhaseContent(2, phases.phase2, tickerData)}
              {getPhaseActions(2, phases.phase2)}
            </div>
          </div>

          {/* Phase 3 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <PhaseIndicator 
                phase={3} 
                status={phases.phase3?.status || 'pending'}
                isActive={phases.phase3?.status === 'active'}
              />
              {phases.phase4?.status && (
                <ArrowRight className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div className="min-h-[180px] p-3 bg-slate-50 rounded-lg">
              {getPhaseContent(3, phases.phase3, tickerData)}
              {getPhaseActions(3, phases.phase3)}
            </div>
          </div>

          {/* Phase 4 */}
          <div className="space-y-3">
            <PhaseIndicator 
              phase={4} 
              status={phases.phase4?.status || 'pending'}
              isActive={phases.phase4?.status === 'active'}
            />
            <div className="min-h-[180px] p-3 bg-slate-50 rounded-lg">
              {getPhaseContent(4, phases.phase4, tickerData)}
              {getPhaseActions(4, phases.phase4)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Wheels Phase View Component
export default function WheelsPhaseView() {
  const [selectedView, setSelectedView] = useState('phase'); // 'grid' or 'phase'

  // Fetch real wheel cycles data
  const {
    data: wheelCycles = [],
    isLoading: cyclesLoading,
    error: cyclesError,
    refetch: refetchCycles
  } = useWheelPhaseCycles();

  // Fetch performance metrics
  const {
    data: performanceMetrics,
    isLoading: metricsLoading,
    error: metricsError
  } = usePhasePerformanceMetrics();

  const loading = cyclesLoading || metricsLoading;
  const error = cyclesError || metricsError;

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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Wheels Phase View</h1>
          <p className="text-slate-600 mt-1">Visual wheel lifecycle management by ticker</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            <Button
              variant={selectedView === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedView('grid')}
              className="text-xs"
            >
              Grid View
            </Button>
            <Button
              variant={selectedView === 'phase' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedView('phase')}
              className="text-xs"
            >
              Phase View
            </Button>
          </div>
          
          <Button>
            <TrendingUp className="w-4 h-4 mr-2" />
            Create Wheel
          </Button>
          <Button variant="outline">
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
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalPnL)}
                </div>
                <div className="text-sm text-slate-600">Current P&L</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-emerald-600" />
              <div>
                <div className="text-2xl font-bold text-emerald-700">
                  {formatCurrency(totalLifetimeEarnings)}
                </div>
                <div className="text-sm text-slate-600">Lifetime Earnings</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {Object.values(phaseDistribution).reduce((a, b) => a + b, 0)}
                </div>
                <div className="text-sm text-slate-600">Active Phases</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-700">Phase Distribution</div>
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
