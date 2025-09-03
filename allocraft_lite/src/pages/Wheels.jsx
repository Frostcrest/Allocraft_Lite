import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, RotateCcw, Target, CheckCircle2, Zap, TrendingUp } from "lucide-react";
import { useWheelCycles, useWheelDetection, useWheelDetectionResults, usePositionsData } from "@/api/enhancedClient";
import WheelBuilder from "@/components/WheelBuilder";
import WheelCreationModal from "@/components/WheelCreationModal";
import StrategyDetectionPanel from "@/components/StrategyDetectionPanel";
import WheelOpportunityCard from "@/components/WheelOpportunityCard";
import WheelOpportunityGrid from "@/components/WheelOpportunityGrid";
import WheelPerformanceSummary from "@/components/WheelPerformanceSummary";
import ActiveWheelsSection from "@/components/ActiveWheelsSection";

// Enhanced Wheels page with improved structure for wheel detection and management
export default function Wheels() {
  console.log('Wheels component rendering...');

  // React Query data fetching
  const {
    data: cycles = [],
    isLoading: cyclesLoading,
    error: cyclesError
  } = useWheelCycles();

  // Positions data for wheel detection
  const {
    allPositions,
    stockPositions,
    optionPositions,
    isLoading: positionsLoading,
    isError: positionsError,
    error: positionsErrorDetails,
    refetch: refetchPositions
  } = usePositionsData();

  // Wheel detection hooks
  const wheelDetectionMutation = useWheelDetection();
  const {
    data: detectionResults,
    isLoading: detectionResultsLoading
  } = useWheelDetectionResults({ enabled: false }); // Disable auto-fetching for now

  const [selectedTicker, setSelectedTicker] = useState(null);
  const [showWheelBuilder, setShowWheelBuilder] = useState(false);
  const [showWheelCreationModal, setShowWheelCreationModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [detectedOpportunities, setDetectedOpportunities] = useState([]);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [quickCreationData, setQuickCreationData] = useState(null);

  // Computed values
  const tickers = Array.from(new Set(cycles.map(c => c.ticker))).sort();
  const loading = cyclesLoading || positionsLoading;

  // Real wheel detection using unified position data
  const runWheelDetection = async (isAutoRefresh = false) => {
    console.log(`🔍 Starting ${isAutoRefresh ? 'automatic' : 'manual'} wheel detection with unified data...`);
    
    try {
      // Prepare unified position data for detection
      const detectionData = {
        positions: allPositions,
        stocks: stockPositions,
        options: optionPositions,
        include_confidence_details: true,
        include_market_context: true,
        min_confidence_score: 50, // Minimum 50% confidence
        strategy_filters: [] // Include all strategies
      };

      console.log('📊 Detection input data:', {
        positionsCount: allPositions.length,
        stocksCount: stockPositions.length,
        optionsCount: optionPositions.length,
        isAutoRefresh
      });

      const result = await wheelDetectionMutation.mutateAsync(detectionData);
      
      console.log('✅ Real detection complete:', result);
      
      // Update with real detection results
      setDetectedOpportunities(result.opportunities || []);
      setLastUpdateTime(new Date());
      
      return result;
    } catch (error) {
      console.error('❌ Real wheel detection failed:', error);
      
      // Fall back to demo data if detection fails (only for manual runs)
      if (!isAutoRefresh) {
        console.log('🔄 Falling back to demo opportunities...');
        loadDemoOpportunities();
      }
      
      throw error;
    }
  };

  // Market hours detection (9:30 AM - 4:00 PM EST, Mon-Fri)
  const isMarketHours = () => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Simple market hours check (9:30 AM - 4:00 PM, Mon-Fri)
    return day >= 1 && day <= 5 && hour >= 9 && hour < 16;
  };

  // Auto-refresh functionality
  const startAutoRefresh = () => {
    if (refreshInterval) return; // Already running

    console.log('🔄 Starting auto-refresh for real-time monitoring...');
    
    const interval = setInterval(() => {
      if (autoRefreshEnabled && isMarketHours() && allPositions.length > 0) {
        console.log('🕐 Auto-refresh triggered during market hours');
        runWheelDetection(true).catch(error => {
          console.log('📝 Auto-refresh detection failed, continuing...');
        });
        
        // Also refresh position data
        refetchPositions();
      }
    }, 30000); // 30 seconds

    setRefreshInterval(interval);
  };

  const stopAutoRefresh = () => {
    if (refreshInterval) {
      console.log('⏹️ Stopping auto-refresh...');
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    console.log('🔄 Manual refresh triggered...');
    try {
      await refetchPositions(); // Refresh positions first
      await runWheelDetection(false); // Then run detection
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
    }
  };

  // Effect to run detection when positions data is available
  useEffect(() => {
    if (!positionsLoading && !positionsError && allPositions.length > 0) {
      console.log('🎯 Positions loaded, running automatic wheel detection...');
      console.log('📊 Position data summary:', {
        allPositionsCount: allPositions.length,
        stockPositionsCount: stockPositions.length,
        optionPositionsCount: optionPositions.length,
        samplePositions: allPositions.slice(0, 3) // Show first 3 positions
      });
      
      runWheelDetection(false).catch(error => {
        console.log('📝 Auto-detection failed, user can manually trigger detection');
      });
    } else if (!positionsLoading) {
      console.log('ℹ️ Positions status:', {
        loading: positionsLoading,
        error: positionsError,
        positionsCount: allPositions.length,
        errorMessage: positionsErrorDetails?.message
      });
    }
  }, [positionsLoading, positionsError, allPositions.length]);

  // Effect to manage auto-refresh lifecycle
  useEffect(() => {
    if (autoRefreshEnabled && allPositions.length > 0) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }

    // Cleanup on unmount
    return () => {
      stopAutoRefresh();
    };
  }, [autoRefreshEnabled, allPositions.length]);

  // Effect to handle visibility changes (stop refresh when tab is not visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('🔇 Tab hidden, pausing auto-refresh...');
        stopAutoRefresh();
      } else if (autoRefreshEnabled && allPositions.length > 0) {
        console.log('👁️ Tab visible, resuming auto-refresh...');
        startAutoRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoRefreshEnabled, allPositions.length]);

  // Handle detection results from Strategy Detection Panel (enhanced with real data)
  const handleDetectionComplete = (detectionResult) => {
    console.log('🎯 Wheels page: Detection complete', detectionResult);
    
    if (detectionResult.opportunities && detectionResult.opportunities.length > 0) {
      setDetectedOpportunities(detectionResult.opportunities);
    } else {
      // If no real opportunities found, provide helpful feedback
      console.log('ℹ️ No wheel opportunities detected from current positions');
      setDetectedOpportunities([]);
    }
  };

  // Handle wheel creation from opportunity card
  const handleCreateWheelFromOpportunity = (opportunity) => {
    console.log('🚀 Creating wheel from opportunity:', opportunity);
    
    // Prepare quick creation data
    const quickData = {
      strategy: opportunity.strategy,
      ticker: opportunity.ticker,
      strikePrice: opportunity.recommended_strike || '',
      expirationDate: opportunity.recommended_expiration || '',
      contractCount: opportunity.recommended_contracts || 1,
      premium: opportunity.potential_income ? (opportunity.potential_income / 100).toFixed(2) : '',
      positionSize: opportunity.positions?.find(p => p.type === 'cash')?.market_value || '',
      notes: `Quick creation from ${opportunity.confidence_level} confidence opportunity`
    };
    
    setQuickCreationData(quickData);
    setShowWheelCreationModal(true);
  };

  // Handle wheel management actions
  const handleWheelAction = (action, wheel) => {
    console.log('� Wheel management action:', action, wheel);
    
    switch (action) {
      case 'view_details':
        // TODO: Open wheel details modal
        alert(`Viewing details for ${wheel.ticker} wheel strategy`);
        break;
      case 'edit_parameters':
        // TODO: Open parameter editing modal
        alert(`Editing parameters for ${wheel.ticker} wheel`);
        break;
      case 'roll_options':
        // TODO: Open roll options modal
        alert(`Rolling options for ${wheel.ticker} wheel`);
        break;
      case 'close_wheel':
        // TODO: Open close confirmation modal
        if (confirm(`Are you sure you want to close the ${wheel.ticker} wheel strategy?`)) {
          alert(`Closing ${wheel.ticker} wheel strategy`);
        }
        break;
      case 'add_notes':
        // TODO: Open notes modal
        const notes = prompt(`Add notes for ${wheel.ticker} wheel strategy:`);
        if (notes) {
          alert(`Notes added: ${notes}`);
        }
        break;
      default:
        console.log('Unknown wheel action:', action);
    }
  };

  // Handle view details for opportunity
  const handleViewOpportunityDetails = (opportunity) => {
    console.log('👁️ View opportunity details:', opportunity);
    // TODO: Implement details modal or expand card view
    alert(`Viewing details for ${opportunity.ticker} ${opportunity.strategy} opportunity`);
  };

  // Demo function to test opportunity cards
  const loadDemoOpportunities = () => {
    const demoOpportunities = [
      {
        ticker: "AAPL",
        strategy: "covered_call",
        confidence_score: 85,
        confidence_level: "high",
        positions: [
          { type: "stock", quantity: 200, market_value: 34000 },
          { type: "option", quantity: 2, market_value: 400 }
        ],
        potential_income: 800,
        risk_assessment: { level: "low" },
        recommendations: ["Sell covered calls at $175 strike"],
        days_to_expiration: 21,
        market_context: { session_type: "Regular Hours", volatility: "Medium" }
      },
      {
        ticker: "TSLA",
        strategy: "cash_secured_put",
        confidence_score: 92,
        confidence_level: "high",
        positions: [
          { type: "cash", quantity: 25000, market_value: 25000 }
        ],
        potential_income: 1200,
        risk_assessment: { level: "medium" },
        recommendations: ["Sell puts at $240 strike for premium income"],
        days_to_expiration: 14,
        market_context: { session_type: "Regular Hours", volatility: "High" }
      },
      {
        ticker: "MSFT",
        strategy: "full_wheel",
        confidence_score: 78,
        confidence_level: "medium",
        positions: [
          { type: "stock", quantity: 100, market_value: 41000 },
          { type: "option", quantity: 1, market_value: 200 }
        ],
        potential_income: 600,
        risk_assessment: { level: "low" },
        recommendations: ["Continue wheel cycle with covered calls"],
        days_to_expiration: 28,
        market_context: { session_type: "Regular Hours", volatility: "Low" }
      }
    ];
    
    console.log('📊 Loading demo opportunities:', demoOpportunities);
    setDetectedOpportunities(demoOpportunities);
  };

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
        {/* Enhanced Page Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <RotateCcw className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Wheel Strategies</h1>
                <p className="text-slate-600 mt-1">
                  Discover and manage wheel opportunities from your positions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                Auto-Detection
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Real-time Analysis
              </span>
              <span>
                {tickers.length} Active Cycle{tickers.length !== 1 ? 's' : ''}
              </span>
              {/* Real-time monitoring status */}
              {autoRefreshEnabled && refreshInterval && (
                <span className="flex items-center gap-1 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Live {isMarketHours() ? 'Market Hours' : 'After Hours'}
                </span>
              )}
              {lastUpdateTime && (
                <span className="text-slate-400">
                  Last updated: {lastUpdateTime.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleManualRefresh}
              variant="outline"
              disabled={loading}
              className="border-slate-300 hover:border-blue-500"
            >
              <RotateCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              variant="outline"
              className={`border-slate-300 ${autoRefreshEnabled ? 'bg-green-50 border-green-300 text-green-700' : ''}`}
            >
              {autoRefreshEnabled ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Auto-Refresh ON
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-slate-400 rounded-full mr-2"></div>
                  Auto-Refresh OFF
                </>
              )}
            </Button>
            <Button
              onClick={() => setShowWheelCreationModal(true)}
              className="bg-blue-600 hover:bg-blue-700 shadow-lg transition-all duration-200"
            >
              <Target className="w-5 h-5 mr-2" /> 
              Create Wheel Strategy
            </Button>
            <Button 
              onClick={loadDemoOpportunities}
              variant="outline" 
              className="border-purple-300 text-purple-600 hover:bg-purple-50 shadow-sm"
            >
              <Zap className="w-5 h-5 mr-2" /> 
              Demo Data
            </Button>
            <Button 
              onClick={() => setShowWheelCreationModal(true)}
              variant="outline" 
              className="border-slate-300 hover:bg-slate-50 shadow-sm"
            >
              <Plus className="w-5 h-5 mr-2" /> 
              Manual Creation
            </Button>
          </div>
        </div>

        {/* Strategy Detection Panel */}
        <StrategyDetectionPanel 
          onDetectionComplete={handleDetectionComplete}
          positionsData={{
            allPositions,
            stockPositions,
            optionPositions,
            isLoading: positionsLoading,
            isError: positionsError,
            error: positionsErrorDetails
          }}
          onManualDetection={runWheelDetection}
          autoRefresh={true}
          className="shadow-lg"
        />

        {/* Performance Summary Widget */}
        <WheelPerformanceSummary 
          opportunities={detectedOpportunities}
          cycles={cycles}
          stockPositions={stockPositions}
          optionPositions={optionPositions}
          className="shadow-lg"
        />

        {/* Wheel Opportunities Grid */}
        <WheelOpportunityGrid 
          opportunities={detectedOpportunities}
          isLoading={wheelDetectionMutation.isPending}
          onCreateWheel={handleCreateWheelFromOpportunity}
          onViewDetails={handleViewOpportunityDetails}
          className="shadow-lg"
        />

        {/* Main Content Area */}
        <div className="space-y-6">
          {tickers.length === 0 ? (
            /* Empty State */
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                <Target className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">No wheel cycles found</h3>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                Get started by analyzing your current positions for wheel opportunities, 
                or create a wheel cycle manually.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => setShowWheelCreationModal(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Target className="w-5 h-5 mr-2" /> 
                  Analyze My Positions
                </Button>
                <Button 
                  onClick={() => setShowWheelCreationModal(true)}
                  variant="outline"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Manually
                </Button>
              </div>
            </div>
          ) : (
            /* Active Wheels Display - Using new ActiveWheelsSection component */
            <ActiveWheelsSection 
              wheelCycles={cycles}
              onWheelAction={handleWheelAction}
              className="shadow-lg"
            />
          )}
        </div>

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

      {/* Wheel Builder Modal (Legacy) */}
      {showWheelBuilder && (
        <WheelBuilder
          isOpen={showWheelBuilder}
          onClose={() => setShowWheelBuilder(false)}
          onWheelCreated={async (wheelData) => {
            console.log('🎯 Wheel creation completed:', wheelData);

            // Show success message
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);

            // Close the modal
            setShowWheelBuilder(false);

            console.log('✅ Wheel successfully created and stored in backend');
          }}
        />
      )}

      {/* New Wheel Creation Modal */}
      {showWheelCreationModal && (
        <WheelCreationModal
          isOpen={showWheelCreationModal}
          onClose={() => {
            setShowWheelCreationModal(false);
            setQuickCreationData(null);
          }}
          onWheelCreated={async (wheelData) => {
            console.log('🎯 New wheel creation completed:', wheelData);

            // Show success message
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 5000);

            // Close the modal
            setShowWheelCreationModal(false);
            setQuickCreationData(null);

            // TODO: Refresh wheel cycles data
            console.log('✅ Wheel successfully created with new modal system');
          }}
          prefilledData={quickCreationData}
          quickMode={!!quickCreationData}
        />
      )}
    </div>
  );
}
