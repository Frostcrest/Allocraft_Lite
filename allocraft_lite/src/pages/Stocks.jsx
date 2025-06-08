import React, { useState, useEffect } from "react";
import { fetchFromAPI } from "@/api/fastapiClient";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import StockForm from "../components/forms/StockForm";
import StockTable from "../components/tables/StockTable";
import { formatCurrency } from "@/lib/utils"; // <-- Add this import

export default function Stocks() {
  const [stocks, setStocks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStocks();
  }, []);

  const loadStocks = async () => {
    try {
      const data = await fetchFromAPI("/stocks/");
      setStocks(data);
    } catch (error) {
      console.error("Error loading stocks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (stockData) => {
    try {
      if (editingStock) {
        await fetchFromAPI(
          `/stocks/${stockId}/`,
          { method: "PUT", body: JSON.stringify(stockData) }
        );
      } else {
        await fetchFromAPI(
          "/stocks/",
          { method: "POST", body: JSON.stringify(stockData) }
        );
      }
      loadStocks();
      setShowForm(false);
      setEditingStock(null);
    } catch (error) {
      console.error("Error saving stock:", error);
    }
  };

  const handleEdit = (stock) => {
    setEditingStock(stock);
    setShowForm(true);
  };

  const handleDelete = async (stockId) => {
    if (window.confirm("Are you sure you want to delete this stock position?")) {
      try {
        await fetchFromAPI(`/stocks/${stockId}/`, { method: "DELETE" });
        loadStocks();
      } catch (error) {
        console.error("Error deleting stock:", error);
      }
    }
  };

  const calculateTotalValue = () => {
    return stocks
      .filter((stock) => stock.status === "Open" && stock.current_price)
      .reduce(
        (total, stock) => total + stock.shares * stock.current_price,
        0
      );
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
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
              Stock Positions
            </h1>
            <p className="text-slate-600 mt-2">
              Manage your equity holdings • Total Value:{" "}
              {formatCurrency(calculateTotalValue())}
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-slate-900 hover:bg-slate-800 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Position
          </Button>
        </div>

        {stocks.length > 0 ? (
          <StockTable stocks={stocks} onEdit={handleEdit} onDelete={handleDelete} />
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <Plus className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No stock positions yet
            </h3>
            <p className="text-slate-500 mb-6">
              Start building your portfolio by adding your first stock position
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-slate-900 hover:bg-slate-800"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Position
            </Button>
          </div>
        )}

        <StockForm
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingStock(null);
          }}
          onSubmit={handleSubmit}
          stock={editingStock}
        />
      </div>
    </div>
  );
}