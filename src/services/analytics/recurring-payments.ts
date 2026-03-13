import { Transaction } from '../../types';
import { RecurringPaymentPattern } from './types';

export class RecurringPaymentsService {
  private readonly MIN_OCCURRENCES = 3; // Minimum occurrences to consider as recurring
  private readonly MAX_AMOUNT_VARIANCE = 0.15; // 15% variance allowed in amount
  private readonly MAX_DATE_VARIANCE_DAYS = 3; // 3 days variance allowed in timing

  async detectRecurringPayments(
    transactions: Transaction[],
    options: {
      minOccurrences?: number;
      maxVariancePercentage?: number;
      lookbackMonths?: number;
    } = {}
  ): Promise<RecurringPaymentPattern[]> {
    const {
      minOccurrences = this.MIN_OCCURRENCES,
      maxVariancePercentage = this.MAX_AMOUNT_VARIANCE,
      lookbackMonths = 12
    } = options;

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - lookbackMonths);

    const relevantTransactions = transactions
      .filter(t => new Date(t.date) >= cutoffDate)
      .filter(t => t.type === 'debit') // Focus on expenses
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const recurringPatterns: RecurringPaymentPattern[] = [];

    // Group transactions by potential recurring patterns
    const merchantGroups = this.groupTransactionsByMerchant(relevantTransactions);
    const descriptionGroups = this.groupTransactionsByDescription(relevantTransactions);

    // Analyze merchant-based patterns
    for (const [merchantId, transactions] of merchantGroups) {
      const patterns = await this.analyzeTransactionGroup(
        transactions,
        minOccurrences,
        maxVariancePercentage,
        'merchant'
      );
      recurringPatterns.push(...patterns);
    }

    // Analyze description-based patterns (for transactions without merchant data)
    for (const [description, transactions] of descriptionGroups) {
      if (transactions.some(t => !t.merchantId)) { // Only if some transactions lack merchant data
        const patterns = await this.analyzeTransactionGroup(
          transactions,
          minOccurrences,
          maxVariancePercentage,
          'description'
        );
        recurringPatterns.push(...patterns);
      }
    }

    // Remove duplicates and conflicts
    const uniquePatterns = this.deduplicatePatterns(recurringPatterns);

    return uniquePatterns.sort((a, b) => b.confidence - a.confidence);
  }

  private groupTransactionsByMerchant(transactions: Transaction[]): Map<string, Transaction[]> {
    const groups = new Map<string, Transaction[]>();
    
    transactions.forEach(transaction => {
      if (transaction.merchantId) {
        const existing = groups.get(transaction.merchantId) || [];
        groups.set(transaction.merchantId, [...existing, transaction]);
      }
    });

    return groups;
  }

  private groupTransactionsByDescription(transactions: Transaction[]): Map<string, Transaction[]> {
    const groups = new Map<string, Transaction[]>();
    
    transactions.forEach(transaction => {
      const normalizedDescription = this.normalizeDescription(transaction.description);
      if (normalizedDescription) {
        const existing = groups.get(normalizedDescription) || [];
        groups.set(normalizedDescription, [...existing, transaction]);
      }
    });

    return groups;
  }

  private normalizeDescription(description: string): string {
    return description
      .toLowerCase()
      .replace(/\b\d+\b/g, '') // Remove numbers
      .replace(/[^\w\s]/g, ' ') // Replace special chars with spaces
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
      .substring(0, 50); // Limit length
  }

  private async analyzeTransactionGroup(
    transactions: Transaction[],
    minOccurrences: number,
    maxVariancePercentage: number,
    groupType: 'merchant' | 'description'
  ): Promise<RecurringPaymentPattern[]> {
    if (transactions.length < minOccurrences) return [];

    const patterns: RecurringPaymentPattern[] = [];
    
    // Detect different frequency patterns
    const frequencies: Array<'weekly' | 'bi_weekly' | 'monthly' | 'bi_monthly' | 'quarterly' | 'yearly'> = [
      'monthly', 'bi_monthly', 'quarterly', 'yearly', 'weekly', 'bi_weekly'
    ];

    for (const frequency of frequencies) {
      const pattern = this.detectFrequencyPattern(
        transactions,
        frequency,
        minOccurrences,
        maxVariancePercentage,
        groupType
      );
      
      if (pattern && pattern.confidence > 0.6) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  private detectFrequencyPattern(
    transactions: Transaction[],
    frequency: 'weekly' | 'bi_weekly' | 'monthly' | 'bi_monthly' | 'quarterly' | 'yearly',
    minOccurrences: number,
    maxVariancePercentage: number,
    groupType: 'merchant' | 'description'
  ): RecurringPaymentPattern | null {
    const expectedIntervalDays = this.getExpectedInterval(frequency);
    const sortedTransactions = transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Find sequences of transactions that match the expected interval
    const sequences = this.findMatchingSequences(sortedTransactions, expectedIntervalDays, maxVariancePercentage);
    
    const longestSequence = sequences.reduce((longest, current) => 
      current.length > longest.length ? current : longest, []);

    if (longestSequence.length < minOccurrences) return null;

    // Calculate pattern statistics
    const amounts = longestSequence.map(t => Math.abs(t.amount));
    const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const amountVariance = this.calculateAmountVariance(amounts, avgAmount);
    
    // Calculate confidence based on consistency
    const intervalConsistency = this.calculateIntervalConsistency(longestSequence, expectedIntervalDays);
    const amountConsistency = 1 - (amountVariance / avgAmount);
    const confidence = (intervalConsistency * 0.6) + (amountConsistency * 0.4);

    if (confidence < 0.6) return null;

    // Predict next payment date
    const lastTransaction = longestSequence[longestSequence.length - 1];
    const nextDueDate = this.calculateNextDueDate(new Date(lastTransaction.date), frequency);

    // Determine if pattern is still active
    const daysSinceLastPayment = (Date.now() - new Date(lastTransaction.date).getTime()) / (1000 * 60 * 60 * 24);
    const isActive = daysSinceLastPayment < expectedIntervalDays * 1.5; // Consider active if within 1.5x expected interval

    const firstTransaction = longestSequence[0];
    const merchantName = groupType === 'merchant' && firstTransaction.merchantId 
      ? this.getMerchantName(firstTransaction.merchantId)
      : this.extractMerchantFromDescription(firstTransaction.description);

    return {
      id: `recurring_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      merchantId: groupType === 'merchant' ? firstTransaction.merchantId : undefined,
      merchantName,
      description: firstTransaction.description,
      amount: avgAmount,
      amountVariance,
      frequency,
      nextDueDate,
      lastPaymentDate: new Date(lastTransaction.date),
      categoryId: firstTransaction.categoryId || 'unknown',
      confidence,
      transactionIds: longestSequence.map(t => t.id),
      isActive,
      missedPayments: this.calculateMissedPayments(longestSequence, frequency),
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  private findMatchingSequences(
    transactions: Transaction[],
    expectedIntervalDays: number,
    maxVariancePercentage: number
  ): Transaction[][] {
    const sequences: Transaction[][] = [];
    
    for (let i = 0; i < transactions.length - 2; i++) {
      const sequence = [transactions[i]];
      let currentTransaction = transactions[i];
      
      // Look for following transactions that match the pattern
      for (let j = i + 1; j < transactions.length; j++) {
        const candidate = transactions[j];
        const daysDiff = (new Date(candidate.date).getTime() - new Date(currentTransaction.date).getTime()) / (1000 * 60 * 60 * 24);
        
        const intervalMatch = Math.abs(daysDiff - expectedIntervalDays) <= this.MAX_DATE_VARIANCE_DAYS;
        const amountMatch = this.isAmountMatch(
          Math.abs(currentTransaction.amount),
          Math.abs(candidate.amount),
          maxVariancePercentage
        );
        
        if (intervalMatch && amountMatch) {
          sequence.push(candidate);
          currentTransaction = candidate;
          i = j - 1; // Skip processed transactions
          break;
        }
      }
      
      if (sequence.length >= 2) {
        sequences.push(sequence);
      }
    }

    return sequences;
  }

  private isAmountMatch(amount1: number, amount2: number, maxVariancePercentage: number): boolean {
    const diff = Math.abs(amount1 - amount2);
    const avgAmount = (amount1 + amount2) / 2;
    const variance = avgAmount > 0 ? diff / avgAmount : 0;
    return variance <= maxVariancePercentage;
  }

  private calculateAmountVariance(amounts: number[], avgAmount: number): number {
    if (amounts.length === 0 || avgAmount === 0) return 0;
    
    const squaredDiffs = amounts.map(amount => Math.pow(amount - avgAmount, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / amounts.length;
    return Math.sqrt(variance);
  }

  private calculateIntervalConsistency(transactions: Transaction[], expectedIntervalDays: number): number {
    if (transactions.length < 2) return 0;

    const intervals: number[] = [];
    for (let i = 1; i < transactions.length; i++) {
      const prevDate = new Date(transactions[i - 1].date);
      const currentDate = new Date(transactions[i].date);
      const daysDiff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      intervals.push(daysDiff);
    }

    // Calculate how consistent the intervals are with the expected interval
    const deviations = intervals.map(interval => Math.abs(interval - expectedIntervalDays));
    const avgDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
    const maxAllowedDeviation = expectedIntervalDays * 0.1; // 10% of expected interval
    
    return Math.max(0, 1 - (avgDeviation / maxAllowedDeviation));
  }

  private calculateNextDueDate(lastPaymentDate: Date, frequency: string): Date {
    const nextDate = new Date(lastPaymentDate);
    
    switch (frequency) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'bi_weekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'bi_monthly':
        nextDate.setMonth(nextDate.getMonth() + 2);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }
    
    return nextDate;
  }

  private calculateMissedPayments(transactions: Transaction[], frequency: string): number {
    if (transactions.length < 2) return 0;

    const sortedTransactions = transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const expectedIntervalDays = this.getExpectedInterval(frequency);
    let missedCount = 0;

    for (let i = 1; i < sortedTransactions.length; i++) {
      const prevDate = new Date(sortedTransactions[i - 1].date);
      const currentDate = new Date(sortedTransactions[i].date);
      const actualIntervalDays = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // If the actual interval is significantly longer than expected, there might be missed payments
      const expectedPayments = Math.round(actualIntervalDays / expectedIntervalDays);
      if (expectedPayments > 1) {
        missedCount += expectedPayments - 1;
      }
    }

    return missedCount;
  }

  private getExpectedInterval(frequency: string): number {
    switch (frequency) {
      case 'weekly': return 7;
      case 'bi_weekly': return 14;
      case 'monthly': return 30;
      case 'bi_monthly': return 60;
      case 'quarterly': return 90;
      case 'yearly': return 365;
      default: return 30;
    }
  }

  private deduplicatePatterns(patterns: RecurringPaymentPattern[]): RecurringPaymentPattern[] {
    const uniquePatterns: RecurringPaymentPattern[] = [];
    const usedTransactionIds = new Set<string>();

    // Sort by confidence to prioritize better patterns
    const sortedPatterns = patterns.sort((a, b) => b.confidence - a.confidence);

    for (const pattern of sortedPatterns) {
      const hasOverlap = pattern.transactionIds.some(id => usedTransactionIds.has(id));
      
      if (!hasOverlap) {
        uniquePatterns.push(pattern);
        pattern.transactionIds.forEach(id => usedTransactionIds.add(id));
      }
    }

    return uniquePatterns;
  }

  private getMerchantName(merchantId: string): string {
    // This would typically fetch from the merchant service
    return merchantId;
  }

  private extractMerchantFromDescription(description: string): string {
    // Simple extraction logic - would be more sophisticated in practice
    return description
      .replace(/\b(UPI|IMPS|NEFT|RTGS|ACH|DEBIT|CREDIT|CARD|TXN|PAYMENT)\b/gi, '')
      .replace(/\b\d+\b/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 30);
  }

  async updateRecurringPattern(
    patternId: string,
    transaction: Transaction
  ): Promise<void> {
    // This would typically update the pattern in a database
    console.log(`Updating recurring pattern ${patternId} with new transaction ${transaction.id}`);
  }

  async getUpcomingPayments(
    patterns: RecurringPaymentPattern[],
    daysAhead: number = 30
  ): Promise<Array<{
    pattern: RecurringPaymentPattern;
    dueDate: Date;
    daysUntilDue: number;
    estimatedAmount: number;
  }>> {
    const upcoming: Array<{
      pattern: RecurringPaymentPattern;
      dueDate: Date;
      daysUntilDue: number;
      estimatedAmount: number;
    }> = [];

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    patterns
      .filter(p => p.isActive)
      .forEach(pattern => {
        let nextDue = new Date(pattern.nextDueDate);
        
        // Find all occurrences within the time window
        while (nextDue <= futureDate) {
          if (nextDue >= now) {
            const daysUntilDue = Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            upcoming.push({
              pattern,
              dueDate: new Date(nextDue),
              daysUntilDue,
              estimatedAmount: pattern.amount
            });
          }
          
          // Calculate next occurrence
          nextDue = this.calculateNextDueDate(nextDue, pattern.frequency);
        }
      });

    return upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }

  async getOverduePayments(
    patterns: RecurringPaymentPattern[],
    gracePeriodDays: number = 5
  ): Promise<Array<{
    pattern: RecurringPaymentPattern;
    daysPastDue: number;
    estimatedAmount: number;
  }>> {
    const overdue: Array<{
      pattern: RecurringPaymentPattern;
      daysPastDue: number;
      estimatedAmount: number;
    }> = [];

    const now = new Date();
    const gracePeriod = gracePeriodDays * 24 * 60 * 60 * 1000; // Convert to milliseconds

    patterns
      .filter(p => p.isActive)
      .forEach(pattern => {
        const dueDate = new Date(pattern.nextDueDate);
        const timeDiff = now.getTime() - dueDate.getTime();
        
        if (timeDiff > gracePeriod) {
          const daysPastDue = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          
          overdue.push({
            pattern,
            daysPastDue,
            estimatedAmount: pattern.amount
          });
        }
      });

    return overdue.sort((a, b) => b.daysPastDue - a.daysPastDue);
  }

  async getPatternStatistics(patterns: RecurringPaymentPattern[]): Promise<{
    totalPatterns: number;
    activePatterns: number;
    byFrequency: Record<string, number>;
    byCategory: Record<string, number>;
    totalMonthlyAmount: number;
    averageConfidence: number;
    mostReliablePatterns: RecurringPaymentPattern[];
  }> {
    const activePatterns = patterns.filter(p => p.isActive);
    
    const byFrequency: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let totalMonthlyAmount = 0;

    patterns.forEach(pattern => {
      // Count by frequency
      byFrequency[pattern.frequency] = (byFrequency[pattern.frequency] || 0) + 1;
      
      // Count by category
      byCategory[pattern.categoryId] = (byCategory[pattern.categoryId] || 0) + 1;
      
      // Calculate monthly equivalent amount
      const monthlyEquivalent = this.convertToMonthlyAmount(pattern.amount, pattern.frequency);
      totalMonthlyAmount += monthlyEquivalent;
    });

    const averageConfidence = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
      : 0;

    const mostReliablePatterns = patterns
      .filter(p => p.confidence > 0.8)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    return {
      totalPatterns: patterns.length,
      activePatterns: activePatterns.length,
      byFrequency,
      byCategory,
      totalMonthlyAmount,
      averageConfidence,
      mostReliablePatterns
    };
  }

  private convertToMonthlyAmount(amount: number, frequency: string): number {
    switch (frequency) {
      case 'weekly': return amount * 4.33; // Average weeks per month
      case 'bi_weekly': return amount * 2.17;
      case 'monthly': return amount;
      case 'bi_monthly': return amount * 0.5;
      case 'quarterly': return amount * 0.33;
      case 'yearly': return amount * 0.083;
      default: return amount;
    }
  }

  async exportRecurringPatterns(patterns: RecurringPaymentPattern[]): Promise<string> {
    // Convert to CSV format
    const headers = [
      'Merchant Name', 'Amount', 'Frequency', 'Next Due Date', 
      'Confidence', 'Category', 'Is Active', 'Missed Payments'
    ];

    const rows = patterns.map(pattern => [
      pattern.merchantName,
      pattern.amount.toFixed(2),
      pattern.frequency,
      pattern.nextDueDate.toISOString().split('T')[0],
      (pattern.confidence * 100).toFixed(1) + '%',
      pattern.categoryId,
      pattern.isActive ? 'Yes' : 'No',
      pattern.missedPayments.toString()
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }
}