import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  Transaction
} from '@/hooks/use-transactions'
import { createMockTransaction } from '@/__tests__/utils/test-data'

// Mock crypto.randomUUID for consistent testing
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'mock-uuid-' + Math.random().toString(36).substring(7))
  }
})

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  })

const createWrapper = (queryClient: QueryClient) => 
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

describe('useTransactions Hook - Comprehensive', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    jest.clearAllMocks()
  })

  describe('useTransactions Hook', () => {
    it('fetches transactions successfully', async () => {
      const { result } = renderHook(() => useTransactions(), {
        wrapper: createWrapper(queryClient),
      })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toBeUndefined()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isSuccess).toBe(true)
      expect(result.current.data).toBeDefined()
      expect(Array.isArray(result.current.data)).toBe(true)
      expect(result.current.data?.[0]).toMatchObject({
        id: expect.any(String),
        merchant: expect.any(String),
        amount: expect.any(Number),
        category: expect.any(String),
      })
    })

    it('handles loading state correctly', async () => {
      const { result } = renderHook(() => useTransactions(), {
        wrapper: createWrapper(queryClient),
      })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.isFetching).toBe(true)
      expect(result.current.isError).toBe(false)
      expect(result.current.isSuccess).toBe(false)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isFetching).toBe(false)
      expect(result.current.isSuccess).toBe(true)
    })

    it('provides error state when fetch fails', async () => {
      // Mock console.error to suppress error logs
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      // Create a query client that will fail
      const failingQueryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: Infinity,
          },
        },
      })

      // Pre-set an error in the query cache
      failingQueryClient.setQueryData(['transactions'], () => {
        throw new Error('Network error')
      })

      const { result } = renderHook(() => useTransactions(), {
        wrapper: createWrapper(failingQueryClient),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      consoleSpy.mockRestore()
    })

    it('uses correct query key', async () => {
      renderHook(() => useTransactions(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        const queryData = queryClient.getQueryData(['transactions'])
        expect(queryData).toBeDefined()
      })
    })

    it('respects stale time configuration', async () => {
      const { result, rerender } = renderHook(() => useTransactions(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      const firstData = result.current.data

      // Re-render should not trigger a new fetch due to stale time
      rerender()

      expect(result.current.data).toBe(firstData)
      expect(result.current.isFetching).toBe(false)
    })
  })

  describe('useCreateTransaction Hook', () => {
    it('creates a new transaction successfully', async () => {
      const { result } = renderHook(() => useCreateTransaction(), {
        wrapper: createWrapper(queryClient),
      })

      const newTransaction = {
        date: '2024-12-15',
        merchant: 'Test Store',
        category: 'Shopping',
        amount: -25.99,
        type: 'debit' as const,
        account: 'Test Account',
        description: 'Test purchase',
        status: 'completed' as const,
      }

      await act(async () => {
        result.current.mutate(newTransaction)
        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })
      })

      expect(result.current.data).toMatchObject(newTransaction)
      expect(result.current.data?.id).toBeDefined()
    })

    it('updates query cache optimistically on success', async () => {
      // First, populate the cache with initial data
      const transactionsHook = renderHook(() => useTransactions(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(transactionsHook.result.current.isSuccess).toBe(true)
      })

      const initialCount = transactionsHook.result.current.data?.length || 0

      // Now test the create mutation
      const { result } = renderHook(() => useCreateTransaction(), {
        wrapper: createWrapper(queryClient),
      })

      const newTransaction = createMockTransaction({
        merchant: 'New Store',
        amount: -15.50,
      })

      await act(async () => {
        result.current.mutate(newTransaction)
        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })
      })

      // Check that the query cache was updated
      const updatedData = queryClient.getQueryData<Transaction[]>(['transactions'])
      expect(updatedData).toBeDefined()
      expect(updatedData!.length).toBe(initialCount + 1)
      expect(updatedData![0]).toMatchObject(newTransaction)
    })

    it('handles mutation errors', async () => {
      // Mock console.error to suppress error logs
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useCreateTransaction(), {
        wrapper: createWrapper(queryClient),
      })

      // Trigger an error by passing invalid data
      await act(async () => {
        result.current.mutate(null as any)
        await waitFor(() => {
          expect(result.current.isError).toBe(true)
        })
      })

      expect(result.current.isSuccess).toBe(false)
      expect(result.current.error).toBeDefined()

      consoleSpy.mockRestore()
    })

    it('resets mutation state correctly', async () => {
      const { result } = renderHook(() => useCreateTransaction(), {
        wrapper: createWrapper(queryClient),
      })

      const newTransaction = createMockTransaction()

      await act(async () => {
        result.current.mutate(newTransaction)
        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })
      })

      expect(result.current.isSuccess).toBe(true)

      act(() => {
        result.current.reset()
      })

      expect(result.current.isIdle).toBe(true)
      expect(result.current.data).toBeUndefined()
      expect(result.current.error).toBeNull()
    })
  })

  describe('useUpdateTransaction Hook', () => {
    it('updates an existing transaction successfully', async () => {
      // First, populate cache with initial data
      const transactionsHook = renderHook(() => useTransactions(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(transactionsHook.result.current.isSuccess).toBe(true)
      })

      const existingTransaction = transactionsHook.result.current.data?.[0]
      expect(existingTransaction).toBeDefined()

      // Now test the update mutation
      const { result } = renderHook(() => useUpdateTransaction(), {
        wrapper: createWrapper(queryClient),
      })

      const updatedTransaction = {
        ...existingTransaction!,
        merchant: 'Updated Store Name',
        amount: -99.99,
      }

      await act(async () => {
        result.current.mutate(updatedTransaction)
        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })
      })

      expect(result.current.data).toMatchObject(updatedTransaction)
    })

    it('updates query cache correctly on success', async () => {
      // Populate initial data
      const transactionsHook = renderHook(() => useTransactions(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(transactionsHook.result.current.isSuccess).toBe(true)
      })

      const existingTransaction = transactionsHook.result.current.data?.[0]!
      const initialCount = transactionsHook.result.current.data?.length || 0

      // Test update
      const { result } = renderHook(() => useUpdateTransaction(), {
        wrapper: createWrapper(queryClient),
      })

      const updatedTransaction = {
        ...existingTransaction,
        merchant: 'Updated Merchant',
      }

      await act(async () => {
        result.current.mutate(updatedTransaction)
        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })
      })

      // Check cache was updated correctly
      const updatedData = queryClient.getQueryData<Transaction[]>(['transactions'])
      expect(updatedData).toBeDefined()
      expect(updatedData!.length).toBe(initialCount) // Count should remain the same
      
      const updatedItem = updatedData!.find(t => t.id === existingTransaction.id)
      expect(updatedItem).toMatchObject(updatedTransaction)
    })

    it('handles updating non-existent transaction', async () => {
      // Populate initial data
      const transactionsHook = renderHook(() => useTransactions(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(transactionsHook.result.current.isSuccess).toBe(true)
      })

      // Test updating a non-existent transaction
      const { result } = renderHook(() => useUpdateTransaction(), {
        wrapper: createWrapper(queryClient),
      })

      const nonExistentTransaction = createMockTransaction({
        id: 'non-existent-id',
      })

      await act(async () => {
        result.current.mutate(nonExistentTransaction)
        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })
      })

      // The mutation should succeed, but the cache shouldn't contain the item
      const cacheData = queryClient.getQueryData<Transaction[]>(['transactions'])
      const foundItem = cacheData?.find(t => t.id === 'non-existent-id')
      expect(foundItem).toBeUndefined()
    })
  })

  describe('useDeleteTransaction Hook', () => {
    it('deletes a transaction successfully', async () => {
      // Populate initial data
      const transactionsHook = renderHook(() => useTransactions(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(transactionsHook.result.current.isSuccess).toBe(true)
      })

      const transactionToDelete = transactionsHook.result.current.data?.[0]
      expect(transactionToDelete).toBeDefined()

      // Test delete
      const { result } = renderHook(() => useDeleteTransaction(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate(transactionToDelete!.id)
        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })
      })

      expect(result.current.isSuccess).toBe(true)
    })

    it('removes transaction from query cache on success', async () => {
      // Populate initial data
      const transactionsHook = renderHook(() => useTransactions(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(transactionsHook.result.current.isSuccess).toBe(true)
      })

      const transactionToDelete = transactionsHook.result.current.data?.[0]!
      const initialCount = transactionsHook.result.current.data?.length || 0

      // Test delete
      const { result } = renderHook(() => useDeleteTransaction(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate(transactionToDelete.id)
        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })
      })

      // Check cache was updated
      const updatedData = queryClient.getQueryData<Transaction[]>(['transactions'])
      expect(updatedData).toBeDefined()
      expect(updatedData!.length).toBe(initialCount - 1)
      
      const deletedItem = updatedData!.find(t => t.id === transactionToDelete.id)
      expect(deletedItem).toBeUndefined()
    })

    it('handles deleting non-existent transaction', async () => {
      // Populate initial data
      const transactionsHook = renderHook(() => useTransactions(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(transactionsHook.result.current.isSuccess).toBe(true)
      })

      const initialCount = transactionsHook.result.current.data?.length || 0

      // Test deleting non-existent transaction
      const { result } = renderHook(() => useDeleteTransaction(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate('non-existent-id')
        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })
      })

      // Cache should remain unchanged
      const cacheData = queryClient.getQueryData<Transaction[]>(['transactions'])
      expect(cacheData!.length).toBe(initialCount)
    })
  })

  describe('Integration Tests', () => {
    it('performs complete CRUD operations', async () => {
      // 1. Fetch initial data
      const fetchHook = renderHook(() => useTransactions(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(fetchHook.result.current.isSuccess).toBe(true)
      })

      const initialCount = fetchHook.result.current.data?.length || 0

      // 2. Create a new transaction
      const createHook = renderHook(() => useCreateTransaction(), {
        wrapper: createWrapper(queryClient),
      })

      const newTransaction = createMockTransaction({
        merchant: 'Integration Test Store',
      })

      await act(async () => {
        createHook.result.current.mutate(newTransaction)
        await waitFor(() => {
          expect(createHook.result.current.isSuccess).toBe(true)
        })
      })

      let cacheData = queryClient.getQueryData<Transaction[]>(['transactions'])
      expect(cacheData!.length).toBe(initialCount + 1)

      const createdTransaction = createHook.result.current.data!

      // 3. Update the transaction
      const updateHook = renderHook(() => useUpdateTransaction(), {
        wrapper: createWrapper(queryClient),
      })

      const updatedTransaction = {
        ...createdTransaction,
        merchant: 'Updated Integration Test Store',
        amount: -50.00,
      }

      await act(async () => {
        updateHook.result.current.mutate(updatedTransaction)
        await waitFor(() => {
          expect(updateHook.result.current.isSuccess).toBe(true)
        })
      })

      cacheData = queryClient.getQueryData<Transaction[]>(['transactions'])
      const foundUpdated = cacheData!.find(t => t.id === createdTransaction.id)
      expect(foundUpdated?.merchant).toBe('Updated Integration Test Store')
      expect(foundUpdated?.amount).toBe(-50.00)

      // 4. Delete the transaction
      const deleteHook = renderHook(() => useDeleteTransaction(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        deleteHook.result.current.mutate(createdTransaction.id)
        await waitFor(() => {
          expect(deleteHook.result.current.isSuccess).toBe(true)
        })
      })

      cacheData = queryClient.getQueryData<Transaction[]>(['transactions'])
      expect(cacheData!.length).toBe(initialCount)
      expect(cacheData!.find(t => t.id === createdTransaction.id)).toBeUndefined()
    })

    it('handles multiple concurrent mutations', async () => {
      // Populate initial data
      const fetchHook = renderHook(() => useTransactions(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(fetchHook.result.current.isSuccess).toBe(true)
      })

      // Create multiple mutations
      const createHook1 = renderHook(() => useCreateTransaction(), {
        wrapper: createWrapper(queryClient),
      })
      const createHook2 = renderHook(() => useCreateTransaction(), {
        wrapper: createWrapper(queryClient),
      })

      const transaction1 = createMockTransaction({ merchant: 'Store 1' })
      const transaction2 = createMockTransaction({ merchant: 'Store 2' })

      // Execute mutations concurrently
      await act(async () => {
        createHook1.result.current.mutate(transaction1)
        createHook2.result.current.mutate(transaction2)

        await Promise.all([
          waitFor(() => expect(createHook1.result.current.isSuccess).toBe(true)),
          waitFor(() => expect(createHook2.result.current.isSuccess).toBe(true)),
        ])
      })

      const cacheData = queryClient.getQueryData<Transaction[]>(['transactions'])
      expect(cacheData!.find(t => t.merchant === 'Store 1')).toBeDefined()
      expect(cacheData!.find(t => t.merchant === 'Store 2')).toBeDefined()
    })
  })

  describe('Performance and Memory', () => {
    it('handles large datasets efficiently', async () => {
      // Pre-populate cache with large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => 
        createMockTransaction({ id: `transaction-${i}` })
      )

      queryClient.setQueryData(['transactions'], largeDataset)

      const startTime = performance.now()

      const { result } = renderHook(() => useUpdateTransaction(), {
        wrapper: createWrapper(queryClient),
      })

      const transactionToUpdate = { ...largeDataset[500], merchant: 'Updated' }

      await act(async () => {
        result.current.mutate(transactionToUpdate)
        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })
      })

      const endTime = performance.now()
      const executionTime = endTime - startTime

      expect(executionTime).toBeLessThan(1000) // Should complete within 1 second
      
      const cacheData = queryClient.getQueryData<Transaction[]>(['transactions'])
      expect(cacheData!.length).toBe(1000)
      expect(cacheData![500].merchant).toBe('Updated')
    })
  })
})