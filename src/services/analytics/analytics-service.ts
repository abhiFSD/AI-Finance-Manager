import { Transaction, Account } from '../../types';
import { 
  AnalyticsData, 
  SpendingSummary, 
  TransactionAnomaly, 
  RecurringPaymentPattern,
  NetWorthSnapshot,
  AnalyticsFilters,
  AnalyticsConfiguration 
} from './types';

import { SpendingPatternsService } from './spending-patterns';
import { AnomalyDetectionService } from './anomaly-detection';
import { RecurringPaymentsService } from './recurring-payments';
import { CashFlowService } from './cash-flow';
import { NetWorthService } from './net-worth';

export class AnalyticsService {
  private spendingService: SpendingPatternsService;
  private anomalyService: AnomalyDetectionService;
  private recurringService: RecurringPaymentsService;
  private cashFlowService: CashFlowService;
  private netWorthService: NetWorthService;
  private configuration: AnalyticsConfiguration;
  private cache: Map<string, any> = new Map();

  constructor(config?: Partial<AnalyticsConfiguration>) {
    this.configuration = {
      anomalyDetection: {
        enabled: true,
        sensitivity: 'medium',
        minimumAmount: 100,
        excludeCategories: ['transfer', 'internal']
      },
      recurringPayments: {
        enabled: true,
        minimumOccurrences: 3,
        maxVariancePercentage: 0.15
      },
      caching: {
        enabled: true,
        ttlMinutes: 30
      },
      ...config
    };

    this.spendingService = new SpendingPatternsService();
    this.anomalyService = new AnomalyDetectionService();
    this.recurringService = new RecurringPaymentsService();
    this.cashFlowService = new CashFlowService();
    this.netWorthService = new NetWorthService();
  }

  async generateComprehensiveAnalytics(
    transactions: Transaction[],
    accounts: Account[],
    filters?: AnalyticsFilters
  ): Promise<AnalyticsData> {
    const cacheKey = `comprehensive_${JSON.stringify({ filters, transactionCount: transactions.length })}`;
    
    if (this.configuration.caching.enabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    // Generate spending summary
    const spendingSummary = await this.spendingService.generateSpendingSummary(
      transactions,
      'monthly',
      filters
    );

    // Detect anomalies if enabled
    const anomalies = this.configuration.anomalyDetection.enabled
      ? await this.anomalyService.detectAnomalies(transactions, {
          sensitivity: this.configuration.anomalyDetection.sensitivity,
          minimumAmount: this.configuration.anomalyDetection.minimumAmount,
          excludeCategories: this.configuration.anomalyDetection.excludeCategories
        })
      : [];

    // Detect recurring payments if enabled
    const recurringPayments = this.configuration.recurringPayments.enabled
      ? await this.recurringService.detectRecurringPayments(transactions, {
          minOccurrences: this.configuration.recurringPayments.minimumOccurrences,
          maxVariancePercentage: this.configuration.recurringPayments.maxVariancePercentage
        })
      : [];

    // Generate cash flow analysis
    const cashFlowAnalysis = await this.cashFlowService.generateCashFlowAnalysis(transactions);

    const analytics: AnalyticsData = {
      totalIncome: spendingSummary.totalIncome,
      totalExpenses: spendingSummary.totalExpenses,
      netSavings: spendingSummary.netSavings,
      categoryBreakdown: spendingSummary.categoryBreakdown,
      monthlyTrends: spendingSummary.monthlyTrends,
      recurringPayments: recurringPayments.map(this.convertRecurringPayment),
      anomalies: anomalies.map(this.convertAnomaly),
      cashFlow: cashFlowAnalysis.historicalCashFlow.map(month => ({
        date: month.date,
        income: month.income,
        expenses: month.expenses,
        balance: month.balance,
        runningBalance: month.runningBalance
      }))
    };

    if (this.configuration.caching.enabled) {
      this.setCache(cacheKey, analytics);
    }

    return analytics;
  }

  async getSpendingAnalysis(
    transactions: Transaction[],
    period: 'monthly' | 'quarterly' | 'yearly' = 'monthly',
    filters?: AnalyticsFilters
  ): Promise<SpendingSummary> {
    return this.spendingService.generateSpendingSummary(transactions, period, filters);
  }

  async getAnomalies(
    transactions: Transaction[],
    options?: {
      sensitivity?: 'low' | 'medium' | 'high';
      minimumAmount?: number;
      excludeCategories?: string[];
    }
  ): Promise<TransactionAnomaly[]> {
    if (!this.configuration.anomalyDetection.enabled) return [];

    const mergedOptions = {
      sensitivity: options?.sensitivity || this.configuration.anomalyDetection.sensitivity,
      minimumAmount: options?.minimumAmount || this.configuration.anomalyDetection.minimumAmount,
      excludeCategories: options?.excludeCategories || this.configuration.anomalyDetection.excludeCategories
    };

    return this.anomalyService.detectAnomalies(transactions, mergedOptions);
  }

  async getRecurringPayments(
    transactions: Transaction[],
    options?: {
      minOccurrences?: number;
      maxVariancePercentage?: number;
      lookbackMonths?: number;
    }
  ): Promise<RecurringPaymentPattern[]> {
    if (!this.configuration.recurringPayments.enabled) return [];

    const mergedOptions = {
      minOccurrences: options?.minOccurrences || this.configuration.recurringPayments.minimumOccurrences,
      maxVariancePercentage: options?.maxVariancePercentage || this.configuration.recurringPayments.maxVariancePercentage,
      lookbackMonths: options?.lookbackMonths || 12
    };

    return this.recurringService.detectRecurringPayments(transactions, mergedOptions);
  }

  async getCashFlowAnalysis(
    transactions: Transaction[],
    options?: {
      projectionMonths?: number;
      includeProjections?: boolean;
      accountIds?: string[];
    }
  ) {
    return this.cashFlowService.generateCashFlowAnalysis(transactions, options);
  }

  async getNetWorthAnalysis(
    accounts: Account[],
    transactions: Transaction[],
    options?: {
      includeProjections?: boolean;
      asOfDate?: Date;
    }
  ): Promise<NetWorthSnapshot> {
    return this.netWorthService.calculateNetWorth(accounts, transactions, options);
  }

  async getNetWorthTrend(
    accounts: Account[],
    transactions: Transaction[],
    months: number = 12
  ): Promise<NetWorthSnapshot[]> {
    return this.netWorthService.getNetWorthTrend(accounts, transactions, months);
  }

  async getUpcomingPayments(
    transactions: Transaction[],
    daysAhead: number = 30
  ): Promise<Array<{
    pattern: RecurringPaymentPattern;
    dueDate: Date;
    daysUntilDue: number;
    estimatedAmount: number;
  }>> {
    if (!this.configuration.recurringPayments.enabled) return [];

    const recurringPayments = await this.getRecurringPayments(transactions);
    return this.recurringService.getUpcomingPayments(recurringPayments, daysAhead);
  }

  async getOverduePayments(
    transactions: Transaction[],
    gracePeriodDays: number = 5
  ): Promise<Array<{
    pattern: RecurringPaymentPattern;
    daysPastDue: number;
    estimatedAmount: number;
  }>> {
    if (!this.configuration.recurringPayments.enabled) return [];

    const recurringPayments = await this.getRecurringPayments(transactions);
    return this.recurringService.getOverduePayments(recurringPayments, gracePeriodDays);
  }

  async getSpendingPatterns(
    transactions: Transaction[],
    categoryId?: string
  ) {
    return this.spendingService.detectSpendingPatterns(transactions, categoryId);
  }

  async generateFinancialHealthScore(
    transactions: Transaction[],
    accounts: Account[]
  ): Promise<{
    score: number;
    breakdown: {
      savingsRate: { score: number; value: number; benchmark: number };
      debtToIncome: { score: number; value: number; benchmark: number };
      expenseVariability: { score: number; value: number; benchmark: number };
      emergencyFund: { score: number; value: number; benchmark: number };
      diversification: { score: number; value: number; benchmark: number };
    };
    recommendations: string[];
  }> {
    const spendingAnalysis = await this.getSpendingAnalysis(transactions, 'monthly');
    const netWorthAnalysis = await this.getNetWorthAnalysis(accounts, transactions);
    const cashFlowAnalysis = await this.getCashFlowAnalysis(transactions);

    // Calculate individual scores (0-100)
    const savingsRate = this.calculateSavingsRateScore(spendingAnalysis.savingsRate);
    const debtToIncome = this.calculateDebtToIncomeScore(netWorthAnalysis, cashFlowAnalysis.summary);
    const expenseVariability = this.calculateExpenseVariabilityScore(spendingAnalysis.monthlyTrends);
    const emergencyFund = this.calculateEmergencyFundScore(netWorthAnalysis, cashFlowAnalysis.summary);
    const diversification = this.calculateDiversificationScore(netWorthAnalysis);

    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      (savingsRate.score * 0.25) +
      (debtToIncome.score * 0.20) +
      (expenseVariability.score * 0.15) +
      (emergencyFund.score * 0.25) +
      (diversification.score * 0.15)
    );

    // Generate recommendations
    const recommendations = this.generateHealthRecommendations({
      savingsRate,
      debtToIncome,
      expenseVariability,
      emergencyFund,
      diversification
    });

    return {
      score: overallScore,
      breakdown: {
        savingsRate,
        debtToIncome,
        expenseVariability,
        emergencyFund,
        diversification
      },
      recommendations
    };
  }

  private calculateSavingsRateScore(savingsRate: number): { score: number; value: number; benchmark: number } {
    const benchmark = 20; // 20% savings rate is ideal
    const score = Math.min(100, Math.max(0, (savingsRate / benchmark) * 100));
    
    return {
      score: Math.round(score),
      value: savingsRate,
      benchmark
    };
  }

  private calculateDebtToIncomeScore(
    netWorth: NetWorthSnapshot,
    cashFlowSummary: any
  ): { score: number; value: number; benchmark: number } {
    const monthlyIncome = cashFlowSummary.averageMonthlyIncome;
    const totalDebt = netWorth.totalLiabilities;
    const annualIncome = monthlyIncome * 12;
    const debtToIncomeRatio = annualIncome > 0 ? (totalDebt / annualIncome) * 100 : 100;
    
    const benchmark = 36; // 36% debt-to-income ratio is acceptable
    const score = Math.min(100, Math.max(0, 100 - (debtToIncomeRatio / benchmark) * 100));
    
    return {
      score: Math.round(score),
      value: debtToIncomeRatio,
      benchmark
    };
  }

  private calculateExpenseVariabilityScore(monthlyTrends: any[]): { score: number; value: number; benchmark: number } {
    if (monthlyTrends.length < 3) {
      return { score: 50, value: 0, benchmark: 15 };
    }

    const expenses = monthlyTrends.map(trend => trend.expenses);
    const avgExpenses = expenses.reduce((sum, exp) => sum + exp, 0) / expenses.length;
    const variance = expenses.reduce((sum, exp) => sum + Math.pow(exp - avgExpenses, 2), 0) / expenses.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = avgExpenses > 0 ? (standardDeviation / avgExpenses) * 100 : 100;
    
    const benchmark = 15; // 15% variability is acceptable
    const score = Math.min(100, Math.max(0, 100 - (coefficientOfVariation / benchmark) * 100));
    
    return {
      score: Math.round(score),
      value: coefficientOfVariation,
      benchmark
    };
  }

  private calculateEmergencyFundScore(
    netWorth: NetWorthSnapshot,
    cashFlowSummary: any
  ): { score: number; value: number; benchmark: number } {
    const liquidAssets = netWorth.assets
      .filter(asset => ['cash', 'savings'].includes(asset.type))
      .reduce((sum, asset) => sum + asset.amount, 0);
    
    const monthlyExpenses = cashFlowSummary.averageMonthlyExpenses;
    const emergencyFundMonths = monthlyExpenses > 0 ? liquidAssets / monthlyExpenses : 0;
    
    const benchmark = 6; // 6 months of expenses
    const score = Math.min(100, (emergencyFundMonths / benchmark) * 100);
    
    return {
      score: Math.round(score),
      value: emergencyFundMonths,
      benchmark
    };
  }

  private calculateDiversificationScore(netWorth: NetWorthSnapshot): { score: number; value: number; benchmark: number } {
    const totalAssets = netWorth.totalAssets;
    if (totalAssets === 0) {
      return { score: 0, value: 0, benchmark: 0.3 };
    }

    // Count different asset types
    const assetTypes = new Set(netWorth.assets.map(asset => asset.type));
    const diversificationRatio = assetTypes.size / 5; // Maximum 5 asset types
    
    const benchmark = 0.6; // 60% diversification is good
    const score = Math.min(100, (diversificationRatio / benchmark) * 100);
    
    return {
      score: Math.round(score),
      value: diversificationRatio,
      benchmark
    };
  }

  private generateHealthRecommendations(breakdown: any): string[] {
    const recommendations: string[] = [];

    if (breakdown.savingsRate.score < 60) {
      recommendations.push('Increase your savings rate by reducing unnecessary expenses or finding ways to boost income');
    }

    if (breakdown.debtToIncome.score < 60) {
      recommendations.push('Focus on debt reduction by paying more than minimum payments or consolidating high-interest debt');
    }

    if (breakdown.expenseVariability.score < 60) {
      recommendations.push('Create a budget to better control and predict your monthly expenses');
    }

    if (breakdown.emergencyFund.score < 60) {
      recommendations.push('Build an emergency fund equivalent to 6 months of expenses in a easily accessible account');
    }

    if (breakdown.diversification.score < 60) {
      recommendations.push('Diversify your assets across different investment types to reduce risk');
    }

    if (recommendations.length === 0) {
      recommendations.push('Great job! Your financial health is strong. Consider optimizing your investment portfolio for better returns');
    }

    return recommendations;
  }

  // Utility methods for data conversion
  private convertRecurringPayment(pattern: RecurringPaymentPattern): any {
    return {
      merchantName: pattern.merchantName,
      amount: pattern.amount,
      frequency: pattern.frequency,
      nextDueDate: pattern.nextDueDate,
      categoryId: pattern.categoryId,
      confidence: pattern.confidence
    };
  }

  private convertAnomaly(anomaly: TransactionAnomaly): any {
    return {
      id: anomaly.id,
      transactionId: anomaly.transactionId,
      type: anomaly.anomalyType.type,
      severity: anomaly.anomalyType.severity,
      description: anomaly.description,
      expectedValue: anomaly.expectedValue,
      actualValue: anomaly.actualValue,
      confidence: anomaly.anomalyType.confidence
    };
  }

  // Cache management
  private generateCacheKey(operation: string, params: any): string {
    return `${operation}_${JSON.stringify(params)}`;
  }

  private getFromCache(key: string): any {
    if (!this.configuration.caching.enabled) return null;
    
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.configuration.caching.ttlMinutes * 60 * 1000) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    if (!this.configuration.caching.enabled) return;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache(): void {
    this.cache.clear();
  }

  updateConfiguration(config: Partial<AnalyticsConfiguration>): void {
    this.configuration = { ...this.configuration, ...config };
    if (!config.caching?.enabled) {
      this.clearCache();
    }
  }

  getConfiguration(): AnalyticsConfiguration {
    return { ...this.configuration };
  }

  // Export and reporting methods
  async exportAnalyticsData(
    transactions: Transaction[],
    accounts: Account[],
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const analytics = await this.generateComprehensiveAnalytics(transactions, accounts);
    
    if (format === 'json') {
      return JSON.stringify(analytics, null, 2);
    }
    
    // CSV export (simplified)
    const headers = ['Category', 'Amount', 'Percentage', 'Transaction Count'];
    const rows = analytics.categoryBreakdown.map(category => [
      category.categoryName,
      category.amount.toFixed(2),
      category.percentage.toFixed(2) + '%',
      category.transactionCount.toString()
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }

  async generateInsights(
    transactions: Transaction[],
    accounts: Account[]
  ): Promise<string[]> {
    const insights: string[] = [];
    
    const analytics = await this.generateComprehensiveAnalytics(transactions, accounts);
    const spendingPatterns = await this.getSpendingPatterns(transactions);
    const healthScore = await this.generateFinancialHealthScore(transactions, accounts);

    // Spending insights
    if (analytics.categoryBreakdown.length > 0) {
      const topCategory = analytics.categoryBreakdown[0];
      insights.push(`Your largest expense category is ${topCategory.categoryName}, accounting for ${topCategory.percentage.toFixed(1)}% of total spending`);
    }

    // Savings insights
    if (analytics.netSavings > 0) {
      const savingsRate = (analytics.netSavings / (analytics.totalIncome || 1)) * 100;
      insights.push(`You're saving ${savingsRate.toFixed(1)}% of your income this month`);
    } else {
      insights.push('Your expenses exceed your income this month. Consider reviewing your spending');
    }

    // Trending insights
    if (analytics.monthlyTrends.length >= 2) {
      const currentMonth = analytics.monthlyTrends[analytics.monthlyTrends.length - 1];
      const previousMonth = analytics.monthlyTrends[analytics.monthlyTrends.length - 2];
      const expenseChange = ((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100;
      
      if (Math.abs(expenseChange) > 10) {
        const direction = expenseChange > 0 ? 'increased' : 'decreased';
        insights.push(`Your expenses ${direction} by ${Math.abs(expenseChange).toFixed(1)}% compared to last month`);
      }
    }

    // Anomaly insights
    if (analytics.anomalies.length > 0) {
      const highSeverityAnomalies = analytics.anomalies.filter(a => ['high', 'critical'].includes(a.severity));
      if (highSeverityAnomalies.length > 0) {
        insights.push(`Found ${highSeverityAnomalies.length} unusual transaction${highSeverityAnomalies.length > 1 ? 's' : ''} that may need review`);
      }
    }

    // Recurring payment insights
    if (analytics.recurringPayments.length > 0) {
      const totalRecurring = analytics.recurringPayments.reduce((sum, payment) => sum + payment.amount, 0);
      insights.push(`You have ${analytics.recurringPayments.length} recurring payments totaling ₹${totalRecurring.toFixed(0)} monthly`);
    }

    // Pattern insights
    if (spendingPatterns.length > 0) {
      const strongestPattern = spendingPatterns[0];
      if (strongestPattern.confidence > 0.7) {
        insights.push(strongestPattern.description);
      }
    }

    // Health score insight
    insights.push(`Your financial health score is ${healthScore.score}/100`);

    return insights;
  }
}