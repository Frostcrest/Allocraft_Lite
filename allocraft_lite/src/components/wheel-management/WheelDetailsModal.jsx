import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, DollarSign, TrendingUp, TrendingDown, Clock,
  Activity, FileText, Target, RotateCcw, AlertCircle,
  Eye, BarChart3, History, Settings, Bot, Trash2
} from "lucide-react";
import WheelStatusBadge from '../status-tracking/WheelStatusBadge';
import WheelStatusHistory from '../status-tracking/WheelStatusHistory';
import StatusUpdateModal from '../status-tracking/StatusUpdateModal';
import { useWheelStatusHistory, useWheelStatusUpdate } from '../../hooks/useWheelStatus';
import { WheelManagementService } from '../../services/WheelManagementService';

/**
 * WheelDetailsModal - Comprehensive view of wheel strategy details
 * Shows full history, performance metrics, and current status
 */
export default function WheelDetailsModal({
  isOpen,
  onClose,
  wheel,
  onAction = () => { }
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [wheelData, setWheelData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // React Query hooks for status tracking
  const { data: statusHistory, refetch: refetchStatusHistory } = useWheelStatusHistory(
    wheel?.id,
    { enabled: isOpen && !!wheel?.id }
  );
  const statusUpdateMutation = useWheelStatusUpdate();

  // Fetch detailed wheel data when modal opens
  useEffect(() => {
    if (isOpen && wheel) {
      fetchWheelDetails();
    }
  }, [isOpen, wheel]);

  const fetchWheelDetails = async () => {
    setLoading(true);
    try {
      // Fetch comprehensive wheel data from our new API endpoint
      const response = await fetch(`http://127.0.0.1:8000/wheels/${wheel.ticker}/data`);
      if (response.ok) {
        const data = await response.json();
        setWheelData(data);
      }
    } catch (error) {
      console.error('Failed to fetch wheel details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!wheel) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
    { id: 'status', label: 'Status Tracking', icon: Activity },
    { id: 'history', label: 'History', icon: History },
    { id: 'positions', label: 'Positions', icon: Target }
  ];

  // Handle status update
  const handleStatusUpdate = (newStatus) => {
    // Update local wheel data
    if (wheelData) {
      setWheelData({ ...wheelData, status: newStatus });
    }
    // Trigger parent component update
    onAction('statusUpdated', { ...wheel, status: newStatus });
    // Refetch status history
    refetchStatusHistory();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-purple-600" />
              <span className="font-bold text-lg">{wheel.ticker} Wheel Strategy</span>
            </div>
            <Badge variant="secondary" className="ml-auto">
              {wheel.strategy_type?.replace('_', ' ').toUpperCase()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {/* Tab Navigation */}
          <div className="flex border-b mb-4">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 border-b-2 transition-colors
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                    }
                  `}
                >
                  <TabIcon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Strategy Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-slate-600">Status</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsStatusModalOpen(true)}
                            className="text-xs"
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Update
                          </Button>
                        </div>
                        <WheelStatusBadge status={wheel.status} size="lg" showTooltip={true} />
                      </div>

                      <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-slate-600">Days Active</span>
                        </div>
                        <span className="text-lg font-semibold">{wheel.days_active || 0}</span>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-slate-600">P&L</span>
                        </div>
                        <span className={`text-lg font-semibold ${(wheel.total_pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                          {formatCurrency(wheel.total_pnl)}
                        </span>
                      </div>
                    </div>

                    {/* Next Actions */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-blue-900 mb-2">Recommended Actions</h3>
                      <div className="space-y-2">
                        {wheel.next_actions?.map((action, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-blue-800">
                            <AlertCircle className="h-3 w-3" />
                            {action}
                          </div>
                        )) || (
                            <div className="text-sm text-blue-700">No immediate actions required</div>
                          )}
                      </div>
                    </div>

                    {/* Strategy Description */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Strategy Details</h3>
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <p className="text-slate-700">
                          {wheel.description || 'This wheel strategy is designed to generate income through systematic options selling while building long-term equity positions.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'performance' && (
                  <div className="space-y-6">
                    {/* Performance Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="text-sm text-slate-600 mb-1">Total Premium</div>
                        <div className="text-xl font-semibold text-green-600">
                          {formatCurrency(wheelData?.total_premium_collected || 0)}
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="text-sm text-slate-600 mb-1">Realized P&L</div>
                        <div className={`text-xl font-semibold ${(wheelData?.realized_pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                          {formatCurrency(wheelData?.realized_pnl || 0)}
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="text-sm text-slate-600 mb-1">Active Cycles</div>
                        <div className="text-xl font-semibold text-blue-600">
                          {wheelData?.active_cycles || 0}
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="text-sm text-slate-600 mb-1">Total Cycles</div>
                        <div className="text-xl font-semibold text-slate-600">
                          {wheelData?.total_cycles || 0}
                        </div>
                      </div>
                    </div>

                    {/* Performance Chart Placeholder */}
                    <div className="bg-slate-50 p-8 rounded-lg text-center">
                      <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">Performance chart coming soon</p>
                    </div>
                  </div>
                )}

                {activeTab === 'status' && (
                  <div className="space-y-6">
                    {/* Current Status Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-slate-700">Current Status</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsStatusModalOpen(true)}
                            className="text-xs"
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Update Status
                          </Button>
                        </div>
                        <WheelStatusBadge status={wheel.status} size="lg" showTooltip={true} />
                        <div className="mt-2 text-xs text-slate-600">
                          Last updated: {wheel.last_status_update ?
                            new Date(wheel.last_status_update).toLocaleString() :
                            'Unknown'
                          }
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <Bot className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-slate-700">Auto-Detection</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={async () => {
                            try {
                              // Trigger auto-detection for this wheel
                              const detection = await WheelManagementService.detectWheelStatus(wheel.id);
                              if (detection.recommended_status !== wheel.status) {
                                setIsStatusModalOpen(true);
                              } else {
                                alert('Status is already up to date!');
                              }
                            } catch (error) {
                              console.error('Auto-detection failed:', error);
                              alert('Auto-detection failed. Please try again.');
                            }
                          }}
                        >
                          <Bot className="h-3 w-3 mr-1" />
                          Run Auto-Detection
                        </Button>
                        <div className="mt-2 text-xs text-slate-600">
                          Automatically detects recommended status based on current positions and market conditions
                        </div>
                      </div>
                    </div>

                    {/* Status History */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Status History
                      </h3>
                      <WheelStatusHistory
                        wheelId={wheel.id}
                        statusHistory={statusHistory}
                        loading={!statusHistory}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="space-y-4">
                    {wheelData?.cycles?.length > 0 ? (
                      wheelData.cycles.map((cycle) => (
                        <div key={cycle.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{cycle.cycle_key}</span>
                            <Badge variant="outline">{cycle.status}</Badge>
                          </div>
                          <div className="text-sm text-slate-600">
                            Started: {formatDate(cycle.started_at)}
                          </div>
                          {cycle.strategy_type && (
                            <div className="text-sm text-slate-600">
                              Strategy: {cycle.strategy_type.replace('_', ' ')}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <History className="h-12 w-12 mx-auto mb-4" />
                        <p>No cycle history available</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'positions' && (
                  <div className="space-y-4">
                    {wheelData?.current_positions?.length > 0 ? (
                      wheelData.current_positions.map((position) => (
                        <div key={position.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{position.symbol}</span>
                            <Badge variant="outline">{position.position_type}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-slate-600">Quantity: </span>
                              <span className="font-medium">{position.quantity}</span>
                            </div>
                            <div>
                              <span className="text-slate-600">Market Value: </span>
                              <span className="font-medium">{formatCurrency(position.market_value)}</span>
                            </div>
                            {position.strike_price && (
                              <div>
                                <span className="text-slate-600">Strike: </span>
                                <span className="font-medium">{formatCurrency(position.strike_price)}</span>
                              </div>
                            )}
                            {position.expiration_date && (
                              <div>
                                <span className="text-slate-600">Expiration: </span>
                                <span className="font-medium">{formatDate(position.expiration_date)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <Target className="h-12 w-12 mx-auto mb-4" />
                        <p>No current positions</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onAction('edit_parameters', wheel)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit Parameters
              </Button>
              <Button
                variant="outline"
                onClick={() => onAction('add_notes', wheel)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Add Notes
              </Button>
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onAction('delete_wheel', wheel)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Wheel
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Status Update Modal */}
      <StatusUpdateModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        wheel={wheel}
        onStatusUpdate={handleStatusUpdate}
      />
    </Dialog>
  );
}
