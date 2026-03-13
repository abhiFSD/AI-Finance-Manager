import moment from 'moment';
import { Transaction, TransactionType } from '@/types';
import { extractionLogger } from '@/utils/logger';

export interface DuplicateDetectionResult {
  uniqueTransactions: Transaction[];
  duplicatesFound: number;
  duplicateGroups: Array<{
    transactions: Transaction[];
    reason: string;
    confidence: number;
  }>;
}

export class DuplicateDetector {
  private readonly similarityThreshold = 0.85;
  private readonly dateToleranceDays = 1;
  private readonly amountTolerancePercent = 0.01; // 1%

  public async detectDuplicates(
    transactions: Transaction[],
    documentId?: string
  ): Promise<DuplicateDetectionResult> {
    try {
      extractionLogger.info('Starting duplicate detection', {
        transactionCount: transactions.length,
        documentId
      });

      const duplicateGroups: Array<{
        transactions: Transaction[];
        reason: string;
        confidence: number;
      }> = [];

      const processed = new Set<number>();
      const uniqueTransactions: Transaction[] = [];

      // Sort transactions by date for efficient comparison
      const sortedTransactions = [...transactions].sort((a, b) => 
        a.date.getTime() - b.date.getTime()
      );

      for (let i = 0; i < sortedTransactions.length; i++) {
        if (processed.has(i)) continue;

        const currentTransaction = sortedTransactions[i];
        const duplicates: number[] = [];

        // Look for duplicates in nearby transactions (within date tolerance)
        for (let j = i + 1; j < sortedTransactions.length; j++) {
          if (processed.has(j)) continue;

          const candidateTransaction = sortedTransactions[j];
          
          // Stop checking if dates are too far apart
          const daysDiff = Math.abs(
            moment(candidateTransaction.date).diff(moment(currentTransaction.date), 'days')
          );
          
          if (daysDiff > this.dateToleranceDays) {
            break;
          }

          const similarity = this.calculateSimilarity(currentTransaction, candidateTransaction);
          
          if (similarity.isDuplicate) {
            duplicates.push(j);
            processed.add(j);
            
            extractionLogger.debug('Duplicate detected', {
              transaction1: currentTransaction.description,
              transaction2: candidateTransaction.description,
              confidence: similarity.confidence,
              reason: similarity.reason
            });
          }
        }

        if (duplicates.length > 0) {
          // Group duplicates
          const group = [currentTransaction, ...duplicates.map(idx => sortedTransactions[idx])];
          
          duplicateGroups.push({
            transactions: group,
            reason: `Similar transactions within ${this.dateToleranceDays} day(s)`,
            confidence: this.calculateGroupConfidence(group)
          });

          // Keep the transaction with highest confidence
          const bestTransaction = group.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
          );
          
          uniqueTransactions.push(bestTransaction);
        } else {
          uniqueTransactions.push(currentTransaction);
        }

        processed.add(i);
      }

      const result: DuplicateDetectionResult = {
        uniqueTransactions,
        duplicatesFound: transactions.length - uniqueTransactions.length,
        duplicateGroups
      };

      extractionLogger.info('Duplicate detection completed', {
        originalCount: transactions.length,
        uniqueCount: uniqueTransactions.length,
        duplicatesFound: result.duplicatesFound,
        groupsFound: duplicateGroups.length,
        documentId
      });

      return result;

    } catch (error) {
      extractionLogger.error('Duplicate detection failed', {
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Return all transactions if detection fails
      return {
        uniqueTransactions: transactions,
        duplicatesFound: 0,
        duplicateGroups: []
      };
    }
  }

  private calculateSimilarity(
    transaction1: Transaction,
    transaction2: Transaction
  ): {
    isDuplicate: boolean;
    confidence: number;
    reason: string;
  } {
    let confidenceScore = 0;
    const reasons: string[] = [];

    // 1. Check exact match (highest confidence)
    if (this.isExactMatch(transaction1, transaction2)) {
      return {
        isDuplicate: true,
        confidence: 100,
        reason: 'Exact match'
      };
    }

    // 2. Check date similarity
    const dateSimilarity = this.calculateDateSimilarity(transaction1.date, transaction2.date);
    if (dateSimilarity.score > 0) {
      confidenceScore += dateSimilarity.score * 0.3; // 30% weight
      reasons.push(dateSimilarity.reason);
    }

    // 3. Check amount similarity
    const amountSimilarity = this.calculateAmountSimilarity(transaction1.amount, transaction2.amount);
    if (amountSimilarity.score > 0) {
      confidenceScore += amountSimilarity.score * 0.4; // 40% weight
      reasons.push(amountSimilarity.reason);
    }

    // 4. Check description similarity
    const descriptionSimilarity = this.calculateDescriptionSimilarity(
      transaction1.description, 
      transaction2.description
    );
    if (descriptionSimilarity.score > 0) {
      confidenceScore += descriptionSimilarity.score * 0.3; // 30% weight
      reasons.push(descriptionSimilarity.reason);
    }

    // 5. Check transaction type
    if (transaction1.type === transaction2.type) {
      confidenceScore += 5; // Small bonus for same type
    }

    const isDuplicate = confidenceScore >= (this.similarityThreshold * 100);

    return {
      isDuplicate,
      confidence: Math.round(confidenceScore),
      reason: reasons.join(', ')
    };
  }

  private isExactMatch(transaction1: Transaction, transaction2: Transaction): boolean {
    return (
      Math.abs(transaction1.date.getTime() - transaction2.date.getTime()) === 0 &&
      Math.abs(transaction1.amount - transaction2.amount) < 0.01 &&
      transaction1.description.trim().toLowerCase() === transaction2.description.trim().toLowerCase() &&
      transaction1.type === transaction2.type
    );
  }

  private calculateDateSimilarity(date1: Date, date2: Date): {
    score: number;
    reason: string;
  } {
    const daysDiff = Math.abs(moment(date1).diff(moment(date2), 'days'));
    
    if (daysDiff === 0) {
      return { score: 100, reason: 'Same date' };
    } else if (daysDiff <= 1) {
      return { score: 80, reason: 'Within 1 day' };
    } else if (daysDiff <= this.dateToleranceDays) {
      return { score: 60, reason: `Within ${daysDiff} day(s)` };
    }
    
    return { score: 0, reason: 'Dates too far apart' };
  }

  private calculateAmountSimilarity(amount1: number, amount2: number): {
    score: number;
    reason: string;
  } {
    if (amount1 === amount2) {
      return { score: 100, reason: 'Exact amount match' };
    }

    const difference = Math.abs(amount1 - amount2);
    const averageAmount = (amount1 + amount2) / 2;
    const percentageDiff = averageAmount > 0 ? (difference / averageAmount) * 100 : 100;

    if (percentageDiff <= this.amountTolerancePercent * 100) {
      return { score: 95, reason: 'Nearly identical amount' };
    } else if (percentageDiff <= 1) {
      return { score: 80, reason: 'Very similar amount' };
    } else if (percentageDiff <= 5) {
      return { score: 60, reason: 'Similar amount' };
    }

    return { score: 0, reason: 'Amounts too different' };
  }

  private calculateDescriptionSimilarity(desc1: string, desc2: string): {
    score: number;
    reason: string;
  } {
    const normalized1 = this.normalizeDescription(desc1);
    const normalized2 = this.normalizeDescription(desc2);

    if (normalized1 === normalized2) {
      return { score: 100, reason: 'Identical descriptions' };
    }

    // Calculate Levenshtein distance
    const levenshteinSimilarity = this.calculateLevenshteinSimilarity(normalized1, normalized2);
    
    if (levenshteinSimilarity >= 0.9) {
      return { score: 90, reason: 'Very similar descriptions' };
    } else if (levenshteinSimilarity >= 0.8) {
      return { score: 75, reason: 'Similar descriptions' };
    } else if (levenshteinSimilarity >= 0.6) {
      return { score: 50, reason: 'Somewhat similar descriptions' };
    }

    // Check for common keywords
    const keywordSimilarity = this.calculateKeywordSimilarity(normalized1, normalized2);
    if (keywordSimilarity >= 0.7) {
      return { score: 60, reason: 'Similar keywords' };
    }

    return { score: 0, reason: 'Descriptions too different' };
  }

  private normalizeDescription(description: string): string {
    return description
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    return maxLength > 0 ? 1 - (distance / maxLength) : 1;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private calculateKeywordSimilarity(desc1: string, desc2: string): number {
    const words1 = new Set(desc1.split(' ').filter(word => word.length > 2));
    const words2 = new Set(desc2.split(' ').filter(word => word.length > 2));

    if (words1.size === 0 && words2.size === 0) return 1;
    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  private calculateGroupConfidence(transactions: Transaction[]): number {
    if (transactions.length < 2) return 0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < transactions.length; i++) {
      for (let j = i + 1; j < transactions.length; j++) {
        const similarity = this.calculateSimilarity(transactions[i], transactions[j]);
        totalSimilarity += similarity.confidence;
        comparisons++;
      }
    }

    return comparisons > 0 ? Math.round(totalSimilarity / comparisons) : 0;
  }

  // Additional methods for handling specific duplicate scenarios

  public detectPotentialSplitTransactions(transactions: Transaction[]): Array<{
    originalTransaction: Transaction;
    splitTransactions: Transaction[];
    confidence: number;
  }> {
    // This would detect cases where one transaction might have been split into multiple parts
    // Implementation would look for transactions with similar descriptions but amounts that sum up
    return [];
  }

  public detectReversalTransactions(transactions: Transaction[]): Array<{
    originalTransaction: Transaction;
    reversalTransaction: Transaction;
    confidence: number;
  }> {
    // This would detect transaction reversals (same amount, opposite type, similar date/description)
    const reversals: Array<{
      originalTransaction: Transaction;
      reversalTransaction: Transaction;
      confidence: number;
    }> = [];

    for (let i = 0; i < transactions.length; i++) {
      for (let j = i + 1; j < transactions.length; j++) {
        const trans1 = transactions[i];
        const trans2 = transactions[j];

        // Check if transactions are potential reversals
        if (
          trans1.type !== trans2.type && // Opposite types
          Math.abs(trans1.amount - trans2.amount) < 0.01 && // Same amount
          Math.abs(trans1.date.getTime() - trans2.date.getTime()) <= (7 * 24 * 60 * 60 * 1000) // Within 7 days
        ) {
          const descSimilarity = this.calculateDescriptionSimilarity(trans1.description, trans2.description);
          
          if (descSimilarity.score > 70) {
            reversals.push({
              originalTransaction: trans1,
              reversalTransaction: trans2,
              confidence: descSimilarity.score
            });
          }
        }
      }
    }

    return reversals;
  }
}

export default DuplicateDetector;