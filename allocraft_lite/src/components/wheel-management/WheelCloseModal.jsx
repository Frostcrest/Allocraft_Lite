import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  XCircle, AlertTriangle, DollarSign, Target, 
  TrendingUp, TrendingDown, Calendar, 
  CheckCircle, Clock, BarChart3, FileText
} from "lucide-react";

/**
 * WheelCloseModal - Close wheel strategy with summary and options
 * Handles closing positions and provides final P&L summary
 */
export default function WheelCloseModal({ 
  isOpen, 
  onClose, 
  wheel,
  onCloseWheel = () => {}
}) {
  const [closeMethod, setCloseMethod] = useState('market_close');
  const [closeNotes, setCloseNotes] = useState('');
  const [wheelSummary, setWheelSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Fetch wheel summary when modal opens
  useEffect(() => {
    if (isOpen && wheel) {
      fetchWheelSummary();
    }
  }, [isOpen, wheel]);

  const fetchWheelSummary = async () => {
    setCalculating(true);
    try {
      // Fetch detailed summary from backend
      const response = await fetch(`http://127.0.0.1:8000/wheels/${wheel.id}/close-summary`);
      if (response.ok) {
        const summary = await response.json();
        setWheelSummary(summary);
      } else {
        // Mock data for development
        setWheelSummary({
          total_premium_collected: 1250.00,
          realized_pnl: 890.50,
          unrealized_pnl: -120.25,
          total_pnl: 770.25,
          days_active: 45,
          cycles_completed: 3,
          current_positions: [
            {
              id: 1,
              symbol: `${wheel.ticker}240119P00150000`,
              type: 'put',
              quantity: -1,
              current_value: 180.00,
              unrealized_pnl: -30.00
            }
          ],
          performance_metrics: {
            win_rate: 75,
            avg_profit_per_cycle: 296.83,
            max_drawdown: -5.2,
            sharpe_ratio: 1.4
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch wheel summary:', error);
    } finally {
      setCalculating(false);
    }
  };

  const executeClose = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/wheels/${wheel.id}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          close_method: closeMethod,
          notes: closeNotes,
          close_all_positions: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        onCloseWheel(result);
        onClose();
      }
    } catch (error) {
      console.error('Failed to close wheel:', error);
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

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  if (!wheel) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-600" />
            Close {wheel.ticker} Wheel Strategy
            <Badge variant="secondary" className="ml-auto">
              {wheel.status?.toUpperCase()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {calculating ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : (
            <>
              {/* Warning Section */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Strategy Closure Warning</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Closing this wheel strategy will liquidate all open positions and end the strategy permanently. 
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              {/* Performance Summary */}
              {wheelSummary && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Final Performance Summary
                  </h3>
                  
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <div className="text-sm text-slate-600 mb-1">Total P&L</div>
                      <div className={`text-xl font-semibold ${
                        wheelSummary.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(wheelSummary.total_pnl)}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg">
                      <div className="text-sm text-slate-600 mb-1">Premium Collected</div>
                      <div className="text-xl font-semibold text-green-600">
                        {formatCurrency(wheelSummary.total_premium_collected)}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg">
                      <div className="text-sm text-slate-600 mb-1">Days Active</div>
                      <div className="text-xl font-semibold text-blue-600">
                        {wheelSummary.days_active}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg">
                      <div className="text-sm text-slate-600 mb-1">Cycles Completed</div>
                      <div className="text-xl font-semibold text-purple-600">
                        {wheelSummary.cycles_completed}
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-slate-700 mb-3">Strategy Performance</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Win Rate:</span>
                          <span className="font-medium">{formatPercentage(wheelSummary.performance_metrics.win_rate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Avg Profit/Cycle:</span>
                          <span className="font-medium">{formatCurrency(wheelSummary.performance_metrics.avg_profit_per_cycle)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Max Drawdown:</span>
                          <span className="font-medium text-red-600">{formatPercentage(wheelSummary.performance_metrics.max_drawdown)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Sharpe Ratio:</span>
                          <span className="font-medium">{wheelSummary.performance_metrics.sharpe_ratio}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-slate-700 mb-3">P&L Breakdown</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Realized P&L:</span>
                          <span className={`font-medium ${
                            wheelSummary.realized_pnl >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(wheelSummary.realized_pnl)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Unrealized P&L:</span>
                          <span className={`font-medium ${
                            wheelSummary.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(wheelSummary.unrealized_pnl)}
                          </span>
                        </div>
                        <div className="border-t pt-2 flex justify-between">
                          <span className="text-slate-600 font-medium">Total P&L:</span>
                          <span className={`font-semibold ${
                            wheelSummary.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(wheelSummary.total_pnl)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Positions */}
              {wheelSummary?.current_positions?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-orange-600" />
                    Positions to Close
                  </h3>
                  
                  <div className="space-y-2">
                    {wheelSummary.current_positions.map((position) => (
                      <div key={position.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant={position.type === 'put' ? 'destructive' : 'default'}>
                              {position.type.toUpperCase()}
                            </Badge>
                            <span className="font-medium">{position.symbol}</span>
                            <span className="text-slate-600">Qty: {Math.abs(position.quantity)}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(position.current_value)}</div>
                            <div className={`text-sm ${
                              position.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {position.unrealized_pnl >= 0 ? '+' : ''}{formatCurrency(position.unrealized_pnl)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Method Selection */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Close Method</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setCloseMethod('market_close')}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      closeMethod === 'market_close' 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-red-600" />
                      <span className="font-medium">Market Close</span>
                    </div>
                    <p className="text-sm text-slate-600">
                      Close all positions immediately at current market prices
                    </p>
                  </button>

                  <button
                    onClick={() => setCloseMethod('limit_close')}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      closeMethod === 'limit_close' 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Limit Orders</span>
                    </div>
                    <p className="text-sm text-slate-600">
                      Place limit orders to close positions at favorable prices
                    </p>
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <Label htmlFor="close_notes" className="text-base font-medium">
                  Closure Notes (Optional)
                </Label>
                <Textarea
                  id="close_notes"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Add any notes about why you're closing this strategy..."
                  rows={3}
                  className="mt-2"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-6 border-t">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                
                <Button 
                  onClick={executeClose}
                  disabled={loading}
                  variant="destructive"
                  className="min-w-[120px]"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Close Strategy
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
