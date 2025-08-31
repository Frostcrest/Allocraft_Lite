import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, RotateCcw, Target } from "lucide-react";
import { useWheelCycles } from "@/api/enhancedClient";
import WheelBuilder from "@/components/WheelBuilder";

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
  const [showWheelBuilder, setShowWheelBuilder] = useState(false);

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
            <Button 
              onClick={() => setShowWheelBuilder(true)}
              className="bg-blue-600 hover:bg-blue-700 shadow-lg"
            >
              <Target className="w-5 h-5 mr-2" /> Build from Positions
            </Button>
            <Button className="bg-slate-900 hover:bg-slate-800 shadow-lg">
              <Plus className="w-5 h-5 mr-2" /> New Ticker
            </Button>
          </div>
        </div>

        <div className="text-center py-12">
          {tickers.length === 0 ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <Target className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No wheel cycles found</h3>
              <p className="text-slate-500 mb-6">Click "Build from Positions" to analyze your Schwab account for wheel opportunities, or create a wheel cycle manually.</p>
              <Button 
                onClick={() => setShowWheelBuilder(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Target className="w-5 h-5 mr-2" /> Analyze Positions for Wheels
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <RotateCcw className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">Wheel Cycles Active</h3>
              <p className="text-slate-500 mb-6">Found {tickers.length} tickers with wheel cycles: {tickers.join(', ')}</p>
              <p className="text-slate-500 mb-4">Use "Build from Positions" to find new wheel opportunities from your current holdings.</p>
              <Button 
                onClick={() => setShowWheelBuilder(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Target className="w-5 h-5 mr-2" /> Find More Opportunities
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Wheel Builder Modal */}
      {showWheelBuilder && (
        <WheelBuilder 
          onClose={() => setShowWheelBuilder(false)}
          onWheelCreated={(wheelData) => {
            console.log('Wheel successfully created:', wheelData);
            // Only close modal when wheel is actually created, not just selected
            setShowWheelBuilder(false);
            // TODO: Refresh wheel cycles data to show the new wheel
          }}
        />
      )}
    </div>
  );
}
