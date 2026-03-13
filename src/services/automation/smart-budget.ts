import { Transaction, Budget } from '../../types';
import { SmartBudgetRecommendation } from './types';

export class SmartBudgetService {
  async generateRecommendations(
    transactions: Transaction[],
    currentBudgets: Budget[],
    monthlyIncome: number
  ): Promise<SmartBudgetRecommendation[]> {
    // Analyze spending patterns from last 6 months
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 6);

    const relevantTransactions = transactions.filter(t => 
      new Date(t.date) >= cutoffDate && 
      t.type === 'debit' && 
      t.categoryId
    );

    const recommendations: SmartBudgetRecommendation[] = [];

    // Group spending by category
    const categorySpending = new Map<string, number[]>();
    const monthlyData = new Map<string, Map<string, number>>();

    relevantTransactions.forEach(t => {
      const monthKey = `${new Date(t.date).getFullYear()}-${new Date(t.date).getMonth()}`;
      const amount = Math.abs(t.amount);

      // Track monthly spending per category
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, new Map());
      }
      const monthData = monthlyData.get(monthKey)!;
      const currentCategoryTotal = monthData.get(t.categoryId!) || 0;
      monthData.set(t.categoryId!, currentCategoryTotal + amount);

      // Track all amounts for variance calculation
      if (!categorySpending.has(t.categoryId!)) {
        categorySpending.set(t.categoryId!, []);
      }
      categorySpending.get(t.categoryId!)!.push(amount);
    });

    // Generate recommendations for each category
    for (const [categoryId, monthlyTotals] of monthlyData) {
      const amounts = Array.from(monthlyTotals.values());
      if (amounts.length < 2) continue;

      const average = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
      const variance = this.calculateVariance(amounts);
      const trend = this.calculateTrend(amounts);
      const confidence = this.calculateConfidence(amounts.length, variance);

      let recommendedAmount = average;

      // Adjust based on trend
      if (trend === 'increasing') {
        recommendedAmount *= 1.1; // 10% increase
      } else if (trend === 'decreasing') {
        recommendedAmount *= 0.95; // 5% decrease
      }

      // Apply seasonal adjustments
      const seasonalAdjustment = this.getSeasonalAdjustment(categoryId);
      if (seasonalAdjustment) {
        recommendedAmount *= seasonalAdjustment;
      }

      // Ensure reasonable percentage of income
      const maxPercentage = this.getMaxCategoryPercentage(categoryId);
      const maxAmount = monthlyIncome * (maxPercentage / 100);
      recommendedAmount = Math.min(recommendedAmount, maxAmount);

      const currentBudget = currentBudgets.find(b => b.categoryId === categoryId)?.amount;
      const adjustmentType = this.getAdjustmentType(currentBudget, recommendedAmount);
      const adjustmentPercentage = currentBudget 
        ? Math.abs((recommendedAmount - currentBudget) / currentBudget * 100)
        : 0;

      recommendations.push({
        categoryId,
        categoryName: this.getCategoryName(categoryId),
        currentBudget,
        recommendedBudget: Math.round(recommendedAmount),
        reasoning: this.generateReasoning(average, recommendedAmount, trend, variance),
        confidence,
        adjustmentType,
        adjustmentPercentage,
        basedOnMonths: amounts.length
      });
    }

    return recommendations
      .sort((a, b) => b.recommendedBudget - a.recommendedBudget)
      .slice(0, 15); // Top 15 categories
  }

  private calculateVariance(amounts: number[]): number {
    const mean = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const squaredDiffs = amounts.map(amt => Math.pow(amt - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / amounts.length;
    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  private calculateTrend(amounts: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (amounts.length < 3) return 'stable';

    const recentAvg = amounts.slice(-3).reduce((sum, amt) => sum + amt, 0) / 3;
    const earlierAvg = amounts.slice(0, -3).reduce((sum, amt) => sum + amt, 0) / (amounts.length - 3);
    
    const change = (recentAvg - earlierAvg) / earlierAvg * 100;
    
    if (change > 15) return 'increasing';
    if (change < -15) return 'decreasing';
    return 'stable';
  }

  private calculateConfidence(dataPoints: number, variance: number): number {
    let confidence = Math.min(dataPoints / 6, 1); // More data points = higher confidence
    confidence *= Math.max(0, 1 - variance); // Lower variance = higher confidence
    return Math.round(confidence * 100) / 100;
  }

  private getSeasonalAdjustment(categoryId: string): number | undefined {
    const month = new Date().getMonth();
    
    switch (categoryId) {
      case 'utilities_electricity':
        return (month >= 2 && month <= 5) || (month >= 10 || month <= 1) ? 1.3 : 0.8;
      case 'shopping_clothing':
        return (month >= 8 && month <= 10) ? 1.4 : 0.9;
      case 'food_delivery':
        return (month >= 5 && month <= 8) ? 1.2 : 1.0;
      default:
        return undefined;
    }
  }

  private getMaxCategoryPercentage(categoryId: string): number {
    const maxPercentages: Record<string, number> = {
      'food_grocery': 20,
      'utilities_electricity': 10,
      'transport_fuel': 15,
      'shopping_online': 15,
      'healthcare_doctor': 10
    };
    return maxPercentages[categoryId] || 12;
  }

  private getAdjustmentType(current: number | undefined, recommended: number): 'increase' | 'decrease' | 'maintain' {
    if (!current) return 'increase';
    
    const change = (recommended - current) / current;
    if (change > 0.05) return 'increase';
    if (change < -0.05) return 'decrease';
    return 'maintain';
  }

  private generateReasoning(historical: number, recommended: number, trend: string, variance: number): string {
    const change = ((recommended - historical) / historical) * 100;
    const changeStr = change > 0 ? 'increase' : 'decrease';
    
    let reasoning = `Based on ${Math.abs(change).toFixed(0)}% ${changeStr} from historical average`;
    
    if (trend !== 'stable') {
      reasoning += `, accounting for ${trend} spending trend`;
    }
    
    if (variance > 0.3) {
      reasoning += '. Note: High spending variance detected';
    }
    
    return reasoning;
  }

  private getCategoryName(categoryId: string): string {
    const names: Record<string, string> = {
      'food_grocery': 'Groceries',
      'food_delivery': 'Food Delivery',
      'transport_fuel': 'Fuel',
      'utilities_electricity': 'Electricity'
    };
    return names[categoryId] || categoryId;
  }
}