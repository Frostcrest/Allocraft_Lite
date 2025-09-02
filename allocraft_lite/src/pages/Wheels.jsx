import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, RotateCcw, Target, CheckCircle2 } from "lucide-react";
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
  const [createdWheels, setCreatedWheels] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);

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
          {tickers.length === 0 && createdWheels.length === 0 ? (
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
              {tickers.length > 0 && (
                <p className="text-slate-500 mb-4">Found {tickers.length} backend cycles: {tickers.join(', ')}</p>
              )}
              {createdWheels.length > 0 && (
                <p className="text-slate-500 mb-4">Created {createdWheels.length} new wheel{createdWheels.length === 1 ? '' : 's'}: {createdWheels.map(w => w.ticker).join(', ')}</p>
              )}
              <p className="text-slate-500 mb-4">Use "Build from Positions" to find more wheel opportunities from your current holdings.</p>
              <Button
                onClick={() => setShowWheelBuilder(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Target className="w-5 h-5 mr-2" /> Find More Opportunities
              </Button>
            </>
          )}
        </div>

        {/* Show Created Wheels */}
        {createdWheels.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">Recently Created Wheels</h2>
            {createdWheels.map((wheel, index) => (
              <div key={index} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{wheel.ticker}</h3>
                      <p className="text-sm text-slate-600 capitalize">{wheel.strategy.replace('_', ' ')} Strategy</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Created from positions</p>
                    <p className="text-xs text-slate-400">{wheel.positions?.length || 0} positions analyzed</p>
                  </div>
                </div>
                
                {wheel.suggestions && wheel.suggestions.length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Suggested Actions:</h4>
                    <ul className="space-y-1">
                      {wheel.suggestions.map((suggestion, suggIndex) => (
                        <li key={suggIndex} className="text-sm text-slate-600 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-medium">{typeof suggestion === 'string' ? suggestion : suggestion.title}</div>
                            {typeof suggestion === 'object' && suggestion.description && (
                              <div className="text-xs text-slate-500 mt-1">{suggestion.description}</div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Success Message */}
        {showSuccess && (
          <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Wheel created successfully!</span>
            </div>
          </div>
        )}
      </div>

      {/* Wheel Builder Modal */}
      {showWheelBuilder && (
        <WheelBuilder
          isOpen={showWheelBuilder}
          onClose={() => setShowWheelBuilder(false)}
          onWheelCreated={async (wheelData) => {
            console.log('🎯 Wheel creation initiated:', wheelData);
            
            try {
              // Safely extract and validate wheel data
              const ticker = wheelData?.ticker || 'Unknown';
              const strategy = wheelData?.strategy || 'unknown';
              const positions = Array.isArray(wheelData?.positions) ? wheelData.positions : [];
              const suggestions = Array.isArray(wheelData?.suggestions) ? wheelData.suggestions : [];
              
              // Add the wheel to our created wheels display
              const newWheel = {
                ticker,
                strategy,
                positions,
                suggestions,
                createdAt: new Date().toISOString()
              };
              
              console.log('✅ Adding wheel to display:', newWheel);
              console.log('📊 Suggestions structure:', suggestions);
              
              setCreatedWheels(prev => [...prev, newWheel]);
              
              // Show success message
              setShowSuccess(true);
              setTimeout(() => setShowSuccess(false), 3000);
              
              // Close the modal
              setShowWheelBuilder(false);
              
              console.log('🚀 Wheel successfully added to frontend display');
              console.log('📝 TODO: Backend integration needed for persistent storage');
              
              // TODO: Future enhancement - integrate with backend API
              // const response = await wheelApi.createCycle({
              //   ticker: wheelData.ticker,
              //   strategy: wheelData.strategy,
              //   initialPositions: wheelData.positions
              // });
              
            } catch (error) {
              console.error('❌ Failed to create wheel display:', error);
              console.error('❌ Error details:', error.message);
              console.error('❌ Wheel data that caused error:', wheelData);
              // TODO: Show error message to user
            }
          }}
        />
      )}
    </div>
  );
}
