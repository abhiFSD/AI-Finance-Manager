export interface SpendingSummary {
  period: 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  categoryBreakdown: CategorySpendingData[];
  monthlyTrends: MonthlySpendingTrend[];
  topMerchants: MerchantSpendingData[];
  averageTransactionAmount: number;
  transactionCount: number;
}

export interface CategorySpendingData {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  transactionCount: number;
  trend: SpendingTrend;
  budget?: number;
  budgetUtilization?: number;
  subcategories: SubcategorySpendingData[];
}

export interface SubcategorySpendingData {
  subcategoryId: string;
  subcategoryName: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface MonthlySpendingTrend {
  month: string;
  year: number;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  topCategories: CategorySpendingData[];
}

export interface MerchantSpendingData {
  merchantId: string;
  merchantName: string;
  amount: number;
  transactionCount: number;
  categoryId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'occasional';
  avgTransactionAmount: number;
  lastTransaction: Date;
}

export interface SpendingTrend {
  direction: 'increasing' | 'decreasing' | 'stable';
  percentage: number;
  comparison: 'previous_month' | 'previous_quarter' | 'previous_year';
}

export interface SpendingPattern {
  type: 'seasonal' | 'monthly' | 'weekly' | 'daily';
  pattern: Record<string, number>;
  confidence: number;
  description: string;
}

export interface AnomalyType {
  type: 'unusual_amount' | 'unusual_frequency' | 'unusual_merchant' | 'unusual_category' | 'unusual_timing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
}

export interface TransactionAnomaly {
  id: string;
  transactionId: string;
  transaction: any; // Transaction object
  anomalyType: AnomalyType;
  description: string;
  expectedValue: number;
  actualValue: number;
  score: number;
  detected_at: Date;
  reviewed: boolean;
  falsePositive?: boolean;
  notes?: string;
}

export interface RecurringPaymentPattern {
  id: string;
  merchantId?: string;
  merchantName: string;
  description: string;
  amount: number;
  amountVariance: number;
  frequency: 'weekly' | 'bi_weekly' | 'monthly' | 'bi_monthly' | 'quarterly' | 'yearly';
  nextDueDate: Date;
  lastPaymentDate: Date;
  categoryId: string;
  confidence: number;
  transactionIds: string[];
  isActive: boolean;
  missedPayments: number;
  created_at: Date;
  updated_at: Date;
}

export interface CashFlowProjection {
  date: Date;
  projectedIncome: number;
  projectedExpenses: number;
  projectedBalance: number;
  actualIncome?: number;
  actualExpenses?: number;
  actualBalance?: number;
  confidence: number;
}

export interface IncomeStream {
  id: string;
  source: string;
  amount: number;
  frequency: 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'yearly';
  isRegular: boolean;
  nextExpectedDate: Date;
  confidence: number;
}

export interface ExpenseCategory {
  categoryId: string;
  categoryName: string;
  monthlyAverage: number;
  variance: number;
  predictability: number;
}

export interface NetWorthSnapshot {
  date: Date;
  assets: AssetValue[];
  liabilities: LiabilityValue[];
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  change: NetWorthChange;
}

export interface AssetValue {
  type: 'savings' | 'investment' | 'property' | 'cash' | 'other';
  subtype?: string;
  amount: number;
  accountId?: string;
  description: string;
}

export interface LiabilityValue {
  type: 'credit_card' | 'loan' | 'mortgage' | 'other';
  subtype?: string;
  amount: number;
  accountId?: string;
  description: string;
  interestRate?: number;
}

export interface NetWorthChange {
  amount: number;
  percentage: number;
  period: 'month' | 'quarter' | 'year';
  breakdown: {
    assetChange: number;
    liabilityChange: number;
  };
}

export interface AnalyticsFilters {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  accountIds?: string[];
  categoryIds?: string[];
  amountRange?: {
    min: number;
    max: number;
  };
  transactionTypes?: ('credit' | 'debit')[];
  includeTransfers?: boolean;
}

export interface AnalyticsConfiguration {
  anomalyDetection: {
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
    minimumAmount: number;
    excludeCategories: string[];
  };
  recurringPayments: {
    enabled: boolean;
    minimumOccurrences: number;
    maxVariancePercentage: number;
  };
  caching: {
    enabled: boolean;
    ttlMinutes: number;
  };
}