import { Transaction } from '../../types';
import { 
  BudgetItem, 
  BudgetStatus, 
  SmartBudgetSuggestion, 
  BudgetTemplate, 
  BudgetConfiguration,
  BudgetComparison 
} from './types';

export class BudgetService {
  private budgets: Map<string, BudgetItem> = new Map();
  private templates: Map<string, BudgetTemplate> = new Map();
  private configuration: BudgetConfiguration;

  constructor(config?: Partial<BudgetConfiguration>) {
    this.configuration = {
      defaultPeriod: 'monthly',
      defaultAlertThreshold: 80,
      enableAutomaticAdjustments: false,
      enablePredictiveAlerts: true,
      rolloverUnusedBudgets: false,
      notificationChannels: ['email', 'push'],
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday
      currency: 'INR',
      ...config
    };

    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplate: BudgetTemplate = {
      id: 'default_50_30_20',
      name: '50/30/20 Rule',
      description: '50% needs, 30% wants, 20% savings',
      categories: [
        { categoryId: 'food_grocery', percentage: 15, priority: 'high' },
        { categoryId: 'utilities_electricity', percentage: 8, priority: 'high' },
        { categoryId: 'utilities_internet', percentage: 3, priority: 'high' },
        { categoryId: 'transport_fuel', percentage: 8, priority: 'high' },
        { categoryId: 'healthcare_doctor', percentage: 5, priority: 'high' },
        { categoryId: 'food_delivery', percentage: 10, priority: 'medium' },
        { categoryId: 'entertainment_streaming', percentage: 3, priority: 'medium' },
        { categoryId: 'shopping_online', percentage: 10, priority: 'medium' },
        { categoryId: 'shopping_clothing', percentage: 5, priority: 'medium' },
        { categoryId: 'entertainment_movies', percentage: 2, priority: 'low' },
        { categoryId: 'personal', percentage: 3, priority: 'low' },
        { categoryId: 'investment_mutual_funds', percentage: 15, priority: 'high' },
        { categoryId: 'investment_fd', percentage: 5, priority: 'medium' },
        { categoryId: 'emergency_fund', percentage: 8, priority: 'high' }
      ],
      totalIncomePercentage: 100,
      isDefault: true,
      created_at: new Date()
    };

    const conservativeTemplate: BudgetTemplate = {
      id: 'conservative_budget',
      name: 'Conservative Budget',
      description: 'Low spending, high savings focus',
      categories: [
        { categoryId: 'food_grocery', percentage: 12, priority: 'high' },
        { categoryId: 'utilities_electricity', percentage: 6, priority: 'high' },
        { categoryId: 'utilities_internet', percentage: 2, priority: 'high' },
        { categoryId: 'transport_fuel', percentage: 6, priority: 'high' },
        { categoryId: 'healthcare_doctor', percentage: 4, priority: 'high' },
        { categoryId: 'food_delivery', percentage: 5, priority: 'medium' },
        { categoryId: 'entertainment_streaming', percentage: 1, priority: 'low' },
        { categoryId: 'shopping_online', percentage: 5, priority: 'medium' },
        { categoryId: 'shopping_clothing', percentage: 3, priority: 'low' },
        { categoryId: 'entertainment_movies', percentage: 1, priority: 'low' },
        { categoryId: 'personal', percentage: 2, priority: 'low' },
        { categoryId: 'investment_mutual_funds', percentage: 25, priority: 'high' },
        { categoryId: 'investment_fd', percentage: 10, priority: 'high' },
        { categoryId: 'emergency_fund', percentage: 18, priority: 'high' }
      ],
      totalIncomePercentage: 100,
      isDefault: false,
      created_at: new Date()
    };

    this.templates.set(defaultTemplate.id, defaultTemplate);
    this.templates.set(conservativeTemplate.id, conservativeTemplate);
  }

  createBudget(budget: Omit<BudgetItem, 'id' | 'created_at' | 'updated_at'>): string {
    const id = `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const newBudget: BudgetItem = {
      ...budget,
      id,
      created_at: now,
      updated_at: now
    };

    this.budgets.set(id, newBudget);
    return id;
  }

  updateBudget(id: string, updates: Partial<BudgetItem>): boolean {
    const budget = this.budgets.get(id);
    if (!budget) return false;

    Object.assign(budget, {
      ...updates,
      updated_at: new Date()
    });

    return true;
  }

  deleteBudget(id: string): boolean {
    return this.budgets.delete(id);
  }

  getBudget(id: string): BudgetItem | undefined {
    return this.budgets.get(id);
  }

  getAllBudgets(filters?: {
    isActive?: boolean;
    period?: string;
    categoryId?: string;
  }): BudgetItem[] {
    let budgets = Array.from(this.budgets.values());

    if (filters) {
      if (filters.isActive !== undefined) {
        budgets = budgets.filter(b => b.isActive === filters.isActive);
      }
      if (filters.period) {
        budgets = budgets.filter(b => b.period === filters.period);
      }
      if (filters.categoryId) {
        budgets = budgets.filter(b => b.categoryId === filters.categoryId);
      }
    }

    return budgets.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
  }

  calculateBudgetStatus(
    budgetId: string, 
    transactions: Transaction[]
  ): BudgetStatus | null {
    const budget = this.budgets.get(budgetId);
    if (!budget) return null;

    const now = new Date();
    const periodTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= budget.startDate && 
             transactionDate <= budget.endDate &&
             (t.categoryId === budget.categoryId || 
              (budget.subcategoryId && t.subcategoryId === budget.subcategoryId)) &&
             t.type === 'debit';
    });

    const spent = periodTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const remaining = Math.max(0, budget.amount - spent);
    const utilizationPercentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    const isOverBudget = spent > budget.amount;

    // Calculate days remaining in budget period
    const daysRemaining = Math.max(0, Math.ceil(
      (budget.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    ));

    const dailyBudgetRemaining = daysRemaining > 0 ? remaining / daysRemaining : 0;

    // Project spending based on current trend
    const periodDays = Math.ceil(
      (budget.endDate.getTime() - budget.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysPassed = periodDays - daysRemaining;
    const dailySpendingRate = daysPassed > 0 ? spent / daysPassed : 0;
    const projectedSpending = dailySpendingRate * periodDays;

    // Determine spending trend
    let trend: 'on_track' | 'over_spending' | 'under_spending';
    if (projectedSpending > budget.amount * 1.1) {
      trend = 'over_spending';
    } else if (projectedSpending < budget.amount * 0.8) {
      trend = 'under_spending';
    } else {
      trend = 'on_track';
    }

    return {
      budgetId,
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

  generateSmartBudgetSuggestions(
    transactions: Transaction[],
    monthlyIncome: number,
    lookbackMonths: number = 6
  ): SmartBudgetSuggestion[] {
    const suggestions: SmartBudgetSuggestion[] = [];
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - lookbackMonths);

    const relevantTransactions = transactions.filter(t => 
      new Date(t.date) >= cutoffDate && t.type === 'debit' && t.categoryId
    );

    // Group transactions by category
    const categorySpending = new Map<string, {
      amounts: number[];
      monthlyTotals: Map<string, number>;
    }>();

    relevantTransactions.forEach(t => {
      const categoryId = t.categoryId!;
      const monthKey = `${new Date(t.date).getFullYear()}-${new Date(t.date).getMonth()}`;
      const amount = Math.abs(t.amount);

      if (!categorySpending.has(categoryId)) {
        categorySpending.set(categoryId, {
          amounts: [],
          monthlyTotals: new Map()
        });
      }

      const categoryData = categorySpending.get(categoryId)!;
      categoryData.amounts.push(amount);
      
      const monthlyTotal = categoryData.monthlyTotals.get(monthKey) || 0;
      categoryData.monthlyTotals.set(monthKey, monthlyTotal + amount);
    });

    // Generate suggestions for each category
    for (const [categoryId, data] of categorySpending) {
      const monthlyAmounts = Array.from(data.monthlyTotals.values());
      if (monthlyAmounts.length < 2) continue;

      const avgMonthlySpending = monthlyAmounts.reduce((sum, amt) => sum + amt, 0) / monthlyAmounts.length;
      const trend = this.calculateSpendingTrend(monthlyAmounts);
      const seasonalAdjustment = this.getSeasonalAdjustment(categoryId, new Date());
      const confidence = this.calculateConfidence(monthlyAmounts, lookbackMonths);
      
      let suggestedAmount = avgMonthlySpending;
      
      // Apply trend adjustment
      if (trend === 'increasing') {
        suggestedAmount *= 1.1; // 10% increase
      } else if (trend === 'decreasing') {
        suggestedAmount *= 0.95; // 5% decrease
      }

      // Apply seasonal adjustment
      if (seasonalAdjustment) {
        suggestedAmount *= seasonalAdjustment;
      }

      // Ensure reasonable percentage of income
      const incomePercentage = monthlyIncome > 0 ? (suggestedAmount / monthlyIncome) * 100 : 0;
      const maxPercentage = this.getMaxCategoryPercentage(categoryId);
      
      if (incomePercentage > maxPercentage) {
        suggestedAmount = monthlyIncome * (maxPercentage / 100);
      }

      const reasoning = this.generateBudgetReasoning(
        avgMonthlySpending, 
        suggestedAmount, 
        trend, 
        seasonalAdjustment
      );

      suggestions.push({
        categoryId,
        categoryName: this.getCategoryName(categoryId),
        suggestedAmount: Math.round(suggestedAmount),
        reasoning,
        confidence,
        basedOnMonths: monthlyAmounts.length,
        historicalAverage: Math.round(avgMonthlySpending),
        trend,
        seasonalAdjustment
      });
    }

    return suggestions.sort((a, b) => b.suggestedAmount - a.suggestedAmount);
  }

  createBudgetFromTemplate(
    templateId: string,
    monthlyIncome: number,
    userId: string,
    period: 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  ): string[] {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const budgetIds: string[] = [];
    const now = new Date();
    const { startDate, endDate } = this.calculateBudgetPeriod(period, now);

    template.categories.forEach(category => {
      const budgetAmount = monthlyIncome * (category.percentage / 100);
      
      if (period === 'quarterly') {
        // Multiply by 3 for quarterly budgets
        const quarterlyAmount = budgetAmount * 3;
        budgetAmount = quarterlyAmount;
      } else if (period === 'yearly') {
        // Multiply by 12 for yearly budgets
        const yearlyAmount = budgetAmount * 12;
        budgetAmount = yearlyAmount;
      }

      const budgetId = this.createBudget({
        name: `${this.getCategoryName(category.categoryId)} Budget`,
        categoryId: category.categoryId,
        amount: Math.round(budgetAmount),
        period,
        startDate,
        endDate,
        rollover: this.configuration.rolloverUnusedBudgets,
        alertThreshold: this.configuration.defaultAlertThreshold,
        isActive: true,
        created_by: userId
      });

      budgetIds.push(budgetId);
    });

    return budgetIds;
  }

  private calculateSpendingTrend(monthlyAmounts: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (monthlyAmounts.length < 3) return 'stable';

    const recentAvg = monthlyAmounts.slice(-3).reduce((sum, amt) => sum + amt, 0) / 3;
    const olderAvg = monthlyAmounts.slice(0, -3).reduce((sum, amt) => sum + amt, 0) / (monthlyAmounts.length - 3);

    const changePercentage = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (changePercentage > 10) return 'increasing';
    if (changePercentage < -10) return 'decreasing';
    return 'stable';
  }

  private getSeasonalAdjustment(categoryId: string, currentDate: Date): number | undefined {
    const month = currentDate.getMonth();
    
    // Apply seasonal adjustments based on Indian context
    switch (categoryId) {
      case 'utilities_electricity':
        // Higher in summer (March-June) and winter (November-February)
        if ((month >= 2 && month <= 5) || (month >= 10 || month <= 1)) return 1.3;
        return 0.8;
        
      case 'shopping_clothing':
        // Higher during festival seasons (September-November)
        if (month >= 8 && month <= 10) return 1.4;
        // Higher in winter (December-February)
        if (month >= 11 || month <= 1) return 1.2;
        return 0.9;
        
      case 'food_delivery':
        // Higher during monsoon (June-September)
        if (month >= 5 && month <= 8) return 1.2;
        return 1.0;
        
      case 'transport_fuel':
        // Higher during travel seasons (March-May, October-December)
        if ((month >= 2 && month <= 4) || (month >= 9 && month <= 11)) return 1.2;
        return 1.0;
        
      case 'entertainment_movies':
        // Higher during holidays and festival season
        if (month === 9 || month === 10 || month === 11 || month === 3) return 1.5;
        return 0.8;
        
      default:
        return undefined;
    }
  }

  private calculateConfidence(monthlyAmounts: number[], lookbackMonths: number): number {
    if (monthlyAmounts.length === 0) return 0;

    // Base confidence on data availability
    let confidence = Math.min(monthlyAmounts.length / lookbackMonths, 1);

    // Adjust for variance
    const avg = monthlyAmounts.reduce((sum, amt) => sum + amt, 0) / monthlyAmounts.length;
    const variance = monthlyAmounts.reduce((sum, amt) => sum + Math.pow(amt - avg, 2), 0) / monthlyAmounts.length;
    const coefficientOfVariation = avg > 0 ? Math.sqrt(variance) / avg : 1;

    // Lower variance = higher confidence
    const varianceAdjustment = Math.max(0, 1 - coefficientOfVariation);
    confidence = (confidence + varianceAdjustment) / 2;

    return Math.round(confidence * 100) / 100;
  }

  private getMaxCategoryPercentage(categoryId: string): number {
    // Maximum reasonable percentage of income for each category
    const maxPercentages: Record<string, number> = {
      'food_grocery': 20,
      'food_delivery': 15,
      'utilities_electricity': 10,
      'utilities_internet': 5,
      'transport_fuel': 15,
      'healthcare_doctor': 10,
      'shopping_online': 15,
      'shopping_clothing': 10,
      'entertainment_streaming': 3,
      'entertainment_movies': 5,
      'personal': 8,
      'investment_mutual_funds': 30,
      'investment_fd': 20
    };

    return maxPercentages[categoryId] || 10;
  }

  private generateBudgetReasoning(
    historical: number,
    suggested: number,
    trend: string,
    seasonalAdjustment?: number
  ): string {
    const change = suggested - historical;
    const changePercentage = historical > 0 ? (change / historical) * 100 : 0;
    
    let reasoning = `Based on ${Math.abs(changePercentage).toFixed(0)}% `;
    reasoning += changePercentage > 0 ? 'increase' : 'decrease';
    reasoning += ' from historical average';

    if (trend !== 'stable') {
      reasoning += `, accounting for ${trend} spending trend`;
    }

    if (seasonalAdjustment) {
      reasoning += ' with seasonal adjustment';
    }

    return reasoning;
  }

  private calculateBudgetPeriod(
    period: 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    startDate: Date
  ): { startDate: Date; endDate: Date } {
    const endDate = new Date(startDate);
    
    switch (period) {
      case 'weekly':
        endDate.setDate(endDate.getDate() + 6);
        break;
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0); // Last day of month
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        endDate.setDate(0);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        endDate.setDate(endDate.getDate() - 1);
        break;
    }

    return { startDate, endDate };
  }

  compareBudgetPeriods(
    currentPeriodBudgets: BudgetItem[],
    previousPeriodBudgets: BudgetItem[],
    currentTransactions: Transaction[],
    previousTransactions: Transaction[]
  ): BudgetComparison {
    const currentSummary = this.generatePeriodSummary(currentPeriodBudgets, currentTransactions);
    const previousSummary = this.generatePeriodSummary(previousPeriodBudgets, previousTransactions);

    const spendingChange = currentSummary.actualSpent - previousSummary.actualSpent;
    const spendingChangePercentage = previousSummary.actualSpent > 0 
      ? (spendingChange / previousSummary.actualSpent) * 100 
      : 0;

    const budgetChange = currentSummary.budgetAmount - previousSummary.budgetAmount;
    const budgetChangePercentage = previousSummary.budgetAmount > 0 
      ? (budgetChange / previousSummary.budgetAmount) * 100 
      : 0;

    const improvedCategories: string[] = [];
    const worsenedCategories: string[] = [];

    currentSummary.topSpendingCategories.forEach(currentCat => {
      const previousCat = previousSummary.topSpendingCategories.find(p => p.categoryId === currentCat.categoryId);
      if (previousCat) {
        const currentVariance = Math.abs(currentCat.variance);
        const previousVariance = Math.abs(previousCat.variance);
        
        if (currentVariance < previousVariance) {
          improvedCategories.push(currentCat.categoryId);
        } else if (currentVariance > previousVariance) {
          worsenedCategories.push(currentCat.categoryId);
        }
      }
    });

    return {
      currentPeriod: currentSummary,
      previousPeriod: previousSummary,
      change: {
        spendingChange,
        spendingChangePercentage,
        budgetChange,
        budgetChangePercentage
      },
      improvedCategories,
      worsenedCategories
    };
  }

  private generatePeriodSummary(
    budgets: BudgetItem[],
    transactions: Transaction[]
  ): any {
    // This would generate a detailed period summary
    // Implementation simplified for brevity
    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      period: 'current',
      budgetAmount: totalBudget,
      actualSpent: totalSpent,
      variance: totalSpent - totalBudget,
      variancePercentage: totalBudget > 0 ? ((totalSpent - totalBudget) / totalBudget) * 100 : 0,
      categoriesOverBudget: [],
      categoriesUnderBudget: [],
      topSpendingCategories: []
    };
  }

  // Utility methods
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

  // Configuration methods
  updateConfiguration(config: Partial<BudgetConfiguration>): void {
    this.configuration = { ...this.configuration, ...config };
  }

  getConfiguration(): BudgetConfiguration {
    return { ...this.configuration };
  }

  getTemplates(): BudgetTemplate[] {
    return Array.from(this.templates.values());
  }

  addTemplate(template: Omit<BudgetTemplate, 'id' | 'created_at'>): string {
    const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTemplate: BudgetTemplate = {
      ...template,
      id,
      created_at: new Date()
    };

    this.templates.set(id, newTemplate);
    return id;
  }

  deleteTemplate(id: string): boolean {
    const template = this.templates.get(id);
    if (!template || template.isDefault) return false;
    
    return this.templates.delete(id);
  }

  // Export methods
  exportBudgets(): string {
    const budgets = this.getAllBudgets();
    return JSON.stringify(budgets, null, 2);
  }

  importBudgets(data: string): boolean {
    try {
      const budgets: BudgetItem[] = JSON.parse(data);
      budgets.forEach(budget => {
        this.budgets.set(budget.id, budget);
      });
      return true;
    } catch {
      return false;
    }
  }
}