import { Transaction } from '../../types';
import { BudgetItem, BudgetStatus } from './types';

export class BudgetTrackingService {
  private readonly CACHE_TTL = 300000; // 5 minutes
  private cache: Map<string, { data: BudgetStatus; timestamp: number }> = new Map();

  async trackBudgetUsage(
    budget: BudgetItem,
    transactions: Transaction[]
  ): Promise<BudgetStatus> {
    const cacheKey = `${budget.id}_${transactions.length}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const status = this.calculateBudgetStatus(budget, transactions);
    
    // Cache the result
    this.cache.set(cacheKey, {
      data: status,
      timestamp: Date.now()
    });

    return status;
  }

  private calculateBudgetStatus(
    budget: BudgetItem,
    transactions: Transaction[]
  ): BudgetStatus {
    const now = new Date();
    
    // Filter transactions for this budget's period and category
    const relevantTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      const matchesDateRange = transactionDate >= budget.startDate && transactionDate <= budget.endDate;
      const matchesCategory = t.categoryId === budget.categoryId || 
                             (budget.subcategoryId && t.subcategoryId === budget.subcategoryId);
      const isExpense = t.type === 'debit';
      
      return matchesDateRange && matchesCategory && isExpense;
    });

    // Calculate spent amount
    const spent = relevantTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const remaining = Math.max(0, budget.amount - spent);
    const utilizationPercentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    const isOverBudget = spent > budget.amount;

    // Calculate time-related metrics
    const totalPeriodDays = Math.ceil(
      (budget.endDate.getTime() - budget.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const daysRemaining = Math.max(0, Math.ceil(
      (budget.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    ));

    const daysPassed = totalPeriodDays - daysRemaining;
    const dailyBudgetRemaining = daysRemaining > 0 ? remaining / daysRemaining : 0;

    // Calculate projected spending
    const dailySpendingRate = daysPassed > 0 ? spent / daysPassed : 0;
    const projectedSpending = dailySpendingRate * totalPeriodDays;

    // Determine spending trend
    const trend = this.calculateSpendingTrend(budget, spent, daysPassed, totalPeriodDays);

    return {
      budgetId: budget.id,
      spent,
      remaining,
      utilizationPercentage,
      isOverBudget,
      daysRemaining,
      dailyBudgetRemaining,
      projectedSpending,
      trend,
      lastUpdated: now
    };
  }

  private calculateSpendingTrend(
    budget: BudgetItem,
    spent: number,
    daysPassed: number,
    totalPeriodDays: number
  ): 'on_track' | 'over_spending' | 'under_spending' {
    if (daysPassed === 0) return 'on_track';

    const expectedSpentPercentage = (daysPassed / totalPeriodDays) * 100;
    const actualSpentPercentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    const variance = actualSpentPercentage - expectedSpentPercentage;

    // Allow 10% variance before flagging as over/under spending
    if (variance > 10) return 'over_spending';
    if (variance < -15) return 'under_spending'; // More tolerance for under-spending
    return 'on_track';
  }

  async trackMultipleBudgets(
    budgets: BudgetItem[],
    transactions: Transaction[]
  ): Promise<BudgetStatus[]> {
    const statuses: BudgetStatus[] = [];
    
    // Process budgets in parallel for better performance
    const promises = budgets.map(budget => this.trackBudgetUsage(budget, transactions));
    const results = await Promise.all(promises);
    
    statuses.push(...results);
    return statuses.sort((a, b) => b.utilizationPercentage - a.utilizationPercentage);
  }

  getBudgetsNeedingAttention(
    statuses: BudgetStatus[],
    alertThreshold: number = 80
  ): Array<{
    status: BudgetStatus;
    alertType: 'over_budget' | 'approaching_limit' | 'unusual_spending' | 'period_ending';
    priority: 'low' | 'medium' | 'high' | 'critical';
    message: string;
  }> {
    const alerts: Array<{
      status: BudgetStatus;
      alertType: 'over_budget' | 'approaching_limit' | 'unusual_spending' | 'period_ending';
      priority: 'low' | 'medium' | 'high' | 'critical';
      message: string;
    }> = [];

    statuses.forEach(status => {
      // Over budget alert
      if (status.isOverBudget) {
        const overage = status.spent - (status.spent - status.remaining);
        alerts.push({
          status,
          alertType: 'over_budget',
          priority: 'critical',
          message: `Budget exceeded by ₹${overage.toFixed(0)} (${(status.utilizationPercentage - 100).toFixed(1)}% over)`
        });
      }
      // Approaching limit alert
      else if (status.utilizationPercentage >= alertThreshold) {
        alerts.push({
          status,
          alertType: 'approaching_limit',
          priority: status.utilizationPercentage >= 95 ? 'high' : 'medium',
          message: `${status.utilizationPercentage.toFixed(1)}% of budget used with ${status.daysRemaining} days remaining`
        });
      }

      // Unusual spending pattern
      if (status.trend === 'over_spending' && !status.isOverBudget) {
        alerts.push({
          status,
          alertType: 'unusual_spending',
          priority: 'medium',
          message: `Spending faster than usual. Projected to use ${(status.projectedSpending / (status.spent + status.remaining) * 100).toFixed(0)}% of budget`
        });
      }

      // Period ending soon with significant budget left
      if (status.daysRemaining <= 3 && status.utilizationPercentage < 50) {
        alerts.push({
          status,
          alertType: 'period_ending',
          priority: 'low',
          message: `Budget period ending in ${status.daysRemaining} days with ${status.utilizationPercentage.toFixed(0)}% unused`
        });
      }
    });

    return alerts.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  generateSpendingVelocityInsights(
    budgetStatus: BudgetStatus,
    transactions: Transaction[]
  ): {
    currentVelocity: number; // ₹ per day
    averageVelocity: number;
    velocityTrend: 'accelerating' | 'decelerating' | 'stable';
    recommendedDailySpending: number;
    daysUntilBudgetExhausted: number;
  } {
    // Calculate spending velocity over recent days
    const recentDays = Math.min(7, Math.floor(transactions.length / 2)); // Last week or half of available data
    const recentTransactions = transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, transactions.length * 0.3); // Most recent 30% of transactions

    const recentSpending = recentTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const currentVelocity = recentDays > 0 ? recentSpending / recentDays : 0;

    const totalSpending = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalDays = transactions.length > 0 ? Math.max(1, 
      Math.ceil((new Date().getTime() - new Date(transactions[0].date).getTime()) / (1000 * 60 * 60 * 24))
    ) : 1;
    const averageVelocity = totalSpending / totalDays;

    // Determine velocity trend
    let velocityTrend: 'accelerating' | 'decelerating' | 'stable';
    const velocityRatio = averageVelocity > 0 ? currentVelocity / averageVelocity : 1;
    
    if (velocityRatio > 1.2) velocityTrend = 'accelerating';
    else if (velocityRatio < 0.8) velocityTrend = 'decelerating';
    else velocityTrend = 'stable';

    // Calculate recommendations
    const recommendedDailySpending = budgetStatus.daysRemaining > 0 
      ? budgetStatus.remaining / budgetStatus.daysRemaining 
      : 0;

    const daysUntilBudgetExhausted = currentVelocity > 0 
      ? Math.ceil(budgetStatus.remaining / currentVelocity)
      : Infinity;

    return {
      currentVelocity,
      averageVelocity,
      velocityTrend,
      recommendedDailySpending,
      daysUntilBudgetExhausted: daysUntilBudgetExhausted === Infinity ? -1 : daysUntilBudgetExhausted
    };
  }

  generateBudgetReport(
    budget: BudgetItem,
    status: BudgetStatus,
    transactions: Transaction[]
  ): {
    summary: {
      budgetName: string;
      period: string;
      budgetAmount: number;
      spent: number;
      remaining: number;
      utilizationPercentage: number;
      daysRemaining: number;
      averageDailySpending: number;
    };
    breakdown: {
      weeklySpending: Array<{ week: string; amount: number }>;
      largestTransactions: Array<{ date: Date; description: string; amount: number }>;
      spendingFrequency: { transactionCount: number; averageTransactionSize: number };
    };
    insights: string[];
    recommendations: string[];
  } {
    // Calculate weekly breakdown
    const weeklySpending = this.calculateWeeklySpending(transactions);
    
    // Get largest transactions
    const largestTransactions = transactions
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 5)
      .map(t => ({
        date: new Date(t.date),
        description: t.description,
        amount: Math.abs(t.amount)
      }));

    // Calculate spending frequency
    const transactionCount = transactions.length;
    const averageTransactionSize = transactionCount > 0 
      ? status.spent / transactionCount 
      : 0;

    // Generate insights
    const insights = this.generateBudgetInsights(budget, status, transactions);
    
    // Generate recommendations
    const recommendations = this.generateBudgetRecommendations(budget, status, transactions);

    return {
      summary: {
        budgetName: budget.name,
        period: `${budget.startDate.toDateString()} - ${budget.endDate.toDateString()}`,
        budgetAmount: budget.amount,
        spent: status.spent,
        remaining: status.remaining,
        utilizationPercentage: status.utilizationPercentage,
        daysRemaining: status.daysRemaining,
        averageDailySpending: status.spent / Math.max(1, 
          Math.ceil((new Date().getTime() - budget.startDate.getTime()) / (1000 * 60 * 60 * 24))
        )
      },
      breakdown: {
        weeklySpending,
        largestTransactions,
        spendingFrequency: {
          transactionCount,
          averageTransactionSize
        }
      },
      insights,
      recommendations
    };
  }

  private calculateWeeklySpending(transactions: Transaction[]): Array<{ week: string; amount: number }> {
    const weeklyTotals = new Map<string, number>();
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];
      
      const existing = weeklyTotals.get(weekKey) || 0;
      weeklyTotals.set(weekKey, existing + Math.abs(transaction.amount));
    });

    return Array.from(weeklyTotals.entries())
      .map(([week, amount]) => ({ week, amount }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  private generateBudgetInsights(
    budget: BudgetItem,
    status: BudgetStatus,
    transactions: Transaction[]
  ): string[] {
    const insights: string[] = [];

    // Utilization insight
    if (status.utilizationPercentage > 90) {
      insights.push('Budget is nearly exhausted - consider reducing spending or increasing budget');
    } else if (status.utilizationPercentage < 30 && status.daysRemaining < 7) {
      insights.push('Significant budget remaining with little time left - consider using for planned purchases');
    }

    // Trend insight
    if (status.trend === 'over_spending') {
      insights.push('Current spending pace will likely exceed budget by period end');
    } else if (status.trend === 'under_spending') {
      insights.push('Spending below expected pace - budget may be too high');
    }

    // Transaction pattern insights
    if (transactions.length > 0) {
      const avgTransactionSize = status.spent / transactions.length;
      const largeTransactions = transactions.filter(t => Math.abs(t.amount) > avgTransactionSize * 2);
      
      if (largeTransactions.length > transactions.length * 0.3) {
        insights.push('Many large transactions detected - consider breaking down big purchases');
      }
      
      if (transactions.length > 30) {
        insights.push('High transaction frequency - consider consolidating purchases');
      }
    }

    return insights;
  }

  private generateBudgetRecommendations(
    budget: BudgetItem,
    status: BudgetStatus,
    transactions: Transaction[]
  ): string[] {
    const recommendations: string[] = [];

    if (status.isOverBudget) {
      recommendations.push('Consider reducing spending in this category or reallocating from other budgets');
    }

    if (status.utilizationPercentage > 80 && status.trend === 'over_spending') {
      recommendations.push('Set up more frequent budget check-ins to avoid overspending');
    }

    if (status.daysRemaining > 0 && status.remaining > 0) {
      recommendations.push(`Daily spending limit: ₹${status.dailyBudgetRemaining.toFixed(0)} to stay within budget`);
    }

    if (transactions.length > 20) {
      recommendations.push('Consider setting up a weekly spending limit to better control expenses');
    }

    return recommendations;
  }

  // Utility methods
  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; hitRate?: number } {
    return { size: this.cache.size };
  }
}