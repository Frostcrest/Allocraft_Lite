import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Grid, List, Clock, Search, Filter, SortDesc, SortAsc,
  RotateCcw, Target, TrendingUp, TrendingDown, Calendar,
  DollarSign, AlertCircle, CheckCircle2, Play, Pause,
  Eye, Edit, MoreHorizontal
} from "lucide-react";

// Import the ActiveWheelCard component
import ActiveWheelCard from './ActiveWheelCard';

/**
 * ActiveWheelsSection - Container for displaying and managing active wheel strategies
 * Supports multiple view modes, filtering, and sorting options
 */
export default function ActiveWheelsSection({
  wheelCycles = [],
  onWheelAction = () => { },
  className = ''
}) {
  // console.log('⚙️ ActiveWheelsSection rendering:', { wheelCyclesCount: wheelCycles.length });

  // View and filtering state
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', 'timeline'
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('performance'); // 'performance', 'date', 'ticker', 'status'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'pending', 'completed'
  const [strategyFilter, setStrategyFilter] = useState('all'); // 'all', 'covered_call', 'cash_secured_put', 'full_wheel'

  // Mock data if no cycles provided (for development/testing)
  const mockWheelCycles = [
    {
      id: 1,
      ticker: 'AAPL',
      strategy_type: 'covered_call',
      status: 'active',
      strike_price: 175.00,
      expiration_date: '2025-01-17',
      contract_count: 2,
      premium_collected: 400,
      unrealized_pnl: 150,
      total_pnl: 550,
      days_active: 12,
      next_action: 'Monitor for assignment',
      created_at: '2025-08-22T10:00:00Z',
      last_updated: '2025-09-03T15:30:00Z'
    },
    {
      id: 2,
      ticker: 'TSLA',
      strategy_type: 'cash_secured_put',
      status: 'pending_assignment',
      strike_price: 240.00,
      expiration_date: '2025-01-10',
      contract_count: 1,
      premium_collected: 320,
      unrealized_pnl: -80,
      total_pnl: 240,
      days_active: 8,
      next_action: 'Assignment likely - prepare for stock purchase',
      created_at: '2025-08-26T14:00:00Z',
      last_updated: '2025-09-03T12:15:00Z'
    },
    {
      id: 3,
      ticker: 'MSFT',
      strategy_type: 'full_wheel',
      status: 'active',
      strike_price: 410.00,
      expiration_date: '2025-01-24',
      contract_count: 1,
      premium_collected: 180,
      unrealized_pnl: 90,
      total_pnl: 270,
      days_active: 18,
      next_action: 'Continue wheel cycle',
      created_at: '2025-08-16T09:00:00Z',
      last_updated: '2025-09-03T16:00:00Z'
    },
    {
      id: 4,
      ticker: 'NVDA',
      strategy_type: 'covered_call',
      status: 'completed',
      strike_price: 850.00,
      expiration_date: '2025-08-30',
      contract_count: 1,
      premium_collected: 450,
      unrealized_pnl: 0,
      total_pnl: 450,
      days_active: 21,
      next_action: 'Strategy completed successfully',
      created_at: '2025-08-09T11:00:00Z',
      last_updated: '2025-08-30T16:00:00Z'
    }
  ];

  // Use provided data or fallback to mock data
  const activeWheels = wheelCycles.length > 0 ? wheelCycles : mockWheelCycles;

  // Filter and sort logic
  const filteredAndSortedWheels = useMemo(() => {
    let filtered = activeWheels;

    // Text search
    if (searchTerm) {
      filtered = filtered.filter(wheel =>
        wheel.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wheel.strategy_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wheel.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(wheel => wheel.status === statusFilter);
    }

    // Strategy filter
    if (strategyFilter !== 'all') {
      filtered = filtered.filter(wheel => wheel.strategy_type === strategyFilter);
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'performance':
          aValue = a.total_pnl || 0;
          bValue = b.total_pnl || 0;
          break;
        case 'date':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'ticker':
          aValue = a.ticker;
          bValue = b.ticker;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [activeWheels, searchTerm, statusFilter, strategyFilter, sortBy, sortOrder]);

  // View mode components
  const ViewModeButton = ({ mode, icon: Icon, label }) => (
    <Button
      variant={viewMode === mode ? "default" : "outline"}
      size="sm"
      onClick={() => setViewMode(mode)}
      className={`px-3 py-2 ${viewMode === mode ? 'bg-blue-600 text-white' : ''}`}
    >
      <Icon className="w-4 h-4 mr-1" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );

  // Sort options
  const sortOptions = [
    { value: 'performance', label: 'Performance', icon: TrendingUp },
    { value: 'date', label: 'Date Created', icon: Calendar },
    { value: 'ticker', label: 'Ticker', icon: Target },
    { value: 'status', label: 'Status', icon: CheckCircle2 }
  ];

  // Status options for filtering
  const statusOptions = [
    { value: 'all', label: 'All Status', count: activeWheels.length },
    { value: 'active', label: 'Active', count: activeWheels.filter(w => w.status === 'active').length },
    { value: 'pending_assignment', label: 'Pending Assignment', count: activeWheels.filter(w => w.status === 'pending_assignment').length },
    { value: 'completed', label: 'Completed', count: activeWheels.filter(w => w.status === 'completed').length }
  ];

  // Strategy options for filtering
  const strategyOptions = [
    { value: 'all', label: 'All Strategies', count: activeWheels.length },
    { value: 'covered_call', label: 'Covered Call', count: activeWheels.filter(w => w.strategy_type === 'covered_call').length },
    { value: 'cash_secured_put', label: 'Cash-Secured Put', count: activeWheels.filter(w => w.strategy_type === 'cash_secured_put').length },
    { value: 'full_wheel', label: 'Full Wheel', count: activeWheels.filter(w => w.strategy_type === 'full_wheel').length }
  ];

  // Handle wheel actions
  const handleWheelAction = (action, wheel) => {
    console.log(`🎯 Wheel action: ${action}`, wheel);
    onWheelAction(action, wheel);
  };

  // Timeline view component
  const TimelineView = () => (
    <div className="space-y-4">
      {filteredAndSortedWheels.map((wheel, index) => (
        <div key={wheel.id} className="flex items-start gap-4">
          <div className="flex flex-col items-center">
            <div className={`
              w-3 h-3 rounded-full 
              ${wheel.status === 'active' ? 'bg-green-500' :
                wheel.status === 'pending_assignment' ? 'bg-yellow-500' :
                  wheel.status === 'completed' ? 'bg-blue-500' : 'bg-slate-400'
              }
            `} />
            {index < filteredAndSortedWheels.length - 1 && (
              <div className="w-px h-16 bg-slate-200 mt-2" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <ActiveWheelCard
              wheel={wheel}
              viewMode="timeline"
              onAction={handleWheelAction}
            />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-blue-600" />
            Active Wheel Strategies
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            {filteredAndSortedWheels.length} of {activeWheels.length} strategies shown
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <ViewModeButton mode="grid" icon={Grid} label="Grid" />
          <ViewModeButton mode="list" icon={List} label="List" />
          <ViewModeButton mode="timeline" icon={Clock} label="Timeline" />
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 border border-slate-200 rounded-lg">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search wheels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.count})
              </option>
            ))}
          </select>

          {/* Strategy Filter */}
          <select
            value={strategyFilter}
            onChange={(e) => setStrategyFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {strategyOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.count})
              </option>
            ))}
          </select>

          {/* Sort Controls */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2"
            >
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant={statusFilter === 'active' ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
            className="text-xs"
          >
            <Play className="w-3 h-3 mr-1" />
            Active ({statusOptions.find(s => s.value === 'active')?.count || 0})
          </Button>

          <Button
            variant={statusFilter === 'pending_assignment' ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(statusFilter === 'pending_assignment' ? 'all' : 'pending_assignment')}
            className="text-xs"
          >
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending ({statusOptions.find(s => s.value === 'pending_assignment')?.count || 0})
          </Button>

          <Button
            variant={statusFilter === 'completed' ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
            className="text-xs"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed ({statusOptions.find(s => s.value === 'completed')?.count || 0})
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {filteredAndSortedWheels.length === 0 && (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-lg">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
            <RotateCcw className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            No wheel strategies found
          </h3>
          <p className="text-slate-500 mb-6">
            {searchTerm || statusFilter !== 'all' || strategyFilter !== 'all'
              ? 'Try adjusting your filters or search terms.'
              : 'Create your first wheel strategy to get started.'
            }
          </p>
          {(searchTerm || statusFilter !== 'all' || strategyFilter !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setStrategyFilter('all');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Wheels Grid/List/Timeline */}
      {filteredAndSortedWheels.length > 0 && (
        <>
          {viewMode === 'grid' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedWheels.map(wheel => (
                <ActiveWheelCard
                  key={wheel.id}
                  wheel={wheel}
                  viewMode="grid"
                  onAction={handleWheelAction}
                />
              ))}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="space-y-3">
              {filteredAndSortedWheels.map(wheel => (
                <ActiveWheelCard
                  key={wheel.id}
                  wheel={wheel}
                  viewMode="list"
                  onAction={handleWheelAction}
                />
              ))}
            </div>
          )}

          {viewMode === 'timeline' && (
            <TimelineView />
          )}
        </>
      )}

      {/* Summary Stats */}
      {filteredAndSortedWheels.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Total P&L</span>
            </div>
            <div className="text-xl font-bold text-green-600">
              ${filteredAndSortedWheels.reduce((sum, w) => sum + (w.total_pnl || 0), 0).toLocaleString()}
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Premium Collected</span>
            </div>
            <div className="text-xl font-bold text-blue-600">
              ${filteredAndSortedWheels.reduce((sum, w) => sum + (w.premium_collected || 0), 0).toLocaleString()}
            </div>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Active Strategies</span>
            </div>
            <div className="text-xl font-bold text-purple-600">
              {filteredAndSortedWheels.filter(w => w.status === 'active').length}
            </div>
          </div>

          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">Avg Days Active</span>
            </div>
            <div className="text-xl font-bold text-orange-600">
              {Math.round(filteredAndSortedWheels.reduce((sum, w) => sum + (w.days_active || 0), 0) / filteredAndSortedWheels.length)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
