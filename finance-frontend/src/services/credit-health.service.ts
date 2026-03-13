import { AxiosResponse } from 'axios';
import { apiClient } from './api';
import { ApiResponse } from '../types';

export interface CreditHealthRecord {
  id: string;
  userId: string;
  creditScore: number;
  source: 'CIBIL' | 'EXPERIAN' | 'EQUIFAX' | 'HIGHMARK' | 'MANUAL';
  reportDate: string;
  creditUtilization?: number;
  totalAccounts?: number;
  activeAccounts?: number;
  onTimePayments?: number;
  missedPayments?: number;
  oldestAccountAge?: number;
  createdAt: string;
}

export interface CreditHealthStats {
  currentScore: number;
  previousScore: number;
  scoreChange: number;
  creditUtilization: number;
  onTimePayments: number;
  missedPayments: number;
  oldestAccountAge: number;
  totalAccounts: number;
  activeAccounts: number;
}

export interface CreditSuggestion {
  category: string;
  suggestion: string;
  impact: 'low' | 'medium' | 'high';
  priority: number;
}

export interface CreditHealthFormData {
  creditScore: number;
  source: 'CIBIL' | 'EXPERIAN' | 'EQUIFAX' | 'HIGHMARK' | 'MANUAL';
  reportDate: string;
  creditUtilization?: number;
  totalAccounts?: number;
  activeAccounts?: number;
  onTimePayments?: number;
  missedPayments?: number;
  oldestAccountAge?: number;
}

class CreditHealthService {
  /**
   * Get all credit health records (history)
   */
  async getCreditHealthRecords(): Promise<ApiResponse<CreditHealthRecord[]>> {
    const response: AxiosResponse<ApiResponse<CreditHealthRecord[]>> = await apiClient.get(
      '/credit-health'
    );
    return response.data;
  }

  /**
   * Get latest credit health record
   */
  async getLatestCreditHealth(): Promise<ApiResponse<CreditHealthStats>> {
    const response: AxiosResponse<ApiResponse<CreditHealthStats>> = await apiClient.get(
      '/credit-health/latest'
    );
    return response.data;
  }

  /**
   * Add a new credit health record
   */
  async createCreditHealthRecord(
    data: CreditHealthFormData
  ): Promise<ApiResponse<CreditHealthRecord>> {
    const response: AxiosResponse<ApiResponse<CreditHealthRecord>> = await apiClient.post(
      '/credit-health',
      data
    );
    return response.data;
  }

  /**
   * Get credit improvement suggestions
   */
  async getSuggestions(): Promise<ApiResponse<CreditSuggestion[]>> {
    const response: AxiosResponse<ApiResponse<CreditSuggestion[]>> = await apiClient.get(
      '/credit-health/suggestions'
    );
    return response.data;
  }
}

export const creditHealthService = new CreditHealthService();
