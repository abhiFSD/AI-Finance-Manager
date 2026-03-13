import { Transaction } from '../../types';
import { CashFlowProjection, IncomeStream, ExpenseCategory } from './types';

export class CashFlowService {
  private readonly PREDICTION_MONTHS = 6; // Default months to project forward
  private readonly MIN_DATA_MONTHS = 3; // Minimum months of data for reliable predictions

  async generateCashFlowAnalysis(
    transactions: Transaction[],
    options: {
      projectionMonths?: number;
      includeProjections?: boolean;
      accountIds?: string[];
    } = {}
  ): Promise<{
    historicalCashFlow: any[];
    projections: CashFlowProjection[];
    incomeStreams: IncomeStream[];
    expenseCategories: ExpenseCategory[];
    summary: {
      currentBalance: number;
      averageMonthlyIncome: number;
      averageMonthlyExpenses: number;
      netCashFlow: number;
      runwayMonths: number;
      burnRate: number;
    };
  }> {
    const {
      projectionMonths = this.PREDICTION_MONTHS,
      includeProjections = true,
      accountIds
    } = options;

    // Filter transactions if account IDs provided
    const filteredTransactions = accountIds?.length
      ? transactions.filter(t => accountIds.includes(t.accountId))
      : transactions;

    const sortedTransactions = filteredTransactions
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Generate historical cash flow
    const historicalCashFlow = this.calculateHistoricalCashFlow(sortedTransactions);
    
    // Identify income streams and expense patterns
    const incomeStreams = this.identifyIncomeStreams(sortedTransactions);
    const expenseCategories = this.analyzeExpenseCategories(sortedTransactions);
    
    // Generate projections if enabled
    const projections = includeProjections 
      ? await this.generateProjections(sortedTransactions, incomeStreams, expenseCategories, projectionMonths)
      : [];

    // Calculate summary metrics
    const summary = this.calculateSummaryMetrics(historicalCashFlow, projections);

    return {
      historicalCashFlow,
      projections,
      incomeStreams,
      expenseCategories,
      summary
    };
  }

  private calculateHistoricalCashFlow(transactions: Transaction[]): any[] {
    const monthlyData = new Map<string, {
      date: Date;
      income: number;
      expenses: number;
      balance: number;
      runningBalance: number;
      transactionCount: number;
    }>();

    let runningBalance = 0;

    // Group transactions by month
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);

      const existing = monthlyData.get(monthKey) || {
        date: monthStart,
        income: 0,
        expenses: 0,
        balance: 0,
        runningBalance: 0,
        transactionCount: 0
      };

      const amount = Math.abs(transaction.amount);
      
      if (transaction.type === 'credit' && transaction.categoryId === 'income') {
        existing.income += amount;
        runningBalance += amount;
      } else if (transaction.type === 'debit' && transaction.categoryId !== 'transfer') {
        existing.expenses += amount;
        runningBalance -= amount;
      }

      existing.balance = existing.income - existing.expenses;
      existing.runningBalance = runningBalance;
      existing.transactionCount++;

      monthlyData.set(monthKey, existing);
    });

    return Array.from(monthlyData.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private identifyIncomeStreams(transactions: Transaction[]): IncomeStream[] {
    const incomeTransactions = transactions.filter(t => 
      t.type === 'credit' && t.categoryId === 'income'
    );

    if (incomeTransactions.length === 0) return [];

    // Group by description patterns to identify different income sources
    const incomeGroups = new Map<string, Transaction[]>();

    incomeTransactions.forEach(transaction => {
      const normalizedDescription = this.normalizeIncomeDescription(transaction.description);
      const existing = incomeGroups.get(normalizedDescription) || [];
      incomeGroups.set(normalizedDescription, [...existing, transaction]);
    });

    const incomeStreams: IncomeStream[] = [];

    for (const [description, transactions] of incomeGroups) {
      if (transactions.length < 2) continue; // Need at least 2 occurrences

      const amounts = transactions.map(t => Math.abs(t.amount));
      const dates = transactions.map(t => new Date(t.date)).sort((a, b) => a.getTime() - b.getTime());
      
      // Calculate frequency
      const intervals = this.calculateIntervals(dates);
      const frequency = this.determineFrequency(intervals);
      
      if (!frequency) continue;

      // Determine if income is regular (low variance in amount and timing)
      const amountVariance = this.calculateVariance(amounts);
      const timingVariance = this.calculateVariance(intervals);
      const isRegular = amountVariance < 0.2 && timingVariance < 0.3; // Less than 20% amount variance and 30% timing variance

      // Calculate average amount
      const averageAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;

      // Predict next expected date
      const lastDate = dates[dates.length - 1];
      const nextExpectedDate = this.calculateNextIncomeDate(lastDate, frequency);

      // Calculate confidence based on regularity and consistency
      const confidence = this.calculateIncomeConfidence(transactions, isRegular, amountVariance, timingVariance);

      incomeStreams.push({
        id: `income_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        source: description,
        amount: averageAmount,
        frequency,
        isRegular,
        nextExpectedDate,
        confidence
      });
    }

    return incomeStreams.sort((a, b) => b.amount - a.amount);
  }

  private analyzeExpenseCategories(transactions: Transaction[]): ExpenseCategory[] {
    const expenseTransactions = transactions.filter(t => 
      t.type === 'debit' && t.categoryId && t.categoryId !== 'transfer'
    );

    const categoryGroups = new Map<string, Transaction[]>();

    expenseTransactions.forEach(transaction => {
      const categoryId = transaction.categoryId!;
      const existing = categoryGroups.get(categoryId) || [];
      categoryGroups.set(categoryId, [...existing, transaction]);
    });

    const expenseCategories: ExpenseCategory[] = [];

    for (const [categoryId, transactions] of categoryGroups) {
      const amounts = transactions.map(t => Math.abs(t.amount));
      const monthlyAmounts = this.groupAmountsByMonth(transactions);
      
      const monthlyAverage = monthlyAmounts.length > 0 
        ? monthlyAmounts.reduce((sum, amt) => sum + amt, 0) / monthlyAmounts.length
        : 0;
      
      const variance = this.calculateVariance(monthlyAmounts);
      const predictability = this.calculatePredictability(monthlyAmounts);

      expenseCategories.push({
        categoryId,
        categoryName: this.getCategoryName(categoryId),
        monthlyAverage,
        variance,
        predictability
      });
    }

    return expenseCategories.sort((a, b) => b.monthlyAverage - a.monthlyAverage);
  }

  private async generateProjections(
    transactions: Transaction[],
    incomeStreams: IncomeStream[],
    expenseCategories: ExpenseCategory[],
    projectionMonths: number
  ): Promise<CashFlowProjection[]> {
    const projections: CashFlowProjection[] = [];
    
    // Get current balance (last known balance)
    const lastTransaction = transactions[transactions.length - 1];
    const currentBalance = lastTransaction?.balance || 0;
    let runningBalance = currentBalance;

    const startDate = new Date();
    startDate.setDate(1); // Start from beginning of current month

    for (let month = 0; month < projectionMonths; month++) {
      const projectionDate = new Date(startDate);
      projectionDate.setMonth(projectionDate.getMonth() + month);

      // Project income for this month
      const projectedIncome = this.projectMonthlyIncome(incomeStreams, projectionDate);
      
      // Project expenses for this month
      const projectedExpenses = this.projectMonthlyExpenses(expenseCategories, projectionDate);
      
      // Calculate projected balance
      const netFlow = projectedIncome - projectedExpenses;
      runningBalance += netFlow;

      // Calculate confidence based on data availability and patterns
      const confidence = this.calculateProjectionConfidence(
        transactions,
        incomeStreams,
        expenseCategories,
        month
      );

      projections.push({
        date: projectionDate,
        projectedIncome,
        projectedExpenses,
        projectedBalance: runningBalance,
        confidence
      });
    }

    return projections;
  }

  private projectMonthlyIncome(incomeStreams: IncomeStream[], projectionDate: Date): number {
    let totalIncome = 0;

    incomeStreams.forEach(stream => {
      // Check if this income stream should occur in this month
      const shouldOccur = this.shouldIncomeOccur(stream, projectionDate);
      
      if (shouldOccur) {
        // Apply some uncertainty to irregular income
        const uncertainty = stream.isRegular ? 1 : 0.8;
        totalIncome += stream.amount * uncertainty * stream.confidence;
      }
    });

    return totalIncome;
  }

  private projectMonthlyExpenses(expenseCategories: ExpenseCategory[], projectionDate: Date): number {
    let totalExpenses = 0;

    expenseCategories.forEach(category => {
      // Add seasonal adjustments if applicable
      const seasonalMultiplier = this.getSeasonalMultiplier(category.categoryId, projectionDate);
      const adjustedAmount = category.monthlyAverage * seasonalMultiplier;
      
      // Add some variance based on predictability
      const varianceMultiplier = 1 + (category.variance * (1 - category.predictability));
      totalExpenses += adjustedAmount * varianceMultiplier;
    });

    return totalExpenses;
  }

  private calculateSummaryMetrics(historicalCashFlow: any[], projections: CashFlowProjection[]): any {
    const recentMonths = historicalCashFlow.slice(-6); // Last 6 months
    
    const averageMonthlyIncome = recentMonths.length > 0
      ? recentMonths.reduce((sum, month) => sum + month.income, 0) / recentMonths.length
      : 0;

    const averageMonthlyExpenses = recentMonths.length > 0
      ? recentMonths.reduce((sum, month) => sum + month.expenses, 0) / recentMonths.length
      : 0;

    const netCashFlow = averageMonthlyIncome - averageMonthlyExpenses;
    const currentBalance = historicalCashFlow.length > 0 
      ? historicalCashFlow[historicalCashFlow.length - 1].runningBalance 
      : 0;

    // Calculate runway (months until balance reaches zero)
    let runwayMonths = 0;
    if (netCashFlow < 0 && currentBalance > 0) {
      runwayMonths = Math.abs(currentBalance / netCashFlow);
    } else if (netCashFlow > 0) {
      runwayMonths = Infinity; // Positive cash flow
    }

    // Burn rate (average monthly expense)
    const burnRate = averageMonthlyExpenses;

    return {
      currentBalance,
      averageMonthlyIncome,
      averageMonthlyExpenses,
      netCashFlow,
      runwayMonths: runwayMonths === Infinity ? -1 : Math.round(runwayMonths),
      burnRate
    };
  }

  // Helper methods
  private normalizeIncomeDescription(description: string): string {
    return description
      .toLowerCase()
      .replace(/\b\d+\b/g, '') // Remove numbers
      .replace(/\b(sal|salary|pay|income|credit|bonus)\b/g, 'salary') // Normalize salary terms
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private calculateIntervals(dates: Date[]): number[] {
    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      const daysDiff = (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
      intervals.push(daysDiff);
    }
    return intervals;
  }

  private determineFrequency(intervals: number[]): 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'yearly' | undefined {
    if (intervals.length === 0) return undefined;

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    
    if (avgInterval >= 350 && avgInterval <= 380) return 'yearly';
    if (avgInterval >= 85 && avgInterval <= 95) return 'quarterly';
    if (avgInterval >= 25 && avgInterval <= 35) return 'monthly';
    if (avgInterval >= 12 && avgInterval <= 16) return 'bi_weekly';
    if (avgInterval >= 5 && avgInterval <= 9) return 'weekly';
    
    return undefined;
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
    
    return mean > 0 ? Math.sqrt(variance) / mean : 0; // Coefficient of variation
  }

  private calculateNextIncomeDate(lastDate: Date, frequency: string): Date {
    const nextDate = new Date(lastDate);
    
    switch (frequency) {
      case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
      case 'bi_weekly': nextDate.setDate(nextDate.getDate() + 14); break;
      case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
      case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
      case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
    }
    
    return nextDate;
  }

  private calculateIncomeConfidence(
    transactions: Transaction[],
    isRegular: boolean,
    amountVariance: number,
    timingVariance: number
  ): number {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence for regular income
    if (isRegular) confidence += 0.3;
    
    // Adjust based on amount consistency
    confidence += Math.max(0, 0.2 - amountVariance);
    
    // Adjust based on timing consistency
    confidence += Math.max(0, 0.2 - timingVariance);
    
    // Boost confidence based on number of data points
    const dataPointBoost = Math.min(transactions.length / 12, 0.2); // Max 0.2 boost for 12+ transactions
    confidence += dataPointBoost;
    
    return Math.min(confidence, 1);
  }

  private groupAmountsByMonth(transactions: Transaction[]): number[] {
    const monthlyTotals = new Map<string, number>();
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyTotals.get(monthKey) || 0;
      monthlyTotals.set(monthKey, existing + Math.abs(transaction.amount));
    });
    
    return Array.from(monthlyTotals.values());
  }

  private calculatePredictability(monthlyAmounts: number[]): number {
    if (monthlyAmounts.length < 2) return 0;
    
    // Calculate how predictable the spending is based on variance
    const variance = this.calculateVariance(monthlyAmounts);
    return Math.max(0, 1 - variance); // Lower variance = higher predictability
  }

  private shouldIncomeOccur(stream: IncomeStream, projectionDate: Date): boolean {
    const daysSinceExpected = (projectionDate.getTime() - stream.nextExpectedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    switch (stream.frequency) {
      case 'weekly': return Math.abs(daysSinceExpected) < 3;
      case 'bi_weekly': return Math.abs(daysSinceExpected) < 5;
      case 'monthly': return Math.abs(daysSinceExpected) < 10;
      case 'quarterly': return Math.abs(daysSinceExpected) < 15;
      case 'yearly': return Math.abs(daysSinceExpected) < 30;
      default: return false;
    }
  }

  private getSeasonalMultiplier(categoryId: string, date: Date): number {
    const month = date.getMonth();
    
    // Apply seasonal adjustments based on category
    switch (categoryId) {
      case 'utilities_electricity':
        // Higher in summer (May-Sep) and winter (Nov-Feb)
        if ((month >= 4 && month <= 8) || (month >= 10 || month <= 1)) return 1.2;
        return 0.9;
        
      case 'shopping_clothing':
        // Higher during festival seasons and winter
        if (month === 9 || month === 10 || month === 11 || month === 2) return 1.3;
        return 0.9;
        
      case 'food_delivery':
        // Higher during monsoon and winter
        if (month >= 6 && month <= 9 || month === 11 || month === 0) return 1.1;
        return 1.0;
        
      case 'transport_fuel':
        // Higher during travel seasons
        if (month === 3 || month === 4 || month === 10 || month === 11) return 1.15;
        return 1.0;
        
      default:
        return 1.0;
    }
  }

  private calculateProjectionConfidence(
    transactions: Transaction[],
    incomeStreams: IncomeStream[],
    expenseCategories: ExpenseCategory[],
    monthsOut: number
  ): number {
    let confidence = 0.9; // Start with high confidence
    
    // Decrease confidence as we project further out
    confidence -= monthsOut * 0.1;
    
    // Adjust based on data quality
    const monthsOfData = this.getMonthsOfData(transactions);
    if (monthsOfData < this.MIN_DATA_MONTHS) {
      confidence *= 0.5;
    }
    
    // Adjust based on income stream confidence
    const avgIncomeConfidence = incomeStreams.length > 0
      ? incomeStreams.reduce((sum, stream) => sum + stream.confidence, 0) / incomeStreams.length
      : 0.3;
    confidence *= (0.5 + avgIncomeConfidence * 0.5);
    
    // Adjust based on expense predictability
    const avgExpensePredictability = expenseCategories.length > 0
      ? expenseCategories.reduce((sum, cat) => sum + cat.predictability, 0) / expenseCategories.length
      : 0.3;
    confidence *= (0.5 + avgExpensePredictability * 0.5);
    
    return Math.max(0.1, Math.min(confidence, 1));
  }

  private getMonthsOfData(transactions: Transaction[]): number {
    if (transactions.length === 0) return 0;
    
    const sortedTransactions = transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstDate = new Date(sortedTransactions[0].date);
    const lastDate = new Date(sortedTransactions[sortedTransactions.length - 1].date);
    
    const monthsDiff = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + 
                       (lastDate.getMonth() - firstDate.getMonth());
    
    return monthsDiff + 1;
  }

  private getCategoryName(categoryId: string): string {
    const categoryNames: Record<string, string> = {
      'food_delivery': 'Food Delivery',
      'food_grocery': 'Groceries',
      'transport_fuel': 'Fuel',
      'shopping_online': 'Online Shopping',
      'utilities_electricity': 'Electricity',
      'income': 'Income'
    };
    return categoryNames[categoryId] || categoryId;
  }

  // Public utility methods
  async exportCashFlowData(
    historicalCashFlow: any[],
    projections: CashFlowProjection[]
  ): Promise<string> {
    const headers = ['Date', 'Income', 'Expenses', 'Net Flow', 'Balance', 'Type'];
    const rows: string[][] = [];

    // Add historical data
    historicalCashFlow.forEach(month => {
      rows.push([
        month.date.toISOString().split('T')[0],
        month.income.toFixed(2),
        month.expenses.toFixed(2),
        (month.income - month.expenses).toFixed(2),
        month.runningBalance.toFixed(2),
        'Historical'
      ]);
    });

    // Add projections
    projections.forEach(projection => {
      rows.push([
        projection.date.toISOString().split('T')[0],
        projection.projectedIncome.toFixed(2),
        projection.projectedExpenses.toFixed(2),
        (projection.projectedIncome - projection.projectedExpenses).toFixed(2),
        projection.projectedBalance.toFixed(2),
        'Projected'
      ]);
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }

  async getScenarioAnalysis(
    transactions: Transaction[],
    scenarios: {
      name: string;
      incomeChange: number; // Percentage change
      expenseChange: number; // Percentage change
    }[]
  ): Promise<Array<{
    scenarioName: string;
    projectedBalance: number;
    runwayMonths: number;
    breakEvenMonth: number;
  }>> {
    const baseAnalysis = await this.generateCashFlowAnalysis(transactions);
    const results: Array<{
      scenarioName: string;
      projectedBalance: number;
      runwayMonths: number;
      breakEvenMonth: number;
    }> = [];

    scenarios.forEach(scenario => {
      const adjustedIncome = baseAnalysis.summary.averageMonthlyIncome * (1 + scenario.incomeChange / 100);
      const adjustedExpenses = baseAnalysis.summary.averageMonthlyExpenses * (1 + scenario.expenseChange / 100);
      const netCashFlow = adjustedIncome - adjustedExpenses;
      
      let projectedBalance = baseAnalysis.summary.currentBalance;
      let runwayMonths = 0;
      let breakEvenMonth = -1;

      // Simulate 24 months
      for (let month = 1; month <= 24; month++) {
        projectedBalance += netCashFlow;
        
        if (projectedBalance <= 0 && runwayMonths === 0) {
          runwayMonths = month;
        }
        
        if (netCashFlow > 0 && breakEvenMonth === -1) {
          breakEvenMonth = month;
        }
      }

      results.push({
        scenarioName: scenario.name,
        projectedBalance,
        runwayMonths: runwayMonths || -1, // -1 means never runs out
        breakEvenMonth: breakEvenMonth || -1 // -1 means never breaks even
      });
    });

    return results;
  }
}