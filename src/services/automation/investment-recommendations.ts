import { Transaction, Account } from '../../types';
import { InvestmentRecommendation, RiskProfile, MarketCondition } from './types';

export class InvestmentRecommendationService {
  async generateRecommendations(
    transactions: Transaction[],
    accounts: Account[],
    riskProfile: RiskProfile,
    marketConditions?: MarketCondition
  ): Promise<InvestmentRecommendation[]> {
    const recommendations: InvestmentRecommendation[] = [];

    // Calculate investable surplus
    const monthlyIncome = this.calculateMonthlyIncome(transactions);
    const monthlyExpenses = this.calculateMonthlyExpenses(transactions);
    const monthlySurplus = monthlyIncome - monthlyExpenses;
    const investableAmount = monthlySurplus * 0.7; // 70% of surplus

    // Current investment analysis
    const currentInvestments = this.analyzeCurrentInvestments(transactions);

    // Generate recommendations based on risk profile
    if (investableAmount > 1000) {
      recommendations.push(...this.generateSIPRecommendations(investableAmount, riskProfile));
    }

    if (currentInvestments.totalValue > 50000) {
      recommendations.push(...this.generateRebalancingRecommendations(currentInvestments, riskProfile));
    }

    // Market-based recommendations
    if (marketConditions) {
      recommendations.push(...this.generateMarketBasedRecommendations(marketConditions, investableAmount, riskProfile));
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  async generateAllocationStrategy(
    availableAmount: number,
    riskProfile: RiskProfile
  ): Promise<InvestmentRecommendation[]> {
    const recommendations: InvestmentRecommendation[] = [];

    const allocation = this.getRecommendedAllocation(riskProfile);

    // Equity allocation
    if (allocation.equity > 0) {
      const equityAmount = availableAmount * allocation.equity;
      recommendations.push({
        type: 'new_investment',
        priority: 'high',
        title: 'Equity Mutual Funds',
        description: `Invest ₹${equityAmount.toFixed(0)} in equity mutual funds`,
        reasoning: 'Long-term wealth creation through equity exposure',
        action: {
          type: 'start_sip',
          instrument: 'Large Cap Equity Fund',
          amount: equityAmount,
          duration: riskProfile.timeHorizon * 12
        },
        riskLevel: 'high',
        expectedReturn: 12,
        timeHorizon: 'long_term',
        confidence: 0.8
      });
    }

    // Debt allocation
    if (allocation.debt > 0) {
      const debtAmount = availableAmount * allocation.debt;
      recommendations.push({
        type: 'new_investment',
        priority: 'medium',
        title: 'Debt Mutual Funds',
        description: `Invest ₹${debtAmount.toFixed(0)} in debt mutual funds`,
        reasoning: 'Stable returns with lower risk',
        action: {
          type: 'start_sip',
          instrument: 'Corporate Bond Fund',
          amount: debtAmount,
          duration: 36
        },
        riskLevel: 'low',
        expectedReturn: 7,
        timeHorizon: 'medium_term',
        confidence: 0.9
      });
    }

    return recommendations;
  }

  private calculateMonthlyIncome(transactions: Transaction[]): number {
    const incomeTransactions = transactions.filter(t => 
      t.type === 'credit' && 
      t.categoryId === 'income' &&
      new Date(t.date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 3 months
    );

    const totalIncome = incomeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return totalIncome / 3; // Average monthly
  }

  private calculateMonthlyExpenses(transactions: Transaction[]): number {
    const expenseTransactions = transactions.filter(t => 
      t.type === 'debit' && 
      t.categoryId !== 'transfer' &&
      t.categoryId !== 'investment_mutual_funds' &&
      new Date(t.date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    );

    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return totalExpenses / 3;
  }

  private analyzeCurrentInvestments(transactions: Transaction[]): {
    totalValue: number;
    equity: number;
    debt: number;
    others: number;
  } {
    const investmentTransactions = transactions.filter(t => 
      t.categoryId?.startsWith('investment_')
    );

    let totalValue = 0;
    let equity = 0;
    let debt = 0;
    let others = 0;

    investmentTransactions.forEach(t => {
      const amount = Math.abs(t.amount);
      totalValue += amount;

      if (t.categoryId?.includes('stocks') || t.categoryId?.includes('equity')) {
        equity += amount;
      } else if (t.categoryId?.includes('fd') || t.categoryId?.includes('debt')) {
        debt += amount;
      } else {
        others += amount;
      }
    });

    return { totalValue, equity, debt, others };
  }

  private generateSIPRecommendations(
    investableAmount: number,
    riskProfile: RiskProfile
  ): InvestmentRecommendation[] {
    const recommendations: InvestmentRecommendation[] = [];

    if (riskProfile.riskTolerance === 'aggressive') {
      recommendations.push({
        type: 'sip_increase',
        priority: 'high',
        title: 'Increase Equity SIP',
        description: `Start SIP of ₹${investableAmount.toFixed(0)} in equity funds`,
        reasoning: 'High risk tolerance allows for aggressive equity allocation',
        action: {
          type: 'start_sip',
          instrument: 'Multi Cap Equity Fund',
          amount: investableAmount * 0.8,
          duration: riskProfile.timeHorizon * 12
        },
        riskLevel: 'high',
        expectedReturn: 14,
        timeHorizon: 'long_term',
        confidence: 0.8
      });
    } else if (riskProfile.riskTolerance === 'moderate') {
      recommendations.push({
        type: 'new_investment',
        priority: 'medium',
        title: 'Balanced Investment Approach',
        description: `Balanced allocation: 60% equity, 40% debt`,
        reasoning: 'Moderate risk tolerance suggests balanced approach',
        action: {
          type: 'start_sip',
          instrument: 'Hybrid Fund',
          amount: investableAmount,
          duration: riskProfile.timeHorizon * 12
        },
        riskLevel: 'medium',
        expectedReturn: 10,
        timeHorizon: 'medium_term',
        confidence: 0.85
      });
    } else {
      recommendations.push({
        type: 'new_investment',
        priority: 'low',
        title: 'Conservative Investment',
        description: `Focus on debt funds and FDs`,
        reasoning: 'Conservative risk tolerance prioritizes capital preservation',
        action: {
          type: 'start_sip',
          instrument: 'Conservative Debt Fund',
          amount: investableAmount,
          duration: 36
        },
        riskLevel: 'low',
        expectedReturn: 7,
        timeHorizon: 'short_term',
        confidence: 0.9
      });
    }

    return recommendations;
  }

  private generateRebalancingRecommendations(
    currentInvestments: any,
    riskProfile: RiskProfile
  ): InvestmentRecommendation[] {
    const recommendations: InvestmentRecommendation[] = [];
    const targetAllocation = this.getRecommendedAllocation(riskProfile);

    const currentEquityPercentage = currentInvestments.equity / currentInvestments.totalValue;
    const targetEquityPercentage = targetAllocation.equity;

    if (Math.abs(currentEquityPercentage - targetEquityPercentage) > 0.1) {
      const action = currentEquityPercentage > targetEquityPercentage ? 'reduce' : 'increase';
      
      recommendations.push({
        type: 'rebalancing',
        priority: 'medium',
        title: 'Portfolio Rebalancing Required',
        description: `${action.charAt(0).toUpperCase() + action.slice(1)} equity allocation`,
        reasoning: `Current equity: ${(currentEquityPercentage * 100).toFixed(0)}%, target: ${(targetEquityPercentage * 100).toFixed(0)}%`,
        action: {
          type: 'rebalance_portfolio',
          percentage: Math.abs(currentEquityPercentage - targetEquityPercentage) * 100
        },
        riskLevel: riskProfile.riskTolerance === 'aggressive' ? 'high' : 'medium',
        timeHorizon: 'medium_term',
        confidence: 0.8
      });
    }

    return recommendations;
  }

  private generateMarketBasedRecommendations(
    marketConditions: MarketCondition,
    investableAmount: number,
    riskProfile: RiskProfile
  ): InvestmentRecommendation[] {
    const recommendations: InvestmentRecommendation[] = [];

    if (marketConditions.marketSentiment === 'bearish' && marketConditions.volatilityLevel === 'high') {
      recommendations.push({
        type: 'new_investment',
        priority: 'high',
        title: 'Market Correction Opportunity',
        description: 'Consider increasing equity allocation during market correction',
        reasoning: 'High volatility and bearish sentiment present buying opportunity',
        action: {
          type: 'start_sip',
          instrument: 'Value Fund',
          amount: investableAmount * 0.5,
          duration: 24
        },
        riskLevel: 'high',
        expectedReturn: 15,
        timeHorizon: 'long_term',
        confidence: 0.7
      });
    }

    if (marketConditions.interestRateEnvironment === 'rising') {
      recommendations.push({
        type: 'new_investment',
        priority: 'medium',
        title: 'Rising Interest Rate Play',
        description: 'Consider short-term debt funds to benefit from rising rates',
        reasoning: 'Rising interest rates favor short-term debt instruments',
        action: {
          type: 'start_sip',
          instrument: 'Short Term Debt Fund',
          amount: investableAmount * 0.3,
          duration: 18
        },
        riskLevel: 'low',
        expectedReturn: marketConditions.inflationRate + 2,
        timeHorizon: 'short_term',
        confidence: 0.85
      });
    }

    return recommendations;
  }

  private getRecommendedAllocation(riskProfile: RiskProfile): { equity: number; debt: number; gold: number; cash: number } {
    const age = 30; // Default age, would come from user profile
    
    switch (riskProfile.riskTolerance) {
      case 'aggressive':
        return { equity: 0.8, debt: 0.15, gold: 0.05, cash: 0 };
      case 'moderate':
        return { equity: 0.6, debt: 0.3, gold: 0.05, cash: 0.05 };
      case 'conservative':
        return { equity: 0.3, debt: 0.6, gold: 0.05, cash: 0.05 };
      default:
        return { equity: 0.6, debt: 0.3, gold: 0.05, cash: 0.05 };
    }
  }
}