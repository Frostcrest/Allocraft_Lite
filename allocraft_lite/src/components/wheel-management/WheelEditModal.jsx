import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Settings, AlertTriangle, DollarSign,
  Target, Calendar, TrendingUp, Save,
  RotateCcw, Percent, Clock
} from "lucide-react";

/**
 * WheelEditModal - Edit wheel strategy parameters
 * Allows modification of key strategy parameters while wheel is running
 */
export default function WheelEditModal({
  isOpen,
  onClose,
  wheel,
  onSave = () => { }
}) {
  const [formData, setFormData] = useState({
    // Core position parameters
    strike_price: '',
    expiration_date: '',
    contract_count: '',
    
    // Strategy parameters
    target_premium_rate: '',
    strike_selection_method: '',
    max_dte: '',
    min_dte: '',
    profit_target_percentage: '',
    loss_limit_percentage: '',
    auto_roll: false,
    max_position_size: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data when wheel changes
  useEffect(() => {
    if (wheel) {
      setFormData({
        // Core position parameters
        strike_price: wheel.strike_price || wheel.detection_metadata?.strike_price || '',
        expiration_date: wheel.expiration_date || wheel.detection_metadata?.expiration_date || '',
        contract_count: wheel.contract_count || wheel.detection_metadata?.contract_count || '',
        
        // Strategy parameters
        target_premium_rate: wheel.target_premium_rate || '',
        strike_selection_method: wheel.strike_selection_method || 'delta',
        max_dte: wheel.max_dte || '',
        min_dte: wheel.min_dte || '',
        profit_target_percentage: wheel.profit_target_percentage || '',
        loss_limit_percentage: wheel.loss_limit_percentage || '',
        auto_roll: wheel.auto_roll || false,
        max_position_size: wheel.max_position_size || '',
        notes: wheel.notes || ''
      });
      setHasChanges(false);
    }
  }, [wheel]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Prepare the update payload with position and strategy parameters
      const updatePayload = {
        ...formData,
        // Position parameters
        strike_price: parseFloat(formData.strike_price) || null,
        expiration_date: formData.expiration_date || null,
        contract_count: parseInt(formData.contract_count) || null,
        
        // Strategy parameters  
        target_premium_rate: parseFloat(formData.target_premium_rate) || null,
        max_dte: parseInt(formData.max_dte) || null,
        min_dte: parseInt(formData.min_dte) || null,
        profit_target_percentage: parseFloat(formData.profit_target_percentage) || null,
        loss_limit_percentage: parseFloat(formData.loss_limit_percentage) || null,
        max_position_size: parseFloat(formData.max_position_size) || null,
        
        // Update detection_metadata to preserve data integrity
        detection_metadata: {
          ...wheel.detection_metadata,
          strike_price: parseFloat(formData.strike_price) || null,
          expiration_date: formData.expiration_date || null,
          contract_count: parseInt(formData.contract_count) || null,
          last_updated: new Date().toISOString()
        }
      };

      // Call our backend API to update wheel parameters
      const response = await fetch(`http://127.0.0.1:8002/wheels/wheel-cycles/${wheel.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      });

      if (response.ok) {
        const updatedWheel = await response.json();
        onSave(updatedWheel);
        onClose();
      } else {
        console.error('Failed to update wheel parameters');
      }
    } catch (error) {
      console.error('Error updating wheel:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!wheel) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-blue-600" />
            Edit {wheel.ticker} Wheel Parameters
            <Badge variant="secondary" className="ml-auto">
              {wheel.status?.toUpperCase()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">

            {/* Position Parameters */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Position Parameters
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="strike_price">Strike Price ($)</Label>
                  <div className="relative">
                    <Input
                      id="strike_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.strike_price}
                      onChange={(e) => handleInputChange('strike_price', e.target.value)}
                      placeholder="37.00"
                    />
                    <DollarSign className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500">
                    Current option strike price
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiration_date">Expiration Date</Label>
                  <div className="relative">
                    <Input
                      id="expiration_date"
                      type="date"
                      value={formData.expiration_date}
                      onChange={(e) => handleInputChange('expiration_date', e.target.value)}
                    />
                    <Calendar className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500">
                    Option expiration date
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract_count">Contracts</Label>
                  <Input
                    id="contract_count"
                    type="number"
                    min="1"
                    value={formData.contract_count}
                    onChange={(e) => handleInputChange('contract_count', e.target.value)}
                    placeholder="1"
                  />
                  <p className="text-xs text-slate-500">
                    Number of option contracts
                  </p>
                </div>
              </div>
            </div>

            {/* Premium Strategy */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Premium Strategy
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target_premium_rate">Target Premium Rate (%)</Label>
                  <div className="relative">
                    <Input
                      id="target_premium_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.target_premium_rate}
                      onChange={(e) => handleInputChange('target_premium_rate', e.target.value)}
                      placeholder="2.5"
                    />
                    <Percent className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500">
                    Minimum premium rate to target for sold options
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profit_target_percentage">Profit Target (%)</Label>
                  <div className="relative">
                    <Input
                      id="profit_target_percentage"
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={formData.profit_target_percentage}
                      onChange={(e) => handleInputChange('profit_target_percentage', e.target.value)}
                      placeholder="50"
                    />
                    <TrendingUp className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500">
                    Close position when profit reaches this percentage
                  </p>
                </div>
              </div>
            </div>

            {/* Strike Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Strike Selection
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="strike_selection_method">Selection Method</Label>
                  <Select
                    value={formData.strike_selection_method}
                    onValueChange={(value) => handleInputChange('strike_selection_method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delta">Delta-based</SelectItem>
                      <SelectItem value="percentage">Percentage OTM</SelectItem>
                      <SelectItem value="premium">Premium Target</SelectItem>
                      <SelectItem value="support_resistance">Support/Resistance</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Method for selecting option strike prices
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_position_size">Max Position Size ($)</Label>
                  <Input
                    id="max_position_size"
                    type="number"
                    step="100"
                    min="0"
                    value={formData.max_position_size}
                    onChange={(e) => handleInputChange('max_position_size', e.target.value)}
                    placeholder="10000"
                  />
                  <p className="text-xs text-slate-500">
                    Maximum dollar amount per position
                  </p>
                </div>
              </div>
            </div>

            {/* Time Management */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                Time Management
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_dte">Minimum DTE</Label>
                  <div className="relative">
                    <Input
                      id="min_dte"
                      type="number"
                      min="0"
                      max="365"
                      value={formData.min_dte}
                      onChange={(e) => handleInputChange('min_dte', e.target.value)}
                      placeholder="7"
                    />
                    <Clock className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500">
                    Minimum days to expiration for new positions
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_dte">Maximum DTE</Label>
                  <div className="relative">
                    <Input
                      id="max_dte"
                      type="number"
                      min="0"
                      max="365"
                      value={formData.max_dte}
                      onChange={(e) => handleInputChange('max_dte', e.target.value)}
                      placeholder="45"
                    />
                    <Clock className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500">
                    Maximum days to expiration for new positions
                  </p>
                </div>
              </div>
            </div>

            {/* Risk Management */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Risk Management
              </h3>

              <div className="space-y-2">
                <Label htmlFor="loss_limit_percentage">Loss Limit (%)</Label>
                <Input
                  id="loss_limit_percentage"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={formData.loss_limit_percentage}
                  onChange={(e) => handleInputChange('loss_limit_percentage', e.target.value)}
                  placeholder="200"
                />
                <p className="text-xs text-slate-500">
                  Close position when loss reaches this percentage of premium
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto_roll"
                  checked={formData.auto_roll}
                  onChange={(e) => handleInputChange('auto_roll', e.target.checked)}
                  className="rounded border-slate-300"
                />
                <Label htmlFor="auto_roll" className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Auto-roll expiring options
                </Label>
              </div>
              <p className="text-xs text-slate-500 ml-6">
                Automatically roll options that are expiring ITM
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Notes</h3>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Add any notes about this wheel strategy..."
                rows={3}
              />
            </div>

            {/* Warning for Active Strategies */}
            {wheel.status === 'active' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-amber-800">Active Strategy Warning</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      This wheel strategy is currently active. Changes to parameters will apply to new positions only.
                      Existing positions will maintain their original parameters.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>

            <Button
              onClick={handleSave}
              disabled={!hasChanges || loading}
              className="min-w-[100px]"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
