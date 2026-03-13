import { AxiosResponse } from 'axios';
import { apiClient } from './api';
import { 
  ApiResponse, 
  PaginatedResponse,
  CreditCard, 
  CreditCardFormData,
  CreditCardPayment,
  Transaction
} from '../types';

export interface CreditCardStats {
  totalCards: number;
  totalBalance: number;
  totalCreditLimit: number;
  totalAvailableCredit: number;
  averageUtilization: number;
  totalRewards: number;
}

export interface CreditCardFilters {
  cardType?: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';
  issuer?: string;
  rewardType?: 'cashback' | 'points' | 'miles' | 'none';
  isActive?: boolean;
  search?: string;
  sortBy?: 'name' | 'balance' | 'creditLimit' | 'paymentDueDate' | 'apr';
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentFormData {
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  confirmationNumber?: string;
}

class CreditCardService {
  /**
   * Get all credit cards with filters
   */
  async getCreditCards(filters?: CreditCardFilters): Promise<ApiResponse<CreditCard[]>> {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response: AxiosResponse<ApiResponse<CreditCard[]>> = await apiClient.get(
      `/credit-cards?${params}`
    );
    return response.data;
  }

  /**
   * Get a single credit card by ID
   */
  async getCreditCard(id: string): Promise<ApiResponse<CreditCard>> {
    const response: AxiosResponse<ApiResponse<CreditCard>> = await apiClient.get(
      `/credit-cards/${id}`
    );
    return response.data;
  }

  /**
   * Create a new credit card
   */
  async createCreditCard(data: CreditCardFormData): Promise<ApiResponse<CreditCard>> {
    const response: AxiosResponse<ApiResponse<CreditCard>> = await apiClient.post(
      '/credit-cards',
      data
    );
    return response.data;
  }

  /**
   * Update an existing credit card
   */
  async updateCreditCard(
    id: string, 
    data: Partial<CreditCardFormData>
  ): Promise<ApiResponse<CreditCard>> {
    const response: AxiosResponse<ApiResponse<CreditCard>> = await apiClient.patch(
      `/credit-cards/${id}`,
      data
    );
    return response.data;
  }

  /**
   * Delete a credit card
   */
  async deleteCreditCard(id: string): Promise<ApiResponse<null>> {
    const response: AxiosResponse<ApiResponse<null>> = await apiClient.delete(
      `/credit-cards/${id}`
    );
    return response.data;
  }

  /**
   * Toggle card active status
   */
  async toggleCardStatus(id: string): Promise<ApiResponse<CreditCard>> {
    const response: AxiosResponse<ApiResponse<CreditCard>> = await apiClient.patch(
      `/credit-cards/${id}/toggle-status`
    );
    return response.data;
  }

  /**
   * Make a payment
   */
  async makePayment(
    cardId: string, 
    data: PaymentFormData
  ): Promise<ApiResponse<CreditCardPayment>> {
    const response: AxiosResponse<ApiResponse<CreditCardPayment>> = await apiClient.post(
      `/credit-cards/${cardId}/payments`,
      data
    );
    return response.data;
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(
    cardId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<CreditCardPayment>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const response: AxiosResponse<ApiResponse<PaginatedResponse<CreditCardPayment>>> = await apiClient.get(
      `/credit-cards/${cardId}/payments?${params}`
    );
    return response.data;
  }

  /**
   * Get transaction history for card
   */
  async getCardTransactions(
    cardId: string,
    page: number = 1,
    limit: number = 10,
    dateFrom?: string,
    dateTo?: string
  ): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response: AxiosResponse<ApiResponse<PaginatedResponse<Transaction>>> = await apiClient.get(
      `/credit-cards/${cardId}/transactions?${params}`
    );
    return response.data;
  }

  /**
   * Get credit card statistics
   */
  async getCreditCardStats(): Promise<ApiResponse<CreditCardStats>> {
    const response: AxiosResponse<ApiResponse<CreditCardStats>> = await apiClient.get(
      '/credit-cards/stats'
    );
    return response.data;
  }

  /**
   * Get balance history for card
   */
  async getBalanceHistory(
    cardId: string,
    period: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<ApiResponse<Array<{ date: string; balance: number; utilization: number }>>> {
    const response: AxiosResponse<ApiResponse<Array<{ date: string; balance: number; utilization: number }>>> = await apiClient.get(
      `/credit-cards/${cardId}/balance-history?period=${period}`
    );
    return response.data;
  }

  /**
   * Get reward points/cashback history
   */
  async getRewardHistory(
    cardId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<any> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const response: any = await apiClient.get(
      `/credit-cards/${cardId}/rewards?${params}`
    );
    return response.data;
  }

  /**
   * Update balance manually
   */
  async updateBalance(
    cardId: string, 
    balance: number
  ): Promise<ApiResponse<CreditCard>> {
    const response: AxiosResponse<ApiResponse<CreditCard>> = await apiClient.patch(
      `/credit-cards/${cardId}/balance`,
      { balance }
    );
    return response.data;
  }

  /**
   * Set payment reminder
   */
  async setPaymentReminder(
    cardId: string,
    reminderDays: number
  ): Promise<ApiResponse<null>> {
    const response: AxiosResponse<ApiResponse<null>> = await apiClient.post(
      `/credit-cards/${cardId}/reminder`,
      { reminderDays }
    );
    return response.data;
  }

  /**
   * Export card data
   */
  async exportCardData(cardId: string): Promise<Blob> {
    const response: AxiosResponse<Blob> = await apiClient.get(
      `/credit-cards/${cardId}/export`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }
}

export const creditCardService = new CreditCardService();