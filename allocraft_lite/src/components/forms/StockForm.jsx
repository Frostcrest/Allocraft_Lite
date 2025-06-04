import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function StockForm({ isOpen, onClose, onSubmit, stock = null }) {
  const [formData, setFormData] = useState({
    ticker: stock?.ticker || '',
    shares: stock?.shares || '',
    cost_basis: stock?.cost_basis || '',
    market_price: stock?.market_price || '',
    status: stock?.status || 'Open',
    entry_date: stock?.entry_date || new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    setFormData({
      ticker: stock?.ticker || '',
      shares: stock?.shares || '',
      cost_basis: stock?.cost_basis || '',
      market_price: stock?.market_price || '',
      status: stock?.status || 'Open',
      entry_date: stock?.entry_date || new Date().toISOString().split('T')[0]
    });
  }, [stock]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      shares: parseFloat(formData.shares),
      cost_basis: parseFloat(formData.cost_basis),
      market_price: formData.market_price ? parseFloat(formData.market_price) : null
    });
    onClose();
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {stock ? 'Edit Stock Position' : 'Add Stock Position'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ticker">Ticker</Label>
              <Input
                id="ticker"
                value={formData.ticker}
                onChange={(e) => handleChange('ticker', e.target.value.toUpperCase())}
                placeholder="AAPL"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shares">Shares</Label>
              <Input
                id="shares"
                type="number"
                step="0.01"
                value={formData.shares}
                onChange={(e) => handleChange('shares', e.target.value)}
                placeholder="100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost_basis">Cost Basis</Label>
              <Input
                id="cost_basis"
                type="number"
                step="0.01"
                value={formData.cost_basis}
                onChange={(e) => handleChange('cost_basis', e.target.value)}
                placeholder="150.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry_date">Entry Date</Label>
              <Input
                id="entry_date"
                type="date"
                value={formData.entry_date}
                onChange={(e) => handleChange('entry_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-slate-900 hover:bg-slate-800">
              {stock ? 'Update' : 'Add'} Position
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}