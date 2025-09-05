import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, TrendingUp, TrendingDown, Target, AlertCircle,
  DollarSign, Percent, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { usePositionsData } from '@/api/enhancedClient';
import { PositionDataService } from '@/services/positionDataService';

/**
 * PositionTickerStep - First step in enhanced wheel creation wizard
 * Allows users to select ticker from their current positions
 */
export default function PositionTickerStep({
  formData,
  updateFormData,
  validationErrors,
  onNext
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicker, setSelectedTicker] = useState(formData.selectedTicker || '');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualTicker, setManualTicker] = useState('');

  // Get positions data
  const { allPositions, isLoading, isError, error } = usePositionsData();

  // Group positions by ticker
  const [groupedPositions, setGroupedPositions] = useState({});

  useEffect(() => {
    if (allPositions && allPositions.length > 0) {
      console.log('🔄 PositionTickerStep: Grouping positions by ticker...', allPositions.length, 'positions');
      
      const grouped = allPositions.reduce((groups, position) => {
        // Use underlying symbol for options, regular symbol for stocks
        const ticker = position.isOption ? position.underlyingSymbol : position.symbol;
        
        if (!ticker) return groups;

        if (!groups[ticker]) {
          groups[ticker] = {
            ticker,
            stocks: [],
            options: [],
            totalValue: 0,
            totalShares: 0
          };
        }

        if (position.isOption) {
          groups[ticker].options.push(position);
        } else {
          groups[ticker].stocks.push(position);
          groups[ticker].totalShares += Math.abs(position.shares || 0);
        }
        
        groups[ticker].totalValue += position.marketValue || 0;
        
        return groups;
      }, {});

      console.log('📊 PositionTickerStep: Grouped positions:', Object.keys(grouped).length, 'tickers');
      setGroupedPositions(grouped);
    }
  }, [allPositions]);

  // Filter positions based on search term
  const filteredPositions = Object.values(groupedPositions).filter(group =>
    group.ticker.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTickerSelect = (ticker) => {
    console.log('🎯 PositionTickerStep: Ticker selected:', ticker);
    setSelectedTicker(ticker);
    updateFormData({
      selectedTicker: ticker,
      ticker: ticker // Also set the ticker for backward compatibility
    });
  };

  const handleManualEntry = () => {
    if (manualTicker.trim()) {
      console.log('✍️ PositionTickerStep: Manual ticker entered:', manualTicker.trim().toUpperCase());
      const ticker = manualTicker.trim().toUpperCase();
      setSelectedTicker(ticker);
      updateFormData({
        selectedTicker: ticker,
        ticker: ticker,
        isManualEntry: true
      });
      setShowManualEntry(false);
      setManualTicker('');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    if (!value) return '0.00%';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Select Position</h2>
          <p className="text-slate-600">Choose a ticker from your current holdings</p>
        </div>
        
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your positions...</p>
        </div>
      </div>
    );
  }

  if (isError || !allPositions || allPositions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Select Position</h2>
          <p className="text-slate-600">Choose a ticker from your current holdings</p>
        </div>

        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Positions Found</h3>
          <p className="text-slate-600 mb-6">
            {isError ? 
              `Error loading positions: ${error?.message || 'Unknown error'}` :
              'We couldn\'t find any positions in your portfolio. You can still create a wheel strategy manually.'
            }
          </p>
          <Button onClick={() => setShowManualEntry(true)} className="bg-blue-600 hover:bg-blue-700">
            <Target className="w-4 h-4 mr-2" />
            Enter Ticker Manually
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Select Position</h2>
        <p className="text-slate-600">
          Choose a ticker from your current holdings to create a wheel strategy
        </p>
      </div>

      {/* Search and Filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search your positions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-600">
            {filteredPositions.length} of {Object.keys(groupedPositions).length} tickers
          </p>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowManualEntry(true)}
            className="text-slate-600 hover:text-slate-900"
          >
            <Target className="w-4 h-4 mr-2" />
            Manual Entry
          </Button>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-3">Enter Ticker Manually</h3>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., AAPL"
              value={manualTicker}
              onChange={(e) => setManualTicker(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleManualEntry()}
              className="flex-1"
            />
            <Button onClick={handleManualEntry} disabled={!manualTicker.trim()}>
              Select
            </Button>
            <Button variant="outline" onClick={() => setShowManualEntry(false)}>
              Cancel
            </Button>
          </div>
          <p className="text-xs text-blue-700 mt-2">
            Use this if you want to create a wheel for a ticker not in your current positions.
          </p>
        </div>
      )}

      {/* Position Cards */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredPositions.map((group) => {
          const stockPosition = group.stocks[0]; // Get primary stock position
          const profitLoss = stockPosition?.profitLoss || 0;
          const profitLossPercent = stockPosition?.profitLossPercent || 0;
          const isSelected = selectedTicker === group.ticker;

          return (
            <button
              key={group.ticker}
              onClick={() => handleTickerSelect(group.ticker)}
              className={`w-full p-4 border rounded-lg text-left transition-all duration-200 hover:shadow-md ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg text-slate-900">{group.ticker}</span>
                  <Badge variant="outline" className="text-xs">
                    {group.stocks.length} stocks, {group.options.length} options
                  </Badge>
                </div>
                
                {isSelected && (
                  <Badge className="bg-blue-600 text-white">
                    Selected
                  </Badge>
                )}
              </div>

              {/* Position Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-600 mb-1">Shares</p>
                  <p className="font-semibold">{group.totalShares.toLocaleString()}</p>
                </div>
                
                <div>
                  <p className="text-slate-600 mb-1">Market Value</p>
                  <p className="font-semibold">{formatCurrency(group.totalValue)}</p>
                </div>
                
                {stockPosition && (
                  <>
                    <div>
                      <p className="text-slate-600 mb-1">P&L</p>
                      <p className={`font-semibold flex items-center gap-1 ${
                        profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {profitLoss >= 0 ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {formatCurrency(Math.abs(profitLoss))}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-slate-600 mb-1">Return</p>
                      <p className={`font-semibold ${
                        profitLossPercent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercent(profitLossPercent)}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Wheel Potential Indicator */}
              {group.totalShares >= 100 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-green-600">
                    <Target className="w-4 h-4" />
                    <span className="text-sm font-medium">Covered Call Ready</span>
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                      {Math.floor(group.totalShares / 100)} contracts
                    </Badge>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Validation Error */}
      {validationErrors.selectedTicker && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{validationErrors.selectedTicker}</p>
        </div>
      )}

      {/* Continue Button */}
      {selectedTicker && (
        <div className="pt-4 border-t">
          <Button 
            onClick={onNext}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Continue with {selectedTicker}
            <ArrowUpRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
