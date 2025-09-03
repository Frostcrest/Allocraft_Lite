import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal, Eye, Edit, X, RotateCcw, Calendar,
  DollarSign, TrendingUp, TrendingDown, Target, Clock,
  AlertCircle, CheckCircle2, Play, Pause, ArrowUp, ArrowDown,
  Settings, FileText, Bell, Activity
} from "lucide-react";

/**
 * ActiveWheelCard - Individual wheel strategy display component
 * Shows comprehensive information about a wheel strategy with management actions
 */
export default function ActiveWheelCard({
  wheel,
  viewMode = 'grid', // 'grid', 'list', 'timeline'
  onAction = () => { },
  className = ''
}) {
  console.log('🎯 ActiveWheelCard rendering:', { wheel: wheel.ticker, viewMode });

  const [showActions, setShowActions] = useState(false);

  // Strategy type display mapping
  const getStrategyDisplay = (type) => {
    const strategies = {
      'covered_call': {
        name: 'Covered Call',
        icon: TrendingDown,
        color: 'green',
        description: 'Selling calls against stock position'
      },
      'cash_secured_put': {
        name: 'Cash-Secured Put',
        icon: TrendingUp,
        color: 'blue',
        description: 'Selling puts with cash backing'
      },
      'full_wheel': {
        name: 'Full Wheel',
        icon: RotateCcw,
        color: 'purple',
        description: 'Complete wheel cycle strategy'
      },
      'poor_mans_covered_call': {
        name: "Poor Man's CC",
        icon: Target,
        color: 'orange',
        description: 'LEAPS-based covered call'
      }
    };
    return strategies[type] || { name: type, icon: Target, color: 'slate', description: 'Options strategy' };
  };

  // Status display mapping
  const getStatusDisplay = (status) => {
    const statuses = {
      'active': {
        name: 'Active',
        icon: Play,
        color: 'text-green-600 bg-green-100',
        description: 'Strategy is running normally'
      },
      'pending_assignment': {
        name: 'Pending Assignment',
        icon: AlertCircle,
        color: 'text-yellow-600 bg-yellow-100',
        description: 'Assignment likely at expiration'
      },
      'completed': {
        name: 'Completed',
        icon: CheckCircle2,
        color: 'text-blue-600 bg-blue-100',
        description: 'Strategy has finished successfully'
      },
      'paused': {
        name: 'Paused',
        icon: Pause,
        color: 'text-slate-600 bg-slate-100',
        description: 'Strategy temporarily paused'
      },
      'closed': {
        name: 'Closed',
        icon: X,
        color: 'text-red-600 bg-red-100',
        description: 'Strategy closed early'
      }
    };
    return statuses[status] || { name: status, icon: AlertCircle, color: 'text-slate-600 bg-slate-100', description: 'Unknown status' };
  };

  const strategyDisplay = getStrategyDisplay(wheel.strategy_type);
  const statusDisplay = getStatusDisplay(wheel.status);

  const StrategyIcon = strategyDisplay.icon;
  const StatusIcon = statusDisplay.icon;

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Calculate days to expiration
  const getDaysToExpiration = () => {
    if (!wheel.expiration_date) return 0;
    const expiry = new Date(wheel.expiration_date);
    const today = new Date();
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Calculate percentage return
  const getPercentageReturn = () => {
    if (!wheel.premium_collected || !wheel.strike_price || !wheel.contract_count) return 0;
    const totalCapital = wheel.strike_price * wheel.contract_count * 100;
    return ((wheel.total_pnl || 0) / totalCapital * 100).toFixed(1);
  };

  // Get next action recommendation
  const getNextActionRecommendation = () => {
    const daysToExpiry = getDaysToExpiration();

    if (wheel.status === 'completed') return 'Strategy completed successfully';
    if (wheel.status === 'paused') return 'Strategy is paused - consider resuming';
    if (wheel.status === 'closed') return 'Strategy was closed early';

    if (daysToExpiry <= 7) {
      if (wheel.strategy_type === 'covered_call') {
        return 'Expiration approaching - monitor for assignment';
      } else if (wheel.strategy_type === 'cash_secured_put') {
        return 'Expiration approaching - prepare for potential assignment';
      }
    }

    if (wheel.unrealized_pnl && wheel.unrealized_pnl > (wheel.premium_collected * 0.5)) {
      return 'Consider closing for profit (50%+ premium captured)';
    }

    return wheel.next_action || 'Monitor position and market conditions';
  };

  // Handle action clicks
  const handleAction = (action) => {
    setShowActions(false);
    onAction(action, wheel);
  };

  // Action buttons
  const actionButtons = [
    { id: 'view_details', label: 'View Details', icon: Eye, description: 'See full strategy details and history' },
    { id: 'edit_parameters', label: 'Edit Parameters', icon: Edit, description: 'Modify risk management settings' },
    { id: 'roll_options', label: 'Roll Options', icon: RotateCcw, description: 'Roll to next expiration' },
    { id: 'close_wheel', label: 'Close Strategy', icon: X, description: 'Close wheel strategy early' },
    { id: 'add_notes', label: 'Add Notes', icon: FileText, description: 'Add strategy notes or observations' }
  ];

  // Performance indicator
  const getPerformanceIndicator = () => {
    const pnl = wheel.total_pnl || 0;
    if (pnl > 0) return { color: 'text-green-600', icon: ArrowUp };
    if (pnl < 0) return { color: 'text-red-600', icon: ArrowDown };
    return { color: 'text-slate-600', icon: Activity };
  };

  const performance = getPerformanceIndicator();
  const PerformanceIcon = performance.icon;

  // Grid view (default card layout)
  if (viewMode === 'grid') {
    return (
      <div className={`bg-white border border-slate-200 rounded-lg p-4 hover:shadow-lg transition-all duration-200 ${className}`}>
        {/* Card Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-${strategyDisplay.color}-100 rounded-lg`}>
              <StrategyIcon className={`w-5 h-5 text-${strategyDisplay.color}-600`} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">{wheel.ticker}</h3>
              <p className="text-sm text-slate-600">{strategyDisplay.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={statusDisplay.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusDisplay.name}
            </Badge>

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowActions(!showActions)}
                className="p-1"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>

              {showActions && (
                <div className="absolute right-0 top-8 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1">
                  {actionButtons.map(action => (
                    <button
                      key={action.id}
                      onClick={() => handleAction(action.id)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-sm"
                    >
                      <action.icon className="w-4 h-4 text-slate-600" />
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-1 mb-1">
              <DollarSign className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-medium text-slate-700">Strike Price</span>
            </div>
            <div className="text-lg font-bold text-slate-900">
              ${wheel.strike_price}
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-1 mb-1">
              <Calendar className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-medium text-slate-700">Days to Expiry</span>
            </div>
            <div className="text-lg font-bold text-slate-900">
              {getDaysToExpiration()}
            </div>
          </div>
        </div>

        {/* P&L Information */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Total P&L</span>
            <span className={`font-bold ${performance.color} flex items-center gap-1`}>
              <PerformanceIcon className="w-4 h-4" />
              {formatCurrency(wheel.total_pnl)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Premium Collected</span>
            <span className="font-medium text-green-600">
              {formatCurrency(wheel.premium_collected)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Return %</span>
            <span className={`font-medium ${performance.color}`}>
              {getPercentageReturn()}%
            </span>
          </div>
        </div>

        {/* Next Action */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-900">Next Action</span>
          </div>
          <p className="text-sm text-blue-800">
            {getNextActionRecommendation()}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('view_details')}
            className="flex-1 text-xs"
          >
            <Eye className="w-3 h-3 mr-1" />
            Details
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('edit_parameters')}
            className="flex-1 text-xs"
          >
            <Settings className="w-3 h-3 mr-1" />
            Manage
          </Button>
        </div>
      </div>
    );
  }

  // List view (horizontal compact layout)
  if (viewMode === 'list') {
    return (
      <div className={`bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 ${className}`}>
        <div className="flex items-center justify-between">
          {/* Left: Basic Info */}
          <div className="flex items-center gap-4">
            <div className={`p-2 bg-${strategyDisplay.color}-100 rounded-lg`}>
              <StrategyIcon className={`w-4 h-4 text-${strategyDisplay.color}-600`} />
            </div>

            <div>
              <h3 className="font-bold text-slate-900">{wheel.ticker}</h3>
              <p className="text-sm text-slate-600">{strategyDisplay.name}</p>
            </div>

            <Badge className={statusDisplay.color}>
              {statusDisplay.name}
            </Badge>
          </div>

          {/* Center: Key Metrics */}
          <div className="hidden md:flex items-center gap-8 text-sm">
            <div className="text-center">
              <div className="text-slate-600">Strike</div>
              <div className="font-semibold">${wheel.strike_price}</div>
            </div>

            <div className="text-center">
              <div className="text-slate-600">Days Left</div>
              <div className="font-semibold">{getDaysToExpiration()}</div>
            </div>

            <div className="text-center">
              <div className="text-slate-600">Total P&L</div>
              <div className={`font-semibold ${performance.color}`}>
                {formatCurrency(wheel.total_pnl)}
              </div>
            </div>

            <div className="text-center">
              <div className="text-slate-600">Return</div>
              <div className={`font-semibold ${performance.color}`}>
                {getPercentageReturn()}%
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('view_details')}
            >
              <Eye className="w-4 h-4 mr-1" />
              Details
            </Button>

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowActions(!showActions)}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>

              {showActions && (
                <div className="absolute right-0 top-8 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1">
                  {actionButtons.slice(1).map(action => (
                    <button
                      key={action.id}
                      onClick={() => handleAction(action.id)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-sm"
                    >
                      <action.icon className="w-4 h-4 text-slate-600" />
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Timeline view (compact with timeline indicators)
  if (viewMode === 'timeline') {
    return (
      <div className={`bg-white border border-slate-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-${strategyDisplay.color}-100 rounded-lg`}>
              <StrategyIcon className={`w-4 h-4 text-${strategyDisplay.color}-600`} />
            </div>

            <div>
              <h3 className="font-bold text-slate-900">{wheel.ticker} - {strategyDisplay.name}</h3>
              <p className="text-sm text-slate-600">
                Created {formatDate(wheel.created_at)} • {wheel.days_active} days active
              </p>
            </div>
          </div>

          <Badge className={statusDisplay.color}>
            {statusDisplay.name}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-slate-600">Strike: </span>
            <span className="font-semibold">${wheel.strike_price}</span>
          </div>
          <div>
            <span className="text-slate-600">Expiry: </span>
            <span className="font-semibold">{getDaysToExpiration()}d</span>
          </div>
          <div>
            <span className="text-slate-600">P&L: </span>
            <span className={`font-semibold ${performance.color}`}>
              {formatCurrency(wheel.total_pnl)}
            </span>
          </div>
          <div>
            <span className="text-slate-600">Return: </span>
            <span className={`font-semibold ${performance.color}`}>
              {getPercentageReturn()}%
            </span>
          </div>
        </div>

        <div className="mt-3 flex justify-between items-center">
          <p className="text-xs text-slate-600">
            {getNextActionRecommendation()}
          </p>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('view_details')}
            className="text-xs"
          >
            View Details
          </Button>
        </div>
      </div>
    );
  }

  // Fallback to grid view
  return null;
}
