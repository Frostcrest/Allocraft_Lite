/**
 * PositionOpportunityStep - First step in enhanced wheel creation
 * 
 * Displays identified wheel opportunities from existing positions,
 * allowing users to select specific positions to create wheels from.
 * Features automatic parameter parsing and pre-filling.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search, Target, TrendingUp, TrendingDown, RotateCcw,
  CheckCircle2, AlertCircle, Eye, DollarSign, Calendar,
  Shield, Activity, Zap, ArrowRight, Info, Coins
} from "lucide-react";
import { PositionParsingService } from '../../services/PositionParsingService';
import { usePositionsData } from '../../api/enhancedClient';

export default function PositionOpportunityStep({
  formData,
  updateFormData,
  validationErrors,
  onNext
}) {
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  
  // Get positions data
  const { allPositions, isLoading, isError } = usePositionsData();
  
  // Identify opportunities from positions
  const [opportunities, setOpportunities] = useState([]);
  
  useEffect(() => {
    if (allPositions && allPositions.length > 0) {
      console.log('📊 Parsing opportunities from positions:', allPositions.length, 'positions');
      const identified = PositionParsingService.identifyWheelOpportunities(allPositions);
      console.log('🎯 Identified', identified.length, 'opportunities');
      setOpportunities(identified);
    } else {
      console.log('❌ No positions available for parsing');
      setOpportunities([]);
    }
  }, [allPositions]);
  
  // Filter opportunities based on search
  const filteredOpportunities = opportunities.filter(opp =>
    opp.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opp.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Handle opportunity selection
  const handleSelectOpportunity = (opportunity, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('🎯 Opportunity selected:', opportunity);
    setSelectedOpportunity(opportunity);
    
    // Update form data with pre-filled information
    const updatedData = {
      ...formData,
      ...opportunity.prefilledData,
      selectedOpportunity: opportunity,
      fromPosition: true
    };
    
    updateFormData(updatedData);
    
    console.log('✅ Form data updated with opportunity:', updatedData);
  };
  
  // Handle manual entry
  const handleManualEntry = () => {
    setShowManualEntry(true);
    setSelectedOpportunity(null);
    updateFormData({
      ...formData,
      fromPosition: false,
      selectedOpportunity: null
    });
  };
  
  // Strategy configuration for display
  const getStrategyConfig = (strategy) => {
    const configs = {
      covered_call: {
        icon: TrendingDown,
        color: 'green',
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        name: 'Covered Call',
        description: 'Generate income from stock positions'
      },
      cash_secured_put: {
        icon: TrendingUp,
        color: 'blue',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        name: 'Cash-Secured Put',
        description: 'Acquire stock at target prices'
      },
      full_wheel: {
        icon: RotateCcw,
        color: 'purple',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-800',
        name: 'Full Wheel',
        description: 'Complete wheel cycle strategy'
      }
    };
    return configs[strategy] || configs.covered_call;
  };
  
  // Confidence badge styling
  const getConfidenceBadge = (confidence) => {
    const styles = {
      high: 'bg-green-100 text-green-800 border-green-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-red-100 text-red-800 border-red-300'
    };
    return styles[confidence] || styles.low;
  };
  
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
          <p className="text-slate-600 mb-6">
            We couldn't find any positions to analyze. You can still create a wheel strategy manually.
          </p>
          <Button onClick={handleManualEntry} className="bg-blue-600 hover:bg-blue-700">
            <Target className="w-4 h-4 mr-2" />
            Create Manually
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Select Position Opportunity</h2>
        <p className="text-slate-600">
          Choose from identified wheel opportunities in your current positions
        </p>
      </div>
      
      {/* Search and Filter */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="Search by ticker or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button 
          variant="outline" 
          onClick={handleManualEntry}
          className="shrink-0"
        >
          <Target className="w-4 h-4 mr-2" />
          Manual Entry
        </Button>
      </div>
      
      {/* Opportunities Grid */}
      {filteredOpportunities.length > 0 ? (
        <div className="max-h-96 overflow-y-auto pr-2">
          <div className="grid gap-4 md:grid-cols-2">
            {filteredOpportunities.map((opportunity) => {
              const config = getStrategyConfig(opportunity.strategy);
              const IconComponent = config.icon;
              const isSelected = selectedOpportunity?.id === opportunity.id;
            
            return (
              <Card 
                key={opportunity.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isSelected ? `ring-2 ring-blue-500 ${config.border}` : config.border
                } border-2`}
                onClick={(e) => handleSelectOpportunity(opportunity, e)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.bg}`}>
                        <IconComponent className={`w-5 h-5 ${config.text}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{opportunity.ticker}</h3>
                        <p className="text-sm text-slate-600">{config.name}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <Badge 
                        variant="outline" 
                        className={getConfidenceBadge(opportunity.confidence)}
                      >
                        {opportunity.confidence.toUpperCase()}
                      </Badge>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Description */}
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {opportunity.description}
                  </p>
                  
                  {/* Key Details */}
                  {opportunity.prefilledData.strikePrice && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <h4 className="text-sm font-semibold text-slate-900 mb-2">Pre-filled Parameters</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-slate-600">Strike:</span>
                          <span className="font-medium ml-2">${opportunity.prefilledData.strikePrice}</span>
                        </div>
                        {opportunity.prefilledData.expirationDate && (
                          <div>
                            <span className="text-slate-600">Expiration:</span>
                            <span className="font-medium ml-2">
                              {PositionParsingService.formatExpirationDate(opportunity.prefilledData.expirationDate)}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-600">Contracts:</span>
                          <span className="font-medium ml-2">{opportunity.prefilledData.contractCount || 1}</span>
                        </div>
                        <div>
                          <span className="text-slate-600">Positions:</span>
                          <span className="font-medium ml-2">{opportunity.sourcePositions.length}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Potential Income & Risk */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-slate-600">Potential Income:</span>
                      <span className="font-bold text-green-700">
                        ${opportunity.potentialIncome?.toFixed(0) || '0'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-600 capitalize">
                        {opportunity.riskAssessment.level} Risk
                      </span>
                    </div>
                  </div>
                  
                  {/* Source Positions */}
                  <div className="border-t pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">Source Positions:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.sourcePositions.slice(0, 3).map((pos, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {pos.symbol} ({pos.quantity > 0 ? '+' : ''}{pos.quantity})
                        </Badge>
                      ))}
                      {opportunity.sourcePositions.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{opportunity.sourcePositions.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Target className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {searchTerm ? 'No Matching Opportunities' : 'No Wheel Opportunities Found'}
          </h3>
          <p className="text-slate-600 mb-6">
            {searchTerm 
              ? 'Try adjusting your search terms or create a wheel manually.'
              : 'Your current positions don\'t show obvious wheel opportunities. You can still create one manually.'
            }
          </p>
          <Button onClick={handleManualEntry} className="bg-blue-600 hover:bg-blue-700">
            <Target className="w-4 h-4 mr-2" />
            Create Manually
          </Button>
        </div>
      )}
      
      {/* Manual Entry Section */}
      {showManualEntry && (
        <Card className="border-2 border-dashed border-slate-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Target className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Manual Wheel Creation</h3>
                <p className="text-sm text-slate-600">Enter ticker and strategy manually</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="manual-ticker">Ticker Symbol</Label>
                <Input
                  id="manual-ticker"
                  placeholder="e.g., AAPL"
                  value={formData.ticker || ''}
                  onChange={(e) => updateFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
                  className={validationErrors.ticker ? 'border-red-300' : ''}
                />
                {validationErrors.ticker && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.ticker}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="manual-strategy">Strategy Type</Label>
                <select
                  id="manual-strategy"
                  value={formData.strategyType || ''}
                  onChange={(e) => updateFormData({ ...formData, strategyType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select strategy...</option>
                  <option value="covered_call">Covered Call</option>
                  <option value="cash_secured_put">Cash-Secured Put</option>
                  <option value="full_wheel">Full Wheel</option>
                </select>
                {validationErrors.strategyType && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.strategyType}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Next Button */}
      {(selectedOpportunity || showManualEntry) && (
        <div className="flex justify-end pt-4">
          <Button 
            onClick={onNext}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!selectedOpportunity && (!formData.ticker || !formData.strategyType)}
          >
            Continue to Parameters
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
