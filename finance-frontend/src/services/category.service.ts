import { AxiosResponse } from 'axios';
import { apiClient } from './api';
import { 
  ApiResponse, 
  PaginatedResponse,
  Category, 
  TransactionType,
} from '../types';

export interface CategoryFormData {
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
}

export interface CategoryStats {
  totalTransactions: number;
  totalAmount: number;
  averageAmount: number;
  lastUsed: string;
}

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  totalSpent: number;
  transactionCount: number;
  percentage: number;
}

export interface CategoryFilters {
  type?: TransactionType;
  search?: string;
  isDefault?: boolean;
}

class CategoryService {
  /**
   * Get all categories with pagination and filters
   */
  async getCategories(
    page: number = 1,
    limit: number = 50,
    filters?: CategoryFilters
  ): Promise<ApiResponse<PaginatedResponse<Category>>> {
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

    const response: AxiosResponse<ApiResponse<PaginatedResponse<Category>>> = await apiClient.get(
      `/categories?${params}`
    );
    return response.data;
  }

  /**
   * Get all categories without pagination (for dropdowns)
   */
  async getAllCategories(type?: TransactionType): Promise<ApiResponse<Category[]>> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);

    const response: AxiosResponse<ApiResponse<Category[]>> = await apiClient.get(
      `/categories?${params}`
    );
    return response.data;
  }

  /**
   * Get a single category by ID
   */
  async getCategory(id: string): Promise<ApiResponse<Category>> {
    const response: AxiosResponse<ApiResponse<Category>> = await apiClient.get(
      `/categories/${id}`
    );
    return response.data;
  }

  /**
   * Create a new category
   */
  async createCategory(data: CategoryFormData): Promise<ApiResponse<Category>> {
    const response: AxiosResponse<ApiResponse<Category>> = await apiClient.post(
      '/categories',
      data
    );
    return response.data;
  }

  /**
   * Update an existing category
   */
  async updateCategory(
    id: string, 
    data: Partial<CategoryFormData>
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
   * Get category statistics
   */
  async getCategoryStats(
    categoryId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<ApiResponse<CategoryStats>> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response: AxiosResponse<ApiResponse<CategoryStats>> = await apiClient.get(
      `/categories/${categoryId}/stats?${params}`
    );
    return response.data;
  }

  /**
   * Get spending breakdown by categories
   */
  async getCategorySpending(
    type?: TransactionType,
    dateFrom?: string,
    dateTo?: string
  ): Promise<ApiResponse<CategorySpending[]>> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response: AxiosResponse<ApiResponse<CategorySpending[]>> = await apiClient.get(
      `/categories/spending?${params}`
    );
    return response.data;
  }

  /**
   * Get spending trends for a specific category
   */
  async getCategoryTrends(
    categoryId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    dateFrom?: string,
    dateTo?: string
  ): Promise<ApiResponse<Array<{ date: string; amount: number; count: number }>>> {
    const params = new URLSearchParams({ period });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response: AxiosResponse<ApiResponse<Array<{ date: string; amount: number; count: number }>>> = await apiClient.get(
      `/categories/${categoryId}/trends?${params}`
    );
    return response.data;
  }

  /**
   * Get most used categories
   */
  async getMostUsedCategories(
    limit: number = 10,
    type?: TransactionType,
    dateFrom?: string,
    dateTo?: string
  ): Promise<ApiResponse<Array<{
    category: Category;
    transactionCount: number;
    totalAmount: number;
  }>>> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (type) params.append('type', type);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response: AxiosResponse<ApiResponse<Array<{
      category: Category;
      transactionCount: number;
      totalAmount: number;
    }>>> = await apiClient.get(`/categories/most-used?${params}`);
    return response.data;
  }

  /**
   * Merge two categories (moves all transactions from source to target)
   */
  async mergeCategories(
    sourceCategoryId: string,
    targetCategoryId: string
  ): Promise<ApiResponse<{ movedTransactions: number }>> {
    const response: AxiosResponse<ApiResponse<{ movedTransactions: number }>> = await apiClient.post(
      `/categories/${sourceCategoryId}/merge`,
      { targetCategoryId }
    );
    return response.data;
  }

  /**
   * Get unused categories (categories with no transactions)
   */
  async getUnusedCategories(): Promise<ApiResponse<Category[]>> {
    const response: AxiosResponse<ApiResponse<Category[]>> = await apiClient.get(
      '/categories/unused'
    );
    return response.data;
  }

  /**
   * Get default categories (system categories that can't be deleted)
   */
  async getDefaultCategories(type?: TransactionType): Promise<ApiResponse<Category[]>> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);

    const response: AxiosResponse<ApiResponse<Category[]>> = await apiClient.get(
      `/categories/default?${params}`
    );
    return response.data;
  }

  /**
   * Restore default categories
   */
  async restoreDefaultCategories(): Promise<ApiResponse<Category[]>> {
    const response: AxiosResponse<ApiResponse<Category[]>> = await apiClient.post(
      '/categories/restore-defaults'
    );
    return response.data;
  }

  /**
   * Get category suggestions based on transaction description
   */
  async getCategorySuggestions(
    description: string,
    amount?: number,
    type?: TransactionType
  ): Promise<ApiResponse<Array<{
    category: Category;
    confidence: number;
    reason: string;
  }>>> {
    const params = new URLSearchParams({ description });
    if (amount) params.append('amount', amount.toString());
    if (type) params.append('type', type);

    const response: AxiosResponse<ApiResponse<Array<{
      category: Category;
      confidence: number;
      reason: string;
    }>>> = await apiClient.get(`/categories/suggestions?${params}`);
    return response.data;
  }

  /**
   * Import categories from CSV file
   */
  async importCategories(file: File): Promise<ApiResponse<{
    imported: number;
    errors: Array<{ row: number; error: string }>;
  }>> {
    const formData = new FormData();
    formData.append('file', file);

    const response: AxiosResponse<ApiResponse<{
      imported: number;
      errors: Array<{ row: number; error: string }>;
    }>> = await apiClient.post('/categories/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Export categories to CSV
   */
  async exportCategories(filters?: CategoryFilters): Promise<Blob> {
    const params = new URLSearchParams(filters as Record<string, string>);

    const response: AxiosResponse<Blob> = await apiClient.get(
      `/categories/export?${params}`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }

  /**
   * Bulk update categories
   */
  async bulkUpdateCategories(updates: Array<{
    id: string;
    data: Partial<CategoryFormData>;
  }>): Promise<ApiResponse<Category[]>> {
    const response: AxiosResponse<ApiResponse<Category[]>> = await apiClient.patch(
      '/categories/bulk',
      { updates }
    );
    return response.data;
  }

  /**
   * Bulk delete categories
   */
  async bulkDeleteCategories(categoryIds: string[]): Promise<ApiResponse<{
    deleted: number;
    failed: Array<{ id: string; reason: string }>;
  }>> {
    const response: AxiosResponse<ApiResponse<{
      deleted: number;
      failed: Array<{ id: string; reason: string }>;
    }>> = await apiClient.delete('/categories/bulk', {
      data: { categoryIds }
    });
    return response.data;
  }
}

export const categoryService = new CategoryService();