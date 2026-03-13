import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Transaction {
  id: string
  date: string
  merchant: string
  category: string
  amount: number
  type: 'credit' | 'debit'
  account: string
  description: string
  status: 'pending' | 'completed' | 'failed'
}

// Mock API functions
const fetchTransactions = async (): Promise<Transaction[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Return mock data
  return [
    {
      id: "1",
      date: "2024-12-15",
      merchant: "Starbucks Coffee",
      category: "Food & Dining",
      amount: -12.50,
      type: "debit",
      account: "Chase Checking",
      description: "Coffee and pastry",
      status: "completed"
    },
    // ... more mock data
  ]
}

const createTransaction = async (transaction: Omit<Transaction, 'id'>): Promise<Transaction> => {
  await new Promise(resolve => setTimeout(resolve, 500))
  return { ...transaction, id: crypto.randomUUID() }
}

const updateTransaction = async (transaction: Transaction): Promise<Transaction> => {
  await new Promise(resolve => setTimeout(resolve, 500))
  return transaction
}

const deleteTransaction = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 500))
}

// Hooks
export const useTransactions = () => {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useCreateTransaction = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createTransaction,
    onSuccess: (newTransaction) => {
      // Update the transactions list optimistically
      queryClient.setQueryData<Transaction[]>(['transactions'], (old) => 
        old ? [newTransaction, ...old] : [newTransaction]
      )
    },
  })
}

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: updateTransaction,
    onSuccess: (updatedTransaction) => {
      // Update the transactions list
      queryClient.setQueryData<Transaction[]>(['transactions'], (old) => 
        old?.map(transaction => 
          transaction.id === updatedTransaction.id ? updatedTransaction : transaction
        ) || []
      )
    },
  })
}

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: (_, deletedId) => {
      // Remove transaction from the list
      queryClient.setQueryData<Transaction[]>(['transactions'], (old) => 
        old?.filter(transaction => transaction.id !== deletedId) || []
      )
    },
  })
}