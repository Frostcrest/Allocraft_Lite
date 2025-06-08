import React, { useState, useEffect } from "react";
import { fetchFromAPI } from "@/api/fastapiClient";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Target, RefreshCcw, Check } from 'lucide-react';
import { format } from 'date-fns';
import OptionForm from "@/components/forms/OptionForm";
import { formatCurrency } from "@/lib/utils"; // <-- Add this import

export default function Options() {
  const [options, setOptions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expiryDates, setExpiryDates] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshDone, setRefreshDone] = useState(false);

  const [formData, setFormData] = useState({
    ticker: '',
    option_type: 'Call',
    strike_price: '',
    expiry_date: '',
    contracts: '',
    cost: '',
    status: 'Open'
  });

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    async function loadExpiryDates() {
      if (!formData.ticker) {
        setExpiryDates([]);
        return;
      }
      try {
        const dates = await fetchFromAPI(`/option_expiries/${formData.ticker}`);
        setExpiryDates(dates);
      } catch (error) {
        console.error("Error fetching expiry dates:", error);
        setExpiryDates([]);
      }
    }
    loadExpiryDates();
  }, [formData.ticker]);

  const loadOptions = async () => {
    try {
      const data = await fetchFromAPI('/options/');
      setOptions(data);
    } catch (error) {
      console.error('Error loading options:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      ticker: '',
      option_type: 'Call',
      strike_price: '',
      expiry_date: '',
      contracts: '',
      cost: '',
      status: 'Open'
    });
    setEditingOption(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const optionData = {
        ...formData,
        strike_price: parseFloat(formData.strike_price),
        contracts: parseFloat(formData.contracts),
        cost: parseFloat(formData.cost),
      };

      if (editingOption) {
        // FIX: Use editingOption.id instead of optionId
        await fetchFromAPI(`/options/${editingOption.id}/`, { method: 'PUT', body: JSON.stringify(optionData) });
      } else {
        await fetchFromAPI('/options/', { method: 'POST', body: JSON.stringify(optionData) });
      }

      loadOptions();
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error saving option:', error);
    }
  };

  const handleEdit = (option) => {
    setEditingOption(option);
    setFormData({
      ticker: option.ticker ?? '',
      option_type: option.option_type ?? 'Call',
      strike_price: option.strike_price !== undefined && option.strike_price !== null ? option.strike_price.toString() : '',
      expiry_date: option.expiry_date ?? '',
      contracts: option.contracts !== undefined && option.contracts !== null ? option.contracts.toString() : '',
      // Prefer cost, fallback to cost_basis
      cost: option.cost !== undefined && option.cost !== null
        ? option.cost.toString()
        : (option.cost_basis !== undefined && option.cost_basis !== null
          ? option.cost_basis.toString()
          : ''),
      status: option.status ?? 'Open'
    });
    setShowForm(true);
  };

  const handleDelete = async (optionId) => {
    if (window.confirm('Are you sure you want to delete this option?')) {
      try {
        await fetchFromAPI(`/options/${optionId}/`, { method: 'DELETE' });
        loadOptions();
      } catch (error) {
        console.error('Error deleting option:', error);
      }
    }
  };

  const handleRefreshPrices = async () => {
    setRefreshing(true);
    setRefreshDone(false);
    try {
      await fetchFromAPI('/options/refresh_prices/', { method: 'GET' });
      await loadOptions();
      setRefreshing(false);
      setRefreshDone(true);
      setTimeout(() => setRefreshDone(false), 5000);
    } catch (error) {
      setRefreshing(false);
      setRefreshDone(false);
      // Optionally show error toast
    }
  };

  const calculateTotalValue = () => {
    return options
      .filter(option => option.status === 'Open' && option.market_price_per_contract)
      .reduce((total, option) => total + (option.contracts * option.market_price_per_contract), 0);
  };

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
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Options Contracts</h1>
            <p className="text-slate-600 mt-2">
              Calls and puts portfolio • Total Value: {formatCurrency(calculateTotalValue())}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              onClick={handleRefreshPrices}
              className="bg-slate-900 hover:bg-slate-800 shadow-lg flex items-center gap-2"
              disabled={refreshing}
              title="Refresh Prices"
            >
              {refreshing ? (
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l5-5-5-5v4A12 12 0 002 12h2z" />
                </svg>
              ) : refreshDone ? (
                <Check className="w-5 h-5 text-emerald-500 transition-opacity duration-500" />
              ) : (
                <RefreshCcw className="w-5 h-5" />
              )}
              <span>Refresh Prices</span>
            </Button>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-slate-900 hover:bg-slate-800 shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Option
            </Button>
          </div>
        </div>

        {options.length > 0 ? (
          <div className="rounded-xl border border-slate-200/60 overflow-hidden bg-white/80 backdrop-blur-xl">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="font-semibold text-slate-700">Ticker</TableHead>
                  <TableHead className="font-semibold text-slate-700">Type</TableHead>
                  <TableHead className="font-semibold text-slate-700">Strike</TableHead>
                  <TableHead className="font-semibold text-slate-700">Expiry</TableHead>
                  <TableHead className="font-semibold text-slate-700">Contracts</TableHead>
                  <TableHead className="font-semibold text-slate-700">Cost Basis</TableHead>
                  <TableHead className="font-semibold text-slate-700">Total Cost</TableHead>
                  <TableHead className="font-semibold text-slate-700">Current Price</TableHead>
                  <TableHead className="font-semibold text-slate-700">Net Liquidity</TableHead>
                  <TableHead className="font-semibold text-slate-700">P/L</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {options.map((option) => {
                  const totalCost = option.cost_basis !== null && option.cost_basis !== undefined
                    ? option.contracts * option.cost_basis * 100
                    : null;

                  const netLiquidity = option.current_price !== null && option.current_price !== undefined
                    ? option.contracts * option.current_price * 100
                    : null;

                  // P/L is now Net Liquidity - Total Cost
                  const pl = netLiquidity !== null && totalCost !== null
                    ? netLiquidity - totalCost
                    : null;

                  return (
                    <TableRow key={option.id} className="hover:bg-slate-50/40 transition-colors">
                      <TableCell className="font-semibold text-slate-900">{option.ticker}</TableCell>
                      <TableCell>
                        <Badge variant={option.option_type === 'Call' ? 'default' : 'secondary'}>
                          {option.option_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(option.strike_price)}</TableCell>
                      <TableCell>{format(new Date(option.expiry_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{option.contracts}</TableCell>
                      <TableCell>
                        {option.cost_basis !== null && option.cost_basis !== undefined
                          ? formatCurrency(option.cost_basis)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {option.cost_basis !== null && option.cost_basis !== undefined
                          ? formatCurrency(totalCost)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {option.market_price_per_contract !== null && option.market_price_per_contract !== undefined
                          ? formatCurrency(option.market_price_per_contract)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {netLiquidity !== null
                          ? formatCurrency(netLiquidity)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {pl !== null ? (
                          <span className={pl >= 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                            {formatCurrency(pl)}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={option.status === 'Open' ? 'default' : 'secondary'}>
                          {option.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(option)}
                            className="hover:bg-slate-100"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(option.id)}
                            className="hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            title="AI Analysis (coming soon)"
                            disabled
                            className="ml-2"
                          >
                            <span role="img" aria-label="AI">🤖</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <Target className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No options contracts yet</h3>
            <p className="text-slate-500 mb-6">Track your calls and puts</p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-slate-900 hover:bg-slate-800"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Option
            </Button>
          </div>
        )}

        <Dialog open={showForm} onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            resetForm();
          }
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900">
                {editingOption ? 'Edit Option Contract' : 'Add Option Contract'}
              </DialogTitle>
            </DialogHeader>
            <OptionForm
              formData={formData}
              expiryDates={expiryDates}
              editingOption={editingOption}
              onChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}