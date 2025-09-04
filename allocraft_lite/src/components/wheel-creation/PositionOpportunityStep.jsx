import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search, Target, TrendingUp, TrendingDown, RotateCcw,
  CheckCircle2, AlertCircle, Eye, DollarSign, Calendar,
  Shield, Activity, Zap, ArrowRight, Info, Coins, Settings
} from "lucide-react";
import { PositionParsingService } from '../../services/PositionParsingService';
import { usePositionsData } from '../../api/enhancedClient';

export default function PositionOpportunityStep({
  formData,
  updateFormData,
  validationErrors,
  isQuickMode,
  prefilledData
}) {
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStrategies, setSelectedStrategies] = useState({});
  const [showManualEntry, setShowManualEntry] = useState(false);
  
  // Get positions data
  const { allPositions, isLoading, isError } = usePositionsData();
  
  // Get ticker opportunity groups
  const [tickerGroups, setTickerGroups] = useState([]);
  
  useEffect(() => {
    if (allPositions && allPositions.length > 0) {
      console.log('📊 Parsing ticker groups from positions:', allPositions.length, 'positions');
      const groups = PositionParsingService.getTickerOpportunityGroups(allPositions);
      console.log('🎯 Identified', groups.length, 'ticker groups');
      setTickerGroups(groups);
    } else {
      console.log('❌ No positions available for parsing');
      setTickerGroups([]);
    }
  }, [allPositions]);
  
  // Filter ticker groups based on search
  const filteredTickerGroups = tickerGroups.filter(group =>
    group.ticker.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Handle strategy selection for a ticker
  const handleStrategySelect = (ticker, strategyType, strategyData) => {
    const selection = {
      ticker,
      strategyType,
      strategyData,
      timestamp: Date.now()
    };
    
    setSelectedStrategies({
      ...selectedStrategies,
      [ticker]: selection
    });
    
    console.log('🎯 User selected strategy:', selection);
    
    // Update form data with proper structure for subsequent steps
    const updatedFormData = {
      ...formData,
      // Core strategy information
      ticker: ticker,
      strategyType: strategyType,
      strategy: strategyType,
      
      // Position-based data
      fromPosition: true,
      selectedStrategy: selection,
      
      // Auto-fill parameters based on strategy and existing positions
      ...getAutoFilledParameters(ticker, strategyType, strategyData)
    };
    
    console.log('📝 Updated form data:', updatedFormData);
    updateFormData(updatedFormData);
  };
  
  // Auto-fill parameters based on selected strategy and position data
  const getAutoFilledParameters = (ticker, strategyType, strategyData) => {
    const autoFilled = {};
    
    // Set expiration date suggestions (15-45 days out)
    const today = new Date();
    const suggestedExpiration = new Date(today);
    suggestedExpiration.setDate(today.getDate() + 30); // 30 days default
    
    switch (strategyType) {
      case 'covered_call':
        if (strategyData.shortCalls && strategyData.shortCalls.length > 0) {
          const existingCall = strategyData.shortCalls[0];
          autoFilled.strikePrice = existingCall.strike_price;
          autoFilled.expirationDate = existingCall.expiration_date;
        } else {
          // Suggest OTM strike (5-10% above current price)
          autoFilled.strikePrice = ''; // Will be filled by market data
          autoFilled.expirationDate = suggestedExpiration.toISOString().split('T')[0];
        }
        autoFilled.contractCount = Math.min(strategyData.maxContracts || 1, 1);
        break;
        
      case 'cash_secured_put':
        if (strategyData.shortPuts && strategyData.shortPuts.length > 0) {
          const existingPut = strategyData.shortPuts[0];
          autoFilled.strikePrice = existingPut.strike_price;
          autoFilled.expirationDate = existingPut.expiration_date;
        } else {
          autoFilled.expirationDate = suggestedExpiration.toISOString().split('T')[0];
        }
        autoFilled.contractCount = 1;
        autoFilled.positionSize = 10000; // $10k default
        break;
        
      case 'poor_mans_covered_call':
        if (strategyData.longCalls && strategyData.longCalls.length > 0) {
          const longCall = strategyData.longCalls[0];
          // Suggest short strike above long strike
          autoFilled.strikePrice = (parseFloat(longCall.strike_price) + 5).toString();
          autoFilled.expirationDate = suggestedExpiration.toISOString().split('T')[0];
        }
        autoFilled.contractCount = 1;
        break;
        
      case 'buy_100_shares':
        autoFilled.positionSize = (strategyData.currentPrice * 100) || 10000;
        autoFilled.contractCount = 1;
        break;
    }
    
    return autoFilled;
  };
  
  // Handle manual entry
  const handleManualEntry = () => {
    setShowManualEntry(true);
    setSelectedStrategies({});
    updateFormData({
      ...formData,
      fromPosition: false,
      selectedStrategy: null,
      ticker: '',
      strategyType: '',
      strategy: ''
    });
  };
  
  // Handle manual form updates
  const handleManualFormUpdate = (field, value) => {
    const updatedFormData = {
      ...formData,
      [field]: value
    };
    
    // Also update the strategy field when strategyType changes
    if (field === 'strategyType') {
      updatedFormData.strategy = value;
    }
    
    updateFormData(updatedFormData);
  };
  
  // Strategy configuration for display
  const getStrategyConfig = (strategyType) => {
    const configs = {
      covered_call: {
        icon: TrendingDown,
        color: 'green',
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        name: 'Covered Call',
        description: 'Sell calls against stock'
      },
      poor_mans_covered_call: {
        icon: Shield,
        color: 'indigo',
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        text: 'text-indigo-800',
        name: "Poor Man's Covered Call",
        description: 'Use long calls as synthetic stock'
      },
      buy_100_shares: {
        icon: Coins,
        color: 'orange',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-800',
        name: 'Buy 100 Shares',
        description: 'Purchase shares to start wheel'
      },
      cash_secured_put: {
        icon: TrendingUp,
        color: 'blue',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        name: 'Cash-Secured Put',
        description: 'Sell puts to acquire stock'
      }
    };
    return configs[strategyType] || configs.covered_call;
  };
  
  // Get confidence badge styling
  const getConfidenceBadge = (confidence) => {
    const styles = {
      high: 'bg-green-100 text-green-800 border-green-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-red-100 text-red-800 border-red-300'
    };
    return styles[confidence] || styles.low;
  };
  
  // Check if we can proceed to next step
  const canProceed = Object.keys(selectedStrategies).length > 0 || showManualEntry;
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Analyzing your positions...</p>
        </div>
      </div>
    );
  }
  
  if (isError || !allPositions || allPositions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Positions Found</h3>
          <p className="text-slate-600 mb-4">
            We couldn't find any positions to analyze. You can still create a wheel manually.
          </p>
          <Button onClick={handleManualEntry} variant="outline">
            <Target className="h-4 w-4 mr-2" />
            Create Wheel Manually
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Select Strategy by Ticker
        </h2>
        <p className="text-slate-600">
          Choose your preferred wheel strategy for each ticker based on your current positions.
        </p>
      </div>
      
      {/* Search and Manual Entry */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search tickers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={handleManualEntry}
          className={showManualEntry ? 'bg-blue-50 border-blue-300' : ''}
        >
          <Target className="h-4 w-4 mr-2" />
          Manual Entry
        </Button>
      </div>
      
      {/* Manual Entry Form */}
      {showManualEntry && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <h3 className="text-lg font-semibold">Manual Wheel Configuration</h3>
            <p className="text-sm text-slate-600">
              Enter wheel parameters manually without using existing positions.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="manualTicker">Ticker Symbol</Label>
                <Input
                  id="manualTicker"
                  placeholder="e.g., AAPL"
                  value={formData.ticker || ''}
                  onChange={(e) => handleManualFormUpdate('ticker', e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <Label htmlFor="manualStrategy">Strategy Type</Label>
                <Select 
                  value={formData.strategyType || formData.strategy || ''} 
                  onValueChange={(value) => handleManualFormUpdate('strategyType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="covered_call">Covered Call</SelectItem>
                    <SelectItem value="cash_secured_put">Cash-Secured Put</SelectItem>
                    <SelectItem value="poor_mans_covered_call">Poor Man's Covered Call</SelectItem>
                    <SelectItem value="buy_100_shares">Buy 100 Shares</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Ticker Strategy Groups */}
      {!showManualEntry && (
        <div className="max-h-96 overflow-y-auto pr-2 space-y-4">
          {filteredTickerGroups.length === 0 ? (
            <div className="text-center py-8">
              <Eye className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Opportunities Found</h3>
              <p className="text-slate-500 mb-4">
                {searchTerm 
                  ? `No tickers match "${searchTerm}"`
                  : 'No wheel opportunities identified from your positions'
                }
              </p>
              <Button onClick={handleManualEntry} variant="outline">
                <Target className="h-4 w-4 mr-2" />
                Create Wheel Manually
              </Button>
            </div>
          ) : (
            filteredTickerGroups.map((group) => (
              <Card 
                key={group.ticker} 
                className={`transition-all duration-200 ${
                  selectedStrategies[group.ticker] 
                    ? 'ring-2 ring-blue-500 border-blue-300 bg-blue-50' 
                    : 'hover:shadow-md border-slate-200'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <span className="font-bold text-slate-700">{group.ticker}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{group.ticker}</h3>
                        <p className="text-sm text-slate-600">
                          {group.totalShares} shares • {Object.keys(group.availableStrategies).length} strategies
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`${getConfidenceBadge(group.confidence)} text-xs`}
                    >
                      {group.confidence} confidence
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-slate-700">Available Strategies:</Label>
                    <div className="grid gap-2">
                      {Object.entries(group.availableStrategies).map(([strategyType, strategyData]) => {
                        const config = getStrategyConfig(strategyType);
                        const Icon = config.icon;
                        const isSelected = selectedStrategies[group.ticker]?.strategyType === strategyType;
                        
                        return (
                          <button
                            key={strategyType}
                            onClick={() => handleStrategySelect(group.ticker, strategyType, strategyData)}
                            className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                              isSelected
                                ? `${config.border} ${config.bg} ring-2 ring-${config.color}-500`
                                : `border-slate-200 hover:border-${config.color}-300 hover:${config.bg}`
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Icon className={`h-5 w-5 ${config.text}`} />
                                <div>
                                  <p className={`font-medium ${config.text}`}>{config.name}</p>
                                  <p className="text-xs text-slate-600">{strategyData.description}</p>
                                </div>
                              </div>
                              {isSelected && (
                                <CheckCircle2 className={`h-5 w-5 ${config.text}`} />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
      
      {/* Error Display */}
      {validationErrors?.opportunity && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-800">{validationErrors.opportunity}</p>
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex justify-between pt-4 border-t border-slate-200">
        <div className="text-sm text-slate-600">
          {Object.keys(selectedStrategies).length > 0 && (
            <span>
              Selected {Object.keys(selectedStrategies).length} strategy{Object.keys(selectedStrategies).length !== 1 ? 'ies' : ''}
            </span>
          )}
        </div>
        <div className="text-sm text-slate-500">
          Navigation handled by modal
        </div>
      </div>
    </div>
  );
}
