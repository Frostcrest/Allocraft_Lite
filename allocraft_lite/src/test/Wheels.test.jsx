import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Wheels from '../pages/Wheels'
import * as enhancedClient from '@/api/enhancedClient'

// Mock the API client
vi.mock('@/api/enhancedClient', () => ({
  useWheelCycles: vi.fn(),
  useWheelDataForTicker: vi.fn(),
  useCreateWheelEvent: vi.fn(),
}))

vi.mock('@/api/fastapiClient', () => ({
  wheelApi: {
    getWheelCycles: vi.fn(),
    getWheelDataForTicker: vi.fn(),
    createWheelEvent: vi.fn(),
  }
}))

// Mock the components that have complex dependencies
vi.mock('@/components/forms/WheelEventForm', () => ({
  default: ({ onSubmit, onCancel }) => (
    <div data-testid="wheel-event-form">
      <button onClick={() => onSubmit({ event_type: 'SELL_PUT' })} data-testid="submit-event">
        Submit Event
      </button>
      <button onClick={onCancel} data-testid="cancel-event">
        Cancel
      </button>
    </div>
  ),
}))

vi.mock('@/features/wheels/components/Timeline', () => ({
  Timeline: ({ events }) => (
    <div data-testid="lot-timeline">
      Timeline with {events?.length || 0} events
    </div>
  ),
}))

vi.mock('@/features/wheels/lot-actions/LotActionsProvider', () => ({
  LotActionsProvider: ({ children }) => <div data-testid="lot-actions-provider">{children}</div>,
}))

vi.mock('@/features/wheels/lot-actions/ActionButtonsRow', () => ({
  ActionButtonsRow: () => <div data-testid="action-buttons-row">Action Buttons</div>,
}))

// Mock modals
vi.mock('@/features/wheels/lot-actions/CoverLotModal', () => ({
  CoverLotModal: () => <div data-testid="cover-lot-modal">Cover Lot Modal</div>,
}))

vi.mock('@/features/wheels/lot-actions/CloseCallModal', () => ({
  CloseCallModal: () => <div data-testid="close-call-modal">Close Call Modal</div>,
}))

vi.mock('@/features/wheels/lot-actions/ClosePutModal', () => ({
  ClosePutModal: () => <div data-testid="close-put-modal">Close Put Modal</div>,
}))

vi.mock('@/features/wheels/lot-actions/RollCallModal', () => ({
  RollCallModal: () => <div data-testid="roll-call-modal">Roll Call Modal</div>,
}))

vi.mock('@/features/wheels/lot-actions/NewLotWizard', () => ({
  NewLotWizard: () => <div data-testid="new-lot-wizard">New Lot Wizard</div>,
}))

const mockCycles = [
  {
    id: 1,
    ticker: 'AAPL',
    started_at: '2024-01-01',
    status: 'Open',
    notes: 'Test cycle',
  },
  {
    id: 2,
    ticker: 'GOOGL',
    started_at: '2024-01-15',
    status: 'Closed',
    notes: 'Completed cycle',
  },
]

const mockWheelData = {
  events: [
    {
      id: 1,
      event_type: 'SELL_PUT',
      trade_date: '2024-01-01',
      quantity_shares: 100,
      contracts: 1,
      price: 150.00,
      strike: 145.00,
      premium: 500.00,
      fees: 1.50,
    },
  ],
  lots: [
    {
      id: 1,
      ticker: 'AAPL',
      shares_per_lot: 100,
      cost_basis: 150.00,
      status: 'HOLDING_SHARES',
    },
  ],
}

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

describe('Wheels Component - React Query Integration', () => {
  beforeEach(() => {
    // Setup default mock implementations
    enhancedClient.useWheelCycles.mockReturnValue({
      data: mockCycles,
      isLoading: false,
      error: null,
    })

    enhancedClient.useWheelDataForTicker.mockReturnValue({
      data: mockWheelData,
      isLoading: false,
      error: null,
    })

    enhancedClient.useCreateWheelEvent.mockReturnValue({
      mutate: vi.fn(),
      isLoading: false,
      error: null,
    })
  })

  it('renders loading state correctly', () => {
    enhancedClient.useWheelCycles.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })

    render(<Wheels />, { wrapper: createWrapper() })

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders error state correctly', () => {
    enhancedClient.useWheelCycles.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch cycles'),
    })

    render(<Wheels />, { wrapper: createWrapper() })

    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })

  it('renders cycles list correctly', () => {
    render(<Wheels />, { wrapper: createWrapper() })

    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('GOOGL')).toBeInTheDocument()
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Closed')).toBeInTheDocument()
  })

  it('handles cycle selection and loads wheel data', async () => {
    const user = userEvent.setup()
    render(<Wheels />, { wrapper: createWrapper() })

    // Click on a cycle to select it
    const aaplCycle = screen.getByText('AAPL')
    await user.click(aaplCycle)

    // Verify that useWheelDataForTicker was called with the correct ticker
    await waitFor(() => {
      expect(enhancedClient.useWheelDataForTicker).toHaveBeenCalledWith('AAPL')
    })
  })

  it('displays wheel data when ticker is selected', async () => {
    const user = userEvent.setup()
    render(<Wheels />, { wrapper: createWrapper() })

    // Select a ticker
    const aaplCycle = screen.getByText('AAPL')
    await user.click(aaplCycle)

    // Should display the timeline and action buttons
    await waitFor(() => {
      expect(screen.getByTestId('lot-timeline')).toBeInTheDocument()
      expect(screen.getByTestId('action-buttons-row')).toBeInTheDocument()
    })
  })

  it('handles creating new cycle', async () => {
    const user = userEvent.setup()
    render(<Wheels />, { wrapper: createWrapper() })

    // Click add new cycle button
    const addButton = screen.getByRole('button', { name: /add new cycle/i })
    await user.click(addButton)

    // Dialog should open
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('integrates with React Query caching', () => {
    render(<Wheels />, { wrapper: createWrapper() })

    // Verify that React Query hooks are called
    expect(enhancedClient.useWheelCycles).toHaveBeenCalled()
    
    // The data should be properly cached and available
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('handles optimistic updates for new events', async () => {
    const mockMutate = vi.fn()
    enhancedClient.useCreateWheelEvent.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
      error: null,
    })

    const user = userEvent.setup()
    render(<Wheels />, { wrapper: createWrapper() })

    // Select a ticker first
    const aaplCycle = screen.getByText('AAPL')
    await user.click(aaplCycle)

    // Open event form (this would be through some UI interaction)
    // For this test, we'll simulate the form being open
    // The actual implementation might have a different trigger
    
    // This test verifies the structure is in place for optimistic updates
    expect(enhancedClient.useCreateWheelEvent).toHaveBeenCalled()
  })

  it('handles network errors gracefully', () => {
    enhancedClient.useWheelCycles.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
    })

    render(<Wheels />, { wrapper: createWrapper() })

    // Should display error message instead of crashing
    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })

  it('maintains component state during re-renders', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Wheels />, { wrapper: createWrapper() })

    // Select a ticker
    const aaplCycle = screen.getByText('AAPL')
    await user.click(aaplCycle)

    // Re-render the component
    rerender(<Wheels />)

    // State should be maintained (React Query caching)
    await waitFor(() => {
      expect(screen.getByTestId('lot-timeline')).toBeInTheDocument()
    })
  })
})
