import { AxiosResponse } from 'axios';
import { apiClient } from './api';
import { 
  ApiResponse, 
  PaginatedResponse,
  Budget, 
  BudgetPeriod,
} from '../types';

export interface BudgetFormData {
  name: string;
  amount: number;
  period: BudgetPeriod;
  categories: string[];
  startDate: string;
  endDate?: string;
}

export interface BudgetStats {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  budgetCount: number;
  overBudgetCount: number;
}

export interface BudgetCategoryBreakdown {
  categoryId: string;
  categoryName: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentage: number;
}

export interface BudgetRecommendation {
  category: string;
  currentAverage: number;
  recommendedAmount: number;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface BudgetFilters {
  period?: BudgetPeriod;
  isActive?: boolean;
  categoryId?: string;
  search?: string;
}

class BudgetService {
  /**
   * Get all budgets with pagination and filters
   */
  async getBudgets(
    page: number = 1,
    limit: number = 20,
    filters?: BudgetFilters
  ): Promise<ApiResponse<PaginatedResponse<Budget>>> {
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

    const response: AxiosResponse<ApiResponse<PaginatedResponse<Budget>>> = await apiClient.get(
      `/budgets?${params}`
    );
    return response.data;
  }

  /**
   * Get a single budget by ID
   */
  async getBudget(id: string): Promise<ApiResponse<Budget>> {
    const response: AxiosResponse<ApiResponse<Budget>> = await apiClient.get(
      `/budgets/${id}`
    );
    return response.data;
  }

  /**
   * Create a new budget
   */
  async createBudget(data: BudgetFormData): Promise<ApiResponse<Budget>> {
    const response: AxiosResponse<ApiResponse<Budget>> = await apiClient.post(
      '/budgets',
      data
    );
    return response.data;
  }

  /**
   * Update an existing budget
   */
  async updateBudget(
    id: string, 
    data: Partial<BudgetFormData>
  ): Promise<ApiResponse<Budget>> {
    const response: AxiosResponse<ApiResponse<Budget>> = await apiClient.patch(
      `/budgets/${id}`,
      data
    );
    return response.data;
  }

  /**
   * Delete a budget
   */
  async deleteBudget(id: string): Promise<ApiResponse<null>> {
    const response: AxiosResponse<ApiResponse<null>> = await apiClient.delete(
      `/budgets/${id}`
    );
    return response.data;
  }

  /**
   * Get budget statistics
   */
  async getBudgetStats(
    period?: BudgetPeriod,
    dateFrom?: string,
    dateTo?: string
  ): Promise<ApiResponse<BudgetStats>> {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response: AxiosResponse<ApiResponse<BudgetStats>> = await apiClient.get(
      `/budgets/summary?${params}`
    );
    return response.data;
  }

  /**
   * Get budget spending breakdown by category
   */
  async getBudgetBreakdown(
    budgetId: string
  ): Promise<ApiResponse<BudgetCategoryBreakdown[]>> {
    const response: AxiosResponse<ApiResponse<BudgetCategoryBreakdown[]>> = await apiClient.get(
      `/budgets/${budgetId}/breakdown`
    );
    return response.data;
  }

  /**
   * Get budget progress over time
   */
  async getBudgetProgress(
    budgetId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<ApiResponse<Array<{ date: string; spent: number; budget: number }>>> {
    const params = new URLSearchParams({ period });
    const response: AxiosResponse<ApiResponse<Array<{ date: string; spent: number; budget: number }>>> = await apiClient.get(
      `/budgets/${budgetId}/progress?${params}`
    );
    return response.data;
  }

  /**
   * Get budget recommendations based on spending patterns
   */
  async getBudgetRecommendations(
    period: BudgetPeriod = 'monthly',
    lookbackMonths: number = 6
  ): Promise<ApiResponse<BudgetRecommendation[]>> {
    const params = new URLSearchParams({
      period,
      lookbackMonths: lookbackMonths.toString(),
    });

    const response: AxiosResponse<ApiResponse<BudgetRecommendation[]>> = await apiClient.get(
      `/budgets/recommendations?${params}`
    );
    return response.data;
  }

  /**
   * Copy budget from previous period
   */
  async copyBudget(
    budgetId: string,
    newPeriod: BudgetPeriod,
    newStartDate: string,
    adjustmentPercentage?: number
  ): Promise<ApiResponse<Budget>> {
    const data = {
      newPeriod,
      newStartDate,
      adjustmentPercentage: adjustmentPercentage || 0,
    };

    const response: AxiosResponse<ApiResponse<Budget>> = await apiClient.post(
      `/budgets/${budgetId}/copy`,
      data
    );
    return response.data;
  }

  /**
   * Reset budget spending (useful for new period)
   */
  async resetBudgetSpending(budgetId: string): Promise<ApiResponse<Budget>> {
    const response: AxiosResponse<ApiResponse<Budget>> = await apiClient.post(
      `/budgets/${budgetId}/reset`
    );
    return response.data;
  }

  /**
   * Get budgets that are currently active for a specific date
   */
  async getActiveBudgets(date?: string): Promise<ApiResponse<Budget[]>> {
    const params = new URLSearchParams();
    if (date) params.append('date', date);

    const response: AxiosResponse<ApiResponse<Budget[]>> = await apiClient.get(
      `/budgets/active?${params}`
    );
    return response.data;
  }

  /**
   * Get over-budget alerts
   */
  async getOverBudgetAlerts(): Promise<ApiResponse<Array<{
    budget: Budget;
    overspentAmount: number;
    overspentPercentage: number;
    categories: Array<{ name: string; overspent: number }>;
  }>>> {
    const response: AxiosResponse<ApiResponse<Array<{
      budget: Budget;
      overspentAmount: number;
      overspentPercentage: number;
      categories: Array<{ name: string; overspent: number }>;
    }>>> = await apiClient.get('/budgets/alerts');
    return response.data;
  }

  /**
   * Import budgets from CSV file
   */
  async importBudgets(file: File): Promise<ApiResponse<{
    imported: number;
    errors: Array<{ row: number; error: string }>;
  }>> {
    const formData = new FormData();
    formData.append('file', file);

    const response: AxiosResponse<ApiResponse<{
      imported: number;
      errors: Array<{ row: number; error: string }>;
    }>> = await apiClient.post('/budgets/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Export budgets to CSV
   */
  async exportBudgets(filters?: BudgetFilters): Promise<Blob> {
    const params = new URLSearchParams(filters as Record<string, string>);

    const response: AxiosResponse<Blob> = await apiClient.get(
      `/budgets/export?${params}`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }
}

export const budgetService = new BudgetService();