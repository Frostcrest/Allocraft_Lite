import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RotateCcw, Calendar, DollarSign, Target,
  TrendingUp, AlertTriangle, Clock, Zap,
  ArrowRight, CheckCircle, Settings
} from "lucide-react";

/**
 * WheelRollModal - Roll expiring or ITM options to new strikes/dates
 * Handles both puts and calls with different rolling strategies
 */
export default function WheelRollModal({
  isOpen,
  onClose,
  wheel,
  onRoll = () => { }
}) {
  const [rollOptions, setRollOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [rollStrategy, setRollStrategy] = useState('extend_dte');
  const [rollParameters, setRollParameters] = useState({
    target_dte: 30,
    strike_adjustment: 'current',
    premium_target: 'neutral',
    max_debit: 100
  });
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Fetch roll candidates when modal opens
  useEffect(() => {
    if (isOpen && wheel) {
      fetchRollCandidates();
    }
  }, [isOpen, wheel]);

  const fetchRollCandidates = async () => {
    setLoading(true);
    try {
      // Fetch options that need rolling from our backend
      const response = await fetch(`http://127.0.0.1:8000/wheels/${wheel.ticker}/roll-candidates`);
      if (response.ok) {
        const candidates = await response.json();
        setRollOptions(candidates);
        // Auto-select all candidates by default
        setSelectedOptions(candidates.map(opt => opt.id));
      }
    } catch (error) {
      console.error('Failed to fetch roll candidates:', error);
      // Mock data for development
      setRollOptions([
        {
          id: 1,
          option_type: 'put',
          strike: 150.00,
          expiration: '2024-01-19',
          current_price: 2.50,
          days_to_expiration: 3,
          delta: -0.25,
          status: 'expiring',
          reason: 'Expiring soon'
        }
      ]);
      setSelectedOptions([1]);
    } finally {
      setLoading(false);
    }
  };

  const calculateRollScenarios = async () => {
    setCalculating(true);
    try {
      // Get roll scenarios from backend
      const response = await fetch(`http://127.0.0.1:8000/wheels/${wheel.ticker}/roll-scenarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          option_ids: selectedOptions,
          strategy: rollStrategy,
          parameters: rollParameters
        })
      });

      if (response.ok) {
        const scenarios = await response.json();
        // Update roll options with scenarios
        setRollOptions(prev => prev.map(opt => {
          const scenario = scenarios.find(s => s.option_id === opt.id);
          return scenario ? { ...opt, scenarios: scenario.options } : opt;
        }));
      }
    } catch (error) {
      console.error('Failed to calculate roll scenarios:', error);
    } finally {
      setCalculating(false);
    }
  };

  const executeRoll = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/wheels/${wheel.ticker}/execute-roll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          option_ids: selectedOptions,
          strategy: rollStrategy,
          parameters: rollParameters
        })
      });

      if (response.ok) {
        const result = await response.json();
        onRoll(result);
        onClose();
      }
    } catch (error) {
      console.error('Failed to execute roll:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!wheel) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <RotateCcw className="h-5 w-5 text-blue-600" />
            Roll Options - {wheel.ticker}
            <Badge variant="secondary" className="ml-auto">
              {rollOptions.length} Candidates
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {loading && rollOptions.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : rollOptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <CheckCircle className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No options need rolling</p>
              <p className="text-sm">All positions are in good standing</p>
            </div>
          ) : (
            <>
              {/* Roll Strategy Selection */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Roll Strategy</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setRollStrategy('extend_dte')}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${rollStrategy === 'extend_dte'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Extend Time</span>
                    </div>
                    <p className="text-sm text-slate-600">
                      Roll to later expiration, same or similar strike
                    </p>
                  </button>

                  <button
                    onClick={() => setRollStrategy('adjust_strike')}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${rollStrategy === 'adjust_strike'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Adjust Strike</span>
                    </div>
                    <p className="text-sm text-slate-600">
                      Roll to different strike and expiration
                    </p>
                  </button>

                  <button
                    onClick={() => setRollStrategy('defensive')}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${rollStrategy === 'defensive'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <span className="font-medium">Defensive</span>
                    </div>
                    <p className="text-sm text-slate-600">
                      Conservative roll to reduce risk
                    </p>
                  </button>
                </div>
              </div>

              {/* Roll Parameters */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Parameters</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target_dte">Target DTE</Label>
                    <Input
                      id="target_dte"
                      type="number"
                      min="7"
                      max="90"
                      value={rollParameters.target_dte}
                      onChange={(e) => setRollParameters(prev => ({
                        ...prev,
                        target_dte: parseInt(e.target.value)
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Strike Adjustment</Label>
                    <Select
                      value={rollParameters.strike_adjustment}
                      onValueChange={(value) => setRollParameters(prev => ({
                        ...prev,
                        strike_adjustment: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">Keep Current</SelectItem>
                        <SelectItem value="otm">Move OTM</SelectItem>
                        <SelectItem value="atm">At-the-Money</SelectItem>
                        <SelectItem value="defensive">Defensive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Premium Target</Label>
                    <Select
                      value={rollParameters.premium_target}
                      onValueChange={(value) => setRollParameters(prev => ({
                        ...prev,
                        premium_target: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit">Net Credit</SelectItem>
                        <SelectItem value="neutral">Even/Small Debit</SelectItem>
                        <SelectItem value="premium">Premium Target</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_debit">Max Debit ($)</Label>
                    <Input
                      id="max_debit"
                      type="number"
                      min="0"
                      step="10"
                      value={rollParameters.max_debit}
                      onChange={(e) => setRollParameters(prev => ({
                        ...prev,
                        max_debit: parseFloat(e.target.value)
                      }))}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <Button
                    onClick={calculateRollScenarios}
                    disabled={calculating || selectedOptions.length === 0}
                    variant="outline"
                    className="w-full"
                  >
                    {calculating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    ) : (
                      <Settings className="h-4 w-4 mr-2" />
                    )}
                    Calculate Roll Scenarios
                  </Button>
                </div>
              </div>

              {/* Options to Roll */}
              <div className="flex-1 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">Options to Roll</h3>
                <div className="space-y-4">
                  {rollOptions.map((option) => (
                    <div
                      key={option.id}
                      className={`border rounded-lg p-4 transition-colors ${selectedOptions.includes(option.id)
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-slate-200'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedOptions.includes(option.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOptions(prev => [...prev, option.id]);
                              } else {
                                setSelectedOptions(prev => prev.filter(id => id !== option.id));
                              }
                            }}
                            className="rounded border-slate-300"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant={option.option_type === 'put' ? 'destructive' : 'default'}>
                                {option.option_type.toUpperCase()}
                              </Badge>
                              <span className="font-medium">
                                {formatCurrency(option.strike)} • {formatDate(option.expiration)}
                              </span>
                            </div>
                            <div className="text-sm text-slate-600 mt-1">
                              {option.reason} • {option.days_to_expiration} DTE • Δ{option.delta}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-semibold">
                            {formatCurrency(option.current_price)}
                          </div>
                          <div className="text-sm text-slate-600">
                            Current Price
                          </div>
                        </div>
                      </div>

                      {/* Roll Scenario */}
                      {option.scenarios && (
                        <div className="bg-white border rounded p-3 mt-3">
                          <div className="flex items-center gap-2 mb-2">
                            <ArrowRight className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium">Recommended Roll</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-slate-600">New Strike: </span>
                              <span className="font-medium">{formatCurrency(option.scenarios.strike)}</span>
                            </div>
                            <div>
                              <span className="text-slate-600">New Expiration: </span>
                              <span className="font-medium">{formatDate(option.scenarios.expiration)}</span>
                            </div>
                            <div>
                              <span className="text-slate-600">Net Credit/Debit: </span>
                              <span className={`font-medium ${option.scenarios.net_credit >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {option.scenarios.net_credit >= 0 ? '+' : ''}{formatCurrency(option.scenarios.net_credit)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-6 border-t">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={calculateRollScenarios}
                    disabled={calculating || selectedOptions.length === 0}
                  >
                    {calculating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    ) : (
                      <Settings className="h-4 w-4 mr-2" />
                    )}
                    Recalculate
                  </Button>

                  <Button
                    onClick={executeRoll}
                    disabled={loading || selectedOptions.length === 0}
                    className="min-w-[120px]"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    Execute Roll
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
