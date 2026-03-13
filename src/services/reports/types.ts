export interface ReportConfiguration {
  id: string;
  name: string;
  description?: string;
  type: 'spending_summary' | 'budget_analysis' | 'cash_flow' | 'net_worth' | 'tax_summary' | 'investment_performance' | 'custom';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  dateRange: {
    startDate: Date;
    endDate: Date;
    type: 'fixed' | 'rolling';
    rollingPeriod?: 'last_7_days' | 'last_30_days' | 'last_quarter' | 'last_year' | 'ytd';
  };
  filters: ReportFilters;
  sections: ReportSection[];
  styling: ReportStyling;
  schedule?: ReportSchedule;
  distribution: ReportDistribution;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ReportFilters {
  accountIds?: string[];
  categoryIds?: string[];
  merchantIds?: string[];
  amountRange?: {
    min: number;
    max: number;
  };
  transactionTypes?: ('credit' | 'debit')[];
  includeTransfers?: boolean;
  includeInternalTransactions?: boolean;
  tags?: string[];
  excludeCategories?: string[];
}

export interface ReportSection {
  id: string;
  name: string;
  type: 'summary' | 'table' | 'chart' | 'text' | 'breakdown' | 'trends' | 'insights';
  order: number;
  config: {
    chartType?: 'pie' | 'bar' | 'line' | 'area' | 'donut';
    groupBy?: 'category' | 'merchant' | 'account' | 'month' | 'week' | 'day';
    sortBy?: 'amount' | 'count' | 'date' | 'name';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    showPercentages?: boolean;
    showTrends?: boolean;
    includeSubcategories?: boolean;
  };
  isVisible: boolean;
}

export interface ReportStyling {
  theme: 'light' | 'dark' | 'corporate' | 'minimal';
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  fontSize: number;
  includeLogo?: boolean;
  logoPath?: string;
  headerText?: string;
  footerText?: string;
  watermark?: string;
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:MM format
  timezone: string;
  isActive: boolean;
  nextRunDate: Date;
  lastRunDate?: Date;
}

export interface ReportDistribution {
  email: {
    enabled: boolean;
    recipients: string[];
    subject?: string;
    body?: string;
  };
  storage: {
    enabled: boolean;
    path: string;
    keepForDays?: number;
  };
  webhook?: {
    enabled: boolean;
    url: string;
    headers?: Record<string, string>;
  };
}

export interface GeneratedReport {
  id: string;
  configId: string;
  name: string;
  format: string;
  filePath: string;
  fileSize: number;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  generatedAt: Date;
  generatedBy: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error?: string;
  downloadCount: number;
  lastDownloaded?: Date;
  metadata: {
    totalTransactions: number;
    totalAmount: number;
    categoriesIncluded: number;
    accountsIncluded: number;
  };
}

export interface ReportData {
  summary: ReportSummary;
  transactions: TransactionData[];
  categories: CategoryData[];
  accounts: AccountData[];
  trends: TrendData[];
  insights: InsightData[];
  charts: ChartData[];
}

export interface ReportSummary {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  transactionCount: number;
  averageTransactionAmount: number;
  topSpendingCategory: string;
  largestTransaction: {
    amount: number;
    description: string;
    date: Date;
  };
}

export interface TransactionData {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  subcategory?: string;
  account: string;
  merchant?: string;
  balance?: number;
  tags?: string[];
}

export interface CategoryData {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  transactionCount: number;
  averageTransactionAmount: number;
  trend: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
  subcategories?: CategoryData[];
}

export interface AccountData {
  id: string;
  name: string;
  type: string;
  balance: number;
  transactionCount: number;
  totalInflow: number;
  totalOutflow: number;
}

export interface TrendData {
  period: string;
  income: number;
  expenses: number;
  balance: number;
  categories: Record<string, number>;
}

export interface InsightData {
  type: 'spending_pattern' | 'savings_opportunity' | 'budget_performance' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  action?: string;
}

export interface ChartData {
  id: string;
  title: string;
  type: 'pie' | 'bar' | 'line' | 'area' | 'donut';
  data: Array<{
    label: string;
    value: number;
    color?: string;
    percentage?: number;
  }>;
  config: {
    showLegend: boolean;
    showDataLabels: boolean;
    currency: string;
    dateFormat?: string;
  };
}

export interface TaxReportData {
  financialYear: string;
  taxableIncome: number;
  deductions: {
    section80C: number;
    section80D: number;
    section24B: number;
    otherDeductions: number;
    total: number;
  };
  investments: {
    equity: number;
    debt: number;
    ppf: number;
    elss: number;
    nps: number;
    total: number;
  };
  capitalGains: {
    shortTerm: number;
    longTerm: number;
    exemptions: number;
    net: number;
  };
  businessExpenses?: {
    category: string;
    amount: number;
    description: string;
  }[];
  gstTransactions?: {
    date: Date;
    description: string;
    amount: number;
    gstRate: number;
    gstAmount: number;
    hsn?: string;
  }[];
}

export interface InvestmentPerformanceData {
  period: string;
  portfolioValue: {
    current: number;
    beginning: number;
    change: number;
    changePercentage: number;
  };
  assetAllocation: {
    equity: number;
    debt: number;
    cash: number;
    other: number;
  };
  holdings: {
    name: string;
    type: 'equity' | 'debt' | 'hybrid';
    units: number;
    avgCost: number;
    currentValue: number;
    gain: number;
    gainPercentage: number;
    dividends: number;
  }[];
  transactions: {
    date: Date;
    type: 'buy' | 'sell' | 'dividend';
    instrument: string;
    quantity: number;
    price: number;
    amount: number;
  }[];
  performance: {
    returns1Year: number;
    returns3Year: number;
    returns5Year: number;
    cagr: number;
    volatility: number;
    sharpeRatio: number;
  };
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  sections: ReportSection[];
  styling: ReportStyling;
  isBuiltIn: boolean;
  created_at: Date;
}

export interface ReportJob {
  id: string;
  configId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  priority: 'low' | 'normal' | 'high';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: GeneratedReport;
}

export interface ReportAnalytics {
  totalReports: number;
  reportsByType: Record<string, number>;
  reportsByFormat: Record<string, number>;
  averageGenerationTime: number;
  popularSections: string[];
  downloadStats: {
    totalDownloads: number;
    mostDownloaded: string;
    downloadsByFormat: Record<string, number>;
  };
}