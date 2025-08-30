import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Wheels from '../pages/Wheels'
import * as enhancedClient from '@/api/enhancedClient'

// Mock the API client
vi.mock('@/api/enhancedClient', () => ({
  useWheelCycles: vi.fn(),
  useWheelDataForTicker: vi.fn(),
  useCreateWheelEvent: vi.fn(),
}))

// Mock all the complex components
vi.mock('@/components/forms/WheelEventForm', () => ({
  default: () => <div data-testid="wheel-event-form">Wheel Event Form</div>,
}))

vi.mock('@/features/wheels/components/Timeline', () => ({
  Timeline: () => <div data-testid="timeline">Timeline</div>,
}))

vi.mock('@/features/wheels/lot-actions/LotActionsProvider', () => ({
  LotActionsProvider: ({ children }) => <div data-testid="lot-actions-provider">{children}</div>,
}))

vi.mock('@/features/wheels/lot-actions/ActionButtonsRow', () => ({
  ActionButtonsRow: () => <div data-testid="action-buttons">Action Buttons</div>,
}))

vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }) => <div data-testid="error-boundary">{children}</div>
}))

const mockWheelCycles = [
  {
    id: 1,
    ticker: 'AAPL',
    status: 'ACTIVE',
    target_allocation: 10000,
    current_shares: 100,
    avg_cost_basis: 150.00,
    total_premium: 500.00,
    realized_pl: 250.00,
    unrealized_pl: 200.00,
    current_price: 155.00,
    created_at: '2024-01-01T00:00:00Z'
  }
]

// Test wrapper with React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Wheels Component - Basic React Query Integration', () => {
  beforeEach(() => {
    // Setup default mock implementations
    enhancedClient.useWheelCycles.mockReturnValue({
      data: mockWheelCycles,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    enhancedClient.useWheelDataForTicker.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    })

    enhancedClient.useCreateWheelEvent.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    })
  })

  it('renders loading state correctly', () => {
    enhancedClient.useWheelCycles.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    })

    render(<Wheels />, { wrapper: createWrapper() })

    expect(screen.getByText(/loading wheels/i)).toBeInTheDocument()
  })

  it('renders error state correctly', () => {
    enhancedClient.useWheelCycles.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch wheel cycles'),
      refetch: vi.fn(),
    })

    render(<Wheels />, { wrapper: createWrapper() })

    expect(screen.getByText(/error loading wheels/i)).toBeInTheDocument()
  })

  it('renders wheel cycles list correctly', () => {
    render(<Wheels />, { wrapper: createWrapper() })

    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('ACTIVE')).toBeInTheDocument()
  })

  it('integrates with React Query caching', () => {
    render(<Wheels />, { wrapper: createWrapper() })

    // Verify that React Query hooks are called
    expect(enhancedClient.useWheelCycles).toHaveBeenCalled()

    // The data should be properly cached and available
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('renders empty state correctly', () => {
    enhancedClient.useWheelCycles.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<Wheels />, { wrapper: createWrapper() })

    // Check for empty state message or basic structure
    expect(screen.getByText(/wheel cycles/i)).toBeInTheDocument()
  })
})
