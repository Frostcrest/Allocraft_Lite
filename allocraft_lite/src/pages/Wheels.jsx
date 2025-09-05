import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, RotateCcw, Target, CheckCircle2, Zap, TrendingUp, Search } from "lucide-react";
import { useWheelCycles, useWheelDetection, useWheelDetectionResults, usePositionsData } from "@/api/enhancedClient";
import WheelBuilder from "@/components/WheelBuilder";
import WheelCreationModal from "@/components/WheelCreationModal";
import WheelOpportunityCard from "@/components/WheelOpportunityCard";
import WheelOpportunityGrid from "@/components/WheelOpportunityGrid";
import WheelPerformanceSummary from "@/components/WheelPerformanceSummary";
import ActiveWheelsSection from "@/components/ActiveWheelsSection";
import WheelDetailsModal from '../components/wheel-management/WheelDetailsModal';
import WheelEditModal from '../components/wheel-management/WheelEditModal';
import WheelRollModal from '../components/wheel-management/WheelRollModal';
import WheelCloseModal from '../components/wheel-management/WheelCloseModal';
import { WheelManagementService } from '../services/WheelManagementService';

// Silent logging function for Wheels page
const wheelsLog = (...args) => {
  // Logging disabled for cleaner console
  // console.log('[Wheels]', ...args);
  void args; // Suppress unused parameter warning
};

// Enhanced Wheels page with improved structure for wheel detection and management
export default function Wheels() {
  wheelsLog('Wheels component rendering...');

  // React Query data fetching
  const {
    data: cycles = [],
    isLoading: cyclesLoading,
    error: cyclesError,
    refetch: refetchWheelCycles
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

  // Transform wheel cycles data to flatten metadata for display components
  const transformWheelCycles = (cycles) => {
    return cycles.map(cycle => {
      const metadata = cycle.detection_metadata || {};
      // Calculate total premium collected (per-share premium * 100 shares * contract count)
      const perSharePremium = metadata.premium || 0;
      const contractCount = metadata.contract_count || cycle.contract_count || 1;
      const totalPremiumCollected = perSharePremium * 100 * contractCount;
      
      // Calculate total P&L 
      // For cash-secured puts: P&L = premium collected (since we sold the put and collected premium)
      // For covered calls: P&L = premium collected + any stock appreciation
      // For now, use premium collected as initial P&L (simplified calculation)
      const totalPnL = totalPremiumCollected || 0;
      
      // Debug logging for P&L calculation
      console.log(`🧮 P&L Calculation for ${cycle.ticker}:`, {
        perSharePremium,
        contractCount,
        totalPremiumCollected,
        totalPnL,
        strategy: cycle.strategy_type
      });
      
      return {
        ...cycle,
        // Flatten detection_metadata fields to top level for component compatibility
        strike_price: metadata.strike_price || cycle.strike_price || null,
        expiration_date: metadata.expiration_date || cycle.expiration_date || null,
        contract_count: contractCount,
        premium_collected: cycle.premium_collected || totalPremiumCollected || null,
        total_pnl: cycle.total_pnl || totalPnL || 0,  // Add total_pnl field
        position_size: metadata.position_size || cycle.position_size || null,
        // Keep original metadata for reference
        original_metadata: metadata
      };
    });
  };

  // Transform cycles for component consumption
  const transformedCycles = transformWheelCycles(cycles);

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

  // Wheel management modals
  const [showWheelDetails, setShowWheelDetails] = useState(false);
  const [showWheelEdit, setShowWheelEdit] = useState(false);
  const [showWheelRoll, setShowWheelRoll] = useState(false);
  const [showWheelClose, setShowWheelClose] = useState(false);
  const [selectedWheel, setSelectedWheel] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [quickCreationData, setQuickCreationData] = useState(null);

  // State for auto-detected wheels that need price information
  const [detectedWheels, setDetectedWheels] = useState([]);
  const [wheelsNeedingPrices, setWheelsNeedingPrices] = useState([]);
  const [showPricePrompt, setShowPricePrompt] = useState(false);
  const [selectedDetectedWheel, setSelectedDetectedWheel] = useState(null);

  // Computed values
  const tickers = Array.from(new Set(transformedCycles.map(c => c.ticker))).sort();
  const loading = cyclesLoading || positionsLoading;

  // Auto-detect wheels when positions are loaded
  useEffect(() => {
    console.log("🔍 Position data changed:", {
      allPositionsExist: !!allPositions,
      allPositionsLength: allPositions?.length || 0,
      positionsLoading
    });

    if (allPositions && allPositions.length > 0 && !positionsLoading) {
      console.log("✅ Triggering auto-detection with", allPositions.length, "positions");
      autoDetectWheels();
    } else if (allPositions && allPositions.length === 0 && !positionsLoading) {
      console.log("⚠️ No positions available for wheel detection");
    }
  }, [allPositions, positionsLoading]);

  const autoDetectWheels = async () => {
    try {
      setDetectionLoading(true);
      console.log("🔄 Auto-detecting wheel strategies...");
      console.log("📊 Available positions for detection:", allPositions?.length || 0);

      const detections = await WheelManagementService.detectWheelStrategies(allPositions);
      
      console.log("🎯 Backend detection results:", detections);
      console.log("📈 Number of detections returned:", detections?.length || 0);

      // Debug: Log the structure of detected opportunities
      if (detections && detections.length > 0) {
        console.log("🔍 Detailed opportunity structures:");
        detections.forEach((detection, index) => {
          console.log(`Opportunity ${index + 1}: ${detection.ticker} (${detection.strategy})`);
          console.log("  - Positions:", detection.positions);
          console.log("  - Positions length:", detection.positions?.length || 0);
          if (detection.positions && detection.positions.length > 0) {
            console.log("  - First position structure:", detection.positions[0]);
            detection.positions.forEach((pos, posIndex) => {
              console.log(`    Position ${posIndex + 1}: type=${pos.type}, quantity=${pos.quantity}, symbol=${pos.symbol}`);
            });
          }
        });
      }

      if (detections && detections.length > 0) {
        // Check for new detections that aren't already active wheels
        const existingTickers = new Set(transformedCycles.map(c => c.ticker));
        const newDetections = detections.filter(d => !existingTickers.has(d.ticker));
        
        console.log("🔍 Existing wheel tickers:", Array.from(existingTickers));
        console.log("🆕 New detections after filtering:", newDetections);

        if (newDetections.length > 0) {
          console.log(`Found ${newDetections.length} new wheel strategies`);
          setDetectedWheels(newDetections);
          
          // 🔧 FIX: Also set detectedOpportunities for UI display
          setDetectedOpportunities(newDetections);
          console.log("✅ Set detectedOpportunities for UI display:", newDetections);

          // Check which detections need price data
          const needingPrices = newDetections.filter(detection => {
            const needsStockPrice = !detection.stock_purchase_price || detection.stock_purchase_price <= 0;
            const needsPutPrice = detection.put_sold_price === null || detection.put_sold_price <= 0;
            return needsStockPrice || needsPutPrice;
          });

          if (needingPrices.length > 0) {
            setWheelsNeedingPrices(needingPrices);
            setShowPricePrompt(true);
          }

          // Auto-create wheels that have complete data
          const completeWheels = newDetections.filter(detection => {
            const hasStockPrice = detection.stock_purchase_price && detection.stock_purchase_price > 0;
            const hasPutPrice = detection.put_sold_price !== null && detection.put_sold_price > 0;
            return hasStockPrice && hasPutPrice;
          });

          for (const wheel of completeWheels) {
            await createWheelFromDetection(wheel);
          }
        } else {
          console.log("❌ No new detections found (all filtered out by existing wheels)");
        }
      } else {
        console.log("❌ No wheel opportunities detected from backend");
        setDetectedOpportunities([]); // Clear any existing opportunities
      }
    } catch (error) {
      console.error("❌ Auto-detection failed:", error);
      setDetectedOpportunities([]); // Clear opportunities on error
    } finally {
      setDetectionLoading(false);
    }
  };

  const createWheelFromDetection = async (detection) => {
    try {
      const wheelData = {
        ticker: detection.ticker,
        shares: detection.shares,
        stock_purchase_price: detection.stock_purchase_price,
        put_strike_price: detection.strike_price,
        put_sold_price: detection.put_sold_price,
        put_expiration_date: detection.expiration_date,
        cycle_type: detection.strategy_type || 'standard',
        notes: `Auto-detected ${detection.strategy_type} wheel strategy`
      };

      await WheelManagementService.createWheelCycle(wheelData);
      await refetchWheelCycles();
      console.log(`Auto-created wheel for ${detection.ticker}`);
    } catch (error) {
      console.error(`Failed to auto-create wheel for ${detection.ticker}:`, error);
    }
  };

  // Real wheel detection using unified position data
  const runWheelDetection = async (isAutoRefresh = false) => {
    wheelsLog(`🔍 Starting ${isAutoRefresh ? 'automatic' : 'manual'} wheel detection with unified data...`);
    wheelsLog(`🌐 Current window location: ${window.location.href}`);
    wheelsLog(`🔗 Expected backend URL: http://127.0.0.1:8000`);

    try {
      // Prepare correct request format for backend WheelDetectionRequest
      const detectionData = {
        account_id: 1, // Default account ID - should match your positions
        specific_tickers: [], // Empty to analyze all tickers
        options: {
          risk_tolerance: "moderate",
          include_historical: false,
          cash_balance: null // Will be calculated by backend
        }
      };

      wheelsLog('📊 Detection input data:', {
        accountId: detectionData.account_id,
        specificTickers: detectionData.specific_tickers,
        options: detectionData.options,
        positionsAvailable: allPositions.length,
        stocksAvailable: stockPositions.length,
        optionsAvailable: optionPositions.length,
        isAutoRefresh
      });

      wheelsLog('🚀 About to call wheelDetectionMutation.mutateAsync...');
      const result = await wheelDetectionMutation.mutateAsync(detectionData);

      wheelsLog('✅ Real detection complete:', result);

      // Backend returns List[WheelDetectionResult] directly
      setDetectedOpportunities(result || []);
      setLastUpdateTime(new Date());

      return { opportunities: result || [] };
    } catch (error) {
      wheelsLog('❌ Real wheel detection failed:', error);
      wheelsLog('❌ Error details:', error.message, error.stack);

      // TEMPORARILY DISABLED: Fall back to demo data if detection fails
      // if (!isAutoRefresh) {
      //   wheelsLog('🔄 Falling back to demo opportunities...');
      //   loadDemoOpportunities();
      // }

      // Show empty opportunities so we can see the real issue
      setDetectedOpportunities([]);
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

    wheelsLog('🔄 Starting auto-refresh for real-time monitoring...');

    const interval = setInterval(() => {
      if (autoRefreshEnabled && isMarketHours() && allPositions.length > 0) {
        wheelsLog('🕐 Auto-refresh triggered during market hours');
        runWheelDetection(true).catch(error => {
          wheelsLog('📝 Auto-refresh detection failed, continuing...');
        });

        // Also refresh position data
        refetchPositions();
      }
    }, 30000); // 30 seconds

    setRefreshInterval(interval);
  };

  const stopAutoRefresh = () => {
    if (refreshInterval) {
      wheelsLog('⏹️ Stopping auto-refresh...');
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    wheelsLog('🔄 Manual refresh triggered...');
    try {
      await refetchPositions(); // Refresh positions first
      await runWheelDetection(false); // Then run detection
    } catch (error) {
      wheelsLog('❌ Manual refresh failed:', error);
    }
  };

  // Effect to run detection when positions data is available
  useEffect(() => {
    if (!positionsLoading && !positionsError && allPositions.length > 0) {
      wheelsLog('🎯 Positions loaded, running automatic wheel detection...');
      wheelsLog('📊 Position data summary:', {
        allPositionsCount: allPositions.length,
        stockPositionsCount: stockPositions.length,
        optionPositionsCount: optionPositions.length,
        samplePositions: allPositions.slice(0, 3) // Show first 3 positions
      });

      runWheelDetection(false).catch(error => {
        wheelsLog('📝 Auto-detection failed, user can manually trigger detection');
      });
    } else if (!positionsLoading) {
      wheelsLog('ℹ️ Positions status:', {
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
        wheelsLog('🔇 Tab hidden, pausing auto-refresh...');
        stopAutoRefresh();
      } else if (autoRefreshEnabled && allPositions.length > 0) {
        wheelsLog('👁️ Tab visible, resuming auto-refresh...');
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
    wheelsLog('🎯 Wheels page: Detection complete', detectionResult);

    if (detectionResult.opportunities && detectionResult.opportunities.length > 0) {
      setDetectedOpportunities(detectionResult.opportunities);
    } else {
      // If no real opportunities found, provide helpful feedback
      wheelsLog('ℹ️ No wheel opportunities detected from current positions');
      setDetectedOpportunities([]);
    }
  };

  // Handle wheel creation from opportunity card
  const handleCreateWheelFromOpportunity = (opportunity) => {
    wheelsLog('🚀 Creating wheel from opportunity:', opportunity);

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

  // Handle wheel management actions using WheelManagementService
  const handleWheelAction = async (action, wheel) => {
    wheelsLog('🎯 Wheel management action:', action, wheel);

    try {
      switch (action) {
        case 'view_details':
          // Use service to get comprehensive wheel details
          setSelectedWheel(wheel);
          setShowWheelDetails(true);
          break;

        case 'edit_parameters':
          setSelectedWheel(wheel);
          setShowWheelEdit(true);
          break;

        case 'roll_options':
          setSelectedWheel(wheel);
          setShowWheelRoll(true);
          break;

        case 'close_wheel':
          setSelectedWheel(wheel);
          setShowWheelClose(true);
          break;

        case 'delete_wheel':
          // Enhanced confirmation for deletion
          const confirmationText = `DELETE ${wheel.ticker}`;
          const userConfirmation = prompt(
            `⚠️ PERMANENT DELETION WARNING ⚠️\n\n` +
            `You are about to permanently delete the ${wheel.ticker} wheel strategy.\n\n` +
            `This action will:\n` +
            `• Remove all wheel cycle data\n` +
            `• Delete all associated events and history\n` +
            `• Cannot be undone\n\n` +
            `To confirm, type exactly: ${confirmationText}`
          );

          if (userConfirmation === confirmationText) {
            try {
              wheelsLog(`🗑️ Deleting wheel ${wheel.ticker} (ID: ${wheel.id})`);
              await WheelManagementService.deleteWheel(wheel.id);
              wheelsLog(`✅ Wheel ${wheel.ticker} deleted successfully`);

              // Refresh wheel cycles data
              refetchWheelCycles();

              // Show success message
              alert(`✅ ${wheel.ticker} wheel strategy has been permanently deleted.`);
            } catch (error) {
              console.error('❌ Failed to delete wheel:', error);
              alert(`❌ Failed to delete ${wheel.ticker} wheel strategy.\n\nError: ${error.message}\n\nPlease try again or contact support.`);
            }
          } else if (userConfirmation !== null) {
            // User tried to confirm but typed wrong text
            alert(`❌ Confirmation text didn't match. Deletion cancelled for safety.\n\nRequired: ${confirmationText}\nYou typed: ${userConfirmation || '(empty)'}`);
          }
          // If userConfirmation is null, user clicked Cancel, so do nothing
          break;

        case 'add_notes':
          const notes = prompt(`Add notes for ${wheel.ticker} wheel strategy:`);
          if (notes) {
            // Log event through service
            await WheelManagementService.logWheelEvent(wheel.id, {
              event_type: 'notes_added',
              description: 'Notes added to wheel strategy',
              metadata: { notes: notes }
            });
            wheelsLog(`✅ Notes added for ${wheel.ticker}:`, notes);
          }
          break;

        case 'update_status':
          // Example of status update through service
          const newStatus = prompt(`Enter new status for ${wheel.ticker} wheel:`, wheel.status);
          if (newStatus && newStatus !== wheel.status) {
            await WheelManagementService.updateWheelStatus(wheel.id, newStatus, {
              reason: 'Manual status update',
              updated_by: 'user'
            });
            wheelsLog(`✅ Status updated for ${wheel.ticker}: ${wheel.status} → ${newStatus}`);
          }
          break;

        default:
          wheelsLog('Unknown wheel action:', action);
      }
    } catch (error) {
      wheelsLog('❌ Wheel action failed:', error);
      alert(`Action failed: ${error.message}`);
    }
  };

  // Modal callback functions using WheelManagementService
  const handleWheelSave = async (updatedWheel) => {
    try {
      wheelsLog('💾 Saving wheel updates:', updatedWheel);

      const result = await WheelManagementService.updateWheel(selectedWheel.id, updatedWheel);

      wheelsLog('✅ Wheel updated successfully:', result);

      // Close modal and refresh data
      setShowWheelEdit(false);
      setSelectedWheel(null);

      // React Query will automatically update cache through service

    } catch (error) {
      wheelsLog('❌ Wheel update failed:', error);
      alert(`Update failed: ${error.message}`);
    }
  };

  const handleWheelRoll = async (rollData) => {
    try {
      wheelsLog('🔄 Rolling wheel options:', rollData);

      const result = await WheelManagementService.rollWheel(selectedWheel.id, rollData);

      wheelsLog('✅ Wheel roll completed:', result);

      // Close modal and refresh data
      setShowWheelRoll(false);
      setSelectedWheel(null);

    } catch (error) {
      wheelsLog('❌ Wheel roll failed:', error);
      alert(`Roll failed: ${error.message}`);
    }
  };

  const handleWheelClose = async (closeData) => {
    try {
      wheelsLog('❌ Closing wheel strategy:', closeData);

      const result = await WheelManagementService.closeWheel(selectedWheel.id, closeData);

      wheelsLog('✅ Wheel closed successfully:', result);

      // Close modal and refresh data
      setShowWheelClose(false);
      setSelectedWheel(null);

    } catch (error) {
      wheelsLog('❌ Wheel closure failed:', error);
      alert(`Closure failed: ${error.message}`);
    }
  };

  const closeAllModals = () => {
    setShowWheelDetails(false);
    setShowWheelEdit(false);
    setShowWheelRoll(false);
    setShowWheelClose(false);
    setSelectedWheel(null);
  };

  // Handle view details for opportunity
  const handleViewOpportunityDetails = (opportunity) => {
    wheelsLog('👁️ View opportunity details:', opportunity);
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

    wheelsLog('📊 Loading demo opportunities:', demoOpportunities);
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
            {/* TEMPORARY: Manual wheel detection button for debugging */}
            <Button
              onClick={() => {
                wheelsLog('🔧 MANUAL: Triggering wheel detection...');
                runWheelDetection(false).then(result => {
                  wheelsLog('🔧 MANUAL: Detection completed', result);
                }).catch(error => {
                  wheelsLog('🔧 MANUAL: Detection failed', error);
                });
              }}
              className="bg-yellow-600 hover:bg-yellow-700 shadow-lg transition-all duration-200"
              variant="outline"
            >
              <Search className="w-5 h-5 mr-2" />
              🔧 TEST Detection
            </Button>
            {/* TEMPORARILY DISABLED DEMO BUTTON */}
            {/*
            <Button
              onClick={loadDemoOpportunities}
              variant="outline"
              className="border-purple-300 text-purple-600 hover:bg-purple-50 shadow-sm"
            >
              <Zap className="w-5 h-5 mr-2" />
              Demo Data
            </Button>
            */}
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
          onAnalyzePositions={runWheelDetection}
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
                  onClick={autoDetectWheels}
                  disabled={detectionLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Target className="w-5 h-5 mr-2" />
                  {detectionLoading ? 'Scanning...' : 'Refresh Detection'}
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
              wheelCycles={transformedCycles}
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
            wheelsLog('🎯 Wheel creation completed:', wheelData);

            // Show success message
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);

            // Close the modal
            setShowWheelBuilder(false);

            wheelsLog('✅ Wheel successfully created and stored in backend');
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
          onWheelCreated={async (createdWheelCycle) => {
            wheelsLog('🎯 New wheel cycle creation completed:', createdWheelCycle);

            // Show success message
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 5000);

            // Close the modal
            setShowWheelCreationModal(false);
            setQuickCreationData(null);

            // The useCreateWheelCycle hook automatically invalidates the cache,
            // so the wheels list will refresh automatically
            wheelsLog('✅ Wheel cycle successfully created and cache invalidated');
          }}
          prefilledData={quickCreationData}
          quickMode={!!quickCreationData}
        />
      )}

      {/* Wheel Management Modals */}
      <WheelDetailsModal
        isOpen={showWheelDetails}
        onClose={closeAllModals}
        wheel={selectedWheel}
        onAction={handleWheelAction}
      />

      <WheelEditModal
        isOpen={showWheelEdit}
        onClose={closeAllModals}
        wheel={selectedWheel}
        onSave={handleWheelSave}
      />

      <WheelRollModal
        isOpen={showWheelRoll}
        onClose={closeAllModals}
        wheel={selectedWheel}
        onRoll={handleWheelRoll}
      />

      <WheelCloseModal
        isOpen={showWheelClose}
        onClose={closeAllModals}
        wheel={selectedWheel}
        onCloseWheel={handleWheelClose}
      />

      {/* Price Data Prompt Modal for Auto-Detected Wheels */}
      {showPricePrompt && wheelsNeedingPrices.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Complete Wheel Setup
            </h3>
            <p className="text-gray-600 mb-4">
              I found {wheelsNeedingPrices.length} potential wheel strategy{wheelsNeedingPrices.length > 1 ? 'ies' : 'y'} that need price information to be created automatically.
            </p>

            <div className="space-y-3 mb-6">
              {wheelsNeedingPrices.map((wheel, index) => (
                <div key={index} className="p-3 border rounded bg-gray-50">
                  <div className="font-medium text-sm">{wheel.ticker}</div>
                  <div className="text-xs text-gray-600">
                    {wheel.strategy_type} • {wheel.shares} shares
                  </div>
                  <div className="text-xs text-yellow-600 mt-1">
                    Missing: {!wheel.stock_purchase_price ? 'Stock Price' : ''}
                    {(!wheel.stock_purchase_price && !wheel.put_sold_price) ? ', ' : ''}
                    {!wheel.put_sold_price ? 'Put Price' : ''}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  setShowPricePrompt(false);
                  setWheelsNeedingPrices([]);
                  // Open wheel creation modal for manual entry
                  setShowWheelCreationModal(true);
                }}
                className="flex-1"
              >
                Add Manually
              </Button>
              <Button
                onClick={() => {
                  setShowPricePrompt(false);
                  setWheelsNeedingPrices([]);
                }}
                variant="outline"
                className="flex-1"
              >
                Skip for Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
