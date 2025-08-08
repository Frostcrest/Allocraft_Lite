import React, { useState, useEffect } from 'react';
import { fetchFromAPI } from "@/api/fastapiClient";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import WheelForm from "@/components/forms/WheelForm";
import { Plus, Edit, RotateCcw, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, calculateWheelTotal } from "@/lib/utils";

const initialFormData = {
  wheel_id: '',
  ticker: '',
  trade_date: new Date().toISOString().split('T')[0],
  call_put: '',
  sell_put_strike_price: '',
  sell_put_open_premium: '',
  sell_put_closed_premium: '',
  sell_put_status: '',
  sell_put_quantity: '',
  assignment_strike_price: '',
  assignment_shares_quantity: '',
  assignment_status: '',
  sell_call_strike_price: '',
  sell_call_open_premium: '',
  sell_call_closed_premium: '',
  sell_call_status: '',
  sell_call_quantity: '',
  called_away_strike_price: '',
  called_away_shares_quantity: '',
  called_away_status: ''
};

export default function Wheels() {
  const [wheels, setWheels] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingWheel, setEditingWheel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    loadWheels();
  }, []);

  const loadWheels = async () => {
    try {
      const data = await fetchFromAPI('/wheels/?ordering=-created_date');
      setWheels(data);
    } catch (error) {
      console.error('Error loading wheels:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingWheel(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Prepare data for API
    const wheelData = {
      ...formData,
      sell_put_strike_price: formData.sell_put_strike_price ? parseFloat(formData.sell_put_strike_price) : null,
      sell_put_open_premium: formData.sell_put_open_premium ? parseFloat(formData.sell_put_open_premium) : null,
      sell_put_closed_premium: formData.sell_put_closed_premium ? parseFloat(formData.sell_put_closed_premium) : null,
      sell_put_quantity: formData.sell_put_quantity ? parseInt(formData.sell_put_quantity) : null,
      assignment_strike_price: formData.assignment_strike_price ? parseFloat(formData.assignment_strike_price) : null,
      assignment_shares_quantity: formData.assignment_shares_quantity ? parseInt(formData.assignment_shares_quantity) : null,
      sell_call_strike_price: formData.sell_call_strike_price ? parseFloat(formData.sell_call_strike_price) : null,
      sell_call_open_premium: formData.sell_call_open_premium ? parseFloat(formData.sell_call_open_premium) : null,
      sell_call_closed_premium: formData.sell_call_closed_premium ? parseFloat(formData.sell_call_closed_premium) : null,
      sell_call_quantity: formData.sell_call_quantity ? parseInt(formData.sell_call_quantity) : null,
      called_away_strike_price: formData.called_away_strike_price ? parseFloat(formData.called_away_strike_price) : null,
      called_away_shares_quantity: formData.called_away_shares_quantity ? parseInt(formData.called_away_shares_quantity) : null,
    };

    try {
      // Backend model doesn't have call_put; omit it if empty
      const payload = { ...wheelData };
      delete payload.call_put;
      if (editingWheel) {
        await fetchFromAPI(`/wheels/${editingWheel.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await fetchFromAPI('/wheels/', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      loadWheels();
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error saving wheel:', error);
    }
  };

  const handleEdit = (wheel) => {
    setEditingWheel(wheel);
    setFormData({
      wheel_id: wheel.wheel_id ?? '',
      ticker: wheel.ticker ?? '',
      trade_date: wheel.trade_date ?? new Date().toISOString().split('T')[0],
      call_put: wheel.call_put ?? '',
      sell_put_strike_price: wheel.sell_put_strike_price ?? '',
      sell_put_open_premium: wheel.sell_put_open_premium ?? '',
      sell_put_closed_premium: wheel.sell_put_closed_premium ?? '',
      sell_put_status: wheel.sell_put_status ?? '',
      sell_put_quantity: wheel.sell_put_quantity ?? '',
      assignment_strike_price: wheel.assignment_strike_price ?? '',
      assignment_shares_quantity: wheel.assignment_shares_quantity ?? '',
      assignment_status: wheel.assignment_status ?? '',
      sell_call_strike_price: wheel.sell_call_strike_price ?? '',
      sell_call_open_premium: wheel.sell_call_open_premium ?? '',
      sell_call_closed_premium: wheel.sell_call_closed_premium ?? '',
      sell_call_status: wheel.sell_call_status ?? '',
      sell_call_quantity: wheel.sell_call_quantity ?? '',
      called_away_strike_price: wheel.called_away_strike_price ?? '',
      called_away_shares_quantity: wheel.called_away_shares_quantity ?? '',
      called_away_status: wheel.called_away_status ?? ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this wheel trade?')) {
      try {
        await fetchFromAPI(`/wheels/${id}`, { method: 'DELETE' });
        loadWheels();
      } catch (error) {
        console.error('Error deleting wheel:', error);
      }
    }
  };

  const groupedWheels = wheels.reduce((acc, wheel) => {
    if (!acc[wheel.wheel_id]) {
      acc[wheel.wheel_id] = [];
    }
    acc[wheel.wheel_id].push(wheel);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-64"></div>
            <div className="h-96 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Wheel Strategies</h1>
            <p className="text-slate-600 mt-2">
              Cash-secured puts and covered calls
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-slate-900 hover:bg-slate-800 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Trade
          </Button>
        </div>

        {Object.keys(groupedWheels).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedWheels).map(([wheelId, wheelTrades]) => (
              <Card key={wheelId} className="border-0 shadow-lg bg-white/80 backdrop-blur-xl">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl font-bold text-slate-900">
                      Wheel Strategy: {wheelId}
                    </CardTitle>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Total Premium</p>
                      <p className="text-lg font-bold text-emerald-600">
                        {formatCurrency(
                          wheelTrades.reduce(
                            (sum, t) =>
                              sum +
                              (parseFloat(t.sell_put_open_premium) || 0) +
                              (parseFloat(t.sell_call_open_premium) || 0),
                            0
                          )
                        )}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {wheelTrades.map((trade) => (
                      <div
                        key={trade.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-slate-50/60 hover:bg-slate-50 transition-colors"
                        style={{ background: "#fcfdfe" }}
                      >
                        <div className="flex flex-row justify-between w-full items-stretch gap-0">
                          {/* Sell Put */}
                          <div className="flex flex-col items-center flex-1 min-w-0">
                            <span className="font-semibold text-slate-800 mb-2">Sell Put</span>
                            <svg width="100%" height="24" viewBox="0 0 120 24" className="mb-2" style={{ maxWidth: 120 }}>
                              <polygon points="0,12 110,12 110,4 120,12 110,20 110,12 0,12" fill="#e2e8f0" />
                            </svg>
                            <div className="text-center">
                              <span>Strike: {trade.sell_put_strike_price}</span><br />
                              <span>Open Prem: {trade.sell_put_open_premium}</span><br />
                              <span>Closed Prem: {trade.sell_put_closed_premium}</span><br />
                              <span>Status: {trade.sell_put_status}</span><br />
                              <span>Qty: {trade.sell_put_quantity}</span>
                            </div>
                          </div>
                          {/* Assignment */}
                          <div className="flex flex-col items-center flex-1 min-w-0">
                            <span className="font-semibold text-slate-800 mb-2">Assigned</span>
                            <svg width="100%" height="24" viewBox="0 0 120 24" className="mb-2" style={{ maxWidth: 120 }}>
                              <polygon points="0,12 110,12 110,4 120,12 110,20 110,12 0,12" fill="#e2e8f0" />
                            </svg>
                            <div className="text-center">
                              <span>Strike: {trade.assignment_strike_price}</span><br />
                              <span>Shares: {trade.assignment_shares_quantity}</span><br />
                              <span>Status: {trade.assignment_status}</span>
                            </div>
                          </div>
                          {/* Sell Call */}
                          <div className="flex flex-col items-center flex-1 min-w-0">
                            <span className="font-semibold text-slate-800 mb-2">Sell Call</span>
                            <svg width="100%" height="24" viewBox="0 0 120 24" className="mb-2" style={{ maxWidth: 120 }}>
                              <polygon points="0,12 110,12 110,4 120,12 110,20 110,12 0,12" fill="#e2e8f0" />
                            </svg>
                            <div className="text-center">
                              <span>Strike: {trade.sell_call_strike_price}</span><br />
                              <span>Open Prem: {trade.sell_call_open_premium}</span><br />
                              <span>Closed Prem: {trade.sell_call_closed_premium}</span><br />
                              <span>Status: {trade.sell_call_status}</span><br />
                              <span>Qty: {trade.sell_call_quantity}</span>
                            </div>
                          </div>
                          {/* Called Away */}
                          <div className="flex flex-col items-center flex-1 min-w-0">
                            <span className="font-semibold text-slate-800 mb-2">Called Away</span>
                            <svg width="100%" height="24" viewBox="0 0 120 24" className="mb-2" style={{ maxWidth: 120 }}>
                              <polygon points="0,12 110,12 110,4 120,12 110,20 110,12 0,12" fill="#e2e8f0" />
                            </svg>
                            <div className="text-center">
                              <span>Strike: {trade.called_away_strike_price}</span><br />
                              <span>Shares: {trade.called_away_shares_quantity}</span><br />
                              <span>Status: {trade.called_away_status}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(trade)}
                            className="hover:bg-slate-100"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(trade.id)}
                            className="hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <RotateCcw className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No wheel strategies yet</h3>
            <p className="text-slate-500 mb-6">Start tracking your cash-secured puts and covered calls</p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-slate-900 hover:bg-slate-800"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Trade
            </Button>
          </div>
        )}

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900">
                {editingWheel ? "Edit Wheel Trade" : "Add Wheel Trade"}
              </DialogTitle>
            </DialogHeader>
            <WheelForm
              formData={formData}
              editingWheel={editingWheel}
              onChange={(field, value) =>
                setFormData((prev) => ({ ...prev, [field]: value }))
              }
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}