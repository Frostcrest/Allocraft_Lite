/**
 * TypeScript type definitions for Allocraft API.
 * 
 * This file provides type safety for API requests and responses,
 * helping catch errors at compile time and improving developer experience.
 */

// Base types
export type DateString = string; // ISO date string (YYYY-MM-DD)
export type DateTimeString = string; // ISO datetime string
export type Currency = number; // Monetary values in base currency units

// Enums for better type safety
export enum WheelEventType {
    BUY_SHARES = 'BUY_SHARES',
    SELL_SHARES = 'SELL_SHARES',
    SELL_CALL_OPEN = 'SELL_CALL_OPEN',
    SELL_CALL_CLOSE = 'SELL_CALL_CLOSE',
    SELL_PUT_OPEN = 'SELL_PUT_OPEN',
    SELL_PUT_CLOSE = 'SELL_PUT_CLOSE',
    BUY_PUT_CLOSE = 'BUY_PUT_CLOSE',
    ASSIGNMENT = 'ASSIGNMENT',
    PUT_ASSIGNMENT = 'PUT_ASSIGNMENT',
    CALLED_AWAY = 'CALLED_AWAY',
    CALL_ASSIGNED = 'CALL_ASSIGNED',
    FEE = 'FEE'
}

export enum LotStatus {
    OPEN_UNCOVERED = 'OPEN_UNCOVERED',
    OPEN_COVERED = 'OPEN_COVERED',
    CASH_RESERVED = 'CASH_RESERVED',
    CLOSED_CALLED_AWAY = 'CLOSED_CALLED_AWAY',
    CLOSED_SOLD = 'CLOSED_SOLD'
}

export enum LotAcquisitionMethod {
    PUT_ASSIGNMENT = 'PUT_ASSIGNMENT',
    OUTRIGHT_PURCHASE = 'OUTRIGHT_PURCHASE',
    CASH_SECURED_PUT = 'CASH_SECURED_PUT',
    CORPORATE_ACTION = 'CORPORATE_ACTION'
}

export enum CycleStatus {
    OPEN = 'Open',
    CLOSED = 'Closed'
}

// API Response Types
export interface WheelCycle {
    id: number;
    cycle_key: string;
    ticker: string;
    started_at: DateString;
    status: CycleStatus;
    notes?: string;
}

export interface WheelEvent {
    id: number;
    cycle_id: number;
    event_type: WheelEventType;
    trade_date: DateString;
    quantity_shares?: number;
    contracts?: number;
    price?: Currency;
    strike?: Currency;
    premium?: Currency;
    fees?: Currency;
    link_event_id?: number;
    notes?: string;
}

export interface Lot {
    id: number;
    cycle_id: number;
    ticker: string;
    created_at: DateTimeString;
    acquisition_method: LotAcquisitionMethod;
    acquisition_date: DateString;
    status: LotStatus;
    cost_basis_effective?: Currency;
    notes?: string;
}

export interface LotMetrics {
    lot_id: number;
    net_premiums: Currency;
    stock_cost_total: Currency;
    fees_total: Currency;
    realized_pl: Currency;
    unrealized_pl: Currency;
}

export interface WheelMetrics {
    shares_owned: number;
    average_cost_basis: Currency;
    total_cost_remaining: Currency;
    net_options_cashflow: Currency;
    realized_stock_pl: Currency;
    total_realized_pl: Currency;
    current_price?: Currency;
    unrealized_pl: Currency;
}

export interface Stock {
    id: number;
    ticker: string;
    shares: number;
    cost_basis: Currency;
    market_price?: Currency;
    status: 'Open' | 'Sold';
    entry_date: DateString;
    current_price?: Currency;
    price_last_updated?: DateTimeString;
}

export interface Ticker {
    id: number;
    symbol: string;
    name?: string;
    last_price?: string;
    change?: string;
    change_percent?: string;
    volume?: string;
    market_cap?: string;
    timestamp?: string;
}

export interface User {
    id: number;
    username: string;
    email: string;
    is_active: boolean;
    roles: string;
}

// API Request Types
export interface CreateWheelCycleRequest {
    ticker: string;
    cycle_key?: string;
    started_at: DateString;
    status?: CycleStatus;
    notes?: string;
}

export interface CreateWheelEventRequest {
    cycle_id: number;
    event_type: WheelEventType;
    trade_date: DateString;
    quantity_shares?: number;
    contracts?: number;
    price?: Currency;
    strike?: Currency;
    premium?: Currency;
    fees?: Currency;
    link_event_id?: number;
    notes?: string;
}

export interface UpdateWheelEventRequest extends Partial<CreateWheelEventRequest> {
    // All fields optional for updates
}

export interface CreateStockRequest {
    ticker: string;
    shares: number;
    cost_basis: Currency;
    market_price?: Currency;
    entry_date: DateString;
    status?: 'Open' | 'Sold';
}

export interface UpdateStockRequest extends Partial<CreateStockRequest> {
    // All fields optional for updates
}

// Dashboard and aggregated data types
export interface DashboardData {
    total_portfolio_value: Currency;
    total_cost_basis: Currency;
    total_unrealized_pl: Currency;
    total_realized_pl: Currency;
    stocks_count: number;
    options_count: number;
    wheel_cycles_count: number;
    top_performers: Array<{
        ticker: string;
        unrealized_pl: Currency;
        unrealized_pl_percent: number;
    }>;
    recent_activity: Array<{
        type: string;
        ticker: string;
        date: DateString;
        amount?: Currency;
    }>;
}

// Frontend-specific types
export interface LotTimeline {
    id: string;
    date: DateString;
    type: string;
    label: string;
    price?: string;
    strike?: string;
    premium?: string;
    qty?: string;
    notes?: string;
    status?: 'OPEN' | 'CLOSED';
}

export interface LotCoverage {
    strike: string;
    premium?: string;
    status: 'OPEN' | 'CLOSED';
}

export interface LotAcquisition {
    type: LotAcquisitionMethod;
    label: string;
    date: DateString;
    collateral?: string;
    outcome?: string;
}

export interface LotVM {
    lotNo: number;
    ticker: string;
    acquisition: LotAcquisition;
    costBasis: string;
    coverage?: LotCoverage;
    status: LotStatus;
    shares: number;
    events: LotTimeline[];
    meta?: {
        putOpenEventId?: number;
    };
}

// Error types
export interface ApiErrorResponse {
    message: string;
    code: string;
    user_message: string;
    context: Record<string, any>;
    timestamp: string;
    status_code: number;
}

export interface ValidationErrorDetail {
    loc: string[];
    msg: string;
    type: string;
}

export interface ValidationErrorResponse {
    detail: ValidationErrorDetail[];
}

// API endpoint response wrappers
export interface ListResponse<T> {
    items: T[];
    total: number;
    page: number;
    per_page: number;
    has_next: boolean;
    has_prev: boolean;
}

export interface CreateResponse<T> {
    data: T;
    message: string;
}

export interface UpdateResponse<T> {
    data: T;
    message: string;
}

export interface DeleteResponse {
    message: string;
    deleted_id: number;
}

// Query and mutation options
export interface QueryOptions {
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
    refetchOnWindowFocus?: boolean;
    refetchOnReconnect?: boolean;
    retry?: boolean | number | ((failureCount: number, error: any) => boolean);
}

export interface MutationOptions {
    onSuccess?: (data: any, variables: any, context: any) => void;
    onError?: (error: any, variables: any, context: any) => void;
    onSettled?: (data: any, error: any, variables: any, context: any) => void;
}

// Utility types
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Form types for UI components
export interface WheelEventFormData {
    event_type: WheelEventType;
    trade_date: string;
    quantity_shares: string;
    contracts: string;
    price: string;
    strike: string;
    premium: string;
    fees: string;
    link_event_id: string;
    notes: string;
}

export interface StockFormData {
    ticker: string;
    shares: string;
    cost_basis: string;
    market_price: string;
    entry_date: string;
    status: 'Open' | 'Sold';
}

// Component prop types
export interface LotCardProps {
    lotNo: number;
    ticker: string;
    acquisition: LotAcquisition;
    costBasis: string;
    coverage?: LotCoverage;
    status: LotStatus;
    shares: number;
    timeline: LotTimeline[];
    onClick: () => void;
}

export interface TimelineProps {
    events: LotTimeline[];
    maxEvents?: number;
    showHeaders?: boolean;
}

export interface ActionButtonsRowProps {
    lot: LotVM;
    hide?: {
        cover?: boolean;
        closePut?: boolean;
        roll?: boolean;
    };
}

// State management types
export interface AppState {
    user: Nullable<User>;
    selectedTicker: Nullable<string>;
    cycles: WheelCycle[];
    events: WheelEvent[];
    lots: Lot[];
    metrics: Nullable<WheelMetrics>;
    loading: {
        cycles: boolean;
        events: boolean;
        lots: boolean;
        metrics: boolean;
    };
    errors: Record<string, string>;
}

export type AppAction =
    | { type: 'SET_USER'; user: Nullable<User> }
    | { type: 'SET_SELECTED_TICKER'; ticker: Nullable<string> }
    | { type: 'SET_CYCLES'; cycles: WheelCycle[] }
    | { type: 'SET_EVENTS'; events: WheelEvent[] }
    | { type: 'SET_LOTS'; lots: Lot[] }
    | { type: 'SET_METRICS'; metrics: Nullable<WheelMetrics> }
    | { type: 'SET_LOADING'; key: keyof AppState['loading']; value: boolean }
    | { type: 'SET_ERROR'; key: string; error: string }
    | { type: 'CLEAR_ERROR'; key: string }
    | { type: 'RESET_STATE' };
