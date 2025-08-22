import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import StockForm from "@/components/forms/StockForm";
import StockTable from "@/components/tables/StockTable";
import { formatCurrency } from "@/lib/utils";
import { useStocks, useCreateStock, useUpdateStock, useDeleteStock } from "@/api/enhancedClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Stock, ApiError } from "@/types";
import SchwabIntegration from "@/components/SchwabIntegration";
import SchwabConfigTest from "@/components/SchwabConfigTest";

// Error display component
interface ErrorDisplayProps {
  error: ApiError | Error | null;
  onRetry?: () => void;
}

const ErrorDisplay = ({ error, onRetry }: ErrorDisplayProps) => (
  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
    <h3 className="text-red-800 font-medium">Error loading stocks</h3>
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
    <p className="text-gray-600 mt-2">Loading stocks...</p>
  </div>
);

interface StockFormData {
  ticker: string;
  name: string;
  shares: number;
  avg_cost: number;
  sector?: string;
}

export default function Stocks() {
  const [showForm, setShowForm] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);

  // React Query hooks
  const { 
    data: stocks = [], 
    isLoading, 
    error,
    refetch 
  } = useStocks();

  const createStockMutation = useCreateStock();
  const updateStockMutation = useUpdateStock();
  const deleteStockMutation = useDeleteStock();

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Stocks</h1>
        </div>
        <LoadingDisplay />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Stocks</h1>
        </div>
        <ErrorDisplay error={error} onRetry={refetch} />
      </div>
    );
  }

  const handleSubmit = async (stockData: StockFormData) => {
    try {
      if (editingStock) {
        await updateStockMutation.mutateAsync({ id: editingStock.id, data: stockData });
      } else {
        await createStockMutation.mutateAsync(stockData);
      }
      setShowForm(false);
      setEditingStock(null);
    } catch (error) {
      console.error("Error saving stock:", error);
      // Error handling is managed by React Query
    }
  };

  const handleEdit = (stock: Stock) => {
    setEditingStock(stock);
    setShowForm(true);
  };

  const handleDelete = async (stockId: number) => {
    if (window.confirm("Are you sure you want to delete this stock position?")) {
      try {
        await deleteStockMutation.mutateAsync(stockId);
      } catch (error) {
        console.error("Error deleting stock:", error);
        // Error handling is managed by React Query
      }
    }
  };

  const handleAddNew = () => {
    setEditingStock(null);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingStock(null);
  };

  // Check for mutation loading states
  const isMutating = createStockMutation.isPending || updateStockMutation.isPending || deleteStockMutation.isPending;

  const calculateTotalValue = () => {
    return stocks
      .filter((stock) => stock.current_price !== null && stock.current_price !== undefined)
      .reduce(
        (total, stock) => total + stock.shares * (stock.current_price || 0),
        0
      );
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Page Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
                Stock Positions
              </h1>
              <p className="text-slate-600 mt-2">
                Manage your equity holdings • Total Value:{" "}
                {formatCurrency(calculateTotalValue())}
              </p>
              {isMutating && (
                <p className="text-blue-600 text-sm mt-1">
                  Processing changes...
                </p>
              )}
            </div>
            <Button
              onClick={handleAddNew}
              disabled={isMutating}
              className="bg-slate-900 hover:bg-slate-800 shadow-lg disabled:opacity-50"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Position
            </Button>
          </div>

          {/* Schwab Integration Section */}
          <SchwabIntegration />

          {/* Schwab Configuration Test */}
          <SchwabConfigTest />

          {/* Manual Stocks Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Manual Positions</h2>
              <p className="text-gray-600 text-sm mt-1">
                Manually tracked stock positions
              </p>
            </div>
            {stocks.length > 0 ? (
              <StockTable 
                stocks={stocks} 
                onEdit={handleEdit} 
                onDelete={handleDelete}
                disabled={isMutating}
              />
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                  <Plus className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  No manual positions yet
                </h3>
                <p className="text-slate-500 mb-6">
                  Add stock positions manually or connect your Schwab account above
                </p>
                <Button
                  onClick={handleAddNew}
                  disabled={isMutating}
                  className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Manual Position
                </Button>
              </div>
            )}
          </div>

          <StockForm
            isOpen={showForm}
            onClose={handleCancel}
            onSubmit={handleSubmit}
            stock={editingStock}
            disabled={isMutating}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}