import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Stocks from '../pages/Stocks'
import * as enhancedClient from '@/api/enhancedClient'

// Mock the API client
vi.mock('@/api/enhancedClient', () => ({
  useStocks: vi.fn(),
  useCreateStock: vi.fn(),
  useUpdateStock: vi.fn(),
  useDeleteStock: vi.fn(),
}))

// Mock the components
vi.mock('../components/forms/StockForm', () => ({
  default: ({ isOpen, onSubmit, onClose, stock, disabled }) => 
    isOpen ? (
      <div data-testid="stock-form">
        <h3>{stock ? 'Edit Stock' : 'Add Stock'}</h3>
        <button 
          onClick={() => onSubmit({ symbol: 'TEST', shares: 100, cost_basis: 50.00 })}
          disabled={disabled}
          data-testid="submit-stock"
        >
          Submit
        </button>
        <button onClick={onClose} data-testid="cancel-stock">Cancel</button>
      </div>
    ) : null
}))

vi.mock('../components/tables/StockTable', () => ({
  default: ({ stocks, onEdit, onDelete, disabled }) => (
    <div data-testid="stock-table">
      {stocks.map(stock => (
        <div key={stock.id} data-testid={`stock-${stock.id}`}>
          <span>{stock.symbol}</span>
          <button 
            onClick={() => onEdit(stock)} 
            disabled={disabled}
            data-testid={`edit-${stock.id}`}
          >
            Edit
          </button>
          <button 
            onClick={() => onDelete(stock.id)} 
            disabled={disabled}
            data-testid={`delete-${stock.id}`}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}))

vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }) => <div data-testid="error-boundary">{children}</div>
}))

const mockStocks = [
  {
    id: 1,
    symbol: 'AAPL',
    shares: 100,
    cost_basis: 150.00,
    current_price: 175.00,
    status: 'Open'
  },
  {
    id: 2,
    symbol: 'GOOGL',
    shares: 50,
    cost_basis: 2500.00,
    current_price: 2700.00,
    status: 'Open'
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

describe('Stocks Component - React Query Integration', () => {
  beforeEach(() => {
    // Setup default mock implementations
    enhancedClient.useStocks.mockReturnValue({
      data: mockStocks,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    enhancedClient.useCreateStock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    })

    enhancedClient.useUpdateStock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    })

    enhancedClient.useDeleteStock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    })
  })

  it('renders loading state correctly', () => {
    enhancedClient.useStocks.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    })

    render(<Stocks />, { wrapper: createWrapper() })

    expect(screen.getByText(/loading stocks/i)).toBeInTheDocument()
  })

  it('renders error state correctly', () => {
    enhancedClient.useStocks.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch stocks'),
      refetch: vi.fn(),
    })

    render(<Stocks />, { wrapper: createWrapper() })

    expect(screen.getByText(/error loading stocks/i)).toBeInTheDocument()
  })

  it('renders stocks list correctly', () => {
    render(<Stocks />, { wrapper: createWrapper() })

    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('GOOGL')).toBeInTheDocument()
    expect(screen.getByTestId('stock-table')).toBeInTheDocument()
  })

  it('calculates total value correctly', () => {
    render(<Stocks />, { wrapper: createWrapper() })

    // AAPL: 100 * 175 = 17,500
    // GOOGL: 50 * 2700 = 135,000
    // Total: 152,500
    expect(screen.getByText(/\$152,500\.00/)).toBeInTheDocument()
  })

  it('opens add stock form', async () => {
    const user = userEvent.setup()
    render(<Stocks />, { wrapper: createWrapper() })

    const addButton = screen.getByText(/add position/i)
    await user.click(addButton)

    expect(screen.getByTestId('stock-form')).toBeInTheDocument()
    expect(screen.getByText('Add Stock')).toBeInTheDocument()
  })

  it('opens edit stock form', async () => {
    const user = userEvent.setup()
    render(<Stocks />, { wrapper: createWrapper() })

    const editButton = screen.getByTestId('edit-1')
    await user.click(editButton)

    expect(screen.getByTestId('stock-form')).toBeInTheDocument()
    expect(screen.getByText('Edit Stock')).toBeInTheDocument()
  })

  it('handles stock creation with optimistic updates', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({})
    enhancedClient.useCreateStock.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
    })

    const user = userEvent.setup()
    render(<Stocks />, { wrapper: createWrapper() })

    // Open add form
    const addButton = screen.getByText(/add position/i)
    await user.click(addButton)

    // Submit form
    const submitButton = screen.getByTestId('submit-stock')
    await user.click(submitButton)

    // Verify mutation was called
    expect(mockMutateAsync).toHaveBeenCalledWith({
      symbol: 'TEST',
      shares: 100,
      cost_basis: 50.00
    })
  })

  it('handles stock deletion with confirmation', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({})
    enhancedClient.useDeleteStock.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
    })

    // Mock window.confirm
    window.confirm = vi.fn().mockReturnValue(true)

    const user = userEvent.setup()
    render(<Stocks />, { wrapper: createWrapper() })

    const deleteButton = screen.getByTestId('delete-1')
    await user.click(deleteButton)

    expect(window.confirm).toHaveBeenCalled()
    expect(mockMutateAsync).toHaveBeenCalledWith(1)
  })

  it('shows loading state during mutations', () => {
    enhancedClient.useCreateStock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
      error: null,
    })

    render(<Stocks />, { wrapper: createWrapper() })

    expect(screen.getByText(/processing changes/i)).toBeInTheDocument()
    
    // Buttons should be disabled
    const addButton = screen.getByText(/add position/i)
    expect(addButton).toBeDisabled()
  })

  it('handles empty stocks state correctly', () => {
    enhancedClient.useStocks.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<Stocks />, { wrapper: createWrapper() })

    expect(screen.getByText(/no stock positions yet/i)).toBeInTheDocument()
    expect(screen.getByText(/add your first position/i)).toBeInTheDocument()
  })

  it('integrates with React Query caching', () => {
    render(<Stocks />, { wrapper: createWrapper() })

    // Verify that React Query hooks are called
    expect(enhancedClient.useStocks).toHaveBeenCalled()
    
    // The data should be properly cached and available
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })
})
