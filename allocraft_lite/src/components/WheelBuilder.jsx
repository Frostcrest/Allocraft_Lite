import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, DollarSign, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { PositionDataService } from "@/services/positionDataService";
import { WheelDetectionService } from "@/services/wheelDetection";
import { useCreateWheelCycle, useWheelDetection } from "@/api/enhancedClient";
import { formatCurrency } from "@/lib/utils";

const WheelBuilder = ({ onWheelCreated, onClose, isOpen: externalIsOpen }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [detectedWheels, setDetectedWheels] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState('');
    const [selectedResult, setSelectedResult] = useState(null);

    // React Query hooks for wheel operations
    const createWheelMutation = useCreateWheelCycle();
    const wheelDetectionMutation = useWheelDetection();

    // Use external control if provided, otherwise use internal state
    const modalIsOpen = externalIsOpen !== undefined ? externalIsOpen : isOpen;
    const handleModalChange = (open) => {
        if (externalIsOpen !== undefined && onClose) {
            // Externally controlled
            if (!open) onClose();
        } else {
            // Internally controlled
            setIsOpen(open);
        }
    };

    // Check if user has any positions (from any source)
    useEffect(() => {
        const checkPositions = async () => {
            try {
                const hasPositions = await PositionDataService.hasAnyPositions();
                setIsConnected(hasPositions);
            } catch (err) {
                console.warn('Could not check position status:', err);
                setIsConnected(false);
            }
        };
        checkPositions();
    }, []);

    // Auto-detect wheels when externally opened
    useEffect(() => {
        if (externalIsOpen && detectedWheels.length === 0) {
            console.log('🚀 Modal opened externally, auto-detecting wheels...');
            detectWheelOpportunities();
        }
    }, [externalIsOpen]);

    const detectWheelOpportunities = async () => {
        setIsLoading(true);
        setError('');

        try {
            console.log('🔍 Starting backend wheel detection analysis...');

            // Use the new React Query hook for backend detection
            const detectionResult = await wheelDetectionMutation.mutateAsync({
                min_confidence_score: 0,
                include_confidence_details: true,
                include_market_context: true
            });

            console.log('✅ Backend detection complete:', detectionResult);

            // Extract opportunities from backend response
            const opportunities = detectionResult.opportunities || [];
            
            if (opportunities.length === 0) {
                // Fallback to frontend detection if backend returns no results
                console.log('🔄 No backend results, falling back to frontend detection...');
                
                const positions = await PositionDataService.getAllPositions();
                if (positions.length === 0) {
                    setError('No positions found. Add some stock positions to detect wheel opportunities.');
                    return;
                }

                const frontendResults = WheelDetectionService.detectWheelStrategies(positions);
                console.log(`📊 Frontend detection found ${frontendResults.length} opportunities`);
                setDetectedWheels(frontendResults);
                
                if (frontendResults.length === 0) {
                    setError('No wheel opportunities detected in your current positions. You may need positions with 100+ shares or short options to create wheels.');
                }
            } else {
                console.log(`🎯 Backend found ${opportunities.length} wheel opportunities`);
                setDetectedWheels(opportunities);
            }

        } catch (err) {
            console.error('❌ Error in wheel detection:', err);
            
            // Fallback to frontend detection on backend error
            console.log('🔄 Backend error, falling back to frontend detection...');
            try {
                const positions = await PositionDataService.getAllPositions();
                if (positions.length > 0) {
                    const frontendResults = WheelDetectionService.detectWheelStrategies(positions);
                    setDetectedWheels(frontendResults);
                    console.log(`📊 Fallback detection found ${frontendResults.length} opportunities`);
                } else {
                    setError('No positions found for analysis.');
                }
            } catch (fallbackErr) {
                console.error('❌ Fallback detection also failed:', fallbackErr);
                setError('Failed to analyze positions. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenBuilder = () => {
        setIsOpen(true);
        setDetectedWheels([]);
        setError('');
        setSelectedResult(null);
    };

    const getStrategyIcon = (strategy) => {
        switch (strategy) {
            case 'full_wheel':
                return <Zap className="w-4 h-4 text-purple-600" />;
            case 'covered_call':
                return <TrendingUp className="w-4 h-4 text-blue-600" />;
            case 'cash_secured_put':
                return <DollarSign className="w-4 h-4 text-green-600" />;
            case 'naked_stock':
                return <AlertCircle className="w-4 h-4 text-yellow-600" />;
            default:
                return <AlertCircle className="w-4 h-4 text-gray-600" />;
        }
    };

    const getStrategyColor = (strategy) => {
        switch (strategy) {
            case 'full_wheel':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'covered_call':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'cash_secured_put':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'naked_stock':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getConfidenceColor = (confidence) => {
        switch (confidence) {
            case 'high':
                return 'bg-emerald-100 text-emerald-800';
            case 'medium':
                return 'bg-amber-100 text-amber-800';
            case 'low':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const handleSelectWheel = (result) => {
        // Just select the wheel for preview, don't create it yet
        console.log('🎯 Selected wheel for preview:', result);
        console.log('📋 Current selectedResult before update:', selectedResult);
        setSelectedResult(result);
        console.log('✅ setSelectedResult called with:', result);

        // Let's also check after a small delay to see if state updated
        setTimeout(() => {
            console.log('🔍 selectedResult after timeout:', selectedResult);
        }, 100);
    };

    const handleCreateWheel = async (result) => {
        // Generate suggestions for the wheel strategy
        const suggestions = WheelDetectionService.generateWheelSuggestions(result);

        console.log('✅ Creating wheel from detection result:', result);
        console.log('💡 Suggested actions:', suggestions);

        try {
            // Create wheel cycle in backend using React Query
            const wheelCycleData = {
                cycle_key: `${result.ticker}-${Date.now()}`,
                ticker: result.ticker,
                started_at: new Date().toISOString().split('T')[0],
                status: "Open",
                notes: JSON.stringify({
                    strategy: result.strategy,
                    detection_metadata: result,
                    suggestions: suggestions
                })
            };

            console.log('🚀 Creating wheel cycle in backend:', wheelCycleData);
            const createdCycle = await createWheelMutation.mutateAsync(wheelCycleData);
            console.log('✅ Wheel cycle created successfully:', createdCycle);

            // Call parent callback with the created wheel data
            if (onWheelCreated) {
                console.log('🚀 Calling parent onWheelCreated callback...');
                onWheelCreated({
                    ticker: result.ticker,
                    strategy: result.strategy,
                    positions: result.positions,
                    suggestions,
                    backendCycle: createdCycle
                });
                console.log('✅ Parent callback completed');
            } else {
                console.warn('❌ No onWheelCreated callback provided');
            }
        } catch (error) {
            console.error('❌ Failed to create wheel cycle:', error);
            setError('Failed to create wheel cycle. Please try again.');
        }
    };

    return (
        <>
            <Button
                onClick={handleOpenBuilder}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                disabled={!isConnected}
            >
                <Zap className="w-4 h-4" />
                Build from Positions
            </Button>

            <Dialog open={modalIsOpen} onOpenChange={handleModalChange}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-purple-600" />
                            Wheel Strategy Builder
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        {!isConnected ? (
                            <Card className="border-amber-200 bg-amber-50">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <AlertCircle className="w-5 h-5 text-amber-600" />
                                        <div>
                                            <h3 className="font-semibold text-amber-800">No Positions Found</h3>
                                            <p className="text-sm text-amber-700 mt-1">
                                                Add some stock positions to automatically detect wheel opportunities. You can import from Schwab or add positions manually.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-amber-300"
                                            onClick={() => window.location.href = '/Dashboard'}
                                        >
                                            Add Positions
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-amber-300"
                                            onClick={() => window.location.href = '/Settings'}
                                        >
                                            Connect Schwab
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold">Detected Wheel Opportunities</h3>
                                        <p className="text-sm text-gray-600">
                                            We'll analyze your positions to find existing and potential wheel strategies.
                                        </p>
                                    </div>
                                    <Button
                                        onClick={detectWheelOpportunities}
                                        disabled={isLoading}
                                        variant="outline"
                                        className="flex items-center gap-2"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                        {isLoading ? 'Analyzing...' : 'Analyze Positions'}
                                    </Button>
                                </div>

                                {error && (
                                    <Card className="border-red-200 bg-red-50">
                                        <CardContent className="pt-4">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 text-red-600" />
                                                <p className="text-sm text-red-700">{error}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {detectedWheels.length > 0 && (
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-gray-900">
                                            Found {detectedWheels.length} wheel opportunit{detectedWheels.length === 1 ? 'y' : 'ies'}:
                                        </h4>

                                        {detectedWheels.map((result, index) => (
                                            <Card key={index} className="border-slate-200 hover:border-slate-300 transition-colors">
                                                <CardHeader className="pb-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            {getStrategyIcon(result.strategy)}
                                                            <div>
                                                                <CardTitle className="text-lg">{result.ticker}</CardTitle>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <Badge className={getStrategyColor(result.strategy)}>
                                                                        {result.strategy.replace('_', ' ')}
                                                                    </Badge>
                                                                    <Badge variant="outline" className={getConfidenceColor(result.confidence)}>
                                                                        {result.confidence} confidence
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            onClick={() => handleCreateWheel(result)}
                                                            size="sm"
                                                            className="bg-purple-600 hover:bg-purple-700"
                                                            disabled={createWheelMutation.isPending}
                                                        >
                                                            {createWheelMutation.isPending ? 'Creating...' : 'Create Wheel'}
                                                        </Button>
                                                    </div>
                                                </CardHeader>

                                                <CardContent>
                                                    <p className="text-sm text-gray-700 mb-3">{result.description}</p>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <h5 className="font-medium text-gray-900 mb-2">Current Positions:</h5>
                                                            <div className="space-y-1">
                                                                {result.positions.map((pos, posIndex) => (
                                                                    <div key={posIndex} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                                                                        <span>
                                                                            {pos.type === 'stock' ? '📈' : pos.type === 'call' ? '📞' : '📉'}
                                                                            {pos.position === 'short' ? '-' : '+'}{pos.quantity} {pos.type}
                                                                            {pos.strikePrice && ` @${formatCurrency(pos.strikePrice)}`}
                                                                        </span>
                                                                        <span className="font-medium">{formatCurrency(pos.marketValue)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {result.recommendations && (
                                                            <div>
                                                                <h5 className="font-medium text-gray-900 mb-2">Recommendations:</h5>
                                                                <ul className="space-y-1">
                                                                    {result.recommendations.map((rec, recIndex) => (
                                                                        <li key={recIndex} className="text-xs text-gray-600 flex items-start gap-1">
                                                                            <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                                                                            {rec}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}

                                {/* Debug before conditional render */}
                                {(() => {
                                    console.log('🔍 About to render selectedResult section. selectedResult is:', selectedResult);
                                    console.log('🔍 selectedResult truthy?', !!selectedResult);
                                    return null;
                                })()}

                                {selectedResult && (
                                    <Card className="border-green-200 bg-green-50">
                                        <CardContent className="pt-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                <h4 className="font-semibold text-green-800">Wheel Creation Preview</h4>
                                            </div>
                                            <p className="text-sm text-green-700 mb-3">
                                                Ready to create a {selectedResult.strategy.replace('_', ' ')} wheel for {selectedResult.ticker}.
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700"
                                                    onClick={() => handleCreateWheel(selectedResult)}
                                                    disabled={createWheelMutation.isPending}
                                                >
                                                    {createWheelMutation.isPending ? 'Creating...' : 'Confirm Creation'}
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => setSelectedResult(null)}>
                                                    Cancel
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default WheelBuilder;
