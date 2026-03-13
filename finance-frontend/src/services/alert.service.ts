import { AxiosResponse } from 'axios';
import { apiClient } from './api';
import { ApiResponse } from '../types';

export interface Alert {
  id: string;
  userId: string;
  type: 'BILL_DUE' | 'LOW_BALANCE' | 'GOAL_MILESTONE' | 'BUDGET_EXCEEDED' | 'LOAN_PAYMENT' | 'GENERAL';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  isRead: boolean;
  actionUrl?: string;
  metadata?: any;
  createdAt: string;
}

class AlertService {
  /**
   * Get all alerts
   */
  async getAlerts(filters?: {
    isRead?: boolean;
    type?: string;
    limit?: number;
  }): Promise<ApiResponse<Alert[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response: AxiosResponse<ApiResponse<Alert[]>> = await apiClient.get(
      `/alerts?${params}`
    );
    return response.data;
  }

  /**
   * Generate new alerts based on current data
   */
  async generateAlerts(): Promise<ApiResponse<Alert[]>> {
    const response: AxiosResponse<ApiResponse<Alert[]>> = await apiClient.post(
      '/alerts/generate'
    );
    return response.data;
  }

  /**
   * Mark alert as read
   */
  async markAsRead(id: string): Promise<ApiResponse<Alert>> {
    const response: AxiosResponse<ApiResponse<Alert>> = await apiClient.put(
      `/alerts/${id}/read`
    );
    return response.data;
  }
}

export const alertService = new AlertService();
