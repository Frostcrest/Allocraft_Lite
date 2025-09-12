import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  X, ChevronLeft, ChevronRight, Target, Settings, Eye,
  CheckCircle2, AlertCircle, TrendingUp, DollarSign, Calendar,
  RotateCcw, Zap, Shield, Info
} from "lucide-react";
import { useCreateWheelCycle } from "@/api/enhancedClient";

// Step Components
import PositionTickerStep from './wheel-creation/PositionTickerStep';
import StrategySelectionStep from './wheel-creation/StrategySelectionStep';
import ParameterConfigurationStep from './wheel-creation/ParameterConfigurationStep';
import ReviewConfirmationStep from './wheel-creation/ReviewConfirmationStep';

/**
 * WheelCreationModal - Multi-step wizard for creating wheel strategies
 * Implements comprehensive workflow with strategy selection, parameter configuration, and review
 */
export default function WheelCreationModal({
  isOpen,
  onClose,
  onWheelCreated,
  prefilledData = null, // For quick creation from opportunities
  quickMode = false // Skip some steps for quick creation
}) {
  // Modal state management
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Position Selection (NEW)
    selectedTicker: prefilledData?.ticker || '',
    isManualEntry: false,

    // Strategy Selection
    strategyType: prefilledData?.strategy || '',
    ticker: prefilledData?.ticker || '',

    // Parameter Configuration
    strikePrice: prefilledData?.strikePrice || '',
    expirationDate: prefilledData?.expirationDate || '',
    contractCount: prefilledData?.contractCount || 1,
    premium: prefilledData?.premium || '',
    positionSize: prefilledData?.positionSize || '',

    // Risk Management
    stopLoss: prefilledData?.stopLoss || '',
    profitTarget: prefilledData?.profitTarget || '',
    maxDays: prefilledData?.maxDays || '',

    // Advanced Settings
    autoRoll: prefilledData?.autoRoll || false,
    notifications: prefilledData?.notifications || true,
    notes: prefilledData?.notes || ''
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // API mutation for creating wheel cycles
  const createWheelCycle = useCreateWheelCycle();

  // Step configuration
  const steps = [
    {
      id: 1,
      title: "Position Selection",
      description: "Choose ticker from your current positions",
      icon: Target,
      component: PositionTickerStep
    },
    {
      id: 2,
      title: "Strategy Selection",
      description: "Choose strategy type and review opportunities",
      icon: Target,
      component: StrategySelectionStep
    },
    {
      id: 3,
      title: "Parameter Configuration",
      description: "Set strike prices, expiration, and position sizing",
      icon: Settings,
      component: ParameterConfigurationStep
    },
    {
      id: 4,
      title: "Review & Confirmation",
      description: "Review settings and confirm wheel creation",
      icon: Eye,
      component: ReviewConfirmationStep
    }
  ];

  // Smart step navigation based on prefilled data
  useEffect(() => {
    if (quickMode && isOpen) {
      // If strategy is pre-filled from suggestion, skip to Parameter Configuration (Step 3)
      if (prefilledData?.strategy) {
        setCurrentStep(3);
        console.log('🚀 Quick mode with pre-filled strategy detected, skipping to Parameter Configuration');
      } else {
        // Otherwise skip to Strategy Selection (Step 2)
        setCurrentStep(2);
      }
    }
  }, [quickMode, isOpen, prefilledData]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && !prefilledData) {
      // Reset to default state only if no prefilled data
      const initialStep = quickMode ? (prefilledData?.strategy ? 3 : 2) : 1;
      setCurrentStep(initialStep);
      setValidationErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, quickMode, prefilledData]);

  // Step validation logic
  const validateStep = (stepNumber) => {
    const errors = {};

    switch (stepNumber) {
      case 1:
        // Position Selection validation - skip if we have prefilled ticker
        if (!formData.selectedTicker && !prefilledData?.ticker) {
          errors.selectedTicker = "Please select a ticker from your positions or enter manually";
        }
        break;

      case 2:
        // Strategy Selection validation - skip if we have prefilled strategy
        if (!formData.strategyType && !prefilledData?.strategy) {
          errors.strategyType = "Strategy type is required";
        }
        if (!formData.ticker && !prefilledData?.ticker) {
          errors.ticker = "Ticker symbol is required";
        }
        break;

      case 3:
        // Parameter Configuration validation
        if (!formData.strikePrice) errors.strikePrice = "Strike price is required";
        if (!formData.expirationDate) errors.expirationDate = "Expiration date is required";
        if (!formData.contractCount || formData.contractCount < 1) {
          errors.contractCount = "Contract count must be at least 1";
        }
        if (!formData.positionSize) errors.positionSize = "Position size is required";
        break;

      case 4:
        // Final validation before submission - use prefilled data if available
        const strategy = formData.strategyType || prefilledData?.strategy;
        const ticker = formData.ticker || prefilledData?.ticker;
        const strikePrice = formData.strikePrice || prefilledData?.strikePrice;

        if (!strategy || !ticker || !strikePrice) {
          errors.general = "Please complete all required fields";
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Navigation handlers
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(Math.min(currentStep + 1, steps.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(Math.max(currentStep - 1, 1));
  };

  const handleStepClick = (stepNumber) => {
    // Allow jumping to previous steps, but validate before going forward
    if (stepNumber <= currentStep || validateStep(currentStep)) {
      setCurrentStep(stepNumber);
    }
  };

  // Form data update handler
  const updateFormData = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));

    // Clear related validation errors
    const newErrors = { ...validationErrors };
    Object.keys(updates).forEach(key => {
      delete newErrors[key];
    });
    setValidationErrors(newErrors);
  };

  // Wheel creation submission
  const handleSubmit = async () => {
    if (!validateStep(4)) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Get the ticker for the wheel cycle
      const ticker = (formData.ticker || prefilledData?.ticker).toUpperCase();
      const strategy = formData.strategyType || prefilledData?.strategy;

      // Generate a unique cycle key
      const timestamp = Date.now();
      const cycleKey = `${ticker}-${strategy}-${timestamp}`;

      // Prepare wheel cycle data for backend API
      const wheelCycleData = {
        cycle_key: cycleKey,
        ticker: ticker,
        started_at: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        status: 'Open',
        strategy_type: strategy,
        notes: formData.notes || prefilledData?.notes || `${strategy.replace('_', ' ')} wheel created via ${quickMode ? 'quick creation' : 'full wizard'}`,
        detection_metadata: {
          // Store the original form data as metadata
          strike_price: parseFloat(formData.strikePrice || prefilledData?.strikePrice),
          expiration_date: formData.expirationDate || prefilledData?.expirationDate,
          contract_count: parseInt(formData.contractCount || prefilledData?.contractCount || 1),
          premium: parseFloat(formData.premium || prefilledData?.premium) || null,
          position_size: parseFloat(formData.positionSize || prefilledData?.positionSize),
          stop_loss: parseFloat(formData.stopLoss || prefilledData?.stopLoss) || null,
          profit_target: parseFloat(formData.profitTarget || prefilledData?.profitTarget) || null,
          max_days: parseInt(formData.maxDays || prefilledData?.maxDays) || null,
          auto_roll: formData.autoRoll || prefilledData?.autoRoll || false,
          notifications_enabled: formData.notifications ?? prefilledData?.notifications ?? true,
          created_via: quickMode ? 'quick_creation' : 'full_wizard',
          source_opportunity: prefilledData ? 'detected_opportunity' : 'manual_entry',
          creation_timestamp: new Date().toISOString()
        }
      };

      console.log('🚀 Creating wheel cycle:', wheelCycleData);

      // Call the actual backend API
      const createdWheelCycle = await createWheelCycle.mutateAsync(wheelCycleData);

      console.log('✅ Wheel cycle created successfully:', createdWheelCycle);

      // Notify parent component with the created wheel cycle
      onWheelCreated(createdWheelCycle);

    } catch (error) {
      console.error('❌ Wheel cycle creation failed:', error);

      // Handle specific API errors
      let errorMessage = 'Failed to create wheel cycle. Please try again.';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.status === 400) {
        errorMessage = 'Invalid wheel data. Please check your inputs.';
      } else if (error?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      setValidationErrors({
        general: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick creation helper
  const isQuickCreation = quickMode && prefilledData;

  // Current step component
  const CurrentStepComponent = steps[currentStep - 1]?.component;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
        {/* Modal Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <RotateCcw className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-slate-900">
                  {isQuickCreation ? 'Quick Wheel Creation' : 'Create New Wheel Strategy'}
                </DialogTitle>
                <p className="text-sm text-slate-600 mt-1">
                  {isQuickCreation
                    ? `Fast-track creation for ${prefilledData.ticker} ${prefilledData.strategy}`
                    : 'Set up a new wheel strategy with guided configuration'
                  }
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress Indicator */}
          {!isQuickCreation && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">
                  Step {currentStep} of {steps.length}
                </span>
                <span className="text-xs text-slate-500">
                  {Math.round((currentStep / steps.length) * 100)}% Complete
                </span>
              </div>
              <Progress value={(currentStep / steps.length) * 100} className="h-2" />
            </div>
          )}

          {/* Step Navigation */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;

              // Mark steps as completed if they were skipped due to prefilled data
              const isSkippedWithData = (
                (step.id === 1 && prefilledData?.ticker && quickMode) ||
                (step.id === 2 && prefilledData?.strategy && quickMode)
              );

              const isCompleted = currentStep > step.id || isSkippedWithData;
              const isAccessible = step.id <= currentStep || isCompleted;

              return (
                <button
                  key={step.id}
                  onClick={() => isAccessible && handleStepClick(step.id)}
                  disabled={!isAccessible}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium 
                    transition-all duration-200 whitespace-nowrap
                    ${isActive
                      ? 'bg-blue-600 text-white shadow-lg'
                      : isCompleted
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : isAccessible
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'bg-slate-50 text-slate-400 cursor-not-allowed'
                    }
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{step.title}</span>
                  <span className="sm:hidden">{step.id}</span>
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6">
            {/* Current Step Content */}
            {CurrentStepComponent && (
              <CurrentStepComponent
                formData={formData}
                updateFormData={updateFormData}
                validationErrors={validationErrors}
                isQuickMode={quickMode}
                prefilledData={prefilledData}
              />
            )}

            {/* General Error Display */}
            {validationErrors.general && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-900">Error</span>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  {validationErrors.general}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Step Info */}
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Info className="w-4 h-4" />
              <span>{steps[currentStep - 1]?.description}</span>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-3">
              {currentStep > 1 && !isQuickCreation && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isSubmitting}
                  className="border-slate-300"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
              )}

              {currentStep < steps.length ? (
                <Button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Create Wheel
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Quick Creation Footer Note */}
          {isQuickCreation && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Quick creation uses smart defaults. You can modify settings after creation.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
