import { Transaction, Account } from '../../types';
import { SavingsRecommendation } from './types';

export class SavingsAutomationService {
  async generateRecommendations(
    transactions: Transaction[],
    accounts: Account[],
    goals: Array<{
      name: string;
      targetAmount: number;
      targetDate: Date;
      priority: string;
    }>
  ): Promise<SavingsRecommendation[]> {
    const recommendations: SavingsRecommendation[] = [];

    const monthlyIncome = this.calculateMonthlyIncome(transactions);
    const monthlyExpenses = this.calculateMonthlyExpenses(transactions);
    const currentSavingsRate = ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100;
    const liquidCash = this.calculateLiquidCash(accounts);

    // Emergency fund recommendation
    const emergencyFundTarget = monthlyExpenses * 6;
    if (liquidCash < emergencyFundTarget) {
      recommendations.push({
        type: 'increase_emergency_fund',
        title: 'Build Emergency Fund',
        description: `Increase emergency fund to ₹${emergencyFundTarget.toFixed(0)}`,
        currentAmount: liquidCash,
        recommendedAmount: emergencyFundTarget,
        potentialBenefit: 'Financial security during emergencies',
        action: {
          type: 'setup_automation',
          amount: Math.min((emergencyFundTarget - liquidCash) / 12, monthlyIncome * 0.1),
          frequency: 'monthly'
        },
        priority: 'high',
        timeframe: 'immediate',
        confidence: 0.9
      });
    }

    // Savings rate optimization
    const targetSavingsRate = 20; // 20% target
    if (currentSavingsRate < targetSavingsRate) {
      const additionalSavings = monthlyIncome * (targetSavingsRate - currentSavingsRate) / 100;
      recommendations.push({
        type: 'optimize_savings_rate',
        title: 'Increase Savings Rate',
        description: `Increase monthly savings by ₹${additionalSavings.toFixed(0)}`,
        currentAmount: monthlyIncome * currentSavingsRate / 100,
        recommendedAmount: monthlyIncome * targetSavingsRate / 100,
        potentialBenefit: `Reach ${targetSavingsRate}% savings rate for better financial health`,
        action: {
          type: 'adjust_budget',
          amount: additionalSavings
        },
        priority: 'medium',
        timeframe: 'short_term',
        confidence: 0.8
      });
    }

    // Goal-based savings
    goals.forEach(goal => {
      const monthsToGoal = Math.max(1, 
        Math.ceil((goal.targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
      );
      const requiredMonthlySavings = goal.targetAmount / monthsToGoal;
      
      if (requiredMonthlySavings <= monthlyIncome * 0.15) { // Max 15% for one goal
        recommendations.push({
          type: 'automate_savings',
          title: `Automate Savings for ${goal.name}`,
          description: `Save ₹${requiredMonthlySavings.toFixed(0)}/month for ${goal.name}`,
          currentAmount: 0,
          recommendedAmount: requiredMonthlySavings,
          potentialBenefit: `Achieve ${goal.name} by ${goal.targetDate.toDateString()}`,
          action: {
            type: 'setup_automation',
            amount: requiredMonthlySavings,
            frequency: 'monthly'
          },
          priority: goal.priority as 'low' | 'medium' | 'high',
          timeframe: monthsToGoal <= 12 ? 'short_term' : 'long_term',
          confidence: 0.85
        });
      }
    });

    // High-yield account recommendation
    const savingsAccountBalance = accounts
      .filter(acc => acc.type === 'savings')
      .reduce((sum, acc) => sum + acc.balance, 0);

    if (savingsAccountBalance > 50000) {
      recommendations.push({
        type: 'high_yield_account',
        title: 'Move to High-Yield Savings',
        description: 'Consider moving funds to high-yield savings account',
        currentAmount: savingsAccountBalance,
        recommendedAmount: savingsAccountBalance,
        potentialBenefit: 'Earn additional ₹2,000-5,000 annually',
        action: {
          type: 'change_account',
          details: 'Research and switch to banks offering 6-7% interest'
        },
        priority: 'low',
        timeframe: 'immediate',
        confidence: 0.7
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private calculateMonthlyIncome(transactions: Transaction[]): number {
    const incomeTransactions = transactions.filter(t => 
      t.type === 'credit' && 
      t.categoryId === 'income' &&
      new Date(t.date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    );

    const totalIncome = incomeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return totalIncome / 3;
  }

  private calculateMonthlyExpenses(transactions: Transaction[]): number {
    const expenseTransactions = transactions.filter(t => 
      t.type === 'debit' && 
      t.categoryId !== 'transfer' &&
      !t.categoryId?.startsWith('investment_') &&
      new Date(t.date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    );

    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return totalExpenses / 3;
  }

  private calculateLiquidCash(accounts: Account[]): number {
    return accounts
      .filter(acc => acc.type === 'savings' || acc.type === 'current')
      .reduce((sum, acc) => sum + acc.balance, 0);
  }
}