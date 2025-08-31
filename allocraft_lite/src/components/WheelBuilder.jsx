import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, DollarSign, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { PositionDataService } from "@/services/positionDataService";
import { WheelDetectionService } from "@/services/wheelDetection";
import { formatCurrency } from "@/lib/utils";

const WheelBuilder = ({ onWheelCreated }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [detectedWheels, setDetectedWheels] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState('');
    const [selectedResult, setSelectedResult] = useState(null);

    // Check Schwab connection status
    useEffect(() => {
        const checkConnection = async () => {
            try {
                const connected = await PositionDataService.isConnectedToSchwab();
                setIsConnected(connected);
            } catch (err) {
                console.warn('Could not check Schwab connection status:', err);
                setIsConnected(false);
            }
        };
        checkConnection();
    }, []);

    const detectWheelOpportunities = async () => {
        setIsLoading(true);
        setError('');

        try {
            console.log('🔍 Analyzing Schwab positions for wheel opportunities...');

            // Get fresh position data
            const positions = await PositionDataService.getSchwabPositions(true);

            if (positions.length === 0) {
                setError('No positions found. Make sure your Schwab account is connected and has positions.');
                return;
            }

            console.log(`📊 Analyzing ${positions.length} positions for wheel strategies...`);

            // Detect wheel strategies
            const detectionResults = WheelDetectionService.detectWheelStrategies(positions);

            console.log(`✅ Found ${detectionResults.length} potential wheel strategies:`, detectionResults);

            setDetectedWheels(detectionResults);

            if (detectionResults.length === 0) {
                setError('No wheel opportunities detected in your current positions. You may need positions with 100+ shares or short options to create wheels.');
            }
        } catch (err) {
            console.error('❌ Error detecting wheel opportunities:', err);
            setError('Failed to analyze positions. Please try again.');
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
        setSelectedResult(result);
    };

    const handleCreateWheel = (result) => {
        // This actually creates the wheel and calls the parent callback
        const suggestions = WheelDetectionService.generateWheelSuggestions(result);

        console.log('✅ Actually creating wheel from detection result:', result);
        console.log('💡 Suggested actions:', suggestions);

        // Call parent callback to create the wheel
        if (onWheelCreated) {
            onWheelCreated({
                ticker: result.ticker,
                strategy: result.strategy,
                positions: result.positions,
                suggestions
            });
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

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
                                            <h3 className="font-semibold text-amber-800">Schwab Connection Required</h3>
                                            <p className="text-sm text-amber-700 mt-1">
                                                Connect your Schwab account to automatically detect wheel opportunities from your positions.
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-3 border-amber-300"
                                        onClick={() => window.location.href = '/Settings'}
                                    >
                                        Go to Settings
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold">Detected Wheel Opportunities</h3>
                                        <p className="text-sm text-gray-600">
                                            We'll analyze your Schwab positions to find existing and potential wheel strategies.
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
                                                            onClick={() => handleSelectWheel(result)}
                                                            size="sm"
                                                            className="bg-purple-600 hover:bg-purple-700"
                                                        >
                                                            Create Wheel
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
                                                >
                                                    Confirm Creation
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
