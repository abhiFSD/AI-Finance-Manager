import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { 
  useTransactions, 
  useCreateTransaction, 
  useUpdateTransaction, 
  useDeleteTransaction,
  Transaction 
} from '@/hooks/use-transactions'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useTransactions', () => {
  it('should fetch transactions successfully', async () => {
    const wrapper = createWrapper()
    
    const { result } = renderHook(() => useTransactions(), { wrapper })

    expect(result.current.isLoading).toBe(true)
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toBeDefined()
    expect(Array.isArray(result.current.data)).toBe(true)
  })
})

describe('useCreateTransaction', () => {
  it('should create a new transaction', async () => {
    const wrapper = createWrapper()
    
    const { result } = renderHook(() => useCreateTransaction(), { wrapper })

    const newTransaction: Omit<Transaction, 'id'> = {
      date: '2024-12-16',
      merchant: 'Test Merchant',
      category: 'Test Category',
      amount: -50.00,
      type: 'debit',
      account: 'Test Account',
      description: 'Test transaction',
      status: 'completed',
    }

    await waitFor(async () => {
      result.current.mutate(newTransaction)
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    expect(result.current.isSuccess).toBe(true)
  })
})

describe('useUpdateTransaction', () => {
  it('should update an existing transaction', async () => {
    const wrapper = createWrapper()
    
    const { result } = renderHook(() => useUpdateTransaction(), { wrapper })

    const updatedTransaction: Transaction = {
      id: '1',
      date: '2024-12-16',
      merchant: 'Updated Merchant',
      category: 'Updated Category',
      amount: -75.00,
      type: 'debit',
      account: 'Updated Account',
      description: 'Updated transaction',
      status: 'completed',
    }

    await waitFor(async () => {
      result.current.mutate(updatedTransaction)
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    expect(result.current.isSuccess).toBe(true)
  })
})

describe('useDeleteTransaction', () => {
  it('should delete a transaction', async () => {
    const wrapper = createWrapper()
    
    const { result } = renderHook(() => useDeleteTransaction(), { wrapper })

    await waitFor(async () => {
      result.current.mutate('1')
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    expect(result.current.isSuccess).toBe(true)
  })
})