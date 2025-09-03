import React, { useState, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AddStockModal from '@/components/AddStockModal';
import { usePositionsData, useBackendHealth } from '../api/enhancedClient';
import { UnifiedPosition } from '../services/unifiedApi';
import RefreshPricesButton from '@/components/RefreshPricesButton';

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
  coveredCalls?: any[]; // Options covering this lot
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
  console.log('🎯 Stocks Component: Initializing...');
  
  // Add debug function to test API directly
  const testApiDirectly = async () => {
    console.log('🧪 Testing API endpoints directly...');
    try {
      // Test stocks endpoint
      const stocksResponse = await fetch('http://127.0.0.1:8001/portfolio/positions/stocks');
      const stocksData = await stocksResponse.json();
      console.log('📊 Direct stocks API response:', stocksData);
      
      // Test options endpoint
      const optionsResponse = await fetch('http://127.0.0.1:8001/portfolio/positions/options');
      const optionsData = await optionsResponse.json();
      console.log('📊 Direct options API response:', optionsData);
      
      // Test all positions endpoint
      const allResponse = await fetch('http://127.0.0.1:8001/portfolio/positions');
      const allData = await allResponse.json();
      console.log('📊 Direct all positions API response:', allData);
    } catch (error) {
      console.error('❌ Direct API test failed:', error);
    }
  };
  
  // React Query hooks replace manual state management
  const {
    allPositions,
    isLoading,
    isError,
    error,
    refetch
  } = usePositionsData();

  console.log('📊 Stocks Component: Raw data from usePositionsData:', {
    allPositionsCount: allPositions.length,
    isLoading,
    isError,
    errorMessage: error?.message,
    errorDetails: error
  });

  const backendHealth = useBackendHealth();
  
  console.log('🏥 Backend Health Status:', {
    isLoading: backendHealth.isLoading,
    isError: backendHealth.isError,
    isSuccess: backendHealth.isSuccess,
    data: backendHealth.data,
    error: backendHealth.error?.message
  });

  // UI state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set());

  // Transform positions for backward compatibility - stocks only
  const stockPositions = useMemo<StockPosition[]>(() => {
    console.log('🔄 Stocks Component: Starting data transformation...');
    console.log('📥 Raw allPositions data:', allPositions);
    
    if (!allPositions || allPositions.length === 0) {
      console.warn('⚠️ No positions data available for transformation');
      return [];
    }

    console.log('📋 Position breakdown by asset_type:', 
      allPositions.reduce((acc, pos) => {
        acc[pos.asset_type] = (acc[pos.asset_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    );

    const filtered = allPositions.filter(pos => {
      const isStock = pos.asset_type !== 'OPTION';
      if (!isStock) {
        console.log('🚫 Filtering out option:', pos.symbol);
      }
      return isStock;
    });

    console.log(`📊 Filtered ${filtered.length} stock positions from ${allPositions.length} total positions`);

    const transformed = filtered.map((pos, index) => {
      const shares = (pos.long_quantity || 0) - (pos.short_quantity || 0);
      const marketPrice = pos.current_price || 
        (pos.market_value && shares > 0 ? pos.market_value / shares : 0);

      console.log(`📦 Transforming position ${index + 1}/${filtered.length}:`, {
        symbol: pos.symbol,
        asset_type: pos.asset_type,
        long_quantity: pos.long_quantity,
        short_quantity: pos.short_quantity,
        calculated_shares: shares,
        current_price: pos.current_price,
        market_value: pos.market_value,
        calculated_market_price: marketPrice,
        average_price: pos.average_price
      });

      const result: StockPosition = {
        ...pos,
        // Legacy compatibility fields
        shares,
        costBasis: pos.average_price,
        marketPrice,
        marketValue: pos.market_value,
        expanded: expandedTickers.has(pos.symbol)
      };

      return result;
    });

    console.log('✅ Stock transformation complete:', {
      transformedCount: transformed.length,
      symbols: transformed.map(p => p.symbol),
      totalShares: transformed.reduce((sum, p) => sum + (p.shares || 0), 0),
      totalValue: transformed.reduce((sum, p) => sum + (p.marketValue || 0), 0)
    });

    return transformed;
  }, [allPositions, expandedTickers]);

  // Get all options for covered call detection
  const allOptions = useMemo(() => {
    console.log('🔄 Extracting options for covered call detection...');
    const options = allPositions.filter(pos => pos.asset_type === 'OPTION');
    console.log(`📊 Found ${options.length} option positions for covered call detection`);
    return options;
  }, [allPositions]);

  // Function to find covered calls for a given stock symbol
  const getCoveredCalls = (symbol: string) => {
    return allOptions.filter(option => 
      option.ticker === symbol && 
      option.option_type === 'Call' && 
      option.short_quantity > 0
    );
  };

  // Calculate tax lots for a given stock position
  const calculateTaxLots = (position: StockPosition): TaxLot[] => {
    const totalShares = position.shares || 0;
    // Use market_value to derive current price if current_price is zero/null
    const currentPrice = position.current_price || 
      (position.market_value && totalShares > 0 ? position.market_value / totalShares : 0);
    const averagePrice = position.average_price || 0;
    
    if (totalShares <= 0) return [];

    const lots: TaxLot[] = [];
    let remainingShares = totalShares;
    let lotNumber = 1;

    // Get covered calls for this symbol
    const coveredCalls = getCoveredCalls(position.symbol);

    // Create 100-share lots
    while (remainingShares >= 100) {
      const lotShares = 100;
      const lotMarketValue = lotShares * currentPrice;
      const lotCostBasis = lotShares * averagePrice;
      const lotProfitLoss = lotMarketValue - lotCostBasis;
      const lotProfitLossPercent = lotCostBasis > 0 ? (lotProfitLoss / lotCostBasis) * 100 : 0;

      // Assign covered calls to this lot (simplified distribution)
      const callsForThisLot = lotNumber <= coveredCalls.length ? [coveredCalls[lotNumber - 1]] : [];

      lots.push({
        lotNumber,
        shares: lotShares,
        isRemainder: false,
        averagePrice,
        currentPrice,
        marketValue: lotMarketValue,
        profitLoss: lotProfitLoss,
        profitLossPercent: lotProfitLossPercent,
        coveredCalls: callsForThisLot.length > 0 ? callsForThisLot : undefined
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
        profitLossPercent: lotProfitLossPercent,
        coveredCalls: undefined // Remainders typically don't have covered calls
      });
    }

    return lots;
  };

  // Add a new manual position (using React Query pattern)
  const addPosition = (newPositionData: { symbol: string; shares: number; costBasis: number; marketPrice: number; }) => {
    // Calculate derived values
    const marketValue = newPositionData.shares * newPositionData.marketPrice;

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
    console.log('🔄 Stocks Component: Showing loading state');
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading positions...</div>
        </div>
      </div>
    );
  }

  if (isError) {
    console.error('💥 Stocks Component: Error state detected:', {
      error: error?.message,
      errorDetails: error,
      stockPositionsLength: stockPositions.length,
      allPositionsLength: allPositions.length
    });
    
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-4">🚨 Data Loading Error</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-red-700">Primary Error:</h3>
              <p className="text-red-600">{error?.message || 'Unknown error'}</p>
            </div>

            <div className="bg-white p-4 rounded border">
              <h3 className="font-medium text-gray-700 mb-2">🔍 Diagnostic Information:</h3>
              <div className="text-sm space-y-1">
                <p><strong>API Error Status:</strong> {(error as any)?.status || 'Unknown'}</p>
                <p><strong>API Error Code:</strong> {(error as any)?.code || 'None'}</p>
                <p><strong>Request URL:</strong> {(error as any)?.context?.path || 'Unknown'}</p>
                <p><strong>Backend Health:</strong> {backendHealth.isSuccess ? '✅ Connected' : '❌ Failed'}</p>
                <p><strong>Positions Count:</strong> {allPositions.length}</p>
                <p><strong>Stock Positions Count:</strong> {stockPositions.length}</p>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded border">
              <h3 className="font-medium text-blue-700 mb-2">🛠️ Troubleshooting Steps:</h3>
              <ol className="text-sm text-blue-600 space-y-1 list-decimal list-inside">
                <li>Check if backend is running on port 8001</li>
                <li>Verify API endpoint: <code>/portfolio/positions</code></li>
                <li>Check browser console for detailed error logs</li>
                <li>Verify CORS configuration allows frontend requests</li>
                <li>Try refreshing the page to retry the request</li>
              </ol>
            </div>

            <button 
              onClick={() => {
                console.log('🔄 Manual refetch triggered by user');
                refetch();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              🔄 Retry Loading Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log('🎨 Stocks Component: Rendering main UI with', stockPositions.length, 'stock positions');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Stock Positions</h1>
          <p className="text-slate-600">Manage your stock portfolio with tax lot tracking</p>
        </div>
        <div className="flex gap-3">
          <RefreshPricesButton 
            variant="all"
            size="md"
            className="shadow-sm"
          />
          <Button 
            onClick={testApiDirectly}
            className="bg-green-600 hover:bg-green-700 text-white"
            variant="outline"
          >
            🧪 Test API
          </Button>
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
            <div className={`text-sm font-medium ${backendHealth.isSuccess ? 'text-emerald-600' : 'text-red-600'}`}>
              {backendHealth.isSuccess ? '✅ Connected' : '❌ Disconnected'}
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
                                onRemove={() => removePosition(String(position.id))}
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
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addPosition}
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

        {/* Covered Call Information */}
        {lot.coveredCalls && lot.coveredCalls.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-500 mb-1">Covered Calls</div>
            {lot.coveredCalls.map((call, index) => (
              <div key={index} className="flex items-center justify-between text-xs bg-purple-50 border border-purple-200 rounded-lg p-2 mb-1">
                <div className="text-purple-700">
                  <span className="font-medium">{call.option_type} ${call.strike_price}</span>
                  <span className="ml-1 text-purple-600">exp: {new Date(call.expiration_date).toLocaleDateString()}</span>
                </div>
                <div className="text-purple-600 font-medium">
                  {call.short_quantity} contracts
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Stocks;
