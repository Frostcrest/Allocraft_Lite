import React from "react";
import { Button } from "@/components/ui/button";

const eventTypes = [
    { value: "BUY_SHARES", label: "Buy Shares" },
    { value: "SELL_SHARES", label: "Sell Shares" },
    { value: "SELL_PUT_OPEN", label: "Sell Put (Open)" },
    { value: "SELL_PUT_CLOSE", label: "Buy to Close Put" },
    { value: "ASSIGNMENT", label: "Assigned Shares" },
    { value: "SELL_CALL_OPEN", label: "Sell Call (Open)" },
    { value: "SELL_CALL_CLOSE", label: "Buy to Close Call" },
    { value: "CALLED_AWAY", label: "Called Away" },
];

export default function WheelEventForm({ form, onChange, onCancel, onSubmit, editing }) {
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-slate-700">Event Type</label>
                    <select className="input" value={form.event_type} onChange={(e) => onChange("event_type", e.target.value)} required>
                        <option value="">Select event</option>
                        {eventTypes.map((e) => (
                            <option key={e.value} value={e.value}>{e.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-700">Trade Date</label>
                    <input type="date" className="input" value={form.trade_date} onChange={(e) => onChange("trade_date", e.target.value)} />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="block text-xs font-medium text-slate-700">Shares Qty</label>
                    <input type="number" step="0.000001" className="input" value={form.quantity_shares || ""} onChange={(e) => onChange("quantity_shares", e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-700">Contracts</label>
                    <input type="number" className="input" value={form.contracts || ""} onChange={(e) => onChange("contracts", e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-700">Price</label>
                    <input type="number" step="0.01" className="input" value={form.price || ""} onChange={(e) => onChange("price", e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-700">Strike</label>
                    <input type="number" step="0.01" className="input" value={form.strike || ""} onChange={(e) => onChange("strike", e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-700">Premium (per contract)</label>
                    <input type="number" step="0.01" className="input" value={form.premium || ""} onChange={(e) => onChange("premium", e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-700">Fees</label>
                    <input type="number" step="0.01" className="input" value={form.fees || ""} onChange={(e) => onChange("fees", e.target.value)} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-slate-700">Linked Event ID</label>
                    <input type="number" className="input" value={form.link_event_id || ""} onChange={(e) => onChange("link_event_id", e.target.value)} placeholder="Optional" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-700">Notes</label>
                    <input type="text" className="input" value={form.notes || ""} onChange={(e) => onChange("notes", e.target.value)} />
                </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit" className="bg-slate-900 text-white">{editing ? "Update" : "Add Event"}</Button>
            </div>
        </form>
    );
}
