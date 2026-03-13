import { Transaction } from '../../types';
import { TransactionAnomaly, AnomalyType } from './types';

export class AnomalyDetectionService {
  private readonly AMOUNT_THRESHOLD_MULTIPLIER = 3; // 3x standard deviation
  private readonly FREQUENCY_THRESHOLD = 0.3; // 30% variance from normal
  private readonly MIN_HISTORICAL_DATA = 10; // Minimum transactions for comparison
  private readonly TIME_WINDOW_DAYS = 90; // Days to look back for pattern analysis

  async detectAnomalies(
    transactions: Transaction[],
    options: {
      sensitivity?: 'low' | 'medium' | 'high';
      minimumAmount?: number;
      excludeCategories?: string[];
    } = {}
  ): Promise<TransactionAnomaly[]> {
    const {
      sensitivity = 'medium',
      minimumAmount = 100,
      excludeCategories = []
    } = options;

    const anomalies: TransactionAnomaly[] = [];
    const sortedTransactions = transactions
      .filter(t => Math.abs(t.amount) >= minimumAmount)
      .filter(t => !excludeCategories.includes(t.categoryId || ''))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (let i = this.MIN_HISTORICAL_DATA; i < sortedTransactions.length; i++) {
      const currentTransaction = sortedTransactions[i];
      const historicalTransactions = sortedTransactions.slice(0, i);
      
      // Skip if not enough historical data
      if (historicalTransactions.length < this.MIN_HISTORICAL_DATA) continue;

      const detectedAnomalies = await this.analyzeTransaction(
        currentTransaction,
        historicalTransactions,
        sensitivity
      );

      anomalies.push(...detectedAnomalies);
    }

    return anomalies.sort((a, b) => b.score - a.score);
  }

  private async analyzeTransaction(
    transaction: Transaction,
    historicalTransactions: Transaction[],
    sensitivity: 'low' | 'medium' | 'high'
  ): Promise<TransactionAnomaly[]> {
    const anomalies: TransactionAnomaly[] = [];

    // 1. Amount anomaly detection
    const amountAnomaly = this.detectAmountAnomaly(transaction, historicalTransactions, sensitivity);
    if (amountAnomaly) anomalies.push(amountAnomaly);

    // 2. Frequency anomaly detection
    const frequencyAnomaly = this.detectFrequencyAnomaly(transaction, historicalTransactions, sensitivity);
    if (frequencyAnomaly) anomalies.push(frequencyAnomaly);

    // 3. Merchant anomaly detection
    const merchantAnomaly = this.detectMerchantAnomaly(transaction, historicalTransactions, sensitivity);
    if (merchantAnomaly) anomalies.push(merchantAnomaly);

    // 4. Category anomaly detection
    const categoryAnomaly = this.detectCategoryAnomaly(transaction, historicalTransactions, sensitivity);
    if (categoryAnomaly) anomalies.push(categoryAnomaly);

    // 5. Timing anomaly detection
    const timingAnomaly = this.detectTimingAnomaly(transaction, historicalTransactions, sensitivity);
    if (timingAnomaly) anomalies.push(timingAnomaly);

    return anomalies;
  }

  private detectAmountAnomaly(
    transaction: Transaction,
    historicalTransactions: Transaction[],
    sensitivity: 'low' | 'medium' | 'high'
  ): TransactionAnomaly | null {
    const amount = Math.abs(transaction.amount);
    const categoryTransactions = historicalTransactions.filter(t => 
      t.categoryId === transaction.categoryId && t.type === transaction.type
    );

    if (categoryTransactions.length < 5) return null;

    const amounts = categoryTransactions.map(t => Math.abs(t.amount));
    const stats = this.calculateStatistics(amounts);
    
    const thresholdMultiplier = this.getSensitivityMultiplier(sensitivity);
    const upperThreshold = stats.mean + (stats.stdDev * thresholdMultiplier);
    const lowerThreshold = Math.max(0, stats.mean - (stats.stdDev * thresholdMultiplier));

    if (amount > upperThreshold || (amount < lowerThreshold && amount > 0)) {
      const isHighAmount = amount > upperThreshold;
      const expectedAmount = stats.mean;
      const deviation = Math.abs(amount - expectedAmount) / expectedAmount;
      
      let severity: 'low' | 'medium' | 'high' | 'critical';
      if (deviation > 5) severity = 'critical';
      else if (deviation > 3) severity = 'high';
      else if (deviation > 2) severity = 'medium';
      else severity = 'low';

      const confidence = Math.min(deviation / 3, 1);

      return {
        id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        transactionId: transaction.id,
        transaction,
        anomalyType: {
          type: 'unusual_amount',
          severity,
          confidence
        },
        description: `${isHighAmount ? 'Unusually high' : 'Unusually low'} amount of ₹${amount.toFixed(2)} for category ${transaction.categoryId}. Expected around ₹${expectedAmount.toFixed(2)}`,
        expectedValue: expectedAmount,
        actualValue: amount,
        score: confidence * 100,
        detected_at: new Date(),
        reviewed: false
      };
    }

    return null;
  }

  private detectFrequencyAnomaly(
    transaction: Transaction,
    historicalTransactions: Transaction[],
    sensitivity: 'low' | 'medium' | 'high'
  ): TransactionAnomaly | null {
    if (!transaction.merchantId) return null;

    const merchantTransactions = historicalTransactions
      .filter(t => t.merchantId === transaction.merchantId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (merchantTransactions.length < 3) return null;

    // Calculate typical intervals between transactions
    const intervals: number[] = [];
    for (let i = 1; i < merchantTransactions.length; i++) {
      const prevDate = new Date(merchantTransactions[i - 1].date);
      const currentDate = new Date(merchantTransactions[i].date);
      const daysDiff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      intervals.push(daysDiff);
    }

    const intervalStats = this.calculateStatistics(intervals);
    const lastTransaction = merchantTransactions[merchantTransactions.length - 1];
    const daysSinceLastTransaction = (new Date(transaction.date).getTime() - new Date(lastTransaction.date).getTime()) / (1000 * 60 * 60 * 24);

    const thresholdMultiplier = this.getSensitivityMultiplier(sensitivity);
    const expectedMaxInterval = intervalStats.mean + (intervalStats.stdDev * thresholdMultiplier);
    const expectedMinInterval = Math.max(0, intervalStats.mean - (intervalStats.stdDev * thresholdMultiplier));

    if (daysSinceLastTransaction > expectedMaxInterval || daysSinceLastTransaction < expectedMinInterval) {
      const isFrequent = daysSinceLastTransaction < expectedMinInterval;
      const deviation = Math.abs(daysSinceLastTransaction - intervalStats.mean) / intervalStats.mean;
      
      let severity: 'low' | 'medium' | 'high' | 'critical';
      if (deviation > 2) severity = 'high';
      else if (deviation > 1) severity = 'medium';
      else severity = 'low';

      const confidence = Math.min(deviation / 2, 1);

      return {
        id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        transactionId: transaction.id,
        transaction,
        anomalyType: {
          type: 'unusual_frequency',
          severity,
          confidence
        },
        description: `${isFrequent ? 'Unusually frequent' : 'Unusually infrequent'} transaction at this merchant. Last transaction was ${daysSinceLastTransaction.toFixed(1)} days ago, expected around ${intervalStats.mean.toFixed(1)} days`,
        expectedValue: intervalStats.mean,
        actualValue: daysSinceLastTransaction,
        score: confidence * 80,
        detected_at: new Date(),
        reviewed: false
      };
    }

    return null;
  }

  private detectMerchantAnomaly(
    transaction: Transaction,
    historicalTransactions: Transaction[],
    sensitivity: 'low' | 'medium' | 'high'
  ): TransactionAnomaly | null {
    // Check if this is a new merchant for the user
    const merchantTransactions = historicalTransactions.filter(t => t.merchantId === transaction.merchantId);
    
    if (merchantTransactions.length > 0) return null; // Not a new merchant

    // Check if the transaction amount is significant for a new merchant
    const amount = Math.abs(transaction.amount);
    const categoryTransactions = historicalTransactions.filter(t => 
      t.categoryId === transaction.categoryId && t.type === transaction.type
    );

    if (categoryTransactions.length === 0) return null;

    const categoryAmounts = categoryTransactions.map(t => Math.abs(t.amount));
    const categoryStats = this.calculateStatistics(categoryAmounts);
    
    const thresholdMultiplier = this.getSensitivityMultiplier(sensitivity);
    const significantThreshold = categoryStats.mean + (categoryStats.stdDev * thresholdMultiplier);

    if (amount > significantThreshold) {
      const confidence = Math.min((amount - significantThreshold) / significantThreshold, 1);

      return {
        id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        transactionId: transaction.id,
        transaction,
        anomalyType: {
          type: 'unusual_merchant',
          severity: amount > categoryStats.mean * 3 ? 'high' : 'medium',
          confidence
        },
        description: `First transaction with new merchant with unusually high amount of ₹${amount.toFixed(2)} for category ${transaction.categoryId}`,
        expectedValue: categoryStats.mean,
        actualValue: amount,
        score: confidence * 70,
        detected_at: new Date(),
        reviewed: false
      };
    }

    return null;
  }

  private detectCategoryAnomaly(
    transaction: Transaction,
    historicalTransactions: Transaction[],
    sensitivity: 'low' | 'medium' | 'high'
  ): TransactionAnomaly | null {
    if (!transaction.categoryId) return null;

    // Check if this category is unusual for the user
    const categoryTransactions = historicalTransactions.filter(t => t.categoryId === transaction.categoryId);
    const totalTransactions = historicalTransactions.length;
    
    if (totalTransactions < 20) return null; // Not enough data

    const categoryFrequency = categoryTransactions.length / totalTransactions;
    const isRareCategory = categoryFrequency < 0.05; // Less than 5% of transactions

    if (isRareCategory) {
      const amount = Math.abs(transaction.amount);
      const userAmounts = historicalTransactions.map(t => Math.abs(t.amount));
      const userStats = this.calculateStatistics(userAmounts);
      
      const thresholdMultiplier = this.getSensitivityMultiplier(sensitivity);
      const significantThreshold = userStats.mean + (userStats.stdDev * thresholdMultiplier);

      if (amount > significantThreshold) {
        const confidence = Math.min((amount - significantThreshold) / significantThreshold, 1);

        return {
          id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          transactionId: transaction.id,
          transaction,
          anomalyType: {
            type: 'unusual_category',
            severity: 'medium',
            confidence
          },
          description: `Unusual spending of ₹${amount.toFixed(2)} in rarely used category ${transaction.categoryId}`,
          expectedValue: userStats.mean,
          actualValue: amount,
          score: confidence * 60,
          detected_at: new Date(),
          reviewed: false
        };
      }
    }

    return null;
  }

  private detectTimingAnomaly(
    transaction: Transaction,
    historicalTransactions: Transaction[],
    sensitivity: 'low' | 'medium' | 'high'
  ): TransactionAnomaly | null {
    const transactionDate = new Date(transaction.date);
    const hour = transactionDate.getHours();
    const dayOfWeek = transactionDate.getDay();

    // Group historical transactions by time patterns
    const hourlyTransactions: number[] = new Array(24).fill(0);
    const weeklyTransactions: number[] = new Array(7).fill(0);

    historicalTransactions.forEach(t => {
      const date = new Date(t.date);
      hourlyTransactions[date.getHours()]++;
      weeklyTransactions[date.getDay()]++;
    });

    const totalTransactions = historicalTransactions.length;
    if (totalTransactions < 30) return null; // Not enough data

    // Check hour-based anomaly
    const hourFrequency = hourlyTransactions[hour] / totalTransactions;
    const avgHourFrequency = 1 / 24; // Expected frequency if uniform
    
    // Check day-based anomaly
    const dayFrequency = weeklyTransactions[dayOfWeek] / totalTransactions;
    const avgDayFrequency = 1 / 7; // Expected frequency if uniform

    const isUnusualHour = hourFrequency < avgHourFrequency * 0.3; // Less than 30% of expected
    const isUnusualDay = dayFrequency < avgDayFrequency * 0.3;

    if ((isUnusualHour || isUnusualDay) && Math.abs(transaction.amount) > 500) {
      const hourDeviation = Math.abs(hourFrequency - avgHourFrequency) / avgHourFrequency;
      const dayDeviation = Math.abs(dayFrequency - avgDayFrequency) / avgDayFrequency;
      const maxDeviation = Math.max(hourDeviation, dayDeviation);
      
      const confidence = Math.min(maxDeviation, 1);

      return {
        id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        transactionId: transaction.id,
        transaction,
        anomalyType: {
          type: 'unusual_timing',
          severity: maxDeviation > 2 ? 'high' : 'medium',
          confidence
        },
        description: `Transaction at unusual time: ${this.getDayName(dayOfWeek)} at ${hour}:00. This pattern is rare in your transaction history.`,
        expectedValue: isUnusualHour ? avgHourFrequency : avgDayFrequency,
        actualValue: isUnusualHour ? hourFrequency : dayFrequency,
        score: confidence * 40,
        detected_at: new Date(),
        reviewed: false
      };
    }

    return null;
  }

  private calculateStatistics(values: number[]): { mean: number; stdDev: number; median: number } {
    if (values.length === 0) {
      return { mean: 0, stdDev: 0, median: 0 };
    }

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    const sortedValues = [...values].sort((a, b) => a - b);
    const median = sortedValues.length % 2 === 0
      ? (sortedValues[sortedValues.length / 2 - 1] + sortedValues[sortedValues.length / 2]) / 2
      : sortedValues[Math.floor(sortedValues.length / 2)];

    return { mean, stdDev, median };
  }

  private getSensitivityMultiplier(sensitivity: 'low' | 'medium' | 'high'): number {
    switch (sensitivity) {
      case 'low': return 3;
      case 'medium': return 2;
      case 'high': return 1.5;
      default: return 2;
    }
  }

  private getDayName(dayIndex: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex];
  }

  async markAnomalyReviewed(
    anomalyId: string,
    isFalsePositive: boolean,
    notes?: string
  ): Promise<void> {
    // This would typically update the anomaly in a database
    // For now, we'll just log it
    console.log(`Anomaly ${anomalyId} marked as ${isFalsePositive ? 'false positive' : 'confirmed'}`);
  }

  async getAnomalyStats(anomalies: TransactionAnomaly[]): Promise<{
    totalAnomalies: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    reviewRate: number;
    falsePositiveRate: number;
  }> {
    const stats = {
      totalAnomalies: anomalies.length,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byType: {},
      reviewRate: 0,
      falsePositiveRate: 0
    };

    let reviewedCount = 0;
    let falsePositiveCount = 0;

    anomalies.forEach(anomaly => {
      // Count by severity
      stats.bySeverity[anomaly.anomalyType.severity]++;

      // Count by type
      const type = anomaly.anomalyType.type;
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Count reviewed
      if (anomaly.reviewed) {
        reviewedCount++;
        if (anomaly.falsePositive) {
          falsePositiveCount++;
        }
      }
    });

    stats.reviewRate = anomalies.length > 0 ? reviewedCount / anomalies.length : 0;
    stats.falsePositiveRate = reviewedCount > 0 ? falsePositiveCount / reviewedCount : 0;

    return stats;
  }

  async filterAnomalies(
    anomalies: TransactionAnomaly[],
    filters: {
      severity?: ('low' | 'medium' | 'high' | 'critical')[];
      type?: string[];
      dateRange?: { startDate: Date; endDate: Date };
      reviewed?: boolean;
      minScore?: number;
    }
  ): Promise<TransactionAnomaly[]> {
    let filtered = anomalies;

    if (filters.severity?.length) {
      filtered = filtered.filter(a => filters.severity!.includes(a.anomalyType.severity));
    }

    if (filters.type?.length) {
      filtered = filtered.filter(a => filters.type!.includes(a.anomalyType.type));
    }

    if (filters.dateRange) {
      filtered = filtered.filter(a => {
        const date = new Date(a.transaction.date);
        return date >= filters.dateRange!.startDate && date <= filters.dateRange!.endDate;
      });
    }

    if (filters.reviewed !== undefined) {
      filtered = filtered.filter(a => a.reviewed === filters.reviewed);
    }

    if (filters.minScore) {
      filtered = filtered.filter(a => a.score >= filters.minScore!);
    }

    return filtered;
  }

  async generateAnomalyReport(
    anomalies: TransactionAnomaly[]
  ): Promise<{
    summary: any;
    topAnomalies: TransactionAnomaly[];
    recommendations: string[];
  }> {
    const stats = await this.getAnomalyStats(anomalies);
    const topAnomalies = anomalies
      .filter(a => !a.reviewed || !a.falsePositive)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const recommendations: string[] = [];

    // Generate recommendations based on anomaly patterns
    if (stats.bySeverity.high > 5) {
      recommendations.push('Consider reviewing your recent high-severity anomalies to identify potential fraudulent activities');
    }

    if (stats.byType['unusual_amount'] > stats.totalAnomalies * 0.5) {
      recommendations.push('Many unusual amounts detected. Consider setting up budget alerts for better spending control');
    }

    if (stats.byType['unusual_merchant'] > 3) {
      recommendations.push('New merchants detected. Review these transactions to ensure they are legitimate');
    }

    if (stats.falsePositiveRate > 0.3) {
      recommendations.push('High false positive rate detected. Consider adjusting anomaly detection sensitivity');
    }

    return {
      summary: stats,
      topAnomalies,
      recommendations
    };
  }
}