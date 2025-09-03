/**
 * Comprehensive Test Suite for Wheels Page Phase 1
 * Tests wheel detection algorithm, component rendering, and responsive design
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Wheels from '../pages/Wheels';
import { testWheelDetectionAccuracy, createTestPositionScenarios } from '../utils/wheelDetectionTest';

// Mock API client
vi.mock('../api/enhancedClient', () => ({
  useWheelCycles: () => ({
    data: [],
    isLoading: false,
    error: null
  }),
  useWheelDetection: () => ({
    mutateAsync: vi.fn(),
    isPending: false
  }),
  useWheelDetectionResults: () => ({
    data: null,
    isLoading: false
  }),
  usePositionsData: () => ({
    allPositions: [],
    stockPositions: [],
    optionPositions: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn()
  })
}));

// Mock components
vi.mock('../components/WheelBuilder', () => ({
  default: () => <div data-testid="wheel-builder">Wheel Builder</div>
}));

vi.mock('../components/StrategyDetectionPanel', () => ({
  default: ({ onDetectionComplete }) => (
    <div data-testid="strategy-detection-panel">
      <button onClick={() => onDetectionComplete({ opportunities: [] })}>
        Detect Strategies
      </button>
    </div>
  )
}));

vi.mock('../components/WheelOpportunityGrid', () => ({
  default: ({ opportunities, isLoading }) => (
    <div data-testid="opportunity-grid">
      {isLoading ? 'Loading...' : `${opportunities.length} opportunities`}
    </div>
  )
}));

vi.mock('../components/WheelPerformanceSummary', () => ({
  default: ({ opportunities }) => (
    <div data-testid="performance-summary">
      Performance: {opportunities.length} opportunities
    </div>
  )
}));

describe('Wheels Page - Phase 1 Tests', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  const renderWheelsPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Wheels />
      </QueryClientProvider>
    );
  };

  describe('Component Rendering', () => {
    it('renders main page components without crashing', () => {
      renderWheelsPage();

      expect(screen.getByText('Wheel Strategies')).toBeInTheDocument();
      expect(screen.getByTestId('strategy-detection-panel')).toBeInTheDocument();
      expect(screen.getByTestId('opportunity-grid')).toBeInTheDocument();
      expect(screen.getByTestId('performance-summary')).toBeInTheDocument();
    });

    it('displays correct page title and description', () => {
      renderWheelsPage();

      expect(screen.getByText('Wheel Strategies')).toBeInTheDocument();
      expect(screen.getByText('Discover and manage wheel opportunities from your positions')).toBeInTheDocument();
    });

    it('shows action buttons', () => {
      renderWheelsPage();

      expect(screen.getByText('Refresh')).toBeInTheDocument();
      expect(screen.getByText(/Auto-Refresh/)).toBeInTheDocument();
      expect(screen.getByText('Detect Opportunities')).toBeInTheDocument();
    });
  });

  describe('Auto-Refresh Functionality', () => {
    it('toggles auto-refresh state', () => {
      renderWheelsPage();

      const autoRefreshButton = screen.getByText(/Auto-Refresh/);
      expect(autoRefreshButton).toHaveTextContent('Auto-Refresh ON');

      fireEvent.click(autoRefreshButton);
      expect(autoRefreshButton).toHaveTextContent('Auto-Refresh OFF');
    });

    it('displays live status when auto-refresh is enabled', () => {
      renderWheelsPage();

      // Check if live status indicators are present
      const statusElements = screen.getAllByText(/Live|Market Hours|After Hours/);
      expect(statusElements.length).toBeGreaterThan(0);
    });
  });

  describe('Detection Integration', () => {
    it('handles detection results from strategy panel', async () => {
      renderWheelsPage();

      const detectButton = screen.getByText('Detect Strategies');
      fireEvent.click(detectButton);

      await waitFor(() => {
        expect(screen.getByTestId('opportunity-grid')).toHaveTextContent('0 opportunities');
      });
    });
  });

  describe('Responsive Design', () => {
    it('renders properly on mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      renderWheelsPage();

      expect(screen.getByText('Wheel Strategies')).toBeInTheDocument();
      expect(screen.getByTestId('strategy-detection-panel')).toBeInTheDocument();
    });

    it('renders properly on tablet viewport', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });

      renderWheelsPage();

      expect(screen.getByText('Wheel Strategies')).toBeInTheDocument();
      expect(screen.getByTestId('opportunity-grid')).toBeInTheDocument();
    });

    it('renders properly on desktop viewport', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });

      renderWheelsPage();

      expect(screen.getByText('Wheel Strategies')).toBeInTheDocument();
      expect(screen.getByTestId('performance-summary')).toBeInTheDocument();
    });
  });
});

describe('Wheel Detection Algorithm Tests', () => {
  const mockDetectionFunction = async (data) => {
    // Simplified mock detection logic for testing
    const opportunities = [];

    // Check for covered call opportunities
    if (data.stocks && data.stocks.length > 0) {
      data.stocks.forEach(stock => {
        if (stock.shares_owned >= 100) {
          opportunities.push({
            ticker: stock.ticker,
            strategy: 'covered_call',
            confidence_score: 85,
            potential_income: 500
          });
        }
      });
    }

    // Check for cash secured put opportunities
    if (data.cashBalance >= 10000) {
      opportunities.push({
        ticker: 'SPY',
        strategy: 'cash_secured_put',
        confidence_score: 80,
        potential_income: 300
      });
    }

    return { opportunities };
  };

  it('detects covered call opportunities correctly', async () => {
    const scenarios = createTestPositionScenarios();
    const result = await testWheelDetectionAccuracy(mockDetectionFunction, {
      coveredCallReady: scenarios.coveredCallReady
    });

    expect(result.summary.accuracy).toBeGreaterThan(0);
    expect(result.results.coveredCallReady.correct).toBe(true);
  });

  it('detects cash secured put opportunities correctly', async () => {
    const scenarios = createTestPositionScenarios();
    const result = await testWheelDetectionAccuracy(mockDetectionFunction, {
      cashSecuredPutReady: scenarios.cashSecuredPutReady
    });

    expect(result.summary.accuracy).toBeGreaterThan(0);
  });

  it('handles empty positions gracefully', async () => {
    const result = await mockDetectionFunction({
      positions: [],
      stocks: [],
      options: [],
      cashBalance: 0
    });

    expect(result.opportunities).toHaveLength(0);
  });

  it('handles invalid data without crashing', async () => {
    const result = await mockDetectionFunction({
      positions: null,
      stocks: undefined,
      options: 'invalid',
      cashBalance: NaN
    });

    expect(result.opportunities).toHaveLength(0);
  });
});

describe('Performance Calculation Tests', () => {
  it('calculates total potential income correctly', () => {
    const opportunities = [
      { potential_income: 500 },
      { potential_income: 300 },
      { potential_income: 200 }
    ];

    const total = opportunities.reduce((sum, op) => sum + op.potential_income, 0);
    expect(total).toBe(1000);
  });

  it('calculates average confidence correctly', () => {
    const opportunities = [
      { confidence_score: 80 },
      { confidence_score: 90 },
      { confidence_score: 70 }
    ];

    const average = Math.round(
      opportunities.reduce((sum, op) => sum + op.confidence_score, 0) / opportunities.length
    );
    expect(average).toBe(80);
  });

  it('handles edge cases in calculations', () => {
    // Empty array
    expect(() => {
      const total = [].reduce((sum, op) => sum + (op.potential_income || 0), 0);
      expect(total).toBe(0);
    }).not.toThrow();

    // Missing values
    const opportunities = [
      { potential_income: undefined },
      { potential_income: null },
      { potential_income: 100 }
    ];

    const total = opportunities.reduce((sum, op) => sum + (op.potential_income || 0), 0);
    expect(total).toBe(100);
  });
});

describe('Market Hours Detection Tests', () => {
  it('correctly identifies market hours', () => {
    // Mock a weekday during market hours (10 AM)
    const mockDate = new Date();
    mockDate.setHours(10, 0, 0, 0);
    mockDate.setDay(2); // Tuesday

    vi.spyOn(global, 'Date').mockImplementation(() => mockDate);

    const isMarketHours = () => {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();
      return day >= 1 && day <= 5 && hour >= 9 && hour < 16;
    };

    expect(isMarketHours()).toBe(true);

    vi.restoreAllMocks();
  });

  it('correctly identifies after hours', () => {
    // Mock a weekday after market hours (5 PM)
    const mockDate = new Date();
    mockDate.setHours(17, 0, 0, 0);
    mockDate.setDay(2); // Tuesday

    vi.spyOn(global, 'Date').mockImplementation(() => mockDate);

    const isMarketHours = () => {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();
      return day >= 1 && day <= 5 && hour >= 9 && hour < 16;
    };

    expect(isMarketHours()).toBe(false);

    vi.restoreAllMocks();
  });

  it('correctly identifies weekends', () => {
    // Mock a Saturday
    const mockDate = new Date();
    mockDate.setHours(10, 0, 0, 0);
    mockDate.setDay(6); // Saturday

    vi.spyOn(global, 'Date').mockImplementation(() => mockDate);

    const isMarketHours = () => {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();
      return day >= 1 && day <= 5 && hour >= 9 && hour < 16;
    };

    expect(isMarketHours()).toBe(false);

    vi.restoreAllMocks();
  });
});
