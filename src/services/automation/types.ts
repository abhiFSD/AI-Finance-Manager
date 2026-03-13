export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  type: 'budget_creation' | 'investment_allocation' | 'debt_payment' | 'savings_transfer' | 'bill_reminder' | 'spending_alert';
  isActive: boolean;
  triggers: AutomationTrigger[];
  actions: AutomationAction[];
  conditions?: AutomationCondition[];
  schedule?: AutomationSchedule;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  last_executed?: Date;
  execution_count: number;
}

export interface AutomationTrigger {
  type: 'transaction_added' | 'budget_exceeded' | 'date_reached' | 'balance_threshold' | 'recurring_payment_due' | 'manual';
  config: {
    categoryId?: string;
    accountId?: string;
    amount_threshold?: number;
    percentage_threshold?: number;
    date?: Date;
    time?: string;
    frequency?: 'daily' | 'weekly' | 'monthly';
  };
}

export interface AutomationAction {
  type: 'send_notification' | 'create_budget' | 'transfer_funds' | 'update_investment' | 'send_email' | 'log_event';
  config: {
    notification_type?: 'email' | 'push' | 'sms';
    recipients?: string[];
    message?: string;
    subject?: string;
    budget_template?: string;
    transfer_amount?: number;
    from_account?: string;
    to_account?: string;
    investment_allocation?: InvestmentAllocation[];
    priority?: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface AutomationCondition {
  field: 'account_balance' | 'monthly_income' | 'monthly_expenses' | 'savings_rate' | 'debt_ratio';
  operator: 'greater_than' | 'less_than' | 'equal_to' | 'not_equal_to' | 'between';
  value: number | string;
  value2?: number; // For 'between' operator
}

export interface AutomationSchedule {
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  time?: string; // HH:MM format
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  startDate: Date;
  endDate?: Date;
  timezone: string;
}

export interface InvestmentAllocation {
  instrument: string;
  percentage: number;
  maxAmount?: number;
  minAmount?: number;
}

export interface SmartBudgetRecommendation {
  categoryId: string;
  categoryName: string;
  currentBudget?: number;
  recommendedBudget: number;
  reasoning: string;
  confidence: number;
  adjustmentType: 'increase' | 'decrease' | 'maintain';
  adjustmentPercentage: number;
  basedOnMonths: number;
  seasonalFactors?: {
    month: number;
    multiplier: number;
  }[];
}

export interface InvestmentRecommendation {
  type: 'sip_increase' | 'rebalancing' | 'new_investment' | 'exit_strategy';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  reasoning: string;
  action: {
    type: 'increase_sip' | 'start_sip' | 'rebalance_portfolio' | 'redeem_investment';
    instrument?: string;
    amount?: number;
    percentage?: number;
    duration?: number; // months
  };
  riskLevel: 'low' | 'medium' | 'high';
  expectedReturn?: number;
  timeHorizon: 'short_term' | 'medium_term' | 'long_term'; // <1yr, 1-5yr, >5yr
  taxImplications?: string;
  confidence: number;
}

export interface DebtOptimizationStrategy {
  id: string;
  strategy: 'avalanche' | 'snowball' | 'hybrid';
  totalDebt: number;
  monthlyPayment: number;
  payoffTimeMonths: number;
  totalInterestSaved: number;
  recommendations: DebtRecommendation[];
  monthlyPlan: MonthlyDebtPlan[];
  confidence: number;
  created_at: Date;
}

export interface DebtRecommendation {
  debtId: string;
  debtName: string;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  recommendedPayment: number;
  priority: number;
  reasoning: string;
  payoffTime: number; // months
  totalInterest: number;
}

export interface MonthlyDebtPlan {
  month: number;
  payments: Array<{
    debtId: string;
    amount: number;
    principalPayment: number;
    interestPayment: number;
    remainingBalance: number;
  }>;
  totalPayment: number;
  totalPrincipal: number;
  totalInterest: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  priority: 'low' | 'medium' | 'high';
  category: 'emergency_fund' | 'vacation' | 'house_down_payment' | 'education' | 'retirement' | 'other';
  autoTransfer?: {
    enabled: boolean;
    amount: number;
    frequency: 'weekly' | 'monthly';
    fromAccount: string;
    toAccount: string;
  };
  created_at: Date;
  updated_at: Date;
}

export interface SavingsRecommendation {
  type: 'increase_emergency_fund' | 'optimize_savings_rate' | 'automate_savings' | 'high_yield_account';
  title: string;
  description: string;
  currentAmount: number;
  recommendedAmount: number;
  potentialBenefit: string;
  action: {
    type: 'transfer_funds' | 'setup_automation' | 'change_account' | 'adjust_budget';
    amount?: number;
    frequency?: 'weekly' | 'monthly';
    details?: string;
  };
  priority: 'low' | 'medium' | 'high';
  timeframe: 'immediate' | 'short_term' | 'long_term';
  confidence: number;
}

export interface NotificationRule {
  id: string;
  name: string;
  type: 'spending_alert' | 'bill_reminder' | 'goal_update' | 'budget_alert' | 'anomaly_detection' | 'investment_update';
  isActive: boolean;
  conditions: NotificationCondition[];
  delivery: {
    channels: ('email' | 'push' | 'sms')[];
    frequency: 'immediate' | 'daily_digest' | 'weekly_digest';
    quietHours?: {
      start: string; // HH:MM
      end: string; // HH:MM
    };
  };
  template: {
    subject: string;
    body: string;
    variables: string[]; // Placeholder variables like {amount}, {category}
  };
  created_at: Date;
  updated_at: Date;
}

export interface NotificationCondition {
  field: 'transaction_amount' | 'budget_usage' | 'account_balance' | 'due_date' | 'goal_progress' | 'anomaly_score';
  operator: 'greater_than' | 'less_than' | 'equal_to' | 'percentage_of' | 'days_before';
  value: number;
  categoryId?: string;
  accountId?: string;
  budgetId?: string;
  goalId?: string;
}

export interface AutomationExecution {
  id: string;
  ruleId: string;
  triggeredBy: {
    type: string;
    data: Record<string, any>;
  };
  status: 'pending' | 'running' | 'completed' | 'failed';
  actions: Array<{
    type: string;
    status: 'pending' | 'completed' | 'failed';
    result?: any;
    error?: string;
  }>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface RiskProfile {
  userId: string;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  investmentExperience: 'beginner' | 'intermediate' | 'advanced';
  timeHorizon: number; // years
  monthlyInvestmentCapacity: number;
  goals: {
    retirement: boolean;
    wealthCreation: boolean;
    taxSaving: boolean;
    shortTermGoals: boolean;
  };
  preferences: {
    sectors?: string[];
    avoidSectors?: string[];
    esgFocused?: boolean;
    liquidityPreference?: 'high' | 'medium' | 'low';
  };
  updated_at: Date;
}

export interface MarketCondition {
  date: Date;
  marketSentiment: 'bullish' | 'bearish' | 'neutral';
  volatilityLevel: 'low' | 'medium' | 'high';
  interestRateEnvironment: 'rising' | 'falling' | 'stable';
  inflationRate: number;
  recommendedAssetAllocation: {
    equity: number;
    debt: number;
    gold: number;
    cash: number;
  };
}

export interface AutomationMetrics {
  totalRules: number;
  activeRules: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  mostTriggeredRule: string;
  rulesByType: Record<string, number>;
  executionsByDay: Array<{
    date: Date;
    count: number;
  }>;
  errorRate: number;
  userEngagement: {
    rulesCreated: number;
    rulesModified: number;
    rulesDisabled: number;
  };
}