import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import AddStockModal from '@/components/AddStockModal';
import { unifiedApi, UnifiedPosition } from '../services/unifiedApi';
// Keep legacy API for development mode checking
import { isDevelopmentMode } from '../services/backendSchwabApi';

// Option symbol parser for formats like "HIMS 251017P00037000"
const parseOptionSymbol = (symbol: string) => {
  // Match pattern: TICKER YYMMDDCPPPPPPPP or TICKER YYMMDDPPPPPPPPP
  const optionMatch = symbol.match(/^([A-Z]+)\s+(\d{6})([CP])(\d{8})$/);

  if (!optionMatch) {
    return { isOption: false, underlyingSymbol: symbol };
  }

  const [, underlying, dateStr, optionType, strikeStr] = optionMatch;

  // Parse date (YYMMDD)
  const year = 2000 + parseInt(dateStr.substring(0, 2));
  const month = parseInt(dateStr.substring(2, 4));
  const day = parseInt(dateStr.substring(4, 6));
  const expirationDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

  // Parse strike price (last 8 digits, divide by 1000)
  const strikePrice = parseInt(strikeStr) / 1000;

  return {
    isOption: true,
    underlyingSymbol: underlying,
    optionType: optionType === 'C' ? 'Call' : 'Put',
    strikePrice,
    expirationDate,
    displaySymbol: `${underlying} ${expirationDate} ${optionType === 'C' ? 'Call' : 'Put'} $${strikePrice}`
  };
};

// Use the unified position interface
interface Position extends UnifiedPosition {
  // Legacy fields for backward compatibility
  shares?: number;
  costBasis?: number;
  marketPrice?: number;
  marketValue?: number;
  // For UI state
  expanded?: boolean;
}

const Stocks: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string>('');
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set());

  // Load positions from unified backend
  useEffect(() => {
    loadUnifiedPositions();
  }, []);

  const loadUnifiedPositions = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Get both stock and option positions from unified backend
      const [stockPositions, optionPositions] = await Promise.all([
        unifiedApi.getStockPositions(),
        unifiedApi.getOptionPositions()
      ]);

      // Combine and transform positions
      const allPositions: Position[] = [];

      // Add stock positions
      stockPositions.forEach(pos => {
        allPositions.push({
          ...pos,
          // Legacy compatibility fields
          shares: (pos.long_quantity || 0) - (pos.short_quantity || 0),
          costBasis: pos.average_price,
          marketPrice: pos.current_price || 0,
          marketValue: pos.market_value
        });
      });

      // Add option positions
      optionPositions.forEach(pos => {
        allPositions.push({
          ...pos,
          // Legacy compatibility fields
          shares: pos.contracts || ((pos.long_quantity || 0) - (pos.short_quantity || 0)),
          costBasis: pos.average_price,
          marketPrice: pos.current_price || 0,
          marketValue: pos.market_value
        });
      });

      setPositions(allPositions);
      setLastRefresh(new Date());

      console.log(`✅ Loaded ${allPositions.length} positions from unified backend:`, {
        stocks: stockPositions.length,
        options: optionPositions.length,
        total: allPositions.length
      });

    } catch (error) {
      console.error('❌ Error loading unified positions:', error);
      setError(`Failed to load positions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('Failed to load positions from unified backend');
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new manual position (keeping this for backward compatibility)
  const addPosition = (newPositionData: { symbol: string; shares: number; costBasis: number; marketPrice: number; }) => {
    // Calculate derived values
    const marketValue = newPositionData.shares * newPositionData.marketPrice;
    const profitLoss = marketValue - (newPositionData.costBasis * newPositionData.shares);
    const profitLossPercent = newPositionData.costBasis > 0 ? ((newPositionData.marketPrice - newPositionData.costBasis) / newPositionData.costBasis) * 100 : 0;

    const position: Position = {
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
      profitLoss,
      profitLossPercent,
      // Legacy compatibility
      shares: newPositionData.shares,
      costBasis: newPositionData.costBasis,
      marketPrice: newPositionData.marketPrice,
      marketValue
    };

    const updatedPositions = [...positions, position];
    setPositions(updatedPositions);
    // Note: In unified model, manual positions should also be saved to backend
    // For now keeping localStorage for compatibility
    localStorage.setItem('stockPositions', JSON.stringify(updatedPositions));
  };

  const removePosition = (id: string) => {
    if (id.includes('schwab') || id.includes('fidelity')) {
      // Can't remove imported positions manually
      toast.error('Cannot remove imported positions. Use your brokerage to close the position.');
      return;
    }

    const updatedPositions = positions.filter(p => p.id !== id);
    setPositions(updatedPositions);
    localStorage.setItem('stockPositions', JSON.stringify(updatedPositions));
  };

  // All positions are now in the single positions array from unified backend
  const allPositions = positions;

  // Group positions by underlying symbol (for options) or symbol (for stocks)
  const groupedPositions = allPositions.reduce((groups, position) => {
    // For options, use the parsed ticker if available, otherwise try to extract from symbol
    let key = position.symbol;
    if (position.asset_type === 'OPTION') {
      key = position.ticker || position.symbol.split(' ')[0] || position.symbol;
    }

    if (!groups[key]) {
      groups[key] = { stocks: [], options: [] };
    }

    if (position.asset_type === 'OPTION') {
      groups[key].options.push(position);
    } else {
      groups[key].stocks.push(position);
    }

    return groups;
  }, {} as Record<string, { stocks: Position[], options: Position[] }>);

  const totalValue = allPositions.reduce((sum, pos) => {
    const value = isNaN(pos.market_value || 0) ? 0 : (pos.market_value || 0);
    return sum + value;
  }, 0);

  // Calculate statistics
  const totalStocks = allPositions.filter(p => p.asset_type !== 'OPTION').length;
  const totalOptions = allPositions.filter(p => p.asset_type === 'OPTION').length;
  const stockValue = allPositions
    .filter(p => p.asset_type !== 'OPTION')
    .reduce((sum, pos) => sum + (pos.market_value || 0), 0);
  const optionValue = allPositions
    .filter(p => p.asset_type === 'OPTION')
    .reduce((sum, pos) => sum + (pos.market_value || 0), 0);

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

  // Calculate summary for a ticker group
  const getTickerSummary = (group: { stocks: Position[], options: Position[] }) => {
    const allPositions = [...group.stocks, ...group.options];
    const totalValue = allPositions.reduce((sum, pos) => sum + (pos.market_value || 0), 0);
    const totalPL = allPositions.reduce((sum, pos) => sum + (pos.profitLoss || 0), 0);
    const totalCost = allPositions.reduce((sum, pos) => sum + ((pos.costBasis || pos.average_price) * Math.abs(pos.shares || pos.long_quantity || 0)), 0);
    const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

    // Calculate option breakdown
    const longOptions = group.options.filter(pos => (pos.shares || pos.long_quantity || 0) > 0).length;
    const shortOptions = group.options.filter(pos => (pos.shares || pos.short_quantity || 0) < 0).length;

    return {
      totalValue,
      totalPL,
      totalPLPercent,
      stockCount: group.stocks.length,
      optionCount: group.options.length,
      longOptions,
      shortOptions
    };
  };

  const handleManualSync = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Refreshing positions...');

      // Just reload the unified positions
      await loadUnifiedPositions();

      toast.success('Positions refreshed successfully');

    } catch (error) {
      console.error('❌ Error refreshing positions:', error);
      toast.error('Failed to refresh positions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMockData = async () => {
    try {
      setIsLoading(true);
      console.log('🎭 Loading mock data not available in unified model...');

      toast.info('Mock data loading not available in unified model');

    } catch (error) {
      console.error('❌ Error loading mock data:', error);
      toast.error(`Failed to load mock data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPositions = async () => {
    try {
      setIsLoading(true);
      console.log('📤 Starting positions export...');

      // Get all positions from unified API
      const allPositions = await unifiedApi.getAllPositions();
      const allAccounts = await unifiedApi.getAllAccounts();

      const exportData = {
        export_info: {
          total_accounts: allAccounts.total_accounts,
          total_positions: allPositions.total_positions,
          export_date: new Date().toISOString()
        },
        accounts: allAccounts.accounts,
        positions: allPositions.positions
      };

      // Create a downloadable JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `allocraft-positions-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${exportData.export_info.total_accounts} accounts with ${exportData.export_info.total_positions} positions`);

    } catch (error) {
      console.error('❌ Error exporting positions:', error);
      toast.error(`Failed to export positions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Testing backend connection...');

      // Test the unified API health check
      const healthCheck = await unifiedApi.checkHealth();
      console.log('🔍 Backend health:', healthCheck);

      toast.success('Backend connected successfully!');

    } catch (error) {
      console.error('❌ Backend connection test failed:', error);
      toast.error(`Backend connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportPositions = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      console.log('📥 Starting positions import...');

      const fileText = await file.text();
      const importData = JSON.parse(fileText);

      // Validate the import data structure
      if (!importData.accounts || !importData.export_info) {
        throw new Error('Invalid import file format');
      }

      const result = await unifiedApi.importPositions(importData);
      console.log('✅ Positions imported:', result);

      // Reload positions to show imported data
      await loadUnifiedPositions();

      toast.success(`Imported successfully: ${result.imported_count} positions`);

    } catch (error) {
      console.error('❌ Error importing positions:', error);
      toast.error(`Failed to import positions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Stock & Options Portfolio</h1>
            <p className="text-slate-600 mt-2">
              Total Value: <span className="font-semibold">${totalValue.toLocaleString()}</span>
            </p>
            <div className="flex gap-6 mt-2 text-sm">
              <div className="text-slate-600">
                📈 <span className="font-medium">{totalStocks} Stocks</span> • ${stockValue.toLocaleString()}
              </div>
              <div className="text-slate-600">
                📊 <span className="font-medium">{totalOptions} Options</span> • ${optionValue.toLocaleString()}
              </div>
            </div>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="bg-slate-900 hover:bg-slate-800 shadow-lg">
            <Plus className="h-5 w-5 mr-2" />
            Add Position
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50 shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-red-800">❌ Error Loading Positions</h3>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError('');
                    loadUnifiedPositions();
                  }}
                  className="border-red-300"
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Schwab Status or Setup Prompt */}
        {positions.length > 0 ? (
          <Card className="border-emerald-200 bg-emerald-50 shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-emerald-800">✅ Schwab Connected</h3>
                  <p className="text-sm text-emerald-600">
                    {positions.length} positions imported from your Schwab account
                  </p>
                  {lastRefresh && (
                    <p className="text-xs text-emerald-500 mt-1">
                      Last updated: {lastRefresh.toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => loadUnifiedPositions()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Loading...' : 'Refresh Data'}
                  </button>

                  <button
                    onClick={handleManualSync}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Syncing...' : 'Sync Fresh Data'}
                  </button>

                  <button
                    onClick={handleExportPositions}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium flex items-center gap-2"
                    disabled={isLoading}
                  >
                    <Download size={16} />
                    {isLoading ? 'Exporting...' : 'Export Data'}
                  </button>

                  {isDevelopmentMode() && (
                    <>
                      <button
                        onClick={handleTestConnection}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Testing...' : '🔧 Test Backend'}
                      </button>

                      <button
                        onClick={handleLoadMockData}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Loading...' : '🎭 Load Mock Data'}
                      </button>

                      <div className="relative">
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportPositions}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={isLoading}
                        />
                        <button
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-2"
                          disabled={isLoading}
                        >
                          <Upload size={16} />
                          {isLoading ? 'Importing...' : 'Import Data'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-blue-200 bg-blue-50 shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-800">🔗 Connect Your Schwab Account</h3>
                  <p className="text-sm text-blue-600">
                    Import your positions automatically from Charles Schwab
                    {isDevelopmentMode() && " or use mock data for development"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = '/Settings'}
                    className="border-blue-300"
                  >
                    Go to Settings
                  </Button>
                  {isDevelopmentMode() && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTestConnection}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Testing...' : '🔧 Test Backend'}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadMockData}
                        className="border-purple-300 text-purple-700 hover:bg-purple-50"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Loading...' : '🎭 Load Mock Data'}
                      </Button>

                      <div className="relative">
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportPositions}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={isLoading}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 flex items-center gap-2"
                          disabled={isLoading}
                        >
                          <Upload size={16} />
                          {isLoading ? 'Importing...' : 'Import Data'}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Positions Section */}
        <Card className="border-0 shadow bg-white/80">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                All Positions
                {allPositions.length > 0 && (
                  <span className="text-sm font-normal text-slate-500 ml-2">
                    ({Object.keys(groupedPositions).length} ticker{Object.keys(groupedPositions).length !== 1 ? 's' : ''})
                  </span>
                )}
              </CardTitle>
              {Object.keys(groupedPositions).length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedTickers(new Set(Object.keys(groupedPositions)))}
                    className="text-xs"
                  >
                    Expand All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedTickers(new Set())}
                    className="text-xs"
                  >
                    Collapse All
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && allPositions.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <div className="animate-spin h-8 w-8 mx-auto mb-4 border-2 border-slate-300 border-t-slate-600 rounded-full"></div>
                <p className="text-lg">Loading Schwab positions...</p>
              </div>
            ) : allPositions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                  <Plus className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No positions yet</h3>
                <p className="text-slate-500 mb-6">Add positions manually or connect your Schwab account to import automatically.</p>
                <Button onClick={() => setIsAddModalOpen(true)} className="bg-slate-900 hover:bg-slate-800">
                  <Plus className="w-5 h-5 mr-2" /> Add Your First Position
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedPositions)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([symbol, group]) => {
                    const summary = getTickerSummary(group);
                    const isExpanded = expandedTickers.has(symbol);

                    return (
                      <Card key={symbol} className="border-0 shadow bg-white/80">
                        <CardHeader className="py-4">
                          <div
                            className="flex items-center justify-between cursor-pointer hover:bg-slate-50 -m-4 p-4 rounded-lg transition-colors"
                            onClick={() => toggleTicker(symbol)}
                          >
                            <div className="flex items-center gap-3">
                              <h3 className="text-xl font-semibold text-slate-900">{symbol}</h3>
                              <div className="flex gap-2">
                                {summary.stockCount > 0 && (
                                  <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                    📈 {summary.stockCount} stock{summary.stockCount !== 1 ? 's' : ''}
                                  </span>
                                )}
                                {summary.optionCount > 0 && (
                                  <span className="inline-flex items-center rounded-full border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                                    📊 {summary.longOptions > 0 ? `${summary.longOptions} long` : ''}{summary.longOptions > 0 && summary.shortOptions > 0 ? ', ' : ''}{summary.shortOptions > 0 ? `${summary.shortOptions} short` : ''} option{summary.optionCount !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="font-semibold text-slate-900">
                                  ${summary.totalValue.toLocaleString()}
                                </div>
                                <div className={`text-sm font-medium ${summary.totalPL >= 0 ? 'text-emerald-600' : 'text-red-600'
                                  }`}>
                                  {summary.totalPL >= 0 ? '+' : ''}${summary.totalPL.toLocaleString()} ({summary.totalPLPercent >= 0 ? '+' : ''}{summary.totalPLPercent.toFixed(2)}%)
                                </div>
                              </div>
                              <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </CardHeader>

                        {isExpanded && (
                          <CardContent className="pt-0">
                            <div className="space-y-6">
                              {/* Stock positions for this symbol */}
                              {group.stocks.length > 0 && (
                                <div className="space-y-3">
                                  <h4 className="text-lg font-medium text-slate-700 flex items-center gap-2">
                                    📈 Stock Positions
                                    <span className="text-sm font-normal text-slate-500">({group.stocks.length})</span>
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {group.stocks.map((position) => (
                                      <PositionCard
                                        key={position.id}
                                        position={position}
                                        canRemove={position.data_source === 'manual'}
                                        onRemove={removePosition}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Option positions for this symbol */}
                              {group.options.length > 0 && (
                                <div className="space-y-3">
                                  <h4 className="text-lg font-medium text-slate-700 flex items-center gap-2">
                                    📊 Option Positions
                                    <span className="text-sm font-normal text-slate-500">({group.options.length})</span>
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {group.options.map((position) => (
                                      <OptionPositionCard
                                        key={position.id}
                                        position={position}
                                        canRemove={position.data_source === 'manual'}
                                        onRemove={removePosition}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        <AddStockModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={addPosition}
        />
      </div>
    </div>
  );
};

// Position Card Component similar to LotCard from Wheels page
interface PositionCardProps {
  position: Position;
  canRemove: boolean;
  onRemove: (id: string) => void;
}

const PositionCard: React.FC<PositionCardProps> = ({ position, canRemove, onRemove }) => {
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

  const getStatusChip = () => {
    if (position.profitLoss === undefined || position.profitLoss === null) {
      return (
        <span className="inline-flex items-center rounded-xl border border-slate-300 bg-slate-50 text-slate-700 px-2.5 py-1 text-xs font-medium">
          Unknown
        </span>
      );
    }
    const isProfit = position.profitLoss >= 0;
    return (
      <span className={`inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-medium ${isProfit
        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
        : 'border-red-300 bg-red-50 text-red-700'
        }`}>
        {isProfit ? 'Profit' : 'Loss'}
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-900 truncate">{position.symbol}</h3>
          {getStatusChip()}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canRemove && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRemove(position.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-slate-500">Shares</div>
            <div className="font-semibold text-slate-900">{position.long_quantity.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-slate-500">Avg Price</div>
            <div className="font-semibold text-slate-900">{formatCurrency(position.average_price)}</div>
          </div>
          <div>
            <div className="text-slate-500">Current Price</div>
            <div className="font-semibold text-slate-900">{position.current_price ? formatCurrency(position.current_price) : 'N/A'}</div>
          </div>
          <div>
            <div className="text-slate-500">Market Value</div>
            <div className="font-semibold text-slate-900">{formatCurrency(position.market_value)}</div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-sm">Profit/Loss</div>
              <div className={`font-semibold ${getProfitLossColor(position.profitLoss)}`}>
                {position.profitLoss !== undefined ? formatCurrency(position.profitLoss) : 'N/A'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-slate-500 text-sm">Percentage</div>
              <div className={`font-semibold ${getProfitLossColor(position.profitLoss)}`}>
                {formatPercent(position.profitLossPercent)}
              </div>
            </div>
          </div>
        </div>

        {position.data_source === 'schwab' && (
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
            Data Source: {position.data_source}
          </div>
        )}
      </div>
    </div>
  );
};

// Option Position Card Component
interface OptionPositionCardProps {
  position: Position;
  canRemove: boolean;
  onRemove: (id: string) => void;
}

const OptionPositionCard: React.FC<OptionPositionCardProps> = ({ position, canRemove, onRemove }) => {
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

  const getOptionTypeChip = () => {
    const isCall = position.option_type === 'Call';
    const profitLoss = position.profitLoss;
    const isProfit = profitLoss !== undefined && profitLoss >= 0;
    return (
      <div className="flex gap-2">
        <span className={`inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-medium ${isCall
          ? 'border-blue-300 bg-blue-50 text-blue-700'
          : 'border-purple-300 bg-purple-50 text-purple-700'
          }`}>
          {position.option_type}
        </span>
        <span className={`inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-medium ${profitLoss !== undefined
          ? (isProfit ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-red-300 bg-red-50 text-red-700')
          : 'border-slate-300 bg-slate-50 text-slate-700'
          }`}>
          {profitLoss !== undefined ? (isProfit ? 'Profit' : 'Loss') : 'Unknown'}
        </span>
      </div>
    );
  };

  const formatExpirationDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isShortPosition = position.short_quantity > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-900 truncate">
            {position.ticker || position.symbol} ${position.strike_price}
          </h3>
          {getOptionTypeChip()}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canRemove && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRemove(position.id)}
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
            {position.option_type} • Exp: {position.expiration_date ? formatExpirationDate(position.expiration_date) : 'N/A'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {isShortPosition ? 'Short' : 'Long'} {Math.abs(position.contracts || 0).toFixed(2)} contract{Math.abs(position.contracts || 0) !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-slate-500">Contracts</div>
            <div className="font-semibold text-slate-900">
              {(position.contracts || 0) >= 0 ? '+' : ''}{(position.contracts || 0).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Avg Price</div>
            <div className="font-semibold text-slate-900">{formatCurrency(position.average_price)}</div>
          </div>
          <div>
            <div className="text-slate-500">Current Price</div>
            <div className="font-semibold text-slate-900">{position.current_price ? formatCurrency(position.current_price) : 'N/A'}</div>
          </div>
          <div>
            <div className="text-slate-500">Market Value</div>
            <div className="font-semibold text-slate-900">{formatCurrency(position.market_value)}</div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-sm">Profit/Loss</div>
              <div className={`font-semibold ${getProfitLossColor(position.profitLoss)}`}>
                {position.profitLoss !== undefined ? formatCurrency(position.profitLoss) : 'N/A'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-slate-500 text-sm">Percentage</div>
              <div className={`font-semibold ${getProfitLossColor(position.profitLoss)}`}>
                {formatPercent(position.profitLossPercent)}
              </div>
            </div>
          </div>
        </div>

        {position.data_source === 'schwab' && (
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
            Data Source: {position.data_source}
          </div>
        )}
      </div>
    </div>
  );
};

export default Stocks;