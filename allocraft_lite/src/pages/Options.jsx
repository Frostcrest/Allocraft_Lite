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

  // React Query hooks
  const {
    data: options = [],
    isLoading,
    error,
    refetch
  } = useOptions();

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

  const handleSubmit = async (optionData) => {
    try {
      if (editingOption) {
        await updateOptionMutation.mutateAsync({ id: editingOption.id, data: optionData });
      } else {
        await createOptionMutation.mutateAsync(optionData);
      }
      setShowForm(false);
      setEditingOption(null);
    } catch (error) {
      console.error("Error saving option:", error);
      // Error handling is managed by React Query
    }
  };

  const handleEdit = (option) => {
    setEditingOption(option);
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
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingOption(null);
  };

  const calculateTotalValue = () => {
    return options
      .filter((option) => option.status === "Open" && option.current_price)
      .reduce(
        (total, option) => total + option.contracts * option.current_price * 100,
        0
      );
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'Open': 'bg-green-100 text-green-800',
      'Closed': 'bg-gray-100 text-gray-800',
      'Expired': 'bg-red-100 text-red-800',
      'Assigned': 'bg-blue-100 text-blue-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatExpiryDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
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

          {options.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold text-slate-700">Ticker</TableHead>
                    <TableHead className="font-semibold text-slate-700">Type</TableHead>
                    <TableHead className="font-semibold text-slate-700">Strike</TableHead>
                    <TableHead className="font-semibold text-slate-700">Expiry</TableHead>
                    <TableHead className="font-semibold text-slate-700">Contracts</TableHead>
                    <TableHead className="font-semibold text-slate-700">Cost Basis</TableHead>
                    <TableHead className="font-semibold text-slate-700">Current Price</TableHead>
                    <TableHead className="font-semibold text-slate-700">P&L</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="font-semibold text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {options.map((option) => {
                    const pl = option.current_price && option.cost_basis
                      ? (option.current_price - option.cost_basis) * option.contracts * 100
                      : 0;

                    return (
                      <TableRow key={option.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium text-slate-900">
                          {option.ticker}
                        </TableCell>
                        <TableCell>
                          <Badge variant={option.option_type === 'Call' ? 'default' : 'secondary'}>
                            {option.option_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(option.strike_price)}</TableCell>
                        <TableCell>{formatExpiryDate(option.expiry_date)}</TableCell>
                        <TableCell>{option.contracts}</TableCell>
                        <TableCell>{formatCurrency(option.cost_basis)}</TableCell>
                        <TableCell>
                          {option.current_price ? formatCurrency(option.current_price) : 'N/A'}
                        </TableCell>
                        <TableCell className={pl >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(pl)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(option.status)}>
                            {option.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleEdit(option)}
                              disabled={isMutating}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(option.id)}
                              disabled={isMutating}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
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
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No options positions yet
              </h3>
              <p className="text-slate-500 mb-6">
                Start trading options by adding your first position
              </p>
              <Button
                onClick={handleAddNew}
                disabled={isMutating}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Your First Option
              </Button>
            </div>
          )}

          <OptionForm
            isOpen={showForm}
            onClose={handleCancel}
            onSubmit={handleSubmit}
            option={editingOption}
            disabled={isMutating}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}
