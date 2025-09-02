import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function OptionForm({
  formData = {},
  expiryDates = [],
  editingOption,
  onChange = () => {},
  onSubmit = () => {},
  onCancel = () => {},
  // New props from Options.jsx
  isOpen,
  onClose,
  option,
  disabled
}) {
  // Use the new props if available, otherwise fall back to old props
  const isModalOpen = isOpen !== undefined ? isOpen : false;
  const handleClose = onClose || onCancel;
  const currentOption = option || editingOption;
  const isDisabled = disabled !== undefined ? disabled : false;
  
  // If formData is empty but we have an option, populate formData
  const currentFormData = formData.ticker ? formData : {
    ticker: currentOption?.ticker || '',
    option_type: currentOption?.option_type || 'Call',
    strike_price: currentOption?.strike_price || '',
    expiry_date: currentOption?.expiry_date || '',
    contracts: currentOption?.contracts || '',
    cost_basis: currentOption?.cost_basis || ''
  };
  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {currentOption ? "Edit Option" : "Add New Option"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ticker">Ticker</Label>
          <Input
            id="ticker"
            value={currentFormData.ticker || ''}
            onChange={e => onChange && onChange("ticker", e.target.value.toUpperCase())}
            placeholder="AAPL"
            required
            disabled={isDisabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="option_type">Type</Label>
          <Select
            value={currentFormData.option_type || 'Call'}
            onValueChange={value => onChange && onChange("option_type", value)}
            disabled={isDisabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Call">Call</SelectItem>
              <SelectItem value="Put">Put</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="strike_price">Strike Price</Label>
          <Input
            id="strike_price"
            type="number"
            step="0.01"
            value={currentFormData.strike_price || ''}
            onChange={e => onChange && onChange("strike_price", e.target.value)}
            placeholder="150.00"
            required
            disabled={isDisabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contracts">Contracts</Label>
          <Input
            id="contracts"
            type="number"
            value={currentFormData.contracts || ''}
            onChange={e => onChange && onChange("contracts", e.target.value)}
            placeholder="1"
            required
            disabled={isDisabled}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="expiry_date">Expiry Date</Label>
        <Select
          value={currentFormData.expiry_date || ''}
          onValueChange={value => onChange && onChange("expiry_date", value)}
          required
          disabled={isDisabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select expiry date" />
          </SelectTrigger>
          <SelectContent>
            {(expiryDates || []).map(date => (
              <SelectItem key={date} value={date}>
                {date}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cost">Cost</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            value={currentFormData.cost_basis || currentFormData.cost || ''}
            onChange={e => onChange && onChange("cost", e.target.value)}
            placeholder="500.00"
            required
            disabled={isDisabled}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={currentFormData.status || 'Open'}
          onValueChange={value => onChange && onChange("status", value)}
          disabled={isDisabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="Closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter className="gap-3">
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleClose}
          disabled={isDisabled}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          className="bg-slate-900 hover:bg-slate-800"
          disabled={isDisabled}
        >
          {currentOption ? "Update" : "Add"} Option
        </Button>
      </DialogFooter>
    </form>
      </DialogContent>
    </Dialog>
  );
}