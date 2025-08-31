import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AddStockModal from '@/components/AddStockModal';
import { backendSchwabApi } from '../services/backendSchwabApi';

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

interface Position {
  id: string;
  symbol: string;
  shares: number;
  costBasis: number;
  marketPrice: number;
  marketValue: number;
  profitLoss: number;
  profitLossPercent: number;
  source: 'manual' | 'schwab';
  accountType?: string;
  accountNumber?: string;
  // Option-specific fields
  isOption?: boolean;
  underlyingSymbol?: string;
  optionType?: 'Call' | 'Put';
  strikePrice?: number;
  expirationDate?: string;
  contracts?: number;
}

const Stocks: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [schwabPositions, setSchwabPositions] = useState<Position[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string>('');
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set());

  // Load manual positions from localStorage
  useEffect(() => {
    const savedPositions = localStorage.getItem('stockPositions');
    if (savedPositions) {
      try {
        const parsed = JSON.parse(savedPositions);
        const manualPositions = parsed.filter((p: Position) => p.source !== 'schwab');
        setPositions(manualPositions);
      } catch (error) {
        console.error('Error loading positions:', error);
      }
    }
  }, []);

  // Safe position transformation with error handling
  const transformSchwabPosition = (pos: any, accountNumber: string, accountType: string, index: number): Position | null => {
    try {
      // Safely extract values with fallbacks
      const instrument = pos.instrument || {};
      const symbol = instrument.symbol || instrument.cusip || `UNKNOWN_${index}`;
      const longQuantity = parseFloat(pos.longQuantity || 0);
      const shortQuantity = parseFloat(pos.shortQuantity || 0);
      const quantity = longQuantity || shortQuantity || 0;

      if (quantity === 0) {
        return null; // Skip positions with no quantity
      }

      const marketValue = parseFloat(pos.marketValue || 0);
      const averagePrice = parseFloat(pos.averagePrice || 0);
      const marketPrice = quantity > 0 ? marketValue / quantity : 0;

      const profitLoss = marketValue - (averagePrice * quantity);
      const profitLossPercent = averagePrice > 0 ? ((marketPrice - averagePrice) / averagePrice) * 100 : 0;

      // Parse option information
      const optionInfo = parseOptionSymbol(symbol);

      const basePosition: Position = {
        id: `schwab-${accountNumber}-${symbol}-${index}`,
        symbol: symbol,
        shares: quantity,
        costBasis: averagePrice,
        marketPrice: marketPrice,
        marketValue: marketValue,
        profitLoss: profitLoss,
        profitLossPercent: profitLossPercent,
        source: 'schwab' as const,
        accountType: accountType,
        accountNumber: accountNumber
      };

      // Add option-specific fields if it's an option
      if (optionInfo.isOption) {
        return {
          ...basePosition,
          isOption: true,
          underlyingSymbol: optionInfo.underlyingSymbol,
          optionType: optionInfo.optionType as 'Call' | 'Put',
          strikePrice: optionInfo.strikePrice,
          expirationDate: optionInfo.expirationDate,
          contracts: Math.abs(quantity) / 100, // Convert shares to contracts
        };
      }

      return basePosition;
    } catch (error) {
      console.error('Error transforming position:', error, pos);
      return null;
    }
  };

  // Load Schwab positions with better error handling
  const loadSchwabPositions = async () => {
    setIsLoading(true);
    setError('');

    try {
      console.log('🔍 Loading Schwab positions...');

      // Check if user is connected to Schwab via backend
      const status = await backendSchwabApi.getStatus();
      if (!status.connected) {
        console.log('❌ User not connected to Schwab');
        setSchwabPositions([]);
        return;
      }

      // Use the Backend Schwab API service with correct hash-based flow
      console.log('📡 Fetching account summaries via Backend Schwab API service...');
      
      // Step 1: Get account summaries - now correctly returning accountNumber + hashValue
      const accountSummaries = await backendSchwabApi.getAccountSummaries();
      console.log('✅ Schwab account summaries fetched:', accountSummaries);
      console.log('🔍 Raw account summaries structure:', JSON.stringify(accountSummaries, null, 2));

      if (!Array.isArray(accountSummaries) || accountSummaries.length === 0) {
        console.log('❌ No Schwab account summaries found');
        setSchwabPositions([]);
        return;
      }

      // Step 2: Get full account details for each account using hash values
      const allPositions: Position[] = [];

      for (const accountSummary of accountSummaries) {
        try {
          console.log('🔍 Individual account summary:', JSON.stringify(accountSummary, null, 2));
          console.log(`🔍 Processing account ${accountSummary.accountNumber} with hash ${accountSummary.hashValue}`);
          
          // Get full account details using the hash value
          const accountDetails = await backendSchwabApi.getAccountByHash(accountSummary.hashValue);
          console.log('🔍 Full account details:', JSON.stringify(accountDetails, null, 2));
          
          const securitiesAccount = accountDetails.securitiesAccount;
          if (!securitiesAccount) {
            console.error('❌ No securitiesAccount found in account details:', accountDetails);
            continue;
          }
          
          const accountNumber = securitiesAccount.accountNumber;
          const accountType = 'Securities'; // Schwab accounts are securities accounts
          
          console.log(`🔍 Account ${accountNumber} processed with hash authentication`);

          // Check if positions are included in the account details
          if (securitiesAccount.positions && securitiesAccount.positions.length > 0) {
            console.log(`📊 Found ${securitiesAccount.positions.length} positions in account ${accountNumber}`);
            
            const transformedPositions = securitiesAccount.positions
              .map((pos: any, index: number) =>
                transformSchwabPosition(pos, accountNumber, accountType, index)
              )
              .filter((pos: Position | null) => pos !== null) as Position[];

            allPositions.push(...transformedPositions);
          } else {
            console.log(`ℹ️ No positions found in account ${accountNumber} (this is normal if account has no holdings)`);
          }
        } catch (error) {
          console.error(`❌ Error fetching details for account ${accountSummary.accountNumber}:`, error);
          continue;
        }
      }

      console.log(`✅ Total Schwab positions loaded: ${allPositions.length}`);
      setSchwabPositions(allPositions);
      setLastRefresh(new Date());

    } catch (error) {
      console.error('❌ Error loading Schwab positions:', error);
      let errorMessage = 'Failed to load Schwab positions';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Full error details:', error);
        
        // Handle specific error types
        if (error.message.includes('Not authenticated with Allocraft')) {
          errorMessage = 'Please log in to your Allocraft account first';
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Schwab connection expired. Please reconnect your account.';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
          errorMessage = 'Access denied. Please check your Schwab account permissions.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Schwab positions on component mount
  useEffect(() => {
    // Check if user is connected to Schwab and auto-load positions
    const checkAndLoadPositions = async () => {
      try {
        const status = await backendSchwabApi.getStatus();
        if (status.connected) {
          console.log('🔄 User is connected to Schwab, loading positions...');
          setTimeout(() => {
            loadSchwabPositions();
          }, 500);
        } else {
          console.log('ℹ️ User not connected to Schwab, skipping position load');
        }
      } catch (error) {
        console.log('ℹ️ Could not check Schwab status, user might not be logged in');
      }
    };
    
    checkAndLoadPositions();
  }, []);

  // Listen for Schwab connection events
  useEffect(() => {
    const handleSchwabConnection = () => {
      console.log('🔄 Schwab connection detected, refreshing positions...');
      setTimeout(() => {
        loadSchwabPositions();
      }, 1000); // Give OAuth time to complete
    };

    window.addEventListener('schwab-connected', handleSchwabConnection);
    return () => {
      window.removeEventListener('schwab-connected', handleSchwabConnection);
    };
  }, []);

  const addPosition = (newPositionData: { symbol: string; shares: number; costBasis: number; marketPrice: number; }) => {
    // Calculate derived values
    const marketValue = newPositionData.shares * newPositionData.marketPrice;
    const profitLoss = marketValue - (newPositionData.costBasis * newPositionData.shares);
    const profitLossPercent = newPositionData.costBasis > 0 ? ((newPositionData.marketPrice - newPositionData.costBasis) / newPositionData.costBasis) * 100 : 0;

    const position: Position = {
      ...newPositionData,
      id: Date.now().toString(),
      source: 'manual',
      marketValue,
      profitLoss,
      profitLossPercent
    };

    const updatedPositions = [...positions, position];
    setPositions(updatedPositions);
    localStorage.setItem('stockPositions', JSON.stringify([...updatedPositions, ...schwabPositions]));
  };

  const removePosition = (id: string) => {
    if (id.startsWith('schwab-')) {
      // Can't remove Schwab positions manually
      return;
    }

    const updatedPositions = positions.filter(p => p.id !== id);
    setPositions(updatedPositions);
    localStorage.setItem('stockPositions', JSON.stringify([...updatedPositions, ...schwabPositions]));
  };

  // Combine manual and Schwab positions safely
  const allPositions = [...positions, ...schwabPositions];
  
  // Group positions by underlying symbol
  const groupedPositions = allPositions.reduce((groups, position) => {
    const key = position.isOption ? position.underlyingSymbol! : position.symbol;
    if (!groups[key]) {
      groups[key] = { stocks: [], options: [] };
    }
    
    if (position.isOption) {
      groups[key].options.push(position);
    } else {
      groups[key].stocks.push(position);
    }
    
    return groups;
  }, {} as Record<string, { stocks: Position[], options: Position[] }>);

  const totalValue = allPositions.reduce((sum, pos) => {
    const value = isNaN(pos.marketValue) ? 0 : pos.marketValue;
    return sum + value;
  }, 0);

  // Calculate statistics
  const totalStocks = allPositions.filter(p => !p.isOption).length;
  const totalOptions = allPositions.filter(p => p.isOption).length;
  const stockValue = allPositions.filter(p => !p.isOption).reduce((sum, pos) => sum + (pos.marketValue || 0), 0);
  const optionValue = allPositions.filter(p => p.isOption).reduce((sum, pos) => sum + (pos.marketValue || 0), 0);

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
    const totalValue = allPositions.reduce((sum, pos) => sum + (pos.marketValue || 0), 0);
    const totalPL = allPositions.reduce((sum, pos) => sum + (pos.profitLoss || 0), 0);
    const totalCost = allPositions.reduce((sum, pos) => sum + (pos.costBasis * Math.abs(pos.shares)), 0);
    const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

    // Calculate option breakdown
    const longOptions = group.options.filter(pos => pos.shares > 0).length;
    const shortOptions = group.options.filter(pos => pos.shares < 0).length;

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
                    loadSchwabPositions();
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
        {schwabPositions.length > 0 ? (
          <Card className="border-emerald-200 bg-emerald-50 shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-emerald-800">✅ Schwab Connected</h3>
                  <p className="text-sm text-emerald-600">
                    {schwabPositions.length} positions imported from your Schwab account
                  </p>
                  {lastRefresh && (
                    <p className="text-xs text-emerald-500 mt-1">
                      Last updated: {lastRefresh.toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadSchwabPositions}
                  disabled={isLoading}
                  className="border-emerald-300"
                >
                  {isLoading ? 'Syncing...' : 'Sync Now'}
                </Button>
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
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/Settings'}
                  className="border-blue-300"
                >
                  Go to Settings
                </Button>
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
                  <Plus className="w-8 h-8 text-slate-400" />
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
                                <div className={`text-sm font-medium ${
                                  summary.totalPL >= 0 ? 'text-emerald-600' : 'text-red-600'
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
                                        canRemove={position.source === 'manual'} 
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
                                        canRemove={position.source === 'manual'} 
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

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getProfitLossColor = (value: number) => {
    if (value > 0) return 'text-emerald-600';
    if (value < 0) return 'text-red-600';
    return 'text-slate-600';
  };

  const getStatusChip = () => {
    const isProfit = position.profitLoss >= 0;
    return (
      <span className={`inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-medium ${
        isProfit 
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
            <div className="font-semibold text-slate-900">{position.shares.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-slate-500">Cost Basis</div>
            <div className="font-semibold text-slate-900">{formatCurrency(position.costBasis)}</div>
          </div>
          <div>
            <div className="text-slate-500">Market Price</div>
            <div className="font-semibold text-slate-900">{formatCurrency(position.marketPrice)}</div>
          </div>
          <div>
            <div className="text-slate-500">Market Value</div>
            <div className="font-semibold text-slate-900">{formatCurrency(position.marketValue)}</div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-sm">Profit/Loss</div>
              <div className={`font-semibold ${getProfitLossColor(position.profitLoss)}`}>
                {formatCurrency(position.profitLoss)}
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

        {position.source === 'schwab' && (
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
            Account: {position.accountNumber} ({position.accountType})
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

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getProfitLossColor = (value: number) => {
    if (value > 0) return 'text-emerald-600';
    if (value < 0) return 'text-red-600';
    return 'text-slate-600';
  };

  const getOptionTypeChip = () => {
    const isCall = position.optionType === 'Call';
    const isProfit = position.profitLoss >= 0;
    return (
      <div className="flex gap-2">
        <span className={`inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-medium ${
          isCall 
            ? 'border-blue-300 bg-blue-50 text-blue-700' 
            : 'border-purple-300 bg-purple-50 text-purple-700'
        }`}>
          {position.optionType}
        </span>
        <span className={`inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-medium ${
          isProfit 
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700' 
            : 'border-red-300 bg-red-50 text-red-700'
        }`}>
          {isProfit ? 'Profit' : 'Loss'}
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

  const isShortPosition = position.shares < 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-900 truncate">
            {position.underlyingSymbol} ${position.strikePrice}
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
            {position.optionType} • Exp: {formatExpirationDate(position.expirationDate!)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {isShortPosition ? 'Short' : 'Long'} {Math.abs(position.contracts!)} contract{Math.abs(position.contracts!) !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-slate-500">Contracts</div>
            <div className="font-semibold text-slate-900">
              {isShortPosition ? '-' : '+'}{Math.abs(position.contracts!)}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Avg Price</div>
            <div className="font-semibold text-slate-900">{formatCurrency(Math.abs(position.costBasis))}</div>
          </div>
          <div>
            <div className="text-slate-500">Current Price</div>
            <div className="font-semibold text-slate-900">{formatCurrency(Math.abs(position.marketPrice))}</div>
          </div>
          <div>
            <div className="text-slate-500">Market Value</div>
            <div className="font-semibold text-slate-900">{formatCurrency(position.marketValue)}</div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-sm">Profit/Loss</div>
              <div className={`font-semibold ${getProfitLossColor(position.profitLoss)}`}>
                {formatCurrency(position.profitLoss)}
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

        {position.source === 'schwab' && (
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
            Account: {position.accountNumber} ({position.accountType})
          </div>
        )}
      </div>
    </div>
  );
};

export default Stocks;