import { Transaction } from '../../types';
import { 
  SpendingSummary, 
  CategorySpendingData, 
  MonthlySpendingTrend, 
  MerchantSpendingData, 
  SpendingPattern,
  SpendingTrend,
  AnalyticsFilters 
} from './types';

export class SpendingPatternsService {
  private cache: Map<string, any> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutes

  async generateSpendingSummary(
    transactions: Transaction[], 
    period: 'monthly' | 'quarterly' | 'yearly',
    filters?: AnalyticsFilters
  ): Promise<SpendingSummary> {
    const cacheKey = this.generateCacheKey('summary', { period, filters });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const filteredTransactions = this.filterTransactions(transactions, filters);
    const { startDate, endDate } = this.getDateRange(period, filters?.dateRange);

    const periodTransactions = filteredTransactions.filter(t => {
      const date = new Date(t.date);
      return date >= startDate && date <= endDate;
    });

    const income = this.calculateIncome(periodTransactions);
    const expenses = this.calculateExpenses(periodTransactions);
    const netSavings = income - expenses;
    const savingsRate = income > 0 ? (netSavings / income) * 100 : 0;

    const categoryBreakdown = await this.generateCategoryBreakdown(periodTransactions, filters);
    const monthlyTrends = await this.generateMonthlyTrends(filteredTransactions, period, filters);
    const topMerchants = this.generateTopMerchants(periodTransactions);

    const summary: SpendingSummary = {
      period,
      startDate,
      endDate,
      totalIncome: income,
      totalExpenses: expenses,
      netSavings,
      savingsRate,
      categoryBreakdown,
      monthlyTrends,
      topMerchants,
      averageTransactionAmount: this.calculateAverageTransactionAmount(periodTransactions),
      transactionCount: periodTransactions.length
    };

    this.setCache(cacheKey, summary);
    return summary;
  }

  private calculateIncome(transactions: Transaction[]): number {
    return transactions
      .filter(t => t.type === 'credit' && t.categoryId === 'income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }

  private calculateExpenses(transactions: Transaction[]): number {
    return transactions
      .filter(t => t.type === 'debit' && t.categoryId !== 'transfer')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }

  private async generateCategoryBreakdown(
    transactions: Transaction[],
    filters?: AnalyticsFilters
  ): Promise<CategorySpendingData[]> {
    const expenseTransactions = transactions.filter(t => 
      t.type === 'debit' && t.categoryId && t.categoryId !== 'transfer'
    );

    const categoryMap = new Map<string, {
      amount: number;
      count: number;
      transactions: Transaction[];
    }>();

    expenseTransactions.forEach(t => {
      const key = t.categoryId!;
      const existing = categoryMap.get(key) || { amount: 0, count: 0, transactions: [] };
      categoryMap.set(key, {
        amount: existing.amount + Math.abs(t.amount),
        count: existing.count + 1,
        transactions: [...existing.transactions, t]
      });
    });

    const totalExpenses = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.amount, 0);
    const categoryData: CategorySpendingData[] = [];

    for (const [categoryId, data] of categoryMap) {
      const percentage = totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0;
      const trend = await this.calculateCategoryTrend(categoryId, transactions);
      
      categoryData.push({
        categoryId,
        categoryName: this.getCategoryName(categoryId),
        amount: data.amount,
        percentage,
        transactionCount: data.count,
        trend,
        subcategories: this.generateSubcategoryBreakdown(data.transactions)
      });
    }

    return categoryData.sort((a, b) => b.amount - a.amount);
  }

  private generateSubcategoryBreakdown(transactions: Transaction[]): any[] {
    const subcategoryMap = new Map<string, { amount: number; count: number }>();

    transactions.forEach(t => {
      if (t.subcategoryId) {
        const existing = subcategoryMap.get(t.subcategoryId) || { amount: 0, count: 0 };
        subcategoryMap.set(t.subcategoryId, {
          amount: existing.amount + Math.abs(t.amount),
          count: existing.count + 1
        });
      }
    });

    const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const subcategories: any[] = [];

    for (const [subcategoryId, data] of subcategoryMap) {
      const percentage = totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0;
      subcategories.push({
        subcategoryId,
        subcategoryName: this.getSubcategoryName(subcategoryId),
        amount: data.amount,
        percentage,
        transactionCount: data.count
      });
    }

    return subcategories.sort((a, b) => b.amount - a.amount);
  }

  private async calculateCategoryTrend(
    categoryId: string, 
    transactions: Transaction[]
  ): Promise<SpendingTrend> {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const currentMonthTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return t.categoryId === categoryId && 
             t.type === 'debit' &&
             date >= currentMonth && 
             date <= now;
    });

    const previousMonthTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return t.categoryId === categoryId && 
             t.type === 'debit' &&
             date >= previousMonth && 
             date <= previousMonthEnd;
    });

    const currentAmount = currentMonthTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const previousAmount = previousMonthTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    if (previousAmount === 0) {
      return {
        direction: 'stable',
        percentage: 0,
        comparison: 'previous_month'
      };
    }

    const change = ((currentAmount - previousAmount) / previousAmount) * 100;
    const threshold = 5; // 5% threshold for considering it stable

    let direction: 'increasing' | 'decreasing' | 'stable';
    if (change > threshold) {
      direction = 'increasing';
    } else if (change < -threshold) {
      direction = 'decreasing';
    } else {
      direction = 'stable';
    }

    return {
      direction,
      percentage: Math.abs(change),
      comparison: 'previous_month'
    };
  }

  private async generateMonthlyTrends(
    transactions: Transaction[], 
    period: 'monthly' | 'quarterly' | 'yearly',
    filters?: AnalyticsFilters
  ): Promise<MonthlySpendingTrend[]> {
    const monthlyData = new Map<string, {
      month: string;
      year: number;
      income: number;
      expenses: number;
      transactions: Transaction[];
    }>();

    const months = period === 'yearly' ? 12 : period === 'quarterly' ? 3 : 6;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - months + 1);

    // Group transactions by month
    transactions.forEach(t => {
      const date = new Date(t.date);
      if (date >= startDate && date <= endDate) {
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const existing = monthlyData.get(key) || {
          month: date.toLocaleString('default', { month: 'long' }),
          year: date.getFullYear(),
          income: 0,
          expenses: 0,
          transactions: []
        };

        if (t.type === 'credit' && t.categoryId === 'income') {
          existing.income += Math.abs(t.amount);
        } else if (t.type === 'debit' && t.categoryId !== 'transfer') {
          existing.expenses += Math.abs(t.amount);
        }

        existing.transactions.push(t);
        monthlyData.set(key, existing);
      }
    });

    const trends: MonthlySpendingTrend[] = [];

    for (const [, data] of monthlyData) {
      const savings = data.income - data.expenses;
      const savingsRate = data.income > 0 ? (savings / data.income) * 100 : 0;
      const topCategories = await this.generateCategoryBreakdown(data.transactions.filter(t => t.type === 'debit'));

      trends.push({
        month: data.month,
        year: data.year,
        income: data.income,
        expenses: data.expenses,
        savings,
        savingsRate,
        topCategories: topCategories.slice(0, 5)
      });
    }

    return trends.sort((a, b) => {
      const dateA = new Date(a.year, this.getMonthNumber(a.month));
      const dateB = new Date(b.year, this.getMonthNumber(b.month));
      return dateA.getTime() - dateB.getTime();
    });
  }

  private generateTopMerchants(transactions: Transaction[]): MerchantSpendingData[] {
    const merchantMap = new Map<string, {
      name: string;
      amount: number;
      count: number;
      categoryId: string;
      dates: Date[];
    }>();

    transactions.filter(t => t.type === 'debit' && t.merchantId).forEach(t => {
      const key = t.merchantId!;
      const existing = merchantMap.get(key) || {
        name: this.getMerchantName(t.merchantId!),
        amount: 0,
        count: 0,
        categoryId: t.categoryId || 'unknown',
        dates: []
      };

      merchantMap.set(key, {
        ...existing,
        amount: existing.amount + Math.abs(t.amount),
        count: existing.count + 1,
        dates: [...existing.dates, new Date(t.date)]
      });
    });

    const merchantData: MerchantSpendingData[] = [];

    for (const [merchantId, data] of merchantMap) {
      const avgTransactionAmount = data.count > 0 ? data.amount / data.count : 0;
      const frequency = this.calculateMerchantFrequency(data.dates);
      const lastTransaction = new Date(Math.max(...data.dates.map(d => d.getTime())));

      merchantData.push({
        merchantId,
        merchantName: data.name,
        amount: data.amount,
        transactionCount: data.count,
        categoryId: data.categoryId,
        frequency,
        avgTransactionAmount,
        lastTransaction
      });
    }

    return merchantData.sort((a, b) => b.amount - a.amount).slice(0, 10);
  }

  private calculateMerchantFrequency(dates: Date[]): 'daily' | 'weekly' | 'monthly' | 'occasional' {
    if (dates.length < 2) return 'occasional';

    const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
    const intervals: number[] = [];

    for (let i = 1; i < sortedDates.length; i++) {
      const diff = sortedDates[i].getTime() - sortedDates[i - 1].getTime();
      intervals.push(diff / (1000 * 60 * 60 * 24)); // Convert to days
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

    if (avgInterval <= 7) return 'daily';
    if (avgInterval <= 14) return 'weekly';
    if (avgInterval <= 35) return 'monthly';
    return 'occasional';
  }

  async detectSpendingPatterns(
    transactions: Transaction[],
    categoryId?: string
  ): Promise<SpendingPattern[]> {
    const filteredTransactions = categoryId 
      ? transactions.filter(t => t.categoryId === categoryId && t.type === 'debit')
      : transactions.filter(t => t.type === 'debit');

    const patterns: SpendingPattern[] = [];

    // Detect seasonal patterns
    const seasonalPattern = this.detectSeasonalPattern(filteredTransactions);
    if (seasonalPattern) patterns.push(seasonalPattern);

    // Detect monthly patterns
    const monthlyPattern = this.detectMonthlyPattern(filteredTransactions);
    if (monthlyPattern) patterns.push(monthlyPattern);

    // Detect weekly patterns
    const weeklyPattern = this.detectWeeklyPattern(filteredTransactions);
    if (weeklyPattern) patterns.push(weeklyPattern);

    // Detect daily patterns
    const dailyPattern = this.detectDailyPattern(filteredTransactions);
    if (dailyPattern) patterns.push(dailyPattern);

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  private detectSeasonalPattern(transactions: Transaction[]): SpendingPattern | null {
    const seasonalData = { spring: 0, summer: 0, autumn: 0, winter: 0 };
    
    transactions.forEach(t => {
      const month = new Date(t.date).getMonth();
      const amount = Math.abs(t.amount);
      
      if (month >= 2 && month <= 4) seasonalData.spring += amount;
      else if (month >= 5 && month <= 7) seasonalData.summer += amount;
      else if (month >= 8 && month <= 10) seasonalData.autumn += amount;
      else seasonalData.winter += amount;
    });

    const total = Object.values(seasonalData).reduce((sum, val) => sum + val, 0);
    if (total === 0) return null;

    const normalizedData = {
      spring: (seasonalData.spring / total) * 100,
      summer: (seasonalData.summer / total) * 100,
      autumn: (seasonalData.autumn / total) * 100,
      winter: (seasonalData.winter / total) * 100
    };

    const maxSeason = Object.entries(normalizedData).reduce((max, [season, value]) => 
      value > max.value ? { season, value } : max, { season: '', value: 0 });

    const variance = this.calculateVariance(Object.values(normalizedData));
    const confidence = variance > 5 ? Math.min(variance / 25, 1) : 0;

    if (confidence < 0.3) return null;

    return {
      type: 'seasonal',
      pattern: normalizedData,
      confidence,
      description: `Highest spending in ${maxSeason.season} (${maxSeason.value.toFixed(1)}%)`
    };
  }

  private detectMonthlyPattern(transactions: Transaction[]): SpendingPattern | null {
    const monthlyData: Record<string, number> = {};
    
    for (let i = 0; i < 12; i++) {
      monthlyData[new Date(0, i).toLocaleString('default', { month: 'long' })] = 0;
    }

    transactions.forEach(t => {
      const month = new Date(t.date).toLocaleString('default', { month: 'long' });
      monthlyData[month] += Math.abs(t.amount);
    });

    const total = Object.values(monthlyData).reduce((sum, val) => sum + val, 0);
    if (total === 0) return null;

    const normalizedData: Record<string, number> = {};
    Object.entries(monthlyData).forEach(([month, amount]) => {
      normalizedData[month] = (amount / total) * 100;
    });

    const maxMonth = Object.entries(normalizedData).reduce((max, [month, value]) => 
      value > max.value ? { month, value } : max, { month: '', value: 0 });

    const variance = this.calculateVariance(Object.values(normalizedData));
    const confidence = variance > 3 ? Math.min(variance / 20, 1) : 0;

    if (confidence < 0.3) return null;

    return {
      type: 'monthly',
      pattern: normalizedData,
      confidence,
      description: `Highest spending in ${maxMonth.month} (${maxMonth.value.toFixed(1)}%)`
    };
  }

  private detectWeeklyPattern(transactions: Transaction[]): SpendingPattern | null {
    const weeklyData: Record<string, number> = {
      Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0
    };

    transactions.forEach(t => {
      const dayName = new Date(t.date).toLocaleString('default', { weekday: 'long' });
      weeklyData[dayName] += Math.abs(t.amount);
    });

    const total = Object.values(weeklyData).reduce((sum, val) => sum + val, 0);
    if (total === 0) return null;

    const normalizedData: Record<string, number> = {};
    Object.entries(weeklyData).forEach(([day, amount]) => {
      normalizedData[day] = (amount / total) * 100;
    });

    const maxDay = Object.entries(normalizedData).reduce((max, [day, value]) => 
      value > max.value ? { day, value } : max, { day: '', value: 0 });

    const variance = this.calculateVariance(Object.values(normalizedData));
    const confidence = variance > 2 ? Math.min(variance / 15, 1) : 0;

    if (confidence < 0.3) return null;

    return {
      type: 'weekly',
      pattern: normalizedData,
      confidence,
      description: `Highest spending on ${maxDay.day} (${maxDay.value.toFixed(1)}%)`
    };
  }

  private detectDailyPattern(transactions: Transaction[]): SpendingPattern | null {
    const hourlyData: Record<string, number> = {};
    
    for (let i = 0; i < 24; i++) {
      hourlyData[`${i}:00`] = 0;
    }

    // Group by hour ranges for better pattern detection
    const timeRanges = {
      'Early Morning (5-8)': 0,
      'Morning (9-12)': 0,
      'Afternoon (13-17)': 0,
      'Evening (18-21)': 0,
      'Night (22-24, 0-4)': 0
    };

    transactions.forEach(t => {
      const hour = new Date(t.date).getHours();
      const amount = Math.abs(t.amount);

      if (hour >= 5 && hour <= 8) timeRanges['Early Morning (5-8)'] += amount;
      else if (hour >= 9 && hour <= 12) timeRanges['Morning (9-12)'] += amount;
      else if (hour >= 13 && hour <= 17) timeRanges['Afternoon (13-17)'] += amount;
      else if (hour >= 18 && hour <= 21) timeRanges['Evening (18-21)'] += amount;
      else timeRanges['Night (22-24, 0-4)'] += amount;
    });

    const total = Object.values(timeRanges).reduce((sum, val) => sum + val, 0);
    if (total === 0) return null;

    const normalizedData: Record<string, number> = {};
    Object.entries(timeRanges).forEach(([range, amount]) => {
      normalizedData[range] = (amount / total) * 100;
    });

    const maxRange = Object.entries(normalizedData).reduce((max, [range, value]) => 
      value > max.value ? { range, value } : max, { range: '', value: 0 });

    const variance = this.calculateVariance(Object.values(normalizedData));
    const confidence = variance > 5 ? Math.min(variance / 25, 1) : 0;

    if (confidence < 0.3) return null;

    return {
      type: 'daily',
      pattern: normalizedData,
      confidence,
      description: `Highest spending during ${maxRange.range} (${maxRange.value.toFixed(1)}%)`
    };
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length);
  }

  // Helper methods
  private filterTransactions(transactions: Transaction[], filters?: AnalyticsFilters): Transaction[] {
    if (!filters) return transactions;

    let filtered = transactions;

    if (filters.dateRange) {
      filtered = filtered.filter(t => {
        const date = new Date(t.date);
        return date >= filters.dateRange.startDate && date <= filters.dateRange.endDate;
      });
    }

    if (filters.accountIds?.length) {
      filtered = filtered.filter(t => filters.accountIds!.includes(t.accountId));
    }

    if (filters.categoryIds?.length) {
      filtered = filtered.filter(t => t.categoryId && filters.categoryIds!.includes(t.categoryId));
    }

    if (filters.amountRange) {
      filtered = filtered.filter(t => {
        const amount = Math.abs(t.amount);
        return amount >= filters.amountRange!.min && amount <= filters.amountRange!.max;
      });
    }

    if (filters.transactionTypes?.length) {
      filtered = filtered.filter(t => filters.transactionTypes!.includes(t.type));
    }

    if (!filters.includeTransfers) {
      filtered = filtered.filter(t => t.categoryId !== 'transfer');
    }

    return filtered;
  }

  private getDateRange(
    period: 'monthly' | 'quarterly' | 'yearly',
    customRange?: { startDate: Date; endDate: Date }
  ): { startDate: Date; endDate: Date } {
    if (customRange) return customRange;

    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'monthly':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarterly':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'yearly':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    return { startDate, endDate };
  }

  private calculateAverageTransactionAmount(transactions: Transaction[]): number {
    if (transactions.length === 0) return 0;
    const total = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return total / transactions.length;
  }

  private getCategoryName(categoryId: string): string {
    // This would typically fetch from the category service
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

  private getSubcategoryName(subcategoryId: string): string {
    // This would typically fetch from the category service
    return subcategoryId;
  }

  private getMerchantName(merchantId: string): string {
    // This would typically fetch from the merchant service
    return merchantId;
  }

  private getMonthNumber(monthName: string): number {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months.indexOf(monthName);
  }

  // Cache management
  private generateCacheKey(operation: string, params: any): string {
    return `${operation}_${JSON.stringify(params)}`;
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache(): void {
    this.cache.clear();
  }
}