// Core API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  status?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// Stock Types
export interface Stock {
  id: number;
  ticker: string;
  name: string;
  shares: number;
  avg_cost: number;
  current_price?: number | null;
  sector?: string | null;
  market_value?: number;
  total_cost?: number;
  unrealized_pl?: number;
  unrealized_pl_percent?: number;
  created_at: string;
  updated_at: string;
}

export interface StockSector {
  sector: string;
  count: number;
  total_value: number;
  total_cost: number;
  unrealized_pl: number;
}

export interface CreateStockRequest {
  ticker: string;
  name: string;
  shares: number;
  avg_cost: number;
  sector?: string;
}

export interface UpdateStockRequest {
  ticker?: string;
  name?: string;
  shares?: number;
  avg_cost?: number;
  sector?: string;
}

// Option Types
export interface Option {
  id: number;
  ticker: string;
  option_type: 'Call' | 'Put';
  strike_price: number;
  expiry_date: string;
  contracts: number;
  cost_basis: number;
  current_price?: number | null;
  status: 'Open' | 'Expired' | 'Closed';
  created_at: string;
  updated_at: string;
}

export interface CreateOptionRequest {
  ticker: string;
  option_type: 'Call' | 'Put';
  strike_price: number;
  expiry_date: string;
  contracts: number;
  cost_basis: number;
}

export interface UpdateOptionRequest {
  ticker?: string;
  option_type?: 'Call' | 'Put';
  strike_price?: number;
  expiry_date?: string;
  contracts?: number;
  cost_basis?: number;
  current_price?: number | null;
  status?: 'Open' | 'Expired' | 'Closed';
}

// Wheel Types
export interface WheelCycle {
  id: number;
  ticker: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  target_allocation: number;
  current_shares: number;
  avg_cost_basis: number;
  total_premium: number;
  realized_pl: number;
  unrealized_pl: number;
  current_price?: number | null;
  created_at: string;
  updated_at: string;
}

export interface WheelEvent {
  id: number;
  wheel_cycle_id: number;
  event_type: 'SELL_PUT' | 'BUY_SHARES' | 'SELL_CALL' | 'CLOSE_POSITION';
  quantity: number;
  price: number;
  premium?: number | null;
  strike_price?: number | null;
  expiry_date?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface WheelLot {
  id: number;
  wheel_cycle_id: number;
  shares: number;
  cost_basis: number;
  status: 'OPEN' | 'COVERED' | 'CLOSED';
  acquired_at: string;
  events: WheelEvent[];
}

export interface WheelTickerData {
  cycle: WheelCycle;
  events: WheelEvent[];
  lots: WheelLot[];
  events_by_lot: Record<number, WheelEvent[]>;
  summary: {
    total_events: number;
    total_premium: number;
    total_lots: number;
    active_lots: number;
  };
}

export interface CreateWheelEventRequest {
  wheel_cycle_id: number;
  event_type: 'SELL_PUT' | 'BUY_SHARES' | 'SELL_CALL' | 'CLOSE_POSITION';
  quantity: number;
  price: number;
  premium?: number;
  strike_price?: number;
  expiry_date?: string;
  notes?: string;
}

// Common Types
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface FilterConfig {
  [key: string]: any;
}

// Error Types
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

// React Query Types
export interface QueryOptions {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

export interface MutationOptions<TData = any, TError = ApiError, TVariables = any> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: TError, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables) => void;
}
