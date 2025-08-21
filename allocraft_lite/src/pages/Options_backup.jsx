import React, { useState } from "react";
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
import { formatCurrency } from "@/lib/utils";
import { 
  useOptions, 
  useOptionExpiries, 
  useCreateOption, 
  useUpdateOption, 
  useDeleteOption, 
  useRefreshOptionPrices 
} from "@/api/enhancedClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Error display component
const ErrorDisplay = ({ error, onRetry }) => (
  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
    <h3 className="text-red-800 font-medium">Error loading options</h3>
    <p className="text-red-600 text-sm mt-1">{error?.message || 'Something went wrong'}</p>
    {onRetry && (
      <Button onClick={onRetry} variant="outline" size="sm" className="mt-2">
        Try Again
      </Button>
    )}
  </div>
);

// Loading component
const LoadingDisplay = () => (
  <div className="p-4 text-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
    <p className="text-gray-600 mt-2">Loading options...</p>
  </div>
);

export default function Options() {
  const [showForm, setShowForm] = useState(false);
  const [editingOption, setEditingOption] = useState(null);

  const [formData, setFormData] = useState({
    ticker: '',
    option_type: 'Call',
    strike_price: '',
    expiry_date: '',
    contracts: '',
    cost_basis: '',
    status: 'Open'
  });

  // React Query hooks
  const { 
    data: options = [], 
    isLoading, 
    error,
    refetch 
  } = useOptions();

  const { 
    data: expiryDates = [], 
    isLoading: expiryLoading 
  } = useOptionExpiries(formData.ticker);

  const createOptionMutation = useCreateOption();
  const updateOptionMutation = useUpdateOption();
  const deleteOptionMutation = useDeleteOption();
  const refreshPricesMutation = useRefreshOptionPrices();

  // Loading state
  if (isLoading) {
    return (
      <ErrorBoundary>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Options</h1>
          </div>
          <LoadingDisplay />
        </div>
      </ErrorBoundary>
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorBoundary>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Options</h1>
          </div>
          <ErrorDisplay error={error} onRetry={refetch} />
        </div>
      </ErrorBoundary>
    );
  }

  // Check for mutation loading states
  const isMutating = createOptionMutation.isPending || 
                     updateOptionMutation.isPending || 
                     deleteOptionMutation.isPending ||
                     refreshPricesMutation.isPending;

  const resetForm = () => {
    setFormData({
      ticker: '',
      option_type: 'Call',
      strike_price: '',
      expiry_date: '',
      contracts: '',
      cost_basis: '',
      status: 'Open'
    });
    setEditingOption(null);
  };

  const handleSubmit = async (optionData) => {
    try {
      if (editingOption) {
        await updateOptionMutation.mutateAsync({ id: editingOption.id, data: optionData });
      } else {
        await createOptionMutation.mutateAsync(optionData);
      }
      setShowForm(false);
      setEditingOption(null);
      resetForm();
    } catch (error) {
      console.error("Error saving option:", error);
      // Error handling is managed by React Query
    }
  };

  const handleEdit = (option) => {
    setEditingOption(option);
    setFormData({
      ticker: option.ticker || '',
      option_type: option.option_type || 'Call',
      strike_price: option.strike_price || '',
      expiry_date: option.expiry_date || '',
      contracts: option.contracts || '',
      cost_basis: option.cost_basis || '',
      status: option.status || 'Open'
    });
    setShowForm(true);
  };

  const handleDelete = async (optionId) => {
    if (window.confirm("Are you sure you want to delete this option?")) {
      try {
        await deleteOptionMutation.mutateAsync(optionId);
      } catch (error) {
        console.error("Error deleting option:", error);
        // Error handling is managed by React Query
      }
    }
  };

  const handleRefreshPrices = async () => {
    try {
      await refreshPricesMutation.mutateAsync();
    } catch (error) {
      console.error("Error refreshing prices:", error);
      // Error handling is managed by React Query
    }
  };

  const handleAddNew = () => {
    setEditingOption(null);
    resetForm();
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingOption(null);
    resetForm();
  };

  const handleFormFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateTotalValue = () => {
    return options
      .filter((option) => option.status === "Open" && option.current_price)
      .reduce(
        (total, option) => total + option.contracts * option.current_price * 100,
        0
      );
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
                Options Positions
              </h1>
              <p className="text-slate-600 mt-2">
                Manage your options contracts • Total Value:{" "}
                {formatCurrency(calculateTotalValue())}
              </p>
              {isMutating && (
                <p className="text-blue-600 text-sm mt-1">
                  {refreshPricesMutation.isPending ? "Refreshing prices..." : "Processing changes..."}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleRefreshPrices}
                disabled={isMutating}
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
              >
                <RefreshCcw className={`w-4 h-4 mr-2 ${refreshPricesMutation.isPending ? 'animate-spin' : ''}`} />
                Refresh Prices
              </Button>
              <Button
                onClick={handleAddNew}
                disabled={isMutating}
                className="bg-slate-900 hover:bg-slate-800 shadow-lg disabled:opacity-50"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Option
              </Button>
            </div>
          </div>
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