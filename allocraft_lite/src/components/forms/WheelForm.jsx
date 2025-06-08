import React from "react";
import { Button } from "@/components/ui/button";

export default function WheelForm({
  formData,
  onChange,
  onSubmit,
  onCancel,
  editingWheel,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Wheel ID
          </label>
          <input
            type="text"
            className="input"
            value={formData.wheel_id}
            onChange={e => onChange("wheel_id", e.target.value)}
            required
            placeholder="AAPL-W1"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Ticker
          </label>
          <input
            type="text"
            className="input"
            value={formData.ticker}
            onChange={e => onChange("ticker", e.target.value)}
            required
            placeholder="AAPL"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Trade Date
          </label>
          <input
            type="date"
            className="input"
            value={formData.trade_date}
            onChange={e => onChange("trade_date", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Call/Put
          </label>
          <input
            type="text"
            className="input"
            value={formData.call_put}
            onChange={e => onChange("call_put", e.target.value)}
            placeholder="put/call"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Sell Put Fields */}
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Sell Put Strike Price
          </label>
          <input
            type="number"
            className="input"
            value={formData.sell_put_strike_price}
            onChange={e => onChange("sell_put_strike_price", e.target.value)}
            step="0.01"
            min="0"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Sell Put Open Premium
          </label>
          <input
            type="number"
            className="input"
            value={formData.sell_put_open_premium}
            onChange={e => onChange("sell_put_open_premium", e.target.value)}
            step="0.01"
            min="0"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Sell Put Closed Premium
          </label>
          <input
            type="number"
            className="input"
            value={formData.sell_put_closed_premium}
            onChange={e => onChange("sell_put_closed_premium", e.target.value)}
            step="0.01"
            min="0"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Sell Put Status
          </label>
          <input
            type="text"
            className="input"
            value={formData.sell_put_status}
            onChange={e => onChange("sell_put_status", e.target.value)}
            placeholder="Closed/Open"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Sell Put Quantity
          </label>
          <input
            type="number"
            className="input"
            value={formData.sell_put_quantity}
            onChange={e => onChange("sell_put_quantity", e.target.value)}
            min="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Assignment Fields */}
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Assignment Strike Price
          </label>
          <input
            type="number"
            className="input"
            value={formData.assignment_strike_price}
            onChange={e => onChange("assignment_strike_price", e.target.value)}
            step="0.01"
            min="0"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Assignment Shares Quantity
          </label>
          <input
            type="number"
            className="input"
            value={formData.assignment_shares_quantity}
            onChange={e => onChange("assignment_shares_quantity", e.target.value)}
            min="0"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Assignment Status
          </label>
          <input
            type="text"
            className="input"
            value={formData.assignment_status}
            onChange={e => onChange("assignment_status", e.target.value)}
            placeholder="Closed/Open"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Sell Call Fields */}
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Sell Call Strike Price
          </label>
          <input
            type="number"
            className="input"
            value={formData.sell_call_strike_price}
            onChange={e => onChange("sell_call_strike_price", e.target.value)}
            step="0.01"
            min="0"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Sell Call Open Premium
          </label>
          <input
            type="number"
            className="input"
            value={formData.sell_call_open_premium}
            onChange={e => onChange("sell_call_open_premium", e.target.value)}
            step="0.01"
            min="0"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Sell Call Closed Premium
          </label>
          <input
            type="number"
            className="input"
            value={formData.sell_call_closed_premium}
            onChange={e => onChange("sell_call_closed_premium", e.target.value)}
            step="0.01"
            min="0"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Sell Call Status
          </label>
          <input
            type="text"
            className="input"
            value={formData.sell_call_status}
            onChange={e => onChange("sell_call_status", e.target.value)}
            placeholder="Closed/Open"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Sell Call Quantity
          </label>
          <input
            type="number"
            className="input"
            value={formData.sell_call_quantity}
            onChange={e => onChange("sell_call_quantity", e.target.value)}
            min="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Called Away Fields */}
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Called Away Strike Price
          </label>
          <input
            type="number"
            className="input"
            value={formData.called_away_strike_price}
            onChange={e => onChange("called_away_strike_price", e.target.value)}
            step="0.01"
            min="0"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Called Away Shares Quantity
          </label>
          <input
            type="number"
            className="input"
            value={formData.called_away_shares_quantity}
            onChange={e => onChange("called_away_shares_quantity", e.target.value)}
            min="0"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Called Away Status
          </label>
          <input
            type="text"
            className="input"
            value={formData.called_away_status}
            onChange={e => onChange("called_away_status", e.target.value)}
            placeholder="Closed/Open"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-slate-900 text-white">
          {editingWheel ? "Update" : "Add"}
        </Button>
      </div>
    </form>
  );
}