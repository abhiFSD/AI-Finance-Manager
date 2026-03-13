import { AxiosResponse } from 'axios';
import { apiClient } from './api';
import { ApiResponse } from '../types';

export interface Insight {
  id: string;
  userId: string;
  type: 'SPENDING' | 'SAVING' | 'INVESTMENT' | 'DEBT' | 'GOAL' | 'GENERAL';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  actionable: boolean;
  metadata?: any;
  createdAt: string;
}

class InsightService {
  /**
   * Get all insights
   */
  async getInsights(filters?: {
    isRead?: boolean;
    type?: string;
    limit?: number;
  }): Promise<ApiResponse<Insight[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response: AxiosResponse<ApiResponse<Insight[]>> = await apiClient.get(
      `/insights?${params}`
    );
    return response.data;
  }

  /**
   * Generate new insights based on current data
   */
  async generateInsights(): Promise<ApiResponse<Insight[]>> {
    const response: AxiosResponse<ApiResponse<Insight[]>> = await apiClient.post(
      '/insights/generate'
    );
    return response.data;
  }

  /**
   * Mark insight as read
   */
  async markAsRead(id: string): Promise<ApiResponse<Insight>> {
    const response: AxiosResponse<ApiResponse<Insight>> = await apiClient.put(
      `/insights/${id}/read`
    );
    return response.data;
  }
}

export const insightService = new InsightService();
