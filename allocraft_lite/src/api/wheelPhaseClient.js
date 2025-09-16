import { useQuery } from '@tanstack/react-query';
import { API_BASE } from './fastapiClient';

// Mock data for development when backend is unavailable
const mockWheelCycles = [
  {
    id: 1,
    ticker: 'HIMS',
    current_stock_price: 16.45,
    total_pnl: 275.50,
    created_at: '2024-12-01T10:00:00Z',
    lifetime_earnings: {
      phase1: 1250.00,
      phase2: 0,
      phase3: 850.00,
      phase4: 1200.00
    },
    current_phase: 3,
    strategy_type: 'covered_call',
    status: 'open'
  },
  {
    id: 2,
    ticker: 'HOOD',
    current_stock_price: 24.82,
    total_pnl: -125.25,
    created_at: '2024-11-15T14:30:00Z',
    lifetime_earnings: {
      phase1: 890.75,
      phase2: 0,
      phase3: 567.50,
      phase4: 0
    },
    current_phase: 1,
    strategy_type: 'cash_secured_put',
    status: 'open'
  },
  {
    id: 3,
    ticker: 'TSLL',
    current_stock_price: 8.95,
    total_pnl: 445.80,
    created_at: '2024-10-20T09:15:00Z',
    lifetime_earnings: {
      phase1: 2100.25,
      phase2: 350.00,
      phase3: 1800.75,
      phase4: 950.00
    },
    current_phase: 2,
    strategy_type: 'assignment',
    status: 'assigned'
  },
  {
    id: 4,
    ticker: 'QUBT',
    current_stock_price: 2.45,
    total_pnl: 89.25,
    created_at: '2024-12-10T16:45:00Z',
    lifetime_earnings: {
      phase1: 450.00,
      phase2: 0,
      phase3: 220.50,
      phase4: 380.75
    },
    current_phase: 4,
    strategy_type: 'closed',
    status: 'completed'
  }
];

/**
 * Hook for fetching wheel cycles with enhanced phase data
 */
export function useWheelPhaseCycles() {
  return useQuery({
    queryKey: ['wheel-phase-cycles'],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_BASE}/wheels/wheel-cycles`);
        if (!response.ok) {
          throw new Error('Failed to fetch wheel cycles');
        }
        const cycles = await response.json();

        // Transform cycles to include phase classification
        return cycles.map(cycle => transformCycleToPhaseData(cycle));
      } catch (error) {
        console.warn('Backend unavailable, using mock data:', error.message);
        // Fallback to mock data when backend is unavailable
        return mockWheelCycles.map(cycle => transformCycleToPhaseData(cycle));
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute during active use
  });
}

/**
 * Hook for fetching aggregated phase performance metrics
 */
export function usePhasePerformanceMetrics() {
  return useQuery({
    queryKey: ['phase-performance-metrics'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/wheels/performance`);
      if (!response.ok) {
        throw new Error('Failed to fetch phase performance metrics');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Transform a wheel cycle from backend into phase-based data structure
 */
function transformCycleToPhaseData(cycle) {
  const metadata = cycle.detection_metadata || {};

  // Determine current phase based on strategy type and status
  const currentPhase = determineCurrentPhase(cycle);

  // Calculate lifetime earnings (mock for now, will be enhanced with backend)
  const lifetimeEarnings = calculateLifetimeEarnings(cycle);

  // Create phase data structure
  const phaseData = createPhaseDataStructure(cycle, metadata, currentPhase);

  return {
    ...cycle,
    current_phase: currentPhase,
    phase_data: phaseData,
    lifetime_earnings: lifetimeEarnings,
    // Add missing fields that frontend expects
    current_stock_price: getStockPrice(cycle.ticker),
    created_at: cycle.started_at,
    // Keep existing fields for compatibility
    stockPrice: getStockPrice(cycle.ticker), // Would come from real-time data
    activeDays: calculateActiveDays(cycle.started_at),
  };
}

/**
 * Determine which phase the wheel cycle is currently in
 */
function determineCurrentPhase(cycle) {
  const strategy = cycle.strategy_type?.toLowerCase();
  const status = cycle.status?.toLowerCase();

  // Phase 1: Cash-Secured Put (Initial or Put-only strategies)
  if (strategy === 'cash_secured_put' && status === 'open') {
    return 1;
  }

  // Phase 2: Share Assignment/Ownership
  if (strategy === 'assignment' || strategy === 'share_ownership') {
    return 2;
  }

  // Phase 3: Covered Call
  if (strategy === 'covered_call' && status === 'open') {
    return 3;
  }

  // Phase 4: Called Away/Cycle Complete
  if (status === 'closed' || status === 'completed') {
    return 4;
  }

  // Default to Phase 1 for new/unknown states
  return 1;
}

/**
 * Calculate lifetime earnings per phase (mock implementation)
 */
function calculateLifetimeEarnings(cycle) {
  const metadata = cycle.detection_metadata || {};
  const premium = metadata.premium || 0;
  const contractCount = metadata.contract_count || 1;

  // Mock lifetime calculation - will be replaced with backend aggregation
  return {
    phase1: premium * contractCount * 100 * 3, // Simulate 3 previous cycles
    phase2: 0, // No outright sales yet
    phase3: premium * contractCount * 100 * 2, // Simulate 2 covered call cycles
    phase4: premium * contractCount * 100 * 1.5, // Simulate 1.5x profit on called away
  };
}

/**
 * Create phase data structure for the cycle
 */
function createPhaseDataStructure(cycle, metadata, currentPhase) {
  const premium = metadata.premium || 0;
  const strikePrice = metadata.strike_price || 0;
  const contractCount = metadata.contract_count || 1;
  const expirationDate = metadata.expiration_date || '';

  return {
    phase1: createPhase1Data(cycle, metadata, currentPhase === 1),
    phase2: createPhase2Data(cycle, metadata, currentPhase === 2),
    phase3: createPhase3Data(cycle, metadata, currentPhase === 3),
    phase4: createPhase4Data(cycle, metadata, currentPhase === 4),
  };
}

function createPhase1Data(cycle, metadata, isActive) {
  const premium = metadata.premium || 0;
  const strikePrice = metadata.strike_price || 0;
  const contractCount = metadata.contract_count || 1;
  const expirationDate = metadata.expiration_date || '';

  if (cycle.strategy_type === 'cash_secured_put') {
    return {
      status: isActive ? 'active' : 'complete',
      type: 'cash_secured_put',
      premium: premium,
      strikePrice: strikePrice,
      expiration: expirationDate,
      contracts: contractCount,
      currentValue: cycle.current_option_value || 0,
      completedDate: isActive ? null : cycle.started_at,
      lifetimeStats: {
        totalContracts: contractCount,
        totalPremium: premium * contractCount * 100,
        expiredWorthless: 0,
        assigned: 0,
        avgPremiumPerContract: premium,
      }
    };
  }

  return {
    status: 'pending',
    type: 'cash_secured_put',
    lifetimeStats: {
      totalContracts: 0,
      totalPremium: 0,
      expiredWorthless: 0,
      assigned: 0,
      avgPremiumPerContract: 0,
    }
  };
}

function createPhase2Data(cycle, metadata, isActive) {
  return {
    status: 'pending',
    type: 'assignment',
    lifetimeStats: {
      totalSharesAssigned: 0,
      totalSharesPurchased: 0,
      totalSharesSold: 0,
      avgAssignmentPrice: 0,
      outrightSaleProfit: 0,
    }
  };
}

function createPhase3Data(cycle, metadata, isActive) {
  return {
    status: 'pending',
    type: 'covered_call',
    lifetimeStats: {
      totalContracts: 0,
      totalPremium: 0,
      expiredWorthless: 0,
      calledAway: 0,
      buyToClosed: 0,
      avgPremiumPerContract: 0,
    }
  };
}

function createPhase4Data(cycle, metadata, isActive) {
  return {
    status: 'pending',
    type: 'call_away',
    lifetimeStats: {
      totalSharesCalledAway: 0,
      totalCallAwayProfit: 0,
      avgProfitPerShare: 0,
      completedCycles: 0,
    }
  };
}

/**
 * Get stock price (mock - would integrate with real-time pricing)
 */
function getStockPrice(ticker) {
  const mockPrices = {
    'HIMS': 37.25,
    'HOOD': 22.50,
    'TSLL': 10.85,
    'QUBT': 12.40,
  };
  return mockPrices[ticker] || 50.00;
}

/**
 * Calculate active days for a cycle
 */
function calculateActiveDays(startedAt) {
  if (!startedAt) return 0;
  const start = new Date(startedAt);
  const now = new Date();
  const diffTime = Math.abs(now - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Delete a wheel cycle
 */
export async function deleteWheelCycle(cycleId) {
  const response = await fetch(`${API_BASE}/wheels/cycles/${cycleId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete wheel cycle');
  }
  return response.json();
}
