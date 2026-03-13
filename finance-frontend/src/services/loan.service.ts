import { AxiosResponse } from 'axios';
import { apiClient } from './api';
import { ApiResponse } from '../types';

export interface Loan {
  id: string;
  userId: string;
  name: string;
  type: 'HOME' | 'CAR' | 'PERSONAL' | 'EDUCATION' | 'BUSINESS' | 'OTHER';
  principalAmount: number;
  outstandingBalance: number;
  interestRate: number;
  emiAmount: number;
  tenure: number;
  remainingTenure: number;
  startDate: string;
  nextPaymentDate: string;
  lender: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoanStats {
  totalDebt: number;
  monthlyEmiTotal: number;
  avgInterestRate: number;
  activeLoans: number;
}

export interface PayoffStrategy {
  avalanche: {
    strategy: string;
    totalMonths: number;
    totalYears: number;
    totalInterestPaid: number;
    payoffOrder: Array<{
      loanId: string;
      loanName: string;
      monthsToPayoff: number;
      interestPaid: number;
      order: number;
    }>;
  };
  snowball: {
    strategy: string;
    totalMonths: number;
    totalYears: number;
    totalInterestPaid: number;
    payoffOrder: Array<{
      loanId: string;
      loanName: string;
      monthsToPayoff: number;
      interestPaid: number;
      order: number;
    }>;
  };
  recommendation: 'avalanche' | 'snowball';
}

export interface LoanPayment {
  id: string;
  loanId: string;
  amount: number;
  principal: number;
  interest: number;
  paymentDate: string;
  createdAt: string;
}

export interface LoanFormData {
  name: string;
  type: 'HOME' | 'CAR' | 'PERSONAL' | 'EDUCATION' | 'BUSINESS' | 'OTHER';
  principalAmount: number;
  interestRate: number;
  tenure: number;
  startDate: string;
  lender: string;
}

export interface PaymentFormData {
  amount: number;
  paymentDate: string;
}

class LoanService {
  /**
   * Get all loans
   */
  async getLoans(): Promise<ApiResponse<Loan[]>> {
    const response: AxiosResponse<ApiResponse<Loan[]>> = await apiClient.get('/loans');
    return response.data;
  }

  /**
   * Get a single loan by ID
   */
  async getLoan(id: string): Promise<ApiResponse<Loan>> {
    const response: AxiosResponse<ApiResponse<Loan>> = await apiClient.get(
      `/loans/${id}`
    );
    return response.data;
  }

  /**
   * Get loan statistics
   */
  async getLoanStats(): Promise<ApiResponse<LoanStats>> {
    const response: AxiosResponse<ApiResponse<LoanStats>> = await apiClient.get(
      '/loans/stats'
    );
    return response.data;
  }

  /**
   * Get payoff strategy (avalanche vs snowball)
   */
  async getPayoffStrategy(): Promise<ApiResponse<PayoffStrategy>> {
    const response: AxiosResponse<ApiResponse<PayoffStrategy>> = await apiClient.get(
      '/loans/payoff-strategy'
    );
    return response.data;
  }

  /**
   * Create a new loan
   */
  async createLoan(data: LoanFormData): Promise<ApiResponse<Loan>> {
    const response: AxiosResponse<ApiResponse<Loan>> = await apiClient.post(
      '/loans',
      data
    );
    return response.data;
  }

  /**
   * Update an existing loan
   */
  async updateLoan(
    id: string,
    data: Partial<LoanFormData>
  ): Promise<ApiResponse<Loan>> {
    const response: AxiosResponse<ApiResponse<Loan>> = await apiClient.put(
      `/loans/${id}`,
      data
    );
    return response.data;
  }

  /**
   * Delete a loan
   */
  async deleteLoan(id: string): Promise<ApiResponse<null>> {
    const response: AxiosResponse<ApiResponse<null>> = await apiClient.delete(
      `/loans/${id}`
    );
    return response.data;
  }

  /**
   * Record a payment for a loan
   */
  async makePayment(
    loanId: string,
    data: PaymentFormData
  ): Promise<ApiResponse<LoanPayment>> {
    const response: AxiosResponse<ApiResponse<LoanPayment>> = await apiClient.post(
      `/loans/${loanId}/payments`,
      data
    );
    return response.data;
  }
}

export const loanService = new LoanService();
