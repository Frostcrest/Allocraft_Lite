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

// Step Components
import PositionOpportunityStep from './wheel-creation/PositionOpportunityStep';
import StrategySelectionStep from './wheel-creation/StrategySelectionStep';
import ParameterConfigurationStep from './wheel-creation/ParameterConfigurationStep';
import ReviewConfirmationStep from './wheel-creation/ReviewConfirmationStep';
import { createWheel } from '../services/WheelManagementService';

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
  // console.log('🎭 WheelCreationModal rendering:', { isOpen, quickMode, prefilledData });

  // Modal state management
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
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

  // Step configuration
  const steps = [
    {
      id: 1,
      title: "Position Opportunity",
      description: "Select from existing positions or create manually",
      icon: Target,
      component: PositionOpportunityStep
    },
    {
      id: 2,
      title: "Strategy Selection",
      description: "Choose strategy type and target ticker",
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

  // Skip to step 3 for quick mode (skip position selection and strategy selection)
  useEffect(() => {
    if (quickMode && isOpen && prefilledData) {
      // Only use quick mode if we have complete essential data
      const hasEssentialData = prefilledData.ticker && prefilledData.strategy;
      if (hasEssentialData) {
        setCurrentStep(3);
      } else {
        // Incomplete data - start from step 1
        console.warn('🚨 Quick mode requested but prefilledData is incomplete:', prefilledData);
        setCurrentStep(1);
      }
    }
  }, [quickMode, isOpen, prefilledData]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && !prefilledData) {
      // Reset to default state only if no prefilled data
      setCurrentStep(quickMode ? 3 : 1);
      setValidationErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, quickMode, prefilledData]);

  // Step validation logic
  const validateStep = (stepNumber) => {
    const errors = {};
    console.log('🔍 Validating step', stepNumber, 'with form data:', formData);

    switch (stepNumber) {
      case 1:
        // Position selection step - minimal validation
        if (!formData.fromPosition && (!formData.ticker || !formData.strategyType)) {
          errors.general = "Please select a position opportunity or enter ticker and strategy manually";
        }
        break;

      case 2:
        // Strategy selection step (may be skipped if coming from position)
        console.log('🔍 Step 2 validation - strategyType:', formData.strategyType, 'ticker:', formData.ticker);
        if (!formData.strategyType) errors.strategyType = "Strategy type is required";
        if (!formData.ticker) errors.ticker = "Ticker symbol is required";
        break;

      case 3:
        // Parameter configuration
        if (!formData.strikePrice) errors.strikePrice = "Strike price is required";
        if (!formData.expirationDate) errors.expirationDate = "Expiration date is required";
        if (!formData.contractCount || formData.contractCount < 1) {
          errors.contractCount = "Contract count must be at least 1";
        }
        if (!formData.positionSize) errors.positionSize = "Position size is required";
        break;

      case 4:
        // Final validation before submission
        if (!formData.strategyType || !formData.ticker || !formData.strikePrice) {
          errors.general = "Please complete all required fields";
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Navigation handlers
  const handleNext = () => {
    console.log('🚀 handleNext called for step', currentStep);
    const isValid = validateStep(currentStep);
    console.log('✅ Step validation result:', isValid);
    if (isValid) {
      const nextStep = Math.min(currentStep + 1, steps.length);
      console.log('➡️ Moving to step', nextStep);
      setCurrentStep(nextStep);
    } else {
      console.log('❌ Validation failed, staying on step', currentStep);
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
    // console.log('🚀 Starting wheel creation submission...');

    if (!validateStep(3)) {
      // console.log('❌ Final validation failed');
      return;
    }

    setIsSubmitting(true);

    try {
      // Validate required fields before submission
      if (!formData.ticker || !formData.strategyType) {
        setValidationErrors({
          general: 'Ticker and strategy type are required fields'
        });
        return;
      }

      // Prepare wheel data for backend (matching WheelCycleCreate schema and WheelManagementService validation)
      const wheelData = {
        cycle_key: `${formData.ticker.toUpperCase()}-${Date.now()}`, // Unique key
        ticker: formData.ticker.toUpperCase(),
        started_at: new Date().toISOString().split('T')[0], // Today's date
        status: "Open",
        strategy_type: formData.strategyType,
        // Direct fields required by WheelManagementService validation
        strike_price: parseFloat(formData.strikePrice) || null,
        shares_quantity: parseInt(formData.contractCount) * 100 || null, // For covered calls
        expiration_date: formData.expirationDate || null,
        quantity: parseInt(formData.contractCount) || 1,
        notes: `Created via ${quickMode ? 'quick creation' : 'full wizard'}. Strategy: ${formData.strategyType}`,
        detection_metadata: {
          strike_price: parseFloat(formData.strikePrice) || null,
          expiration_date: formData.expirationDate || null,
          contract_count: parseInt(formData.contractCount) || 1,
          premium: parseFloat(formData.premium) || null,
          position_size: parseFloat(formData.positionSize) || null,
          created_via: quickMode ? 'quick_creation' : 'full_wizard',
          creation_timestamp: new Date().toISOString()
        }
      };

      console.log('📊 Prepared wheel data for submission:', wheelData);

      // Call actual backend API
      const response = await createWheel(wheelData);

      console.log('✅ Wheel creation successful:', response);

      // Notify parent component
      onWheelCreated(response);

    } catch (error) {
      console.error('❌ Wheel creation failed:', error);
      setValidationErrors({
        general: 'Failed to create wheel. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick creation helper - only true if we have complete essential data
  const isQuickCreation = quickMode && prefilledData && prefilledData.ticker && prefilledData.strategy;

  // Current step component
  const CurrentStepComponent = steps[currentStep - 1]?.component;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden p-0 flex flex-col">
        {/* Modal Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
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
                  {isQuickCreation && prefilledData?.ticker && prefilledData?.strategy
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
              const isCompleted = currentStep > step.id;
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
            {/* Quick Creation Badge */}
            {isQuickCreation && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-600" />
                  <span className="font-medium text-amber-900">Quick Creation Mode</span>
                  <Badge variant="secondary" className="text-xs">Fast Track</Badge>
                </div>
                <p className="text-sm text-amber-700 mt-1">
                  Pre-filled with opportunity data. Review and adjust parameters as needed.
                </p>
              </div>
            )}

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
        <div className="flex-shrink-0 px-6 py-4 border-t border-slate-200 bg-slate-50">
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
