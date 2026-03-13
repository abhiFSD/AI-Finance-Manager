import { AxiosResponse } from 'axios';
import { apiClient } from './api';
import { ApiResponse } from '../types';

export interface RiskProfile {
  id: string;
  userId: string;
  score: number;
  category: 'CONSERVATIVE' | 'MODERATE' | 'BALANCED' | 'GROWTH' | 'AGGRESSIVE';
  age: string;
  incomeStability: string;
  investmentHorizon: string;
  riskTolerance: string;
  investmentExperience: string;
  createdAt: string;
  updatedAt: string;
}

export interface RiskRecommendation {
  category: string;
  recommended: number;
  current: number;
  description: string;
}

export interface RiskProfileFormData {
  age: '18-25' | '26-35' | '36-45' | '46-55' | '55+';
  incomeStability: 'very_stable' | 'stable' | 'moderate' | 'unstable';
  investmentHorizon: '<1' | '1-3' | '3-5' | '5-10' | '10+';
  riskTolerance: 'sell_immediately' | 'sell_some' | 'hold' | 'buy_more';
  investmentExperience: 'none' | 'beginner' | 'intermediate' | 'expert';
}

class RiskProfileService {
  /**
   * Get current risk profile
   */
  async getRiskProfile(): Promise<ApiResponse<RiskProfile>> {
    const response: AxiosResponse<ApiResponse<RiskProfile>> = await apiClient.get(
      '/risk-profile'
    );
    return response.data;
  }

  /**
   * Create or update risk profile
   */
  async saveRiskProfile(
    data: RiskProfileFormData
  ): Promise<ApiResponse<RiskProfile>> {
    const response: AxiosResponse<ApiResponse<RiskProfile>> = await apiClient.post(
      '/risk-profile',
      data
    );
    return response.data;
  }

  /**
   * Get investment recommendations based on risk profile
   */
  async getRecommendations(): Promise<ApiResponse<RiskRecommendation[]>> {
    const response: AxiosResponse<ApiResponse<RiskRecommendation[]>> = await apiClient.get(
      '/risk-profile/recommendations'
    );
    return response.data;
  }
}

export const riskProfileService = new RiskProfileService();
