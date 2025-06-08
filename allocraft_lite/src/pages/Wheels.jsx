import React, { useState, useEffect } from 'react';
import { fetchFromAPI } from "@/api/fastapiClient";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import WheelForm from "@/components/forms/WheelForm";
import { Plus, Edit, RotateCcw, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, calculateWheelTotal } from "@/lib/utils"; // <-- Add this import

export default function Wheels() {
  const [wheels, setWheels] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingWheel, setEditingWheel] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    wheel_id: '',
    ticker: '',
    trade_type: 'Sell Put',
    trade_date: new Date().toISOString().split('T')[0],
    strike_price: '',
    premium_received: '',
    status: 'Active'
  });

  useEffect(() => {
    loadWheels();
  }, []);

  const loadWheels = async () => {
    try {
      // Updated to use fetchFromAPI
      const data = await fetchFromAPI('/wheels/?ordering=-created_date');
      setWheels(data);
    } catch (error) {
      console.error('Error loading wheels:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      wheel_id: '',
      ticker: '',
      trade_type: 'Sell Put',
      trade_date: new Date().toISOString().split('T')[0],
      strike_price: '',
      premium_received: '',
      status: 'Active'
    });
    setEditingWheel(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const wheelData = {
        ...formData,
        strike_price: formData.strike_price ? parseFloat(formData.strike_price) : null,
        premium_received: formData.premium_received ? parseFloat(formData.premium_received) : null
      };

      if (editingWheel) {
        // Update
        await fetchFromAPI(`/wheels/${editingWheel.id}/`, {
          method: 'PUT',
          body: JSON.stringify(wheelData)
        });
      } else {
        // Create
        await fetchFromAPI('/wheels/', {
          method: 'POST',
          body: JSON.stringify(wheelData)
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
      trade_type: wheel.trade_type ?? 'Sell Put',
      trade_date: wheel.trade_date ?? new Date().toISOString().split('T')[0],
      strike_price: wheel.strike_price !== undefined && wheel.strike_price !== null ? wheel.strike_price.toString() : '',
      premium_received: wheel.premium_received !== undefined && wheel.premium_received !== null ? wheel.premium_received.toString() : '',
      status: wheel.status ?? 'Active'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this wheel trade?')) {
      try {
        await fetchFromAPI(`/wheels/${id}/`, { method: 'DELETE' });
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
                        {formatCurrency(calculateWheelTotal(wheelTrades))}
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
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            <Badge variant={trade.trade_type === 'Sell Put' ? 'default' : 'secondary'}>
                              {trade.trade_type}
                            </Badge>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{trade.ticker}</p>
                            <p className="text-sm text-slate-500">
                              {format(new Date(trade.trade_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                          {trade.strike_price && (
                            <div>
                              <p className="text-sm text-slate-500">Strike</p>
                              <p className="font-medium">{formatCurrency(trade.strike_price)}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-slate-500">Premium</p>
                            <p className="font-semibold text-emerald-600">
                              {formatCurrency(trade.premium_received)}
                            </p>
                          </div>
                          <Badge variant={trade.status === 'Active' ? 'default' : 'secondary'}>
                            {trade.status}
                          </Badge>
                          <div className="flex gap-2">
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