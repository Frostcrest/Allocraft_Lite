import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, RotateCcw } from "lucide-react";
import { useWheelCycles } from "@/api/enhancedClient";

// Gradually restoring Wheels component - Step 1: Basic data fetching
export default function Wheels() {
  console.log('Wheels component rendering...');

  // Step 1: Add back basic React Query data fetching
  const {
    data: cycles = [],
    isLoading: cyclesLoading,
    error: cyclesError
  } = useWheelCycles();

  const [selectedTicker, setSelectedTicker] = useState(null);

  // Simple computed values without complex useEffect
  const tickers = Array.from(new Set(cycles.map(c => c.ticker))).sort();
  const loading = cyclesLoading;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <RotateCcw className="w-8 h-8 text-slate-400 animate-spin" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">Loading wheels data...</h3>
          </div>
        </div>
      </div>
    );
  }

  if (cyclesError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-red-600 mb-2">Error loading wheels data</h3>
            <p className="text-slate-500">{cyclesError.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Wheels by Ticker</h1>
            <p className="text-slate-600 mt-2">All lots and events are grouped by ticker</p>
          </div>
          <div className="flex gap-2">
            <Button className="bg-slate-900 hover:bg-slate-800 shadow-lg">
              <Plus className="w-5 h-5 mr-2" /> New Ticker
            </Button>
          </div>
        </div>

        <div className="text-center py-12">
          {tickers.length === 0 ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <RotateCcw className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No wheel cycles found</h3>
              <p className="text-slate-500 mb-6">Create your first wheel cycle to get started.</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <RotateCcw className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">Step 1: Basic data loading complete</h3>
              <p className="text-slate-500 mb-6">Found {tickers.length} tickers with wheel cycles: {tickers.join(', ')}</p>
              <p className="text-xs text-gray-400">Navigation working properly. More features will be restored gradually.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
