import { Transaction, Account } from '../../types';
import { NetWorthSnapshot, AssetValue, LiabilityValue, NetWorthChange } from './types';

export class NetWorthService {
  async calculateNetWorth(
    accounts: Account[],
    transactions: Transaction[],
    options: {
      includeProjections?: boolean;
      asOfDate?: Date;
    } = {}
  ): Promise<NetWorthSnapshot> {
    const {
      includeProjections = false,
      asOfDate = new Date()
    } = options;

    const assets = this.calculateAssets(accounts, transactions, asOfDate);
    const liabilities = this.calculateLiabilities(accounts, transactions, asOfDate);

    const totalAssets = assets.reduce((sum, asset) => sum + asset.amount, 0);
    const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.amount, 0);
    const netWorth = totalAssets - totalLiabilities;

    const change = await this.calculateNetWorthChange(accounts, transactions, asOfDate);

    return {
      date: asOfDate,
      assets,
      liabilities,
      totalAssets,
      totalLiabilities,
      netWorth,
      change
    };
  }

  private calculateAssets(accounts: Account[], transactions: Transaction[], asOfDate: Date): AssetValue[] {
    const assets: AssetValue[] = [];

    accounts.forEach(account => {
      if (['savings', 'current', 'investment'].includes(account.type)) {
        const currentBalance = this.calculateAccountBalance(account, transactions, asOfDate);
        
        if (currentBalance > 0) {
          assets.push({
            type: account.type === 'investment' ? 'investment' : account.type === 'current' ? 'cash' : 'savings',
            amount: currentBalance,
            accountId: account.id,
            description: `${account.bank} ${account.name}`
          });
        }
      }
    });

    // Add estimated investment values (this would typically come from investment tracking)
    // For now, we'll calculate based on investment transactions
    const investmentValue = this.calculateInvestmentValue(transactions, asOfDate);
    if (investmentValue > 0) {
      assets.push({
        type: 'investment',
        subtype: 'portfolio',
        amount: investmentValue,
        description: 'Investment Portfolio'
      });
    }

    return assets.sort((a, b) => b.amount - a.amount);
  }

  private calculateLiabilities(accounts: Account[], transactions: Transaction[], asOfDate: Date): LiabilityValue[] {
    const liabilities: LiabilityValue[] = [];

    accounts.forEach(account => {
      if (['credit', 'loan'].includes(account.type)) {
        const currentBalance = this.calculateAccountBalance(account, transactions, asOfDate);
        
        if (currentBalance < 0) { // Negative balance means liability
          liabilities.push({
            type: account.type === 'credit' ? 'credit_card' : 'loan',
            amount: Math.abs(currentBalance),
            accountId: account.id,
            description: `${account.bank} ${account.name}`,
            interestRate: this.estimateInterestRate(account.type)
          });
        }
      }
    });

    // Calculate outstanding loans from loan payments
    const loanLiabilities = this.calculateLoanLiabilities(transactions, asOfDate);
    liabilities.push(...loanLiabilities);

    return liabilities.sort((a, b) => b.amount - a.amount);
  }

  private calculateAccountBalance(account: Account, transactions: Transaction[], asOfDate: Date): number {
    const accountTransactions = transactions.filter(t => 
      t.accountId === account.id && new Date(t.date) <= asOfDate
    );

    if (accountTransactions.length === 0) {
      return account.balance; // Return initial balance if no transactions
    }

    // Get the most recent balance from transactions
    const sortedTransactions = accountTransactions.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return sortedTransactions[0].balance || account.balance;
  }

  private calculateInvestmentValue(transactions: Transaction[], asOfDate: Date): number {
    const investmentTransactions = transactions.filter(t => 
      t.categoryId?.startsWith('investment_') && new Date(t.date) <= asOfDate
    );

    // Simple calculation: sum of investment purchases minus withdrawals
    let totalInvested = 0;
    let totalWithdrawn = 0;

    investmentTransactions.forEach(t => {
      if (t.type === 'debit') {
        totalInvested += Math.abs(t.amount);
      } else if (t.type === 'credit' && t.description.toLowerCase().includes('redeem')) {
        totalWithdrawn += Math.abs(t.amount);
      }
    });

    // Apply estimated growth (this is simplified - real implementation would track actual values)
    const netInvestment = totalInvested - totalWithdrawn;
    const estimatedGrowth = this.estimateInvestmentGrowth(netInvestment, investmentTransactions);

    return netInvestment + estimatedGrowth;
  }

  private estimateInvestmentGrowth(principal: number, transactions: Transaction[]): number {
    if (transactions.length === 0 || principal <= 0) return 0;

    // Simple growth estimation based on time invested
    const firstInvestment = transactions
      .filter(t => t.type === 'debit')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

    if (!firstInvestment) return 0;

    const monthsInvested = Math.max(1, this.getMonthsDifference(new Date(firstInvestment.date), new Date()));
    
    // Estimate 12% annual return (1% monthly) - this is very simplified
    const estimatedMonthlyReturn = 0.01;
    const growthFactor = Math.pow(1 + estimatedMonthlyReturn, monthsInvested);

    return principal * (growthFactor - 1);
  }

  private calculateLoanLiabilities(transactions: Transaction[], asOfDate: Date): LiabilityValue[] {
    const loanLiabilities: LiabilityValue[] = [];

    // Identify loan payments and estimate outstanding balances
    const loanPayments = transactions.filter(t => 
      t.description.toLowerCase().includes('loan') ||
      t.description.toLowerCase().includes('emi') ||
      t.categoryId?.includes('loan')
    );

    if (loanPayments.length === 0) return loanLiabilities;

    // Group by potential loan sources
    const loanGroups = new Map<string, Transaction[]>();
    loanPayments.forEach(payment => {
      const loanKey = this.extractLoanIdentifier(payment.description);
      const existing = loanGroups.get(loanKey) || [];
      loanGroups.set(loanKey, [...existing, payment]);
    });

    for (const [loanKey, payments] of loanGroups) {
      const outstandingAmount = this.estimateOutstandingLoanAmount(payments, asOfDate);
      
      if (outstandingAmount > 0) {
        loanLiabilities.push({
          type: 'loan',
          subtype: this.determineLoanType(payments[0].description),
          amount: outstandingAmount,
          description: `${loanKey} Loan`,
          interestRate: this.estimateLoanInterestRate(payments[0].description)
        });
      }
    }

    return loanLiabilities;
  }

  private extractLoanIdentifier(description: string): string {
    // Extract loan identifier from transaction description
    const cleanedDescription = description
      .toLowerCase()
      .replace(/\b(emi|loan|payment|installment)\b/gi, '')
      .replace(/\b\d+\b/g, '')
      .trim();

    return cleanedDescription || 'Personal Loan';
  }

  private determineLoanType(description: string): string {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('home') || lowerDesc.includes('mortgage')) return 'home_loan';
    if (lowerDesc.includes('car') || lowerDesc.includes('auto')) return 'auto_loan';
    if (lowerDesc.includes('education') || lowerDesc.includes('student')) return 'education_loan';
    if (lowerDesc.includes('personal')) return 'personal_loan';
    
    return 'other_loan';
  }

  private estimateOutstandingLoanAmount(payments: Transaction[], asOfDate: Date): number {
    // This is a simplified estimation - real implementation would track loan details
    const recentPayments = payments
      .filter(t => new Date(t.date) <= asOfDate)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12); // Last 12 payments

    if (recentPayments.length === 0) return 0;

    const avgPayment = recentPayments.reduce((sum, p) => sum + Math.abs(p.amount), 0) / recentPayments.length;
    
    // Estimate remaining tenure (simplified assumption: 5 years average)
    const estimatedRemainingPayments = 60; // 5 years * 12 months
    
    // Simple outstanding calculation (principal + interest)
    return avgPayment * estimatedRemainingPayments * 0.8; // 80% as principal
  }

  private estimateInterestRate(accountType: string): number {
    // Estimated interest rates for different account types
    switch (accountType) {
      case 'credit': return 18; // 18% for credit cards
      case 'loan': return 12; // 12% average for loans
      default: return 0;
    }
  }

  private estimateLoanInterestRate(description: string): number {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('home') || lowerDesc.includes('mortgage')) return 8.5;
    if (lowerDesc.includes('car') || lowerDesc.includes('auto')) return 10;
    if (lowerDesc.includes('education')) return 9;
    if (lowerDesc.includes('personal')) return 14;
    
    return 12; // Default
  }

  private async calculateNetWorthChange(
    accounts: Account[],
    transactions: Transaction[],
    currentDate: Date
  ): Promise<NetWorthChange> {
    // Calculate net worth change compared to previous month
    const previousMonth = new Date(currentDate);
    previousMonth.setMonth(previousMonth.getMonth() - 1);

    const previousNetWorth = await this.calculateNetWorth(accounts, transactions, {
      asOfDate: previousMonth
    });

    const currentNetWorth = await this.calculateNetWorth(accounts, transactions, {
      asOfDate: currentDate
    });

    const change = currentNetWorth.netWorth - previousNetWorth.netWorth;
    const percentage = previousNetWorth.netWorth !== 0 
      ? (change / Math.abs(previousNetWorth.netWorth)) * 100 
      : 0;

    const assetChange = currentNetWorth.totalAssets - previousNetWorth.totalAssets;
    const liabilityChange = currentNetWorth.totalLiabilities - previousNetWorth.totalLiabilities;

    return {
      amount: change,
      percentage,
      period: 'month',
      breakdown: {
        assetChange,
        liabilityChange: -liabilityChange // Negative because increase in liability is bad
      }
    };
  }

  async getNetWorthTrend(
    accounts: Account[],
    transactions: Transaction[],
    months: number = 12
  ): Promise<NetWorthSnapshot[]> {
    const trends: NetWorthSnapshot[] = [];
    const endDate = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const snapshotDate = new Date(endDate);
      snapshotDate.setMonth(snapshotDate.getMonth() - i);
      snapshotDate.setDate(1); // First day of month

      const snapshot = await this.calculateNetWorth(accounts, transactions, {
        asOfDate: snapshotDate
      });

      trends.push(snapshot);
    }

    return trends;
  }

  async getAssetAllocation(assets: AssetValue[]): Promise<{
    byType: Record<string, { amount: number; percentage: number }>;
    byRisk: Record<string, { amount: number; percentage: number }>;
    byLiquidity: Record<string, { amount: number; percentage: number }>;
  }> {
    const totalAssets = assets.reduce((sum, asset) => sum + asset.amount, 0);

    // Group by type
    const byType: Record<string, { amount: number; percentage: number }> = {};
    assets.forEach(asset => {
      const existing = byType[asset.type] || { amount: 0, percentage: 0 };
      byType[asset.type] = {
        amount: existing.amount + asset.amount,
        percentage: totalAssets > 0 ? ((existing.amount + asset.amount) / totalAssets) * 100 : 0
      };
    });

    // Group by risk level
    const byRisk: Record<string, { amount: number; percentage: number }> = {
      low: { amount: 0, percentage: 0 },
      medium: { amount: 0, percentage: 0 },
      high: { amount: 0, percentage: 0 }
    };

    assets.forEach(asset => {
      const riskLevel = this.getAssetRiskLevel(asset);
      byRisk[riskLevel].amount += asset.amount;
    });

    Object.keys(byRisk).forEach(risk => {
      byRisk[risk].percentage = totalAssets > 0 ? (byRisk[risk].amount / totalAssets) * 100 : 0;
    });

    // Group by liquidity
    const byLiquidity: Record<string, { amount: number; percentage: number }> = {
      high: { amount: 0, percentage: 0 },
      medium: { amount: 0, percentage: 0 },
      low: { amount: 0, percentage: 0 }
    };

    assets.forEach(asset => {
      const liquidityLevel = this.getAssetLiquidity(asset);
      byLiquidity[liquidityLevel].amount += asset.amount;
    });

    Object.keys(byLiquidity).forEach(liquidity => {
      byLiquidity[liquidity].percentage = totalAssets > 0 
        ? (byLiquidity[liquidity].amount / totalAssets) * 100 
        : 0;
    });

    return { byType, byRisk, byLiquidity };
  }

  private getAssetRiskLevel(asset: AssetValue): 'low' | 'medium' | 'high' {
    switch (asset.type) {
      case 'cash':
      case 'savings':
        return 'low';
      case 'investment':
        if (asset.subtype?.includes('debt') || asset.subtype?.includes('fd')) return 'low';
        if (asset.subtype?.includes('hybrid')) return 'medium';
        return 'high'; // Equity investments
      case 'property':
        return 'medium';
      default:
        return 'medium';
    }
  }

  private getAssetLiquidity(asset: AssetValue): 'high' | 'medium' | 'low' {
    switch (asset.type) {
      case 'cash':
        return 'high';
      case 'savings':
        return 'high';
      case 'investment':
        if (asset.subtype?.includes('fd') || asset.subtype?.includes('ppf')) return 'low';
        return 'medium'; // Mutual funds, stocks
      case 'property':
        return 'low';
      default:
        return 'medium';
    }
  }

  async getLiabilityAnalysis(liabilities: LiabilityValue[]): Promise<{
    totalDebt: number;
    weightedAverageRate: number;
    debtByType: Record<string, { amount: number; percentage: number }>;
    monthlyPayments: number;
    debtToIncomeRatio?: number;
  }> {
    const totalDebt = liabilities.reduce((sum, liability) => sum + liability.amount, 0);

    // Calculate weighted average interest rate
    let weightedRate = 0;
    let totalWeightedDebt = 0;
    liabilities.forEach(liability => {
      if (liability.interestRate) {
        weightedRate += liability.amount * liability.interestRate;
        totalWeightedDebt += liability.amount;
      }
    });
    const weightedAverageRate = totalWeightedDebt > 0 ? weightedRate / totalWeightedDebt : 0;

    // Group by debt type
    const debtByType: Record<string, { amount: number; percentage: number }> = {};
    liabilities.forEach(liability => {
      const type = liability.subtype || liability.type;
      const existing = debtByType[type] || { amount: 0, percentage: 0 };
      debtByType[type] = {
        amount: existing.amount + liability.amount,
        percentage: totalDebt > 0 ? ((existing.amount + liability.amount) / totalDebt) * 100 : 0
      };
    });

    // Estimate monthly payments (simplified calculation)
    const monthlyPayments = this.estimateMonthlyPayments(liabilities);

    return {
      totalDebt,
      weightedAverageRate,
      debtByType,
      monthlyPayments
    };
  }

  private estimateMonthlyPayments(liabilities: LiabilityValue[]): number {
    let totalMonthlyPayments = 0;

    liabilities.forEach(liability => {
      const principal = liability.amount;
      const annualRate = (liability.interestRate || 12) / 100;
      const monthlyRate = annualRate / 12;
      
      // Assume different tenures for different debt types
      let tenureMonths = 60; // 5 years default
      
      switch (liability.type) {
        case 'credit_card': tenureMonths = 12; break; // 1 year to pay off
        case 'loan':
          if (liability.subtype?.includes('home')) tenureMonths = 240; // 20 years
          else if (liability.subtype?.includes('auto')) tenureMonths = 60; // 5 years
          else tenureMonths = 36; // 3 years for personal loans
          break;
      }

      if (monthlyRate > 0) {
        // EMI calculation
        const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
                   (Math.pow(1 + monthlyRate, tenureMonths) - 1);
        totalMonthlyPayments += emi;
      } else {
        // No interest case
        totalMonthlyPayments += principal / tenureMonths;
      }
    });

    return totalMonthlyPayments;
  }

  // Helper methods
  private getMonthsDifference(date1: Date, date2: Date): number {
    return (date2.getFullYear() - date1.getFullYear()) * 12 + 
           (date2.getMonth() - date1.getMonth());
  }

  async exportNetWorthData(snapshots: NetWorthSnapshot[]): Promise<string> {
    const headers = [
      'Date', 'Total Assets', 'Total Liabilities', 'Net Worth', 
      'Month Change', 'Month Change %'
    ];

    const rows = snapshots.map((snapshot, index) => [
      snapshot.date.toISOString().split('T')[0],
      snapshot.totalAssets.toFixed(2),
      snapshot.totalLiabilities.toFixed(2),
      snapshot.netWorth.toFixed(2),
      snapshot.change.amount.toFixed(2),
      snapshot.change.percentage.toFixed(2) + '%'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }
}