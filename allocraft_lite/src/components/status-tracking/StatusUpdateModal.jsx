import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Settings,
    User,
    Bot,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Activity,
    Lightbulb
} from 'lucide-react';
import WheelStatusBadge from './WheelStatusBadge';
import { WheelManagementService } from '../../services/WheelManagementService';

/**
 * StatusUpdateModal - Advanced status management interface
 * 
 * Provides manual status override functionality with intelligent recommendations,
 * validation, and automatic detection integration.
 */
export default function StatusUpdateModal({
    isOpen,
    onClose,
    wheel,
    onStatusUpdate = () => { }
}) {
    const [selectedStatus, setSelectedStatus] = useState(wheel?.status || '');
    const [isUpdating, setIsUpdating] = useState(false);
    const [autoDetection, setAutoDetection] = useState(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [validationResult, setValidationResult] = useState(null);
    const [updateReason, setUpdateReason] = useState('');

    // Available status options with descriptions
    const statusOptions = [
        { value: 'pending', label: 'Pending', description: 'Initial setup phase' },
        { value: 'active', label: 'Active', description: 'Options active, generating income' },
        { value: 'monitoring', label: 'Monitoring', description: 'Watching for assignment/expiration' },
        { value: 'assigned', label: 'Assigned', description: 'Put assigned, holding shares' },
        { value: 'rolling', label: 'Rolling', description: 'Rolling options to new expiration' },
        { value: 'covered', label: 'Covered', description: 'Covered calls active on shares' },
        { value: 'expired', label: 'Expired', description: 'Options expired, ready for next cycle' },
        { value: 'paused', label: 'Paused', description: 'Strategy temporarily suspended' },
        { value: 'closed', label: 'Closed', description: 'Strategy completed or manually closed' }
    ];

    // Auto-detect recommended status
    const handleAutoDetect = async () => {
        setIsDetecting(true);
        try {
            const detection = await WheelManagementService.detectWheelStatus(wheel.id);
            setAutoDetection(detection);

            if (detection.confidence > 0.8) {
                setSelectedStatus(detection.recommended_status);
                await validateTransition(detection.recommended_status);
            }
        } catch (error) {
            console.error('Auto-detection failed:', error);
        } finally {
            setIsDetecting(false);
        }
    };

    // Validate status transition
    const validateTransition = async (newStatus) => {
        if (!newStatus || newStatus === wheel.status) {
            setValidationResult(null);
            return;
        }

        try {
            // Use the advanced validation from the service
            const validation = WheelManagementService.validateStatusTransitionAdvanced(
                wheel.status,
                newStatus,
                { manual: true, reason: updateReason }
            );
            setValidationResult(validation);
        } catch (error) {
            setValidationResult({
                valid: false,
                reason: error.message,
                warnings: [],
                recommendations: []
            });
        }
    };

    // Handle status selection change
    const handleStatusChange = async (newStatus) => {
        setSelectedStatus(newStatus);
        await validateTransition(newStatus);
    };

    // Update wheel status
    const handleUpdate = async () => {
        setIsUpdating(true);
        try {
            await WheelManagementService.updateWheelStatus(wheel.id, selectedStatus, {
                trigger_event: 'manual',
                automated: false,
                reason: updateReason || 'Manual status update',
                updated_by: 'user',
                auto_detection: autoDetection
            });

            onStatusUpdate(selectedStatus);
            onClose();
        } catch (error) {
            console.error('Status update failed:', error);
            alert(`Status update failed: ${error.message}`);
        } finally {
            setIsUpdating(false);
        }
    };

    const getConfidenceColor = (confidence) => {
        if (confidence >= 0.8) return 'text-green-600';
        if (confidence >= 0.6) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Update Wheel Status - {wheel?.ticker}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Current Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Current Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <WheelStatusBadge status={wheel?.status} size="lg" />
                                <div className="text-sm text-slate-600">
                                    Last updated: {wheel?.last_status_update ?
                                        new Date(wheel.last_status_update).toLocaleString() :
                                        'Unknown'
                                    }
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Auto-Detection */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Bot className="h-4 w-4" />
                                Automatic Status Detection
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <Button
                                    variant="outline"
                                    onClick={handleAutoDetect}
                                    disabled={isDetecting}
                                    className="w-full"
                                >
                                    {isDetecting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            <Bot className="h-4 w-4 mr-2" />
                                            Auto-Detect Recommended Status
                                        </>
                                    )}
                                </Button>

                                {autoDetection && (
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">Recommended:</span>
                                                <WheelStatusBadge status={autoDetection.recommended_status} size="sm" />
                                            </div>
                                            <Badge className={`${getConfidenceColor(autoDetection.confidence)}`}>
                                                {Math.round(autoDetection.confidence * 100)}% confident
                                            </Badge>
                                        </div>

                                        {autoDetection.trigger_events.length > 0 && (
                                            <div className="text-sm text-slate-600 mb-2">
                                                <span className="font-medium">Trigger events:</span>
                                                <ul className="list-disc list-inside ml-2">
                                                    {autoDetection.trigger_events.map((event, index) => (
                                                        <li key={index} className="capitalize">
                                                            {event.replace('_', ' ')}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {autoDetection.recommendations.length > 0 && (
                                            <div className="text-sm text-slate-600">
                                                <span className="font-medium">Recommendations:</span>
                                                <ul className="list-disc list-inside ml-2">
                                                    {autoDetection.recommendations.map((rec, index) => (
                                                        <li key={index}>{rec}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Manual Status Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Manual Status Selection
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {statusOptions.map((option) => (
                                        <div
                                            key={option.value}
                                            className={`
                                                p-3 border rounded-lg cursor-pointer transition-colors
                                                ${selectedStatus === option.value ?
                                                    'border-blue-500 bg-blue-50' :
                                                    'border-slate-200 hover:border-slate-300'
                                                }
                                            `}
                                            onClick={() => handleStatusChange(option.value)}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <WheelStatusBadge
                                                    status={option.value}
                                                    size="sm"
                                                    showTooltip={false}
                                                />
                                                <span className="font-medium text-sm">{option.label}</span>
                                            </div>
                                            <p className="text-xs text-slate-600">{option.description}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">
                                        Update Reason (Optional)
                                    </label>
                                    <textarea
                                        value={updateReason}
                                        onChange={(e) => setUpdateReason(e.target.value)}
                                        placeholder="Explain why you're updating the status..."
                                        className="w-full p-3 border rounded-lg resize-none"
                                        rows={2}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Validation Results */}
                    {validationResult && (
                        <Card>
                            <CardContent className="pt-6">
                                {validationResult.valid ? (
                                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                                        <div>
                                            <div className="font-medium text-green-800">Valid Transition</div>
                                            <div className="text-sm text-green-700">
                                                Status can be updated from {wheel?.status} to {selectedStatus}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                                        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                        <div>
                                            <div className="font-medium text-red-800">Invalid Transition</div>
                                            <div className="text-sm text-red-700">{validationResult.reason}</div>
                                        </div>
                                    </div>
                                )}

                                {validationResult.warnings?.length > 0 && (
                                    <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg mt-3">
                                        <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                                        <div>
                                            <div className="font-medium text-yellow-800">Warnings</div>
                                            <ul className="text-sm text-yellow-700 list-disc list-inside">
                                                {validationResult.warnings.map((warning, index) => (
                                                    <li key={index}>{warning}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {validationResult.recommendations?.length > 0 && (
                                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg mt-3">
                                        <Lightbulb className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                        <div>
                                            <div className="font-medium text-blue-800">Recommendations</div>
                                            <ul className="text-sm text-blue-700 list-disc list-inside">
                                                {validationResult.recommendations.map((rec, index) => (
                                                    <li key={index}>{rec}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-between pt-4 border-t">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdate}
                            disabled={
                                isUpdating ||
                                !selectedStatus ||
                                selectedStatus === wheel?.status ||
                                (validationResult && !validationResult.valid)
                            }
                        >
                            {isUpdating ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Updating...
                                </>
                            ) : (
                                'Update Status'
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
