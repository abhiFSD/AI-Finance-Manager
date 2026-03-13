import { AxiosResponse } from 'axios';
import { apiClient } from './api';
import { ApiResponse } from '../types';

export interface NetWorthData {
  netWorth: number;
  assets: {
    accounts: number;
    investments: number;
    total: number;
  };
  liabilities: {
    creditCards: number;
    loans: number;
    total: number;
  };
}

class NetWorthService {
  /**
   * Get current net worth calculation
   */
  async getNetWorth(): Promise<ApiResponse<NetWorthData>> {
    const response: AxiosResponse<ApiResponse<NetWorthData>> = await apiClient.get(
      '/net-worth'
    );
    return response.data;
  }
}

export const netWorthService = new NetWorthService();
