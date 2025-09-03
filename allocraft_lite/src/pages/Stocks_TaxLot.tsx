import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import AddStockModal from '@/components/AddStockModal';
import { usePositionsData, useImportPositions, useBackendHealth } from '../api/enhancedClient';
import { UnifiedPosition } from '../services/unifiedApi';
import { isDevelopmentMode } from '../services/backendSchwabApi';

// Tax Lot interface for organizing stock positions
interface TaxLot {
  lotNumber: number;
  shares: number;
  isRemainder: boolean;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  profitLoss: number;
  profitLossPercent: number;
}

// Simplified position interface focused on stocks only
interface StockPosition extends UnifiedPosition {
  // Legacy fields for backward compatibility
  shares?: number;
  costBasis?: number;
  marketPrice?: number;
  marketValue?: number;
  // For UI state
  expanded?: boolean;
}

const Stocks: React.FC = () => {
  // React Query hooks replace manual state management
  const {
    allPositions,
    portfolioSummary,
    isLoading,
    isError,
    error,
    refetch
  } = usePositionsData();

  const importPositionsMutation = useImportPositions();
  const backendHealth = useBackendHealth();

  // UI state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set());

  // Transform positions for backward compatibility - stocks only
  const stockPositions = useMemo<StockPosition[]>(() => {
    return allPositions
      .filter(pos => pos.asset_type !== 'OPTION') // Remove all options
      .map(pos => ({
        ...pos,
        // Legacy compatibility fields
        shares: (pos.long_quantity || 0) - (pos.short_quantity || 0),
        costBasis: pos.average_price,
        marketPrice: pos.current_price || 0,
        marketValue: pos.market_value,
        expanded: expandedTickers.has(pos.symbol)
      }));
  }, [allPositions, expandedTickers]);

  // Calculate tax lots for a given stock position
  const calculateTaxLots = (position: StockPosition): TaxLot[] => {
    const totalShares = position.shares || 0;
    const currentPrice = position.current_price || 0;
    const averagePrice = position.average_price || 0;
    
    if (totalShares <= 0) return [];

    const lots: TaxLot[] = [];
    let remainingShares = totalShares;
    let lotNumber = 1;

    // Create 100-share lots
    while (remainingShares >= 100) {
      const lotShares = 100;
      const lotMarketValue = lotShares * currentPrice;
      const lotCostBasis = lotShares * averagePrice;
      const lotProfitLoss = lotMarketValue - lotCostBasis;
      const lotProfitLossPercent = lotCostBasis > 0 ? (lotProfitLoss / lotCostBasis) * 100 : 0;

      lots.push({
        lotNumber,
        shares: lotShares,
        isRemainder: false,
        averagePrice,
        currentPrice,
        marketValue: lotMarketValue,
        profitLoss: lotProfitLoss,
        profitLossPercent: lotProfitLossPercent
      });

      remainingShares -= 100;
      lotNumber++;
    }

    // Add remainder lot if any shares left
    if (remainingShares > 0) {
      const lotMarketValue = remainingShares * currentPrice;
      const lotCostBasis = remainingShares * averagePrice;
      const lotProfitLoss = lotMarketValue - lotCostBasis;
      const lotProfitLossPercent = lotCostBasis > 0 ? (lotProfitLoss / lotCostBasis) * 100 : 0;

      lots.push({
        lotNumber: 0, // 0 indicates remainder
        shares: remainingShares,
        isRemainder: true,
        averagePrice,
        currentPrice,
        marketValue: lotMarketValue,
        profitLoss: lotProfitLoss,
        profitLossPercent: lotProfitLossPercent
      });
    }

    return lots;
  };

  // Add a new manual position (using React Query pattern)
  const addPosition = (newPositionData: { symbol: string; shares: number; costBasis: number; marketPrice: number; }) => {
    // Calculate derived values
    const marketValue = newPositionData.shares * newPositionData.marketPrice;
    const profitLoss = marketValue - (newPositionData.costBasis * newPositionData.shares);
    const profitLossPercent = newPositionData.costBasis > 0 ? ((newPositionData.marketPrice - newPositionData.costBasis) / newPositionData.costBasis) * 100 : 0;

    const position: StockPosition = {
      id: Date.now().toString(),
      symbol: newPositionData.symbol,
      asset_type: 'EQUITY',
      long_quantity: newPositionData.shares > 0 ? newPositionData.shares : 0,
      short_quantity: newPositionData.shares < 0 ? Math.abs(newPositionData.shares) : 0,
      market_value: marketValue,
      average_price: newPositionData.costBasis,
      current_price: newPositionData.marketPrice,
      data_source: 'manual',
      status: 'Open',
      account_id: 1,
      profit_loss: profitLoss,
      profit_loss_percent: profitLossPercent,
      ticker: newPositionData.symbol
    };

    // Store in localStorage for now (this will be replaced with proper API call)
    const existingPositions = JSON.parse(localStorage.getItem('stockPositions') || '[]');
    const updatedPositions = [...existingPositions, position];
    localStorage.setItem('stockPositions', JSON.stringify(updatedPositions));
    
    // Trigger refetch to get latest data
    refetch();
  };

  // Remove position
  const removePosition = (id: string) => {
    const existingPositions = JSON.parse(localStorage.getItem('stockPositions') || '[]');
    const updatedPositions = existingPositions.filter((p: StockPosition) => p.id !== id);
    localStorage.setItem('stockPositions', JSON.stringify(updatedPositions));
    
    // Trigger refetch to get latest data
    refetch();
  };

  // Group stock positions by symbol (no options)
  const groupedStockPositions = stockPositions.reduce((groups, position) => {
    const symbol = position.symbol;
    if (!groups[symbol]) {
      groups[symbol] = [];
    }
    groups[symbol].push(position);
    return groups;
  }, {} as Record<string, StockPosition[]>);

  // Calculate total values for stocks only
  const totalStockValue = stockPositions.reduce((sum, pos) => {
    const value = isNaN(pos.market_value || 0) ? 0 : (pos.market_value || 0);
    return sum + value;
  }, 0);

  const totalStocks = stockPositions.length;

  // Toggle function for expanding/collapsing tickers
  const toggleTicker = (symbol: string) => {
    setExpandedTickers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(symbol)) {
        newSet.delete(symbol);
      } else {
        newSet.add(symbol);
      }
      return newSet;
    });
  };

  // Enhanced ticker summary for stocks with tax lot grouping
  const getStockTickerSummary = (positions: StockPosition[]) => {
    const totalShares = positions.reduce((sum, pos) => sum + (pos.shares || 0), 0);
    const totalMarketValue = positions.reduce((sum, pos) => sum + (pos.market_value || 0), 0);
    const totalCostBasis = positions.reduce((sum, pos) => sum + ((pos.shares || 0) * (pos.average_price || 0)), 0);
    const totalProfitLoss = totalMarketValue - totalCostBasis;
    const totalProfitLossPercent = totalCostBasis > 0 ? (totalProfitLoss / totalCostBasis) * 100 : 0;

    return {
      totalShares,
      totalMarketValue,
      totalProfitLoss,
      totalProfitLossPercent
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getProfitLossColor = (value: number | undefined) => {
    if (value === undefined || value === null) return 'text-slate-600';
    if (value > 0) return 'text-emerald-600';
    if (value < 0) return 'text-red-600';
    return 'text-slate-600';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading positions...</div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Error loading positions: {error?.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Stock Positions</h1>
          <p className="text-slate-600">Manage your stock portfolio with tax lot tracking</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Stock
          </Button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Total Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStocks}</div>
            <p className="text-sm text-slate-600">Stock positions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStockValue)}</div>
            <p className="text-sm text-slate-600">Market value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Backend Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-sm font-medium ${backendHealth.isHealthy ? 'text-emerald-600' : 'text-red-600'}`}>
              {backendHealth.isHealthy ? '✅ Connected' : '❌ Disconnected'}
            </div>
            <p className="text-xs text-slate-600">
              {stockPositions.length} positions loaded from backend
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Positions */}
      <div className="space-y-4">
        {stockPositions.length > 0 ? (
          Object.entries(groupedStockPositions).map(([symbol, positions]) => {
            const summary = getStockTickerSummary(positions);
            const isExpanded = expandedTickers.has(symbol);
            const position = positions[0]; // Use first position for main data

            return (
              <Card key={symbol} className="overflow-hidden">
                <CardHeader 
                  className="cursor-pointer hover:bg-slate-50 transition-colors" 
                  onClick={() => toggleTicker(symbol)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold">{symbol}</h3>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          {Math.floor(summary.totalShares)} shares
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">{formatCurrency(summary.totalMarketValue)}</div>
                      <div className={`text-sm font-medium ${getProfitLossColor(summary.totalProfitLoss)}`}>
                        {formatCurrency(summary.totalProfitLoss)} ({formatPercent(summary.totalProfitLossPercent)})
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Tax Lots Display */}
                      <div className="space-y-3">
                        <h4 className="text-lg font-medium text-slate-700 flex items-center gap-2">
                          📊 Tax Lots
                          <span className="text-sm font-normal text-slate-500">
                            ({Math.floor(summary.totalShares / 100)} lots + {summary.totalShares % 100} remainder)
                          </span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {positions.map((position) => {
                            const taxLots = calculateTaxLots(position);
                            return taxLots.map((lot, index) => (
                              <TaxLotCard
                                key={`${position.id}-${index}`}
                                lot={lot}
                                symbol={symbol}
                                canRemove={position.data_source === 'manual'}
                                onRemove={() => removePosition(position.id)}
                              />
                            ));
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-slate-400 mb-4">
                <Plus className="w-12 h-12 mx-auto mb-3 opacity-40" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No stock positions yet</h3>
              <p className="text-slate-600 mb-6">Start building your portfolio by adding your first stock position.</p>
              <Button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Stock
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AddStockModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={addPosition}
      />
    </div>
  );
};

// Tax Lot Card Component
interface TaxLotCardProps {
  lot: TaxLot;
  symbol: string;
  canRemove: boolean;
  onRemove: () => void;
}

const TaxLotCard: React.FC<TaxLotCardProps> = ({ lot, symbol, canRemove, onRemove }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getProfitLossColor = (value: number) => {
    if (value > 0) return 'text-emerald-600';
    if (value < 0) return 'text-red-600';
    return 'text-slate-600';
  };

  const getLotTitle = () => {
    if (lot.isRemainder) {
      return `Remainder`;
    }
    return `Lot ${lot.lotNumber}`;
  };

  const getLotTypeChip = () => {
    const isProfit = lot.profitLoss >= 0;
    return (
      <div className="flex gap-2">
        <span className={`inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-medium ${lot.isRemainder
          ? 'border-orange-300 bg-orange-50 text-orange-700'
          : 'border-blue-300 bg-blue-50 text-blue-700'
          }`}>
          {getLotTitle()}
        </span>
        <span className={`inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-medium ${isProfit 
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700' 
          : 'border-red-300 bg-red-50 text-red-700'
          }`}>
          {isProfit ? 'Profit' : 'Loss'}
        </span>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-900 truncate">
            {symbol}
          </h3>
          {getLotTypeChip()}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canRemove && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRemove}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm text-slate-600">
          <div className="font-medium">
            {lot.shares} shares • Avg: {formatCurrency(lot.averagePrice)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Current: {formatCurrency(lot.currentPrice)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-slate-500">Market Value</div>
            <div className="font-semibold">{formatCurrency(lot.marketValue)}</div>
          </div>
          <div>
            <div className="text-slate-500">P&L</div>
            <div className={`font-semibold ${getProfitLossColor(lot.profitLoss)}`}>
              {formatCurrency(lot.profitLoss)}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">P&L %</span>
            <span className={`font-medium ${getProfitLossColor(lot.profitLoss)}`}>
              {formatPercent(lot.profitLossPercent)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stocks;
