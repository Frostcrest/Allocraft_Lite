/**
 * Wheel Management Service Layer
 * 
 * Centralized business logic service for comprehensive wheel strategy management.
 * Provides standardized interfaces for all wheel lifecycle operations with
 * integrated validation, error handling, and React Query optimization.
 * 
 * Key Features:
 * - Centralized business logic for all wheel operations
 * - Standardized validation and error handling
 * - React Query integration for optimal caching
 * - Event logging and audit trail management
 * - Performance calculation and risk assessment
 * - Status transition management
 */

import { queryClient } from '../api/enhancedClient';
import { apiFetch } from '../api/fastapiClient';

// Enhanced API wrapper for this service
const enhancedFetch = async <T = any>(path: string, options: RequestInit = {}): Promise<T> => {
    const response = await apiFetch(path, options);

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch {
            errorData = { message: response.statusText };
        }
        throw new Error(errorData.message || errorData.detail || 'Request failed');
    }

    return response.json();
};

// Types
interface WheelData {
    ticker: string;
    strategy_type: string;
    strike_price?: number;
    shares_quantity?: number;
    expiration_date?: string;
    quantity?: number;
}

interface WheelUpdates {
    strike_price?: number;
    quantity?: number;
    expiration_date?: string;
    [key: string]: any;
}

interface RollData {
    from_expiration: string;
    to_expiration: string;
    roll_type: string;
    net_credit?: number;
}

interface CloseData {
    reason: string;
    close_date: string;
    [key: string]: any;
}

interface RiskAssessment {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    assessment_date: string;
}

interface PnLCalculation {
    total_premiums: number;
    total_costs: number;
    net_profit: number;
    total_return: number;
    annualized_return: number;
    duration_days: number;
    calculation_date: string;
}

interface StatusHistoryEntry {
    id?: number;
    cycle_id: number;
    previous_status: string | null;
    new_status: string;
    trigger_event: string;
    automated: boolean;
    metadata: any;
    updated_by: string | null;
    timestamp: string;
}

interface AutoStatusDetectionResult {
    recommended_status: string;
    confidence: number;
    trigger_events: string[];
    position_analysis: any;
    recommendations: string[];
}

interface StatusTransitionValidation {
    valid: boolean;
    reason?: string;
    warnings: string[];
    recommendations: string[];
}

/**
 * Wheel Management Service Class
 * Handles all wheel strategy business logic and API interactions
 */
export class WheelManagementService {

    /**
     * Create a new wheel strategy
     */
    static async createWheel(wheelData: WheelData): Promise<any> {
        try {
            console.log('🔄 WheelManagementService: Creating wheel:', wheelData);

            // Validation
            this.validateWheelCreationData(wheelData);

            // Create wheel cycle via API
            const response = await enhancedFetch('/wheels/wheel-cycles', {
                method: 'POST',
                body: JSON.stringify(wheelData)
            });

            // Log creation event
            await this.logWheelEvent(response.id, {
                event_type: 'created',
                description: `Wheel strategy created for ${wheelData.ticker}`,
                metadata: { strategy: wheelData.strategy_type }
            });

            // Invalidate relevant caches
            await this.invalidateWheelCaches();

            console.log('✅ WheelManagementService: Wheel created successfully:', response);
            return response;

        } catch (error: any) {
            console.error('❌ WheelManagementService: Wheel creation failed:', error);
            throw this.enhanceError(error, 'createWheel', wheelData);
        }
    }

    /**
     * Update wheel parameters
     */
    static async updateWheel(wheelId: string | number, updates: WheelUpdates): Promise<any> {
        try {
            console.log('🔄 WheelManagementService: Updating wheel:', wheelId, updates);

            // Validation
            this.validateWheelUpdates(updates);

            // Risk assessment for parameter changes
            const riskAssessment = await this.assessParameterRisk(wheelId, updates);

            // Update wheel via API
            const response = await enhancedFetch(`/wheels/wheel-cycles/${wheelId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    ...updates,
                    risk_assessment: riskAssessment
                })
            });

            // Log update event
            await this.logWheelEvent(wheelId, {
                event_type: 'parameter_update',
                description: 'Wheel parameters updated',
                metadata: {
                    changes: updates,
                    risk_level: riskAssessment.level
                }
            });

            // Update cache
            queryClient.setQueryData(['wheel-cycles'], (oldData: any) => {
                if (!oldData) return oldData;
                return oldData.map((wheel: any) =>
                    wheel.id === wheelId ? { ...wheel, ...response } : wheel
                );
            });

            console.log('✅ WheelManagementService: Wheel updated successfully:', response);
            return response;

        } catch (error: any) {
            console.error('❌ WheelManagementService: Wheel update failed:', error);
            throw this.enhanceError(error, 'updateWheel', { wheelId, updates });
        }
    }

    /**
     * Roll wheel options to new expiration
     */
    static async rollWheel(wheelId: string | number, rollData: RollData): Promise<any> {
        try {
            console.log('🔄 WheelManagementService: Rolling wheel:', wheelId, rollData);

            // Validation
            this.validateRollData(rollData);

            // Scenario analysis for rolling decision
            const scenarios = await this.analyzeRollScenarios(wheelId, rollData);

            // Execute roll via API
            const response = await enhancedFetch(`/wheels/wheel-cycles/${wheelId}/roll`, {
                method: 'POST',
                body: JSON.stringify({
                    ...rollData,
                    scenarios: scenarios
                })
            });

            // Log roll event
            await this.logWheelEvent(wheelId, {
                event_type: 'options_roll',
                description: `Options rolled: ${rollData.from_expiration} → ${rollData.to_expiration}`,
                metadata: {
                    roll_type: rollData.roll_type,
                    net_credit: rollData.net_credit,
                    scenarios: scenarios
                }
            });

            // Invalidate caches
            await this.invalidateWheelCaches();

            console.log('✅ WheelManagementService: Wheel rolled successfully:', response);
            return response;

        } catch (error: any) {
            console.error('❌ WheelManagementService: Wheel roll failed:', error);
            throw this.enhanceError(error, 'rollWheel', { wheelId, rollData });
        }
    }

    /**
     * Close wheel strategy
     */
    static async closeWheel(wheelId: string | number, closeData: CloseData): Promise<any> {
        try {
            console.log('🔄 WheelManagementService: Closing wheel:', wheelId, closeData);

            // Validation
            this.validateCloseData(closeData);

            // Calculate final P&L
            const finalPnL = await this.calculateFinalPnL(wheelId, closeData);

            // Close wheel via API
            const response = await enhancedFetch(`/wheels/wheel-cycles/${wheelId}/close`, {
                method: 'POST',
                body: JSON.stringify({
                    ...closeData,
                    final_pnl: finalPnL
                })
            });

            // Log closure event
            await this.logWheelEvent(wheelId, {
                event_type: 'strategy_closed',
                description: `Wheel strategy closed`,
                metadata: {
                    closure_reason: closeData.reason,
                    final_pnl: finalPnL,
                    total_return: finalPnL.total_return,
                    duration_days: finalPnL.duration_days
                }
            });

            // Update cache to mark as closed
            queryClient.setQueryData(['wheel-cycles'], (oldData: any) => {
                if (!oldData) return oldData;
                return oldData.map((wheel: any) =>
                    wheel.id === wheelId ? { ...wheel, status: 'closed', ...response } : wheel
                );
            });

            console.log('✅ WheelManagementService: Wheel closed successfully:', response);
            return response;

        } catch (error: any) {
            console.error('❌ WheelManagementService: Wheel closure failed:', error);
            throw this.enhanceError(error, 'closeWheel', { wheelId, closeData });
        }
    }

    /**
     * Get comprehensive wheel details
     */
    static async getWheelDetails(wheelId: string | number): Promise<any> {
        try {
            console.log('🔄 WheelManagementService: Fetching wheel details:', wheelId);

            // Fetch wheel data with parallel requests for efficiency
            const [wheelData, events, performance, positions] = await Promise.all([
                enhancedFetch(`/wheels/wheel-cycles/${wheelId}`),
                enhancedFetch(`/wheels/wheel-events?cycle_id=${wheelId}`),
                this.safeApiCall(() => enhancedFetch(`/wheels/wheel-cycles/${wheelId}/performance`), {}),
                this.safeApiCall(() => enhancedFetch(`/wheels/wheel-cycles/${wheelId}/positions`), [])
            ]);

            // Combine all data
            const detailsData = {
                ...wheelData,
                events: events || [],
                performance: performance || {},
                positions: positions || [],
                last_updated: new Date().toISOString()
            };

            console.log('✅ WheelManagementService: Wheel details fetched:', detailsData);
            return detailsData;

        } catch (error: any) {
            console.error('❌ WheelManagementService: Failed to fetch wheel details:', error);
            throw this.enhanceError(error, 'getWheelDetails', { wheelId });
        }
    }

    /**
     * Get wheel event history
     */
    static async getWheelEvents(wheelId: string | number): Promise<any[]> {
        try {
            console.log('🔄 WheelManagementService: Fetching wheel events:', wheelId);

            const events = await enhancedFetch(`/wheels/wheel-events?cycle_id=${wheelId}`);

            // Enhance events with status transitions
            const enhancedEvents = events.map((event: any) => ({
                ...event,
                status_transition: this.calculateStatusTransition(event),
                risk_impact: this.assessEventRiskImpact(event)
            }));

            console.log('✅ WheelManagementService: Wheel events fetched:', enhancedEvents);
            return enhancedEvents;

        } catch (error: any) {
            console.error('❌ WheelManagementService: Failed to fetch wheel events:', error);
            throw this.enhanceError(error, 'getWheelEvents', { wheelId });
        }
    }

    /**
     * Update wheel status with transition logic
     */
    static async updateWheelStatus(wheelId: string | number, newStatus: string, context: any = {}): Promise<any> {
        try {
            console.log('🔄 WheelManagementService: Updating wheel status:', wheelId, newStatus);

            // Validate status transition
            const currentWheel = await this.getWheelDetails(wheelId);
            const validation = this.validateStatusTransitionAdvanced(currentWheel.status, newStatus, context);

            if (!validation.valid) {
                throw new Error(`Invalid status transition: ${currentWheel.status} → ${newStatus}. ${validation.reason}`);
            }

            // Log warnings if any
            if (validation.warnings.length > 0) {
                console.warn('⚠️ Status transition warnings:', validation.warnings);
            }

            // Create status history entry
            const historyEntry = {
                cycle_id: wheelId,
                previous_status: currentWheel.status,
                new_status: newStatus,
                trigger_event: context.trigger_event || 'manual',
                automated: context.automated || false,
                metadata: {
                    context: context,
                    validation: validation,
                    timestamp: new Date().toISOString()
                },
                updated_by: context.updated_by || 'system'
            };

            // Update status via API
            const response = await this.safeApiCall(
                () => enhancedFetch(`/wheels/wheel-cycles/${wheelId}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        status: newStatus,
                        context: context,
                        timestamp: new Date().toISOString(),
                        history_entry: historyEntry
                    })
                }),
                { status: newStatus }
            );

            // Log status change event
            await this.logWheelEvent(wheelId, {
                event_type: 'status_change',
                description: `Status changed: ${currentWheel.status} → ${newStatus}`,
                metadata: {
                    previous_status: currentWheel.status,
                    new_status: newStatus,
                    context: context,
                    validation: validation
                }
            });

            // Update cache
            queryClient.setQueryData(['wheel-cycles'], (oldData: any) => {
                if (!oldData) return oldData;
                return oldData.map((wheel: any) =>
                    wheel.id === wheelId ? { ...wheel, status: newStatus } : wheel
                );
            });

            // Invalidate status-related queries
            await queryClient.invalidateQueries({ queryKey: ['wheel-status-history', wheelId] });

            console.log('✅ WheelManagementService: Wheel status updated:', response);
            return response;

        } catch (error: any) {
            console.error('❌ WheelManagementService: Status update failed:', error);
            throw this.enhanceError(error, 'updateWheelStatus', { wheelId, newStatus, context });
        }
    }

    /**
     * Get comprehensive status history for a wheel
     */
    static async getStatusHistory(wheelId: string | number): Promise<StatusHistoryEntry[]> {
        try {
            console.log('🔄 WheelManagementService: Fetching status history:', wheelId);

            const history = await enhancedFetch(`/wheels/wheel-cycles/${wheelId}/status/history`);

            // Enhance history entries with additional context
            const enhancedHistory = history.map((entry: any) => ({
                ...entry,
                duration_since: this.calculateDurationSince(entry.timestamp),
                transition_type: this.classifyTransition(entry.previous_status, entry.new_status),
                impact_level: this.assessTransitionImpact(entry)
            }));

            console.log('✅ WheelManagementService: Status history fetched:', enhancedHistory);
            return enhancedHistory;

        } catch (error: any) {
            console.error('❌ WheelManagementService: Failed to fetch status history:', error);
            throw this.enhanceError(error, 'getStatusHistory', { wheelId });
        }
    }

    /**
     * Automatically detect wheel status based on current positions
     */
    static async detectWheelStatus(wheelId: string | number): Promise<AutoStatusDetectionResult> {
        try {
            console.log('🔄 WheelManagementService: Auto-detecting wheel status:', wheelId);

            const wheelDetails = await this.getWheelDetails(wheelId);
            const positions = wheelDetails.positions || [];

            // Analyze current positions
            const positionAnalysis = this.analyzeWheelPositions(positions);

            // Determine recommended status
            let recommendedStatus = wheelDetails.status;
            let confidence = 0.5;
            const triggerEvents: string[] = [];
            const recommendations: string[] = [];

            // Check for assignment events
            if (positionAnalysis.hasAssignedPositions) {
                recommendedStatus = 'assigned';
                confidence = 0.9;
                triggerEvents.push('position_assignment');
                recommendations.push('Consider selling covered calls on assigned shares');
            }

            // Check for expiration events
            if (positionAnalysis.hasExpiredOptions) {
                if (positionAnalysis.hasStockPositions) {
                    recommendedStatus = 'covered';
                    triggerEvents.push('option_expiration_with_stock');
                } else {
                    recommendedStatus = 'expired';
                    triggerEvents.push('option_expiration');
                }
                confidence = 0.95;
            }

            // Check for active options near expiration
            if (positionAnalysis.hasOptionsNearExpiration) {
                recommendedStatus = 'monitoring';
                confidence = 0.8;
                triggerEvents.push('options_near_expiration');
                recommendations.push('Monitor for assignment risk and consider rolling options');
            }

            // Check for no positions (wheel completed)
            if (positionAnalysis.totalPositions === 0) {
                recommendedStatus = 'closed';
                confidence = 0.9;
                triggerEvents.push('all_positions_closed');
                recommendations.push('Wheel strategy completed successfully');
            }

            const result: AutoStatusDetectionResult = {
                recommended_status: recommendedStatus,
                confidence: confidence,
                trigger_events: triggerEvents,
                position_analysis: positionAnalysis,
                recommendations: recommendations
            };

            console.log('✅ WheelManagementService: Auto-detection completed:', result);
            return result;

        } catch (error: any) {
            console.error('❌ WheelManagementService: Auto-detection failed:', error);
            throw this.enhanceError(error, 'detectWheelStatus', { wheelId });
        }
    }

    /**
     * Update wheel status automatically based on position changes
     */
    static async autoUpdateWheelStatus(wheelId: string | number, trigger: string = 'position_change'): Promise<any> {
        try {
            console.log('🔄 WheelManagementService: Auto-updating wheel status:', wheelId, trigger);

            const detection = await this.detectWheelStatus(wheelId);

            // Only update if confidence is high and status actually changed
            if (detection.confidence > 0.8) {
                const currentWheel = await this.getWheelDetails(wheelId);

                if (detection.recommended_status !== currentWheel.status) {
                    const result = await this.updateWheelStatus(wheelId, detection.recommended_status, {
                        trigger_event: trigger,
                        automated: true,
                        detection_result: detection,
                        updated_by: 'auto_detector'
                    });

                    console.log('✅ WheelManagementService: Auto-status update completed:', result);
                    return result;
                } else {
                    console.log('📊 WheelManagementService: Status unchanged after detection');
                    return { status: 'unchanged', detection: detection };
                }
            } else {
                console.log('📊 WheelManagementService: Auto-detection confidence too low, manual review needed');
                return { status: 'manual_review_needed', detection: detection };
            }

        } catch (error: any) {
            console.error('❌ WheelManagementService: Auto-update failed:', error);
            throw this.enhanceError(error, 'autoUpdateWheelStatus', { wheelId, trigger });
        }
    }

    // ========================================
    // VALIDATION METHODS
    // ========================================

    /**
     * Validate wheel creation data
     */
    static validateWheelCreationData(wheelData: WheelData): void {
        const required = ['ticker', 'strategy_type'];
        const missing = required.filter(field => !wheelData[field as keyof WheelData]);

        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }

        // Strategy-specific validation
        if (wheelData.strategy_type === 'cash_secured_put' && !wheelData.strike_price) {
            throw new Error('Strike price is required for cash-secured put strategy');
        }

        if (wheelData.strategy_type === 'covered_call' && !wheelData.shares_quantity) {
            throw new Error('Shares quantity is required for covered call strategy');
        }
    }

    /**
     * Validate wheel parameter updates
     */
    static validateWheelUpdates(updates: WheelUpdates): void {
        // Validate strike price changes
        if (updates.strike_price && (updates.strike_price <= 0 || updates.strike_price > 10000)) {
            throw new Error('Strike price must be between $0 and $10,000');
        }

        // Validate quantity changes
        if (updates.quantity && updates.quantity < 1) {
            throw new Error('Quantity must be at least 1');
        }

        // Validate expiration date
        if (updates.expiration_date) {
            const expDate = new Date(updates.expiration_date);
            const today = new Date();
            if (expDate <= today) {
                throw new Error('Expiration date must be in the future');
            }
        }
    }

    /**
     * Validate roll data
     */
    static validateRollData(rollData: RollData): void {
        const required = ['from_expiration', 'to_expiration', 'roll_type'];
        const missing = required.filter(field => !rollData[field as keyof RollData]);

        if (missing.length > 0) {
            throw new Error(`Missing required roll fields: ${missing.join(', ')}`);
        }

        // Validate roll direction
        const fromDate = new Date(rollData.from_expiration);
        const toDate = new Date(rollData.to_expiration);

        if (toDate <= fromDate) {
            throw new Error('Roll expiration must be later than current expiration');
        }
    }

    /**
     * Validate closure data
     */
    static validateCloseData(closeData: CloseData): void {
        const required = ['reason', 'close_date'];
        const missing = required.filter(field => !closeData[field as keyof CloseData]);

        if (missing.length > 0) {
            throw new Error(`Missing required closure fields: ${missing.join(', ')}`);
        }

        const validReasons = ['profit_target', 'stop_loss', 'assignment', 'expiration', 'manual'];
        if (!validReasons.includes(closeData.reason)) {
            throw new Error(`Invalid closure reason: ${closeData.reason}`);
        }
    }

    // ========================================
    // BUSINESS LOGIC METHODS
    // ========================================

    /**
     * Assess risk of parameter changes
     */
    static async assessParameterRisk(wheelId: string | number, updates: WheelUpdates): Promise<RiskAssessment> {
        try {
            const currentWheel = await this.getWheelDetails(wheelId);
            let riskLevel: 'low' | 'medium' | 'high' = 'low';
            const riskFactors: string[] = [];

            // Assess strike price changes
            if (updates.strike_price && currentWheel.strike_price) {
                const priceChange = Math.abs(updates.strike_price - currentWheel.strike_price) / currentWheel.strike_price;
                if (priceChange > 0.1) {
                    riskLevel = 'high';
                    riskFactors.push('Significant strike price change (>10%)');
                } else if (priceChange > 0.05) {
                    riskLevel = 'medium';
                    riskFactors.push('Moderate strike price change (>5%)');
                }
            }

            // Assess quantity changes
            if (updates.quantity && currentWheel.quantity) {
                const quantityChange = Math.abs(updates.quantity - currentWheel.quantity) / currentWheel.quantity;
                if (quantityChange > 0.5) {
                    riskLevel = 'high';
                    riskFactors.push('Large quantity change (>50%)');
                }
            }

            return {
                level: riskLevel,
                factors: riskFactors,
                assessment_date: new Date().toISOString()
            };

        } catch (error) {
            console.warn('Risk assessment failed, using default:', error);
            return { level: 'medium', factors: ['Unable to assess risk'], assessment_date: new Date().toISOString() };
        }
    }

    /**
     * Analyze roll scenarios
     */
    static async analyzeRollScenarios(_wheelId: string | number, rollData: RollData): Promise<any> {
        try {
            // Simplified scenario analysis - can be enhanced with market data
            const scenarios = {
                optimistic: {
                    probability: 0.3,
                    outcome: 'Options expire worthless, keep premium',
                    estimated_profit: rollData.net_credit || 0
                },
                likely: {
                    probability: 0.5,
                    outcome: 'Roll again at next expiration',
                    estimated_profit: (rollData.net_credit || 0) * 0.7
                },
                pessimistic: {
                    probability: 0.2,
                    outcome: 'Assignment or early closure',
                    estimated_profit: (rollData.net_credit || 0) * 0.3
                }
            };

            return scenarios;

        } catch (error) {
            console.warn('Scenario analysis failed, using defaults:', error);
            return {
                likely: {
                    probability: 1.0,
                    outcome: 'Standard roll execution',
                    estimated_profit: rollData.net_credit || 0
                }
            };
        }
    }

    /**
     * Calculate final P&L for wheel closure
     */
    static async calculateFinalPnL(wheelId: string | number, closeData: CloseData): Promise<PnLCalculation> {
        try {
            const wheelDetails = await this.getWheelDetails(wheelId);
            const events = wheelDetails.events || [];

            // Calculate total premiums received
            const totalPremiums = events
                .filter((event: any) => event.event_type === 'premium_received')
                .reduce((sum: number, event: any) => sum + (event.amount || 0), 0);

            // Calculate costs (commissions, assignment costs, etc.)
            const totalCosts = events
                .filter((event: any) => event.event_type === 'cost')
                .reduce((sum: number, event: any) => sum + (event.amount || 0), 0);

            // Calculate duration
            const startDate = new Date(wheelDetails.created_at);
            const endDate = new Date(closeData.close_date);
            const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

            const netProfit = totalPremiums - totalCosts;
            const totalReturn = wheelDetails.capital_requirement ? (netProfit / wheelDetails.capital_requirement) * 100 : 0;
            const annualizedReturn = durationDays > 0 ? (totalReturn * 365 / durationDays) : 0;

            return {
                total_premiums: totalPremiums,
                total_costs: totalCosts,
                net_profit: netProfit,
                total_return: totalReturn,
                annualized_return: annualizedReturn,
                duration_days: durationDays,
                calculation_date: new Date().toISOString()
            };

        } catch (error) {
            console.warn('P&L calculation failed, using defaults:', error);
            return {
                total_premiums: 0,
                total_costs: 0,
                net_profit: 0,
                total_return: 0,
                annualized_return: 0,
                duration_days: 0,
                calculation_date: new Date().toISOString()
            };
        }
    }

    /**
     * Validate status transitions (basic)
     */
    static validateStatusTransition(currentStatus: string, newStatus: string): boolean {
        const validTransitions: { [key: string]: string[] } = {
            'active': ['paused', 'monitoring', 'closed', 'assigned', 'rolling', 'covered'],
            'paused': ['active', 'closed'],
            'monitoring': ['active', 'paused', 'closed', 'assigned', 'rolling'],
            'assigned': ['active', 'closed', 'covered'],
            'rolling': ['active', 'closed', 'monitoring'],
            'covered': ['active', 'closed', 'monitoring'],
            'expired': ['closed', 'active'],
            'closed': [], // No transitions from closed
            'pending': ['active', 'closed']
        };

        return validTransitions[currentStatus]?.includes(newStatus) || false;
    }

    /**
     * Validate status transitions with advanced logic
     */
    static validateStatusTransitionAdvanced(currentStatus: string, newStatus: string, context: any = {}): StatusTransitionValidation {
        const basicValidation = this.validateStatusTransition(currentStatus, newStatus);
        const warnings: string[] = [];
        const recommendations: string[] = [];

        if (!basicValidation) {
            return {
                valid: false,
                reason: `Invalid transition from ${currentStatus} to ${newStatus}`,
                warnings: [],
                recommendations: ['Review wheel status transition rules']
            };
        }

        // Add contextual warnings and recommendations
        if (currentStatus === 'active' && newStatus === 'closed' && !context.manual_closure) {
            warnings.push('Closing active wheel without completion may result in missed opportunities');
            recommendations.push('Consider allowing wheel to complete naturally');
        }

        if (currentStatus === 'assigned' && newStatus === 'active' && !context.shares_sold) {
            warnings.push('Transitioning from assigned to active without selling shares');
            recommendations.push('Verify covered call strategy is in place');
        }

        return {
            valid: true,
            warnings: warnings,
            recommendations: recommendations
        };
    }

    /**
     * Calculate duration since timestamp
     */
    static calculateDurationSince(timestamp: string): string {
        const now = new Date();
        const then = new Date(timestamp);
        const diffMs = now.getTime() - then.getTime();

        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) {
            return `${days} day${days !== 1 ? 's' : ''} ago`;
        } else if (hours > 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else {
            return 'Less than an hour ago';
        }
    }

    /**
     * Classify transition type
     */
    static classifyTransition(previousStatus: string | null, newStatus: string): string {
        if (!previousStatus) return 'initial';

        const progressiveTransitions = ['pending', 'active', 'monitoring', 'assigned', 'covered', 'closed'];
        const prevIndex = progressiveTransitions.indexOf(previousStatus);
        const newIndex = progressiveTransitions.indexOf(newStatus);

        if (newStatus === 'paused') return 'suspension';
        if (previousStatus === 'paused') return 'resumption';
        if (newStatus === 'closed') return 'termination';
        if (newIndex > prevIndex) return 'progression';
        if (newIndex < prevIndex) return 'regression';

        return 'lateral';
    }

    /**
     * Assess transition impact level
     */
    static assessTransitionImpact(entry: any): string {
        const highImpactTransitions = ['assigned', 'closed', 'expired'];
        const mediumImpactTransitions = ['monitoring', 'rolling', 'covered'];

        if (highImpactTransitions.includes(entry.new_status)) return 'high';
        if (mediumImpactTransitions.includes(entry.new_status)) return 'medium';

        return 'low';
    }

    /**
     * Analyze wheel positions for status detection
     */
    static analyzeWheelPositions(positions: any[]): any {
        const analysis = {
            totalPositions: positions.length,
            hasStockPositions: false,
            hasOptionPositions: false,
            hasAssignedPositions: false,
            hasExpiredOptions: false,
            hasOptionsNearExpiration: false,
            optionsByType: {
                puts: 0,
                calls: 0
            },
            expirationAnalysis: {
                within7Days: 0,
                within30Days: 0,
                expired: 0
            }
        };

        const now = new Date();

        positions.forEach(position => {
            if (position.position_type === 'stock' || position.instrument_type === 'stock') {
                analysis.hasStockPositions = true;

                // Check for assignment indicators
                if (position.assigned || position.acquisition_method === 'assignment') {
                    analysis.hasAssignedPositions = true;
                }
            } else if (position.position_type === 'option' || position.instrument_type === 'option') {
                analysis.hasOptionPositions = true;

                // Categorize option types
                if (position.option_type === 'put') {
                    analysis.optionsByType.puts++;
                } else if (position.option_type === 'call') {
                    analysis.optionsByType.calls++;
                }

                // Check expiration status
                if (position.expiration_date) {
                    const expDate = new Date(position.expiration_date);
                    const daysToExpiration = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                    if (daysToExpiration < 0) {
                        analysis.hasExpiredOptions = true;
                        analysis.expirationAnalysis.expired++;
                    } else if (daysToExpiration <= 7) {
                        analysis.hasOptionsNearExpiration = true;
                        analysis.expirationAnalysis.within7Days++;
                    } else if (daysToExpiration <= 30) {
                        analysis.expirationAnalysis.within30Days++;
                    }
                }
            }
        });

        return analysis;
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    /**
     * Safe API call wrapper
     */
    static async safeApiCall<T>(apiCall: () => Promise<T>, defaultValue: T): Promise<T> {
        try {
            return await apiCall();
        } catch (error) {
            console.warn('API call failed, using default:', error);
            return defaultValue;
        }
    }

    /**
     * Log wheel event
     */
    static async logWheelEvent(wheelId: string | number, eventData: any): Promise<void> {
        try {
            await enhancedFetch('/wheels/wheel-events', {
                method: 'POST',
                body: JSON.stringify({
                    cycle_id: wheelId,
                    trade_date: new Date().toISOString(),
                    ...eventData
                })
            });
        } catch (error) {
            console.warn('Failed to log wheel event:', error);
            // Don't throw - event logging is not critical
        }
    }

    /**
     * Invalidate wheel-related caches
     */
    static async invalidateWheelCaches(): Promise<void> {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['wheel-cycles'] }),
            queryClient.invalidateQueries({ queryKey: ['wheel-detection'] }),
            queryClient.invalidateQueries({ queryKey: ['wheel-detection', 'results'] })
        ]);
    }

    /**
     * Enhance error with context
     */
    static enhanceError(error: any, operation: string, context: any = {}): Error {
        const enhancedError = new Error(`WheelManagementService.${operation}: ${error.message}`);
        (enhancedError as any).originalError = error;
        (enhancedError as any).operation = operation;
        (enhancedError as any).context = context;
        (enhancedError as any).timestamp = new Date().toISOString();
        return enhancedError;
    }

    /**
     * Calculate status transition info
     */
    static calculateStatusTransition(event: any): any {
        // Simple status transition logic based on event type
        const transitions: { [key: string]: any } = {
            'created': { from: null, to: 'active' },
            'parameter_update': { from: 'active', to: 'active' },
            'options_roll': { from: 'rolling', to: 'active' },
            'assignment': { from: 'active', to: 'assigned' },
            'strategy_closed': { from: '*', to: 'closed' }
        };

        return transitions[event.event_type] || { from: null, to: null };
    }

    /**
     * Assess event risk impact
     */
    static assessEventRiskImpact(event: any): string {
        const highRiskEvents = ['assignment', 'early_exercise', 'strategy_closed'];
        const mediumRiskEvents = ['options_roll', 'parameter_update'];

        if (highRiskEvents.includes(event.event_type)) return 'high';
        if (mediumRiskEvents.includes(event.event_type)) return 'medium';
        return 'low';
    }
}

/**
 * Convenience functions for common operations
 */

export const createWheel = (wheelData: WheelData) => WheelManagementService.createWheel(wheelData);
export const updateWheel = (wheelId: string | number, updates: WheelUpdates) => WheelManagementService.updateWheel(wheelId, updates);
export const rollWheel = (wheelId: string | number, rollData: RollData) => WheelManagementService.rollWheel(wheelId, rollData);
export const closeWheel = (wheelId: string | number, closeData: CloseData) => WheelManagementService.closeWheel(wheelId, closeData);
export const getWheelDetails = (wheelId: string | number) => WheelManagementService.getWheelDetails(wheelId);
export const getWheelEvents = (wheelId: string | number) => WheelManagementService.getWheelEvents(wheelId);
export const updateWheelStatus = (wheelId: string | number, status: string, context?: any) => WheelManagementService.updateWheelStatus(wheelId, status, context);

export default WheelManagementService;
