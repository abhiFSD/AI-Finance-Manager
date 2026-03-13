export interface BudgetItem {
  id: string;
  name: string;
  categoryId: string;
  subcategoryId?: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
  rollover: boolean;
  alertThreshold: number; // percentage (0-100)
  isActive: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface BudgetStatus {
  budgetId: string;
  spent: number;
  remaining: number;
  utilizationPercentage: number;
  isOverBudget: boolean;
  daysRemaining: number;
  dailyBudgetRemaining: number;
  projectedSpending: number;
  trend: 'on_track' | 'over_spending' | 'under_spending';
  lastUpdated: Date;
}

export interface BudgetAlert {
  id: string;
  budgetId: string;
  type: 'threshold_reached' | 'budget_exceeded' | 'goal_achieved' | 'period_ending';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  currentAmount: number;
  budgetAmount: number;
  percentage: number;
  triggered_at: Date;
  acknowledged: boolean;
  acknowledged_at?: Date;
}

export interface BudgetPeriodSummary {
  period: string;
  budgetAmount: number;
  actualSpent: number;
  variance: number;
  variancePercentage: number;
  categoriesOverBudget: string[];
  categoriesUnderBudget: string[];
  topSpendingCategories: Array<{
    categoryId: string;
    categoryName: string;
    spent: number;
    budgeted: number;
    variance: number;
  }>;
}

export interface SmartBudgetSuggestion {
  categoryId: string;
  categoryName: string;
  suggestedAmount: number;
  currentAmount?: number;
  reasoning: string;
  confidence: number;
  basedOnMonths: number;
  historicalAverage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonalAdjustment?: number;
}

export interface BudgetTemplate {
  id: string;
  name: string;
  description: string;
  categories: Array<{
    categoryId: string;
    percentage: number;
    priority: 'high' | 'medium' | 'low';
  }>;
  totalIncomePercentage: number;
  isDefault: boolean;
  created_at: Date;
}

export interface GoalType {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  priority: 'low' | 'medium' | 'high';
  category: 'savings' | 'debt_payoff' | 'purchase' | 'investment' | 'emergency_fund';
  isActive: boolean;
  milestones: GoalMilestone[];
  created_at: Date;
  updated_at: Date;
}

export interface GoalMilestone {
  id: string;
  goalId: string;
  name: string;
  targetAmount: number;
  targetDate: Date;
  achieved: boolean;
  achieved_at?: Date;
  created_at: Date;
}

export interface SavingsOpportunity {
  categoryId: string;
  categoryName: string;
  currentSpending: number;
  potentialSavings: number;
  savingsPercentage: number;
  strategy: string;
  difficulty: 'easy' | 'moderate' | 'difficult';
  impact: 'low' | 'medium' | 'high';
  timeframe: 'immediate' | 'short_term' | 'long_term';
  reasoning: string;
}

export interface BudgetComparison {
  currentPeriod: BudgetPeriodSummary;
  previousPeriod: BudgetPeriodSummary;
  change: {
    spendingChange: number;
    spendingChangePercentage: number;
    budgetChange: number;
    budgetChangePercentage: number;
  };
  improvedCategories: string[];
  worsenedCategories: string[];
}

export interface BudgetConfiguration {
  defaultPeriod: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  defaultAlertThreshold: number;
  enableAutomaticAdjustments: boolean;
  enablePredictiveAlerts: boolean;
  rolloverUnusedBudgets: boolean;
  notificationChannels: ('email' | 'push' | 'sms')[];
  workingDays: number[]; // 0-6 (Sunday-Saturday)
  currency: string;
}