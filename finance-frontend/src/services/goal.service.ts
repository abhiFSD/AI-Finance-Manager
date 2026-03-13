import { AxiosResponse } from 'axios';
import { apiClient } from './api';
import { 
  ApiResponse, 
  PaginatedResponse,
  Goal, 
  GoalFormData,
  GoalMilestone,
  GoalCategory
} from '../types';

export interface GoalStats {
  totalGoals: number;
  completedGoals: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  averageProgress: number;
}

export interface GoalFilters {
  category?: GoalCategory;
  priority?: 'low' | 'medium' | 'high';
  isCompleted?: boolean;
  search?: string;
  sortBy?: 'name' | 'targetDate' | 'targetAmount' | 'progress' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  date: string;
  description?: string;
  createdAt: string;
}

class GoalService {
  /**
   * Get all goals with filters
   */
  async getGoals(filters?: GoalFilters): Promise<ApiResponse<Goal[]>> {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response: AxiosResponse<ApiResponse<Goal[]>> = await apiClient.get(
      `/goals?${params}`
    );
    return response.data;
  }

  /**
   * Get a single goal by ID
   */
  async getGoal(id: string): Promise<ApiResponse<Goal>> {
    const response: AxiosResponse<ApiResponse<Goal>> = await apiClient.get(
      `/goals/${id}`
    );
    return response.data;
  }

  /**
   * Create a new goal
   */
  async createGoal(data: GoalFormData): Promise<ApiResponse<Goal>> {
    // Map frontend category to backend category
    const categoryMap: Record<string, string> = {
      'emergency_fund': 'EMERGENCY_FUND',
      'vacation': 'VACATION',
      'home': 'HOME_PURCHASE',
      'retirement': 'RETIREMENT',
      'education': 'EDUCATION',
      'debt_payoff': 'DEBT_PAYOFF',
      'investment': 'INVESTMENT',
      'other': 'OTHER'
    };

    // Transform frontend data to match backend expectations
    const backendData = {
      name: data.name,
      targetAmount: data.targetAmount,
      currentAmount: 0,
      deadline: data.targetDate || undefined,
      category: categoryMap[data.category] || 'OTHER',
      priority: data.priority.toUpperCase(),
      description: data.description || undefined
    };

    const response: AxiosResponse<ApiResponse<Goal>> = await apiClient.post(
      '/goals',
      backendData
    );
    return response.data;
  }

  /**
   * Update an existing goal
   */
  async updateGoal(
    id: string, 
    data: Partial<GoalFormData>
  ): Promise<ApiResponse<Goal>> {
    const response: AxiosResponse<ApiResponse<Goal>> = await apiClient.patch(
      `/goals/${id}`,
      data
    );
    return response.data;
  }

  /**
   * Delete a goal
   */
  async deleteGoal(id: string): Promise<ApiResponse<null>> {
    const response: AxiosResponse<ApiResponse<null>> = await apiClient.delete(
      `/goals/${id}`
    );
    return response.data;
  }

  /**
   * Mark goal as completed
   */
  async completeGoal(id: string): Promise<ApiResponse<Goal>> {
    const response: AxiosResponse<ApiResponse<Goal>> = await apiClient.patch(
      `/goals/${id}/complete`
    );
    return response.data;
  }

  /**
   * Add contribution to goal
   */
  async addContribution(
    goalId: string, 
    amount: number, 
    description?: string
  ): Promise<ApiResponse<Goal>> {
    const response: AxiosResponse<ApiResponse<Goal>> = await apiClient.post(
      `/goals/${goalId}/contributions`,
      { amount, description }
    );
    return response.data;
  }

  /**
   * Get goal contributions
   */
  async getGoalContributions(
    goalId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<GoalContribution>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const response: AxiosResponse<ApiResponse<PaginatedResponse<GoalContribution>>> = await apiClient.get(
      `/goals/${goalId}/contributions?${params}`
    );
    return response.data;
  }

  /**
   * Get goal progress over time
   */
  async getGoalProgress(
    goalId: string,
    period: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<ApiResponse<Array<{ date: string; amount: number }>>> {
    const response: AxiosResponse<ApiResponse<Array<{ date: string; amount: number }>>> = await apiClient.get(
      `/goals/${goalId}/progress?period=${period}`
    );
    return response.data;
  }

  /**
   * Get goal statistics
   */
  async getGoalStats(): Promise<ApiResponse<GoalStats>> {
    const response: AxiosResponse<ApiResponse<GoalStats>> = await apiClient.get(
      '/goals/stats'
    );
    return response.data;
  }

  /**
   * Create milestone for goal
   */
  async createMilestone(
    goalId: string,
    data: { name: string; targetAmount: number }
  ): Promise<ApiResponse<GoalMilestone>> {
    const response: AxiosResponse<ApiResponse<GoalMilestone>> = await apiClient.post(
      `/goals/${goalId}/milestones`,
      data
    );
    return response.data;
  }

  /**
   * Update milestone
   */
  async updateMilestone(
    goalId: string,
    milestoneId: string,
    data: Partial<{ name: string; targetAmount: number }>
  ): Promise<ApiResponse<GoalMilestone>> {
    const response: AxiosResponse<ApiResponse<GoalMilestone>> = await apiClient.patch(
      `/goals/${goalId}/milestones/${milestoneId}`,
      data
    );
    return response.data;
  }

  /**
   * Complete milestone
   */
  async completeMilestone(
    goalId: string,
    milestoneId: string
  ): Promise<ApiResponse<GoalMilestone>> {
    const response: AxiosResponse<ApiResponse<GoalMilestone>> = await apiClient.patch(
      `/goals/${goalId}/milestones/${milestoneId}/complete`
    );
    return response.data;
  }

  /**
   * Delete milestone
   */
  async deleteMilestone(
    goalId: string,
    milestoneId: string
  ): Promise<ApiResponse<null>> {
    const response: AxiosResponse<ApiResponse<null>> = await apiClient.delete(
      `/goals/${goalId}/milestones/${milestoneId}`
    );
    return response.data;
  }
}

export const goalService = new GoalService();