import { AxiosResponse } from 'axios';
import { apiClient } from './api';
import { 
  ApiResponse, 
  PaginatedResponse,
  Transaction, 
  TransactionFormData, 
  TransactionFilters,
  Account,
  Category
} from '../types';

export interface TransactionStats {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  transactionCount: number;
}

class TransactionService {
  /**
   * Get all transactions with pagination and filters
   */
  async getTransactions(
    page: number = 1,
    limit: number = 20,
    filters?: TransactionFilters
  ): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    // Add filters to params
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(item => params.append(key, item.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    const response: AxiosResponse<ApiResponse<PaginatedResponse<Transaction>>> = await apiClient.get(
      `/transactions?${params}`
    );
    return response.data;
  }

  /**
   * Get a single transaction by ID
   */
  async getTransaction(id: string): Promise<ApiResponse<Transaction>> {
    const response: AxiosResponse<ApiResponse<Transaction>> = await apiClient.get(
      `/transactions/${id}`
    );
    return response.data;
  }

  /**
   * Create a new transaction
   */
  async createTransaction(data: TransactionFormData): Promise<ApiResponse<Transaction>> {
    const response: AxiosResponse<ApiResponse<Transaction>> = await apiClient.post(
      '/transactions',
      data
    );
    return response.data;
  }

  /**
   * Update an existing transaction
   */
  async updateTransaction(
    id: string, 
    data: Partial<TransactionFormData>
  ): Promise<ApiResponse<Transaction>> {
    const response: AxiosResponse<ApiResponse<Transaction>> = await apiClient.patch(
      `/transactions/${id}`,
      data
    );
    return response.data;
  }

  /**
   * Delete a transaction
   */
  async deleteTransaction(id: string): Promise<ApiResponse<null>> {
    const response: AxiosResponse<ApiResponse<null>> = await apiClient.delete(
      `/transactions/${id}`
    );
    return response.data;
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(
    accountId?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<ApiResponse<TransactionStats>> {
    const params = new URLSearchParams();
    if (accountId) params.append('accountId', accountId);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response: AxiosResponse<ApiResponse<TransactionStats>> = await apiClient.get(
      `/transactions/stats?${params}`
    );
    return response.data;
  }

  /**
   * Get transactions grouped by category
   */
  async getTransactionsByCategory(
    accountId?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<ApiResponse<Array<{ category: string; amount: number; count: number }>>> {
    const params = new URLSearchParams();
    if (accountId) params.append('accountId', accountId);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response: AxiosResponse<ApiResponse<Array<{ category: string; amount: number; count: number }>>> = await apiClient.get(
      `/transactions/by-category?${params}`
    );
    return response.data;
  }

  /**
   * Get transaction trends over time
   */
  async getTransactionTrends(
    accountId?: string,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    dateFrom?: string,
    dateTo?: string
  ): Promise<ApiResponse<Array<{ date: string; income: number; expenses: number }>>> {
    const params = new URLSearchParams({ period });
    if (accountId) params.append('accountId', accountId);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response: AxiosResponse<ApiResponse<Array<{ date: string; income: number; expenses: number }>>> = await apiClient.get(
      `/transactions/trends?${params}`
    );
    return response.data;
  }

  /**
   * Get all accounts
   */
  async getAccounts(): Promise<ApiResponse<Account[]>> {
    const response: AxiosResponse<ApiResponse<Account[]>> = await apiClient.get('/accounts');
    return response.data;
  }

  /**
   * Create a new account
   */
  async createAccount(data: {
    name: string;
    type: string;
    balance: number;
    currency: string;
  }): Promise<ApiResponse<Account>> {
    const response: AxiosResponse<ApiResponse<Account>> = await apiClient.post(
      '/accounts',
      data
    );
    return response.data;
  }

  /**
   * Update an account
   */
  async updateAccount(
    id: string,
    data: Partial<Account>
  ): Promise<ApiResponse<Account>> {
    const response: AxiosResponse<ApiResponse<Account>> = await apiClient.patch(
      `/accounts/${id}`,
      data
    );
    return response.data;
  }

  /**
   * Delete an account
   */
  async deleteAccount(id: string): Promise<ApiResponse<null>> {
    const response: AxiosResponse<ApiResponse<null>> = await apiClient.delete(
      `/accounts/${id}`
    );
    return response.data;
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<ApiResponse<Category[]>> {
    const response: AxiosResponse<ApiResponse<Category[]>> = await apiClient.get('/categories');
    return response.data;
  }

  /**
   * Create a new category
   */
  async createCategory(data: {
    name: string;
    type: string;
    color: string;
    icon: string;
  }): Promise<ApiResponse<Category>> {
    const response: AxiosResponse<ApiResponse<Category>> = await apiClient.post(
      '/categories',
      data
    );
    return response.data;
  }

  /**
   * Update a category
   */
  async updateCategory(
    id: string,
    data: Partial<Category>
  ): Promise<ApiResponse<Category>> {
    const response: AxiosResponse<ApiResponse<Category>> = await apiClient.patch(
      `/categories/${id}`,
      data
    );
    return response.data;
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string): Promise<ApiResponse<null>> {
    const response: AxiosResponse<ApiResponse<null>> = await apiClient.delete(
      `/categories/${id}`
    );
    return response.data;
  }

  /**
   * Import transactions from CSV file
   */
  async importTransactions(file: File, accountId: string): Promise<ApiResponse<{
    imported: number;
    errors: Array<{ row: number; error: string }>;
  }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('accountId', accountId);

    const response: AxiosResponse<ApiResponse<{
      imported: number;
      errors: Array<{ row: number; error: string }>;
    }>> = await apiClient.post('/transactions/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Export transactions to CSV
   */
  async exportTransactions(filters?: TransactionFilters): Promise<Blob> {
    const params = new URLSearchParams(filters as Record<string, string>);

    const response: AxiosResponse<Blob> = await apiClient.get(
      `/transactions/export?${params}`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }
}

export const transactionService = new TransactionService();