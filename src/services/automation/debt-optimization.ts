import { DebtOptimizationStrategy, DebtRecommendation, MonthlyDebtPlan } from './types';

export class DebtOptimizationService {
  async optimizePayments(
    debts: Array<{
      id: string;
      name: string;
      balance: number;
      interestRate: number;
      minimumPayment: number;
    }>,
    availableAmount: number
  ): Promise<DebtOptimizationStrategy> {
    
    // Calculate strategies: avalanche (highest interest first) and snowball (smallest balance first)
    const avalancheStrategy = this.calculateAvalanche(debts, availableAmount);
    const snowballStrategy = this.calculateSnowball(debts, availableAmount);
    
    // Choose the most effective strategy
    const strategy = avalancheStrategy.totalInterest < snowballStrategy.totalInterest 
      ? avalancheStrategy 
      : snowballStrategy;

    return {
      id: `strategy_${Date.now()}`,
      strategy: strategy.type,
      totalDebt: debts.reduce((sum, debt) => sum + debt.balance, 0),
      monthlyPayment: availableAmount,
      payoffTimeMonths: strategy.payoffTime,
      totalInterestSaved: strategy.totalInterest,
      recommendations: strategy.recommendations,
      monthlyPlan: strategy.monthlyPlan,
      confidence: 0.85,
      created_at: new Date()
    };
  }

  private calculateAvalanche(debts: any[], availableAmount: number) {
    // Sort by highest interest rate first
    const sortedDebts = [...debts].sort((a, b) => b.interestRate - a.interestRate);
    return this.calculatePayoffPlan(sortedDebts, availableAmount, 'avalanche');
  }

  private calculateSnowball(debts: any[], availableAmount: number) {
    // Sort by smallest balance first
    const sortedDebts = [...debts].sort((a, b) => a.balance - b.balance);
    return this.calculatePayoffPlan(sortedDebts, availableAmount, 'snowball');
  }

  private calculatePayoffPlan(
    sortedDebts: any[], 
    availableAmount: number, 
    type: 'avalanche' | 'snowball'
  ) {
    const recommendations: DebtRecommendation[] = [];
    const monthlyPlan: MonthlyDebtPlan[] = [];
    let totalInterest = 0;
    let currentMonth = 1;
    let remainingDebts = [...sortedDebts];
    let extraPayment = availableAmount - remainingDebts.reduce((sum, debt) => sum + debt.minimumPayment, 0);

    // Generate recommendations
    remainingDebts.forEach((debt, index) => {
      const additionalPayment = index === 0 ? extraPayment : 0; // Focus extra payment on priority debt
      recommendations.push({
        debtId: debt.id,
        debtName: debt.name,
        currentBalance: debt.balance,
        interestRate: debt.interestRate,
        minimumPayment: debt.minimumPayment,
        recommendedPayment: debt.minimumPayment + additionalPayment,
        priority: index + 1,
        reasoning: type === 'avalanche' 
          ? `Highest interest rate (${debt.interestRate}%)`
          : `Smallest balance (₹${debt.balance})`,
        payoffTime: this.estimatePayoffTime(debt, debt.minimumPayment + additionalPayment),
        totalInterest: this.calculateInterest(debt, debt.minimumPayment + additionalPayment)
      });
    });

    // Simulate monthly payments
    while (remainingDebts.length > 0 && currentMonth <= 120) { // Max 10 years
      const monthPayments: MonthlyDebtPlan['payments'] = [];
      let monthlyTotal = 0;

      remainingDebts.forEach((debt, index) => {
        const payment = index === 0 
          ? debt.minimumPayment + extraPayment 
          : debt.minimumPayment;
        
        const interestPayment = (debt.balance * debt.interestRate / 100) / 12;
        const principalPayment = Math.min(payment - interestPayment, debt.balance);
        
        debt.balance -= principalPayment;
        totalInterest += interestPayment;
        monthlyTotal += payment;

        monthPayments.push({
          debtId: debt.id,
          amount: payment,
          principalPayment,
          interestPayment,
          remainingBalance: Math.max(0, debt.balance)
        });
      });

      monthlyPlan.push({
        month: currentMonth,
        payments: monthPayments,
        totalPayment: monthlyTotal,
        totalPrincipal: monthPayments.reduce((sum, p) => sum + p.principalPayment, 0),
        totalInterest: monthPayments.reduce((sum, p) => sum + p.interestPayment, 0)
      });

      // Remove paid off debts and reallocate extra payment
      const paidOffDebts = remainingDebts.filter(debt => debt.balance <= 0);
      if (paidOffDebts.length > 0) {
        extraPayment += paidOffDebts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
        remainingDebts = remainingDebts.filter(debt => debt.balance > 0);
      }

      currentMonth++;
    }

    return {
      type,
      recommendations,
      monthlyPlan,
      payoffTime: currentMonth - 1,
      totalInterest
    };
  }

  private estimatePayoffTime(debt: any, monthlyPayment: number): number {
    const monthlyRate = debt.interestRate / 100 / 12;
    if (monthlyRate === 0) return Math.ceil(debt.balance / monthlyPayment);
    
    const months = -Math.log(1 - (debt.balance * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate);
    return Math.ceil(months);
  }

  private calculateInterest(debt: any, monthlyPayment: number): number {
    const payoffTime = this.estimatePayoffTime(debt, monthlyPayment);
    return (monthlyPayment * payoffTime) - debt.balance;
  }
}