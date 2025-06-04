import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function OptionForm({
  formData,
  expiryDates,
  editingOption,
  onChange,
  onSubmit,
  onCancel,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ticker">Ticker</Label>
          <Input
            id="ticker"
            value={formData.ticker}
            onChange={e => onChange("ticker", e.target.value.toUpperCase())}
            placeholder="AAPL"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="option_type">Type</Label>
          <Select
            value={formData.option_type}
            onValueChange={value => onChange("option_type", value)}
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
            value={formData.strike_price}
            onChange={e => onChange("strike_price", e.target.value)}
            placeholder="150.00"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contracts">Contracts</Label>
          <Input
            id="contracts"
            type="number"
            value={formData.contracts}
            onChange={e => onChange("contracts", e.target.value)}
            placeholder="1"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="expiry_date">Expiry Date</Label>
        <Select
          value={formData.expiry_date}
          onValueChange={value => onChange("expiry_date", value)}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select expiry date" />
          </SelectTrigger>
          <SelectContent>
            {expiryDates.map(date => (
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
            value={formData.cost}
            onChange={e => onChange("cost", e.target.value)}
            placeholder="500.00"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status}
          onValueChange={value => onChange("status", value)}
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
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-slate-900 hover:bg-slate-800">
          {editingOption ? "Update" : "Add"} Option
        </Button>
      </DialogFooter>
    </form>
  );
}