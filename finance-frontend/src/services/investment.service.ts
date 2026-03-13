import { AxiosResponse } from 'axios';
import { apiClient } from './api';
import { ApiResponse } from '../types';

export interface Investment {
  id: string;
  userId: string;
  name: string;
  type: 'SIP' | 'MF' | 'ETF' | 'FD' | 'STOCKS' | 'BONDS' | 'OTHER';
  platform: string;
  investedAmount: number;
  currentValue: number;
  purchaseDate: string;
  expectedReturn?: number;
  goalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentStats {
  totalInvested: number;
  currentValue: number;
  totalReturns: number;
  returnPercentage: number;
  totalInvestments: number;
}

export interface InvestmentAllocation {
  type: string;
  value: number;
  percentage: number;
}

export interface InvestmentSuggestion {
  type: string;
  recommended: number;
  current: number;
  difference: number;
  reason: string;
}

export interface InvestmentFormData {
  name: string;
  type: 'SIP' | 'MF' | 'ETF' | 'FD' | 'STOCKS' | 'BONDS' | 'OTHER';
  platform: string;
  investedAmount: number;
  currentValue: number;
  purchaseDate: string;
  expectedReturn?: number;
  goalId?: string;
}

class InvestmentService {
  /**
   * Get all investments with optional filters
   */
  async getInvestments(filters?: {
    type?: string;
    goalId?: string;
  }): Promise<ApiResponse<Investment[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response: AxiosResponse<ApiResponse<Investment[]>> = await apiClient.get(
      `/investments?${params}`
    );
    return response.data;
  }

  /**
   * Get a single investment by ID
   */
  async getInvestment(id: string): Promise<ApiResponse<Investment>> {
    const response: AxiosResponse<ApiResponse<Investment>> = await apiClient.get(
      `/investments/${id}`
    );
    return response.data;
  }

  /**
   * Get investment statistics
   */
  async getInvestmentStats(): Promise<ApiResponse<InvestmentStats>> {
    const response: AxiosResponse<ApiResponse<InvestmentStats>> = await apiClient.get(
      '/investments/stats'
    );
    return response.data;
  }

  /**
   * Get asset allocation breakdown
   */
  async getAllocation(): Promise<ApiResponse<InvestmentAllocation[]>> {
    const response: AxiosResponse<ApiResponse<InvestmentAllocation[]>> = await apiClient.get(
      '/investments/allocation'
    );
    return response.data;
  }

  /**
   * Get investment suggestions based on risk profile
   */
  async getSuggestions(): Promise<ApiResponse<InvestmentSuggestion[]>> {
    const response: AxiosResponse<ApiResponse<InvestmentSuggestion[]>> = await apiClient.get(
      '/investments/suggestions'
    );
    return response.data;
  }

  /**
   * Create a new investment
   */
  async createInvestment(data: InvestmentFormData): Promise<ApiResponse<Investment>> {
    const response: AxiosResponse<ApiResponse<Investment>> = await apiClient.post(
      '/investments',
      data
    );
    return response.data;
  }

  /**
   * Update an existing investment
   */
  async updateInvestment(
    id: string,
    data: Partial<InvestmentFormData>
  ): Promise<ApiResponse<Investment>> {
    const response: AxiosResponse<ApiResponse<Investment>> = await apiClient.put(
      `/investments/${id}`,
      data
    );
    return response.data;
  }

  /**
   * Delete an investment
   */
  async deleteInvestment(id: string): Promise<ApiResponse<null>> {
    const response: AxiosResponse<ApiResponse<null>> = await apiClient.delete(
      `/investments/${id}`
    );
    return response.data;
  }
}

export const investmentService = new InvestmentService();
