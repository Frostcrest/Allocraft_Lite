import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Target, RefreshCcw, Check } from 'lucide-react';
import { format } from 'date-fns';
import OptionForm from "@/components/forms/OptionForm";
import RefreshPricesButton from "@/components/RefreshPricesButton";
import { formatCurrency } from "@/lib/utils";
import {
  useOptions,
  useOptionExpiries,
  useCreateOption,
  useUpdateOption,
  useDeleteOption,
  useRefreshOptionPrices
} from "@/api/enhancedClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  calculateOptionPnL,
  calculateStrategyPnL,
  formatPercent,
  getPnLColorClass,
  getPnLBadgeClass,
  getStrategyBadgeClass,
  calculatePortfolioPnL
} from "@/utils/pnlCalculations";

// Utility function to categorize options by strategy
const categorizeOptions = (options) => {
  const longCalls = [];
  const longPuts = [];
  const shortCalls = [];
  const shortPuts = [];
  const pmccPositions = []; // Poor Man's Covered Calls
  const coveredCalls = []; // Covered Calls with associated stock
  const wheelPositions = []; // Short puts starting wheels

  options.forEach(option => {
    const isShort = (option.contracts || 0) < 0;
    const isCall = option.option_type === 'Call';
    const isPut = option.option_type === 'Put';

    if (isCall && !isShort) {
      longCalls.push(option);
    } else if (isPut && !isShort) {
      longPuts.push(option);
    } else if (isCall && isShort) {
      shortCalls.push(option);
      // Note: Would need to check for associated long calls (PMCC) or stock (CC)
      // This requires cross-referencing with stock positions
    } else if (isPut && isShort) {
      shortPuts.push(option);
      // Note: Short puts are typically the start of wheel strategies
      wheelPositions.push(option);
    }
  });

  return {
    longCalls,
    longPuts, 
    shortCalls,
    shortPuts,
    pmccPositions,
    coveredCalls,
    wheelPositions
  };
};

// Strategy badge component
const StrategyBadge = ({ strategy }) => {
  const strategyConfig = {
    'Wheel Start': { color: 'bg-purple-100 text-purple-800', icon: '🎯' },
    'Covered Call': { color: 'bg-blue-100 text-blue-800', icon: '🛡️' },
    'PMCC': { color: 'bg-green-100 text-green-800', icon: '⚡' },
    'Naked': { color: 'bg-yellow-100 text-yellow-800', icon: '⚠️' }
  };
  
  const config = strategyConfig[strategy] || { color: 'bg-gray-100 text-gray-800', icon: '📊' };
  
  return (
    <Badge className={`${config.color} text-xs`}>
      {config.icon} {strategy}
    </Badge>
  );
};

// Error display component
const ErrorDisplay = ({ error, onRetry }) => (
  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
    <h3 className="text-red-800 font-medium">Error loading options</h3>
    <p className="text-red-600 text-sm mt-1">{error?.message || 'Something went wrong'}</p>
    {onRetry && (
      <Button onClick={onRetry} variant="outline" size="sm" className="mt-2">
        Try Again
      </Button>
    )}
  </div>
);

// Loading component
const LoadingDisplay = () => (
  <div className="p-4 text-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
    <p className="text-gray-600 mt-2">Loading options...</p>
  </div>
);

export default function Options() {
  const [showForm, setShowForm] = useState(false);
  const [editingOption, setEditingOption] = useState(null);

  // React Query hooks
  const {
    data: rawOptions,
    isLoading,
    error,
    refetch
  } = useOptions();

  // Ensure options is always an array
  const options = React.useMemo(() => {
    if (!rawOptions) return [];
    if (!Array.isArray(rawOptions)) {
      console.warn('Options API returned non-array data:', rawOptions);
      return [];
    }
    return rawOptions.filter(option => option && typeof option === 'object');
  }, [rawOptions]);

  // Create debug state to display on page
  const [debugInfo, setDebugInfo] = React.useState(null);

  // Debug logging
  React.useEffect(() => {
    console.log('Options data received:', {
      rawOptions,
      processedOptions: options,
      isArray: Array.isArray(options),
      length: options?.length
    });

    if (error) {
      console.error('Options API error:', error);
    }
  }, [options, error, rawOptions]);

  // Auto-refresh prices on component mount
  React.useEffect(() => {
    // Only auto-refresh if we have options data and no current refresh is pending
    if (options && options.length > 0 && !refreshPricesMutation.isPending) {
      console.log('Auto-refreshing option prices on mount...');
      refreshPricesMutation.mutate();
    }
  }, [options.length]); // Only trigger when options are first loaded

  // Categorize options for strategy analysis
  const categorizedOptions = React.useMemo(() => {
    return categorizeOptions(options);
  }, [options]);

  const createOptionMutation = useCreateOption();
  const updateOptionMutation = useUpdateOption();
  const deleteOptionMutation = useDeleteOption();
  const refreshPricesMutation = useRefreshOptionPrices();

  // Loading state
  if (isLoading) {
    return (
      <ErrorBoundary>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Options</h1>
          </div>
          <LoadingDisplay />
        </div>
      </ErrorBoundary>
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorBoundary>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Options</h1>
          </div>
          <ErrorDisplay error={error} onRetry={refetch} />
        </div>
      </ErrorBoundary>
    );
  }

  // Check for mutation loading states
  const isMutating = createOptionMutation.isPending ||
    updateOptionMutation.isPending ||
    deleteOptionMutation.isPending ||
    refreshPricesMutation.isPending;

  const handleSubmit = async (optionData) => {
    try {
      if (editingOption) {
        await updateOptionMutation.mutateAsync({ id: editingOption.id, data: optionData });
      } else {
        await createOptionMutation.mutateAsync(optionData);
      }
      setShowForm(false);
      setEditingOption(null);
    } catch (error) {
      console.error("Error saving option:", error);
      // Error handling is managed by React Query
    }
  };

  const handleEdit = (option) => {
    setEditingOption(option);
    setShowForm(true);
  };

  const handleDelete = async (optionId) => {
    if (window.confirm("Are you sure you want to delete this option?")) {
      try {
        await deleteOptionMutation.mutateAsync(optionId);
      } catch (error) {
        console.error("Error deleting option:", error);
        // Error handling is managed by React Query
      }
    }
  };

  const handleRefreshPrices = async () => {
    try {
      await refreshPricesMutation.mutateAsync();
    } catch (error) {
      console.error("Error refreshing prices:", error);
      // Error handling is managed by React Query
    }
  };

  const handleAddNew = () => {
    setEditingOption(null);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingOption(null);
  };

  const calculateTotalValue = () => {
    if (!options || !Array.isArray(options)) {
      return 0;
    }

    return options
      .filter((option) =>
        option &&
        option.status === "Open" &&
        option.current_price &&
        typeof option.current_price === 'number' &&
        option.contracts &&
        typeof option.contracts === 'number'
      )
      .reduce(
        (total, option) => total + Math.abs(option.contracts) * option.current_price * 100,
        0
      );
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'Open': 'bg-green-100 text-green-800',
      'Closed': 'bg-gray-100 text-gray-800',
      'Expired': 'bg-red-100 text-red-800',
      'Assigned': 'bg-blue-100 text-blue-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatExpiryDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
                Options Positions
              </h1>
              <p className="text-slate-600 mt-2">
                Manage your options contracts • Total Value:{" "}
                {formatCurrency(calculateTotalValue())}
              </p>
              <div className="text-sm text-slate-500 mt-1 space-y-1">
                <p>📈 <strong>Long Calls/Puts:</strong> Directional bets and protection</p>
                <p>🛡️ <strong>Short Calls:</strong> Can be Covered Calls (with stock) or PMCC (with long calls)</p>
                <p>🎯 <strong>Short Puts:</strong> Start of wheel strategies, may have associated wheels</p>
              </div>
              {isMutating && (
                <p className="text-blue-600 text-sm mt-1">
                  {refreshPricesMutation.isPending ? "Refreshing prices..." : "Processing changes..."}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <RefreshPricesButton 
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              />
              <Button
                onClick={handleAddNew}
                disabled={isMutating}
                className="bg-slate-900 hover:bg-slate-800 shadow-lg disabled:opacity-50"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Option
              </Button>
            </div>
          </div>

          {/* Strategy Summary Cards */}
          {options.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Long Calls</p>
                    <p className="text-2xl font-bold text-green-600">{categorizedOptions.longCalls.length}</p>
                  </div>
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-lg">📈</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">Bullish positions</p>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Long Puts</p>
                    <p className="text-2xl font-bold text-red-600">{categorizedOptions.longPuts.length}</p>
                  </div>
                  <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 text-lg">📉</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">Bearish protection</p>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Short Calls</p>
                    <p className="text-2xl font-bold text-blue-600">{categorizedOptions.shortCalls.length}</p>
                  </div>
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-lg">🛡️</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">Income generation</p>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Short Puts</p>
                    <p className="text-2xl font-bold text-purple-600">{categorizedOptions.shortPuts.length}</p>
                  </div>
                  <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-lg">🎯</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">Wheel strategies</p>
              </div>
            </div>
          )}

          {options.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold text-slate-700">Ticker</TableHead>
                    <TableHead className="font-semibold text-slate-700">Type & Position</TableHead>
                    <TableHead className="font-semibold text-slate-700">Strike</TableHead>
                    <TableHead className="font-semibold text-slate-700">Expiry</TableHead>
                    <TableHead className="font-semibold text-slate-700">Contracts</TableHead>
                    <TableHead className="font-semibold text-slate-700">Cost Basis</TableHead>
                    <TableHead className="font-semibold text-slate-700">Current Price</TableHead>
                    <TableHead className="font-semibold text-slate-700">P&L</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="font-semibold text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {options && options.length > 0 ? (
                    options.map((option) => {
                      // Safely handle option data with null checks
                      if (!option || typeof option !== 'object') {
                        console.warn('Invalid option object:', option);
                        return null;
                      }

                      // Use enhanced P&L calculation
                      const positionData = {
                        contracts: option.contracts || 0,
                        averagePrice: option.average_price || 0,
                        currentPrice: option.current_price || 0,
                        optionType: option.option_type || 'CALL',
                        strikePrice: option.strike_price || 0,
                        symbol: option.symbol
                      };

                      // Determine strategy type based on position characteristics
                      let strategyType = 'unknown';
                      const isShort = (option.contracts || 0) < 0;
                      if (isShort) {
                        if (option.option_type === 'Put') {
                          strategyType = 'wheel';
                        } else if (option.option_type === 'Call') {
                          strategyType = 'covered_call';
                        }
                      } else {
                        strategyType = 'long_option';
                      }

                      // Calculate enhanced P&L with strategy insights
                      const pnlResult = calculateStrategyPnL(positionData, strategyType);
                      
                      // Use backend P&L if available, otherwise use calculated
                      const profitLoss = option.profit_loss !== undefined ? option.profit_loss : pnlResult.profitLoss;
                      const profitLossPercent = option.profit_loss_percent !== undefined ? 
                        option.profit_loss_percent : pnlResult.profitLossPercent;

                      const positionType = isShort ? 'Short' : 'Long';
                      const absContracts = Math.abs(option.contracts || 0);

                      // Strategy display names
                      const strategyDisplayNames = {
                        'wheel': 'Wheel Start',
                        'covered_call': 'Covered Call',
                        'pmcc': 'PMCC',
                        'long_option': 'Long Option',
                        'unknown': 'Naked'
                      };

                      return (
                        <TableRow key={option.id || Math.random()} className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-900">
                            {option.ticker || option.underlying_symbol || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex gap-2">
                                <Badge variant={option.option_type === 'Call' ? 'default' : 'secondary'}>
                                  {option.option_type || 'Unknown'}
                                </Badge>
                                <Badge variant={isShort ? 'destructive' : 'default'} className="text-xs">
                                  {positionType}
                                </Badge>
                              </div>
                              <Badge className={`${getStrategyBadgeClass(strategyType)} text-xs`}>
                                {strategyDisplayNames[strategyType]}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(option.strike_price || 0)}</TableCell>
                          <TableCell>{formatExpiryDate(option.expiration_date)}</TableCell>
                          <TableCell>
                            <span className={isShort ? 'text-red-600' : 'text-green-600'}>
                              {isShort ? '-' : '+'}{absContracts}
                            </span>
                          </TableCell>
                          <TableCell>{formatCurrency(option.average_price || 0)}</TableCell>
                          <TableCell>
                            {(option.current_price !== null && 
                              option.current_price !== undefined && 
                              typeof option.current_price === 'number') ? 
                              formatCurrency(option.current_price) : 
                              'N/A'
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className={getPnLColorClass(profitLoss)}>
                                {formatCurrency(profitLoss)}
                              </span>
                              <span className={`text-xs ${getPnLColorClass(profitLoss)}`}>
                                {formatPercent(profitLossPercent)}
                              </span>
                              {pnlResult.breakevenPrice && (
                                <span className="text-xs text-slate-500">
                                  BE: {formatCurrency(pnlResult.breakevenPrice)}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(option.status || 'Unknown')}>
                              {option.status || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleEdit(option)}
                                disabled={isMutating}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => handleDelete(option.id)}
                                disabled={isMutating}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }).filter(Boolean)) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                        No options data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <Target className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No options positions yet
              </h3>
              <p className="text-slate-500 mb-6">
                Start trading options by adding your first position
              </p>
              <Button
                onClick={handleAddNew}
                disabled={isMutating}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Your First Option
              </Button>
            </div>
          )}

          <OptionForm
            isOpen={showForm}
            onClose={handleCancel}
            onSubmit={handleSubmit}
            option={editingOption}
            disabled={isMutating}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}
