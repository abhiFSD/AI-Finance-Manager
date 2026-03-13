import { AxiosResponse } from 'axios';
import { apiClient } from './api';
import { 
  ApiResponse, 
  PaginatedResponse,
  Account, 
  AccountFormData,
  Transaction,
  AccountType
} from '../types';

export interface AccountStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  transactionCount: number;
}

export interface AccountTrendData {
  date: string;
  balance: number;
  income: number;
  expenses: number;
}

export interface AccountFilters {
  type?: AccountType;
  search?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'balance' | 'type' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

class AccountService {
  /**
   * Get all accounts with filters
   */
  async getAccounts(filters?: AccountFilters): Promise<ApiResponse<Account[]>> {
    const params = new URLSearchParams();

    // Add filters to params
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response: AxiosResponse<ApiResponse<Account[]>> = await apiClient.get(
      `/accounts?${params}`
    );
    return response.data;
  }

  /**
   * Get a single account by ID
   */
  async getAccount(id: string): Promise<ApiResponse<Account>> {
    const response: AxiosResponse<ApiResponse<Account>> = await apiClient.get(
      `/accounts/${id}`
    );
    return response.data;
  }

  /**
   * Create a new account
   */
  async createAccount(data: AccountFormData): Promise<ApiResponse<Account>> {
    const response: AxiosResponse<ApiResponse<Account>> = await apiClient.post(
      '/accounts',
      data
    );
    return response.data;
  }

  /**
   * Update an existing account
   */
  async updateAccount(
    id: string, 
    data: Partial<AccountFormData>
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
   * Get account statistics
   */
  async getAccountStats(
    accountId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<ApiResponse<AccountStats>> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response: AxiosResponse<ApiResponse<AccountStats>> = await apiClient.get(
      `/accounts/${accountId}/stats?${params}`
    );
    return response.data;
  }

  /**
   * Get account balance trends over time
   */
  async getAccountTrends(
    accountId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    dateFrom?: string,
    dateTo?: string
  ): Promise<ApiResponse<AccountTrendData[]>> {
    const params = new URLSearchParams({ period });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response: AxiosResponse<ApiResponse<AccountTrendData[]>> = await apiClient.get(
      `/accounts/${accountId}/trends?${params}`
    );
    return response.data;
  }

  /**
   * Get recent transactions for an account
   */
  async getAccountTransactions(
    accountId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const response: AxiosResponse<ApiResponse<PaginatedResponse<Transaction>>> = await apiClient.get(
      `/accounts/${accountId}/transactions?${params}`
    );
    return response.data;
  }

  /**
   * Transfer money between accounts
   */
  async transferMoney(data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description?: string;
  }): Promise<ApiResponse<{ fromTransaction: Transaction; toTransaction: Transaction }>> {
    const response: AxiosResponse<ApiResponse<{ fromTransaction: Transaction; toTransaction: Transaction }>> = await apiClient.post(
      '/accounts/transfer',
      data
    );
    return response.data;
  }

  /**
   * Toggle account active status
   */
  async toggleAccountStatus(id: string): Promise<ApiResponse<Account>> {
    const response: AxiosResponse<ApiResponse<Account>> = await apiClient.patch(
      `/accounts/${id}/toggle-status`
    );
    return response.data;
  }

  /**
   * Get account balance history for chart
   */
  async getBalanceHistory(
    accountId: string,
    period: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<ApiResponse<Array<{ date: string; balance: number }>>> {
    const response: AxiosResponse<ApiResponse<Array<{ date: string; balance: number }>>> = await apiClient.get(
      `/accounts/${accountId}/balance-history?period=${period}`
    );
    return response.data;
  }

  /**
   * Export account data
   */
  async exportAccountData(accountId: string): Promise<Blob> {
    const response: AxiosResponse<Blob> = await apiClient.get(
      `/accounts/${accountId}/export`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }
}

export const accountService = new AccountService();