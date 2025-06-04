import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function WheelForm({
  formData,
  editingWheel,
  onChange,
  onSubmit,
  onCancel,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Remove Wheel ID as a unique identifier input, keep as grouping label */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="wheel_id">Wheel Group ID</Label>
          <Input
            id="wheel_id"
            value={formData.wheel_id}
            onChange={e => onChange("wheel_id", e.target.value)}
            placeholder="AAPL-001"
            required
          />
        </div>
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
      </div>
      <div className="space-y-2">
        <Label htmlFor="trade_type">Trade Type</Label>
        <Select
          value={formData.trade_type}
          onValueChange={value => onChange("trade_type", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Sell Put">Sell Put</SelectItem>
            <SelectItem value="Assignment">Assignment</SelectItem>
            <SelectItem value="Sell Call">Sell Call</SelectItem>
            <SelectItem value="Called Away">Called Away</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="trade_date">Trade Date</Label>
        <Input
          id="trade_date"
          type="date"
          value={formData.trade_date}
          onChange={e => onChange("trade_date", e.target.value)}
          required
        />
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
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="premium_received">Premium Received</Label>
          <Input
            id="premium_received"
            type="number"
            step="0.01"
            value={formData.premium_received}
            onChange={e => onChange("premium_received", e.target.value)}
            placeholder="250.00"
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
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter className="gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-slate-900 hover:bg-slate-800">
          {editingWheel ? "Update" : "Add"} Trade
        </Button>
      </DialogFooter>
    </form>
  );
}