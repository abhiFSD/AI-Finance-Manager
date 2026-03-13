import { Transaction } from '../../types';
import { CategorizationResult } from './types';
import { MLCategorizationService } from './ml-categorization';
import { MerchantMappingService } from './merchant-mapping';
import { CategoryHierarchyService } from './category-hierarchy';

interface BulkCategorizationOptions {
  batchSize?: number;
  skipAlreadyCategorized?: boolean;
  minConfidence?: number;
  onProgress?: (processed: number, total: number) => void;
  onError?: (error: Error, transaction: Transaction) => void;
}

interface BulkCategorizationResult {
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  results: Array<{
    transactionId: string;
    result?: CategorizationResult;
    error?: string;
    skipped?: boolean;
  }>;
  executionTime: number;
}

export class BulkCategorizationService {
  private mlService: MLCategorizationService;
  private merchantService: MerchantMappingService;
  private categoryService: CategoryHierarchyService;

  constructor() {
    this.mlService = new MLCategorizationService();
    this.merchantService = new MerchantMappingService();
    this.categoryService = new CategoryHierarchyService();
  }

  async categorizeTransactionsBulk(
    transactions: Transaction[],
    options: BulkCategorizationOptions = {}
  ): Promise<BulkCategorizationResult> {
    const startTime = Date.now();
    const {
      batchSize = 100,
      skipAlreadyCategorized = true,
      minConfidence = 0.3,
      onProgress,
      onError
    } = options;

    const result: BulkCategorizationResult = {
      totalProcessed: 0,
      successCount: 0,
      errorCount: 0,
      skippedCount: 0,
      results: [],
      executionTime: 0
    };

    // Filter transactions if needed
    const transactionsToProcess = skipAlreadyCategorized
      ? transactions.filter(t => !t.categoryId)
      : transactions;

    const totalTransactions = transactionsToProcess.length;
    
    // Process in batches
    for (let i = 0; i < totalTransactions; i += batchSize) {
      const batch = transactionsToProcess.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (transaction) => {
        try {
          if (skipAlreadyCategorized && transaction.categoryId) {
            result.skippedCount++;
            return {
              transactionId: transaction.id,
              skipped: true
            };
          }

          const categorizationResult = await this.categorizeTransaction(transaction);
          
          // Only accept results above minimum confidence
          if (categorizationResult.confidence >= minConfidence) {
            result.successCount++;
            return {
              transactionId: transaction.id,
              result: categorizationResult
            };
          } else {
            result.errorCount++;
            return {
              transactionId: transaction.id,
              error: `Low confidence: ${categorizationResult.confidence.toFixed(2)}`
            };
          }
        } catch (error) {
          result.errorCount++;
          if (onError) {
            onError(error instanceof Error ? error : new Error(String(error)), transaction);
          }
          return {
            transactionId: transaction.id,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      result.results.push(...batchResults);
      result.totalProcessed = i + batch.length;

      if (onProgress) {
        onProgress(result.totalProcessed, totalTransactions);
      }

      // Small delay to prevent overwhelming the system
      if (i + batchSize < totalTransactions) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    result.executionTime = Date.now() - startTime;
    return result;
  }

  async categorizeTransaction(transaction: Transaction): Promise<CategorizationResult> {
    // Step 1: Try merchant mapping first (fastest and most accurate)
    const merchant = this.merchantService.findMerchantByDescription(transaction.description);
    if (merchant) {
      this.merchantService.incrementTransactionCount(merchant.id);
      return {
        categoryId: merchant.categoryId,
        confidence: merchant.confidence,
        reason: `Matched known merchant: ${merchant.name}`,
        merchantId: merchant.id,
        suggestions: []
      };
    }

    // Step 2: Try pattern matching
    const patternMatch = this.merchantService.getCategoryByPattern(transaction.description);
    if (patternMatch && patternMatch.confidence >= 0.7) {
      return {
        categoryId: patternMatch.categoryId,
        confidence: patternMatch.confidence,
        reason: 'Matched category pattern',
        suggestions: []
      };
    }

    // Step 3: Use ML categorization
    const mlResult = await this.mlService.categorizeTransaction(transaction);
    return mlResult;
  }

  async categorizeByCategory(
    transactions: Transaction[],
    targetCategoryId: string,
    options: BulkCategorizationOptions = {}
  ): Promise<BulkCategorizationResult> {
    const category = this.categoryService.getCategoryById(targetCategoryId);
    if (!category) {
      throw new Error(`Category not found: ${targetCategoryId}`);
    }

    // Filter transactions that might belong to this category
    const relevantTransactions = this.filterTransactionsByCategory(transactions, targetCategoryId);
    
    return this.categorizeTransactionsBulk(relevantTransactions, options);
  }

  private filterTransactionsByCategory(transactions: Transaction[], categoryId: string): Transaction[] {
    const category = this.categoryService.getCategoryById(categoryId);
    if (!category) return [];

    const keywords = category.keywords.map(k => k.toLowerCase());
    
    return transactions.filter(transaction => {
      const description = transaction.description.toLowerCase();
      return keywords.some(keyword => description.includes(keyword));
    });
  }

  async categorizeSimilarTransactions(
    referenceTransaction: Transaction,
    transactions: Transaction[],
    options: BulkCategorizationOptions = {}
  ): Promise<BulkCategorizationResult> {
    // First categorize the reference transaction
    const referenceResult = await this.categorizeTransaction(referenceTransaction);
    
    if (referenceResult.confidence < 0.5) {
      throw new Error('Reference transaction could not be categorized with sufficient confidence');
    }

    // Find similar transactions
    const similarTransactions = this.findSimilarTransactions(
      referenceTransaction,
      transactions,
      0.6 // similarity threshold
    );

    // Apply the same category to similar transactions
    const results: Array<{
      transactionId: string;
      result?: CategorizationResult;
      error?: string;
      skipped?: boolean;
    }> = [];

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    similarTransactions.forEach(({ transaction, similarity }) => {
      if (options.skipAlreadyCategorized && transaction.categoryId) {
        skippedCount++;
        results.push({
          transactionId: transaction.id,
          skipped: true
        });
        return;
      }

      const confidence = Math.min(referenceResult.confidence * similarity, 0.95);
      
      if (confidence >= (options.minConfidence || 0.3)) {
        successCount++;
        results.push({
          transactionId: transaction.id,
          result: {
            categoryId: referenceResult.categoryId,
            confidence,
            reason: `Similar to reference transaction (${(similarity * 100).toFixed(1)}% match)`,
            merchantId: referenceResult.merchantId,
            suggestions: []
          }
        });
      } else {
        errorCount++;
        results.push({
          transactionId: transaction.id,
          error: `Low similarity confidence: ${confidence.toFixed(2)}`
        });
      }
    });

    return {
      totalProcessed: similarTransactions.length,
      successCount,
      errorCount,
      skippedCount,
      results,
      executionTime: 0 // This is a sync operation
    };
  }

  private findSimilarTransactions(
    referenceTransaction: Transaction,
    transactions: Transaction[],
    threshold: number = 0.6
  ): Array<{ transaction: Transaction; similarity: number }> {
    const refDescription = referenceTransaction.description.toLowerCase();
    const refAmount = Math.abs(referenceTransaction.amount);
    
    return transactions
      .map(transaction => {
        const description = transaction.description.toLowerCase();
        const amount = Math.abs(transaction.amount);
        
        // Calculate similarity score
        let similarity = 0;
        
        // Text similarity (70% weight)
        const textSimilarity = this.calculateTextSimilarity(refDescription, description);
        similarity += textSimilarity * 0.7;
        
        // Amount similarity (30% weight)
        const amountSimilarity = Math.min(amount, refAmount) / Math.max(amount, refAmount);
        similarity += amountSimilarity * 0.3;
        
        return { transaction, similarity };
      })
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.split(/\s+/).filter(word => word.length > 2);
    const words2 = text2.split(/\s+/).filter(word => word.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(word => set2.has(word)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  async categorizeByMerchant(
    merchantName: string,
    transactions: Transaction[],
    options: BulkCategorizationOptions = {}
  ): Promise<BulkCategorizationResult> {
    const merchant = this.merchantService.findMerchantByDescription(merchantName);
    if (!merchant) {
      throw new Error(`Merchant not found: ${merchantName}`);
    }

    const merchantTransactions = transactions.filter(transaction =>
      this.merchantService.findMerchantByDescription(transaction.description)?.id === merchant.id
    );

    const results: Array<{
      transactionId: string;
      result?: CategorizationResult;
      error?: string;
      skipped?: boolean;
    }> = [];

    let successCount = 0;
    let skippedCount = 0;

    merchantTransactions.forEach(transaction => {
      if (options.skipAlreadyCategorized && transaction.categoryId) {
        skippedCount++;
        results.push({
          transactionId: transaction.id,
          skipped: true
        });
        return;
      }

      successCount++;
      results.push({
        transactionId: transaction.id,
        result: {
          categoryId: merchant.categoryId,
          confidence: merchant.confidence,
          reason: `Auto-categorized by merchant: ${merchant.name}`,
          merchantId: merchant.id,
          suggestions: []
        }
      });
    });

    return {
      totalProcessed: merchantTransactions.length,
      successCount,
      errorCount: 0,
      skippedCount,
      results,
      executionTime: 0
    };
  }

  async recategorizeByDateRange(
    transactions: Transaction[],
    startDate: Date,
    endDate: Date,
    options: BulkCategorizationOptions = {}
  ): Promise<BulkCategorizationResult> {
    const filteredTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    return this.categorizeTransactionsBulk(filteredTransactions, {
      ...options,
      skipAlreadyCategorized: false // Force recategorization
    });
  }

  getCategorizationStats(results: BulkCategorizationResult): {
    successRate: number;
    averageConfidence: number;
    categoryDistribution: Record<string, number>;
    processingSpeed: number; // transactions per second
  } {
    const successfulResults = results.results
      .filter(r => r.result)
      .map(r => r.result!);

    const successRate = results.totalProcessed > 0 
      ? results.successCount / results.totalProcessed 
      : 0;

    const averageConfidence = successfulResults.length > 0
      ? successfulResults.reduce((sum, r) => sum + r.confidence, 0) / successfulResults.length
      : 0;

    const categoryDistribution: Record<string, number> = {};
    successfulResults.forEach(result => {
      categoryDistribution[result.categoryId] = 
        (categoryDistribution[result.categoryId] || 0) + 1;
    });

    const processingSpeed = results.executionTime > 0
      ? (results.totalProcessed / results.executionTime) * 1000
      : 0;

    return {
      successRate,
      averageConfidence,
      categoryDistribution,
      processingSpeed
    };
  }

  async validateCategorization(
    transactions: Transaction[],
    sampleSize: number = 50
  ): Promise<{
    validationAccuracy: number;
    inconsistencies: Array<{
      transactionId: string;
      description: string;
      currentCategory: string;
      suggestedCategory: string;
      confidence: number;
    }>;
  }> {
    const categorizedTransactions = transactions.filter(t => t.categoryId);
    const sampleTransactions = this.selectRandomSample(categorizedTransactions, sampleSize);
    
    const inconsistencies: Array<{
      transactionId: string;
      description: string;
      currentCategory: string;
      suggestedCategory: string;
      confidence: number;
    }> = [];

    let correctCount = 0;

    for (const transaction of sampleTransactions) {
      const result = await this.categorizeTransaction({
        ...transaction,
        categoryId: undefined // Remove existing category for validation
      });

      if (result.categoryId === transaction.categoryId) {
        correctCount++;
      } else if (result.confidence > 0.7) {
        inconsistencies.push({
          transactionId: transaction.id,
          description: transaction.description,
          currentCategory: transaction.categoryId!,
          suggestedCategory: result.categoryId,
          confidence: result.confidence
        });
      }
    }

    return {
      validationAccuracy: sampleTransactions.length > 0 
        ? correctCount / sampleTransactions.length 
        : 0,
      inconsistencies
    };
  }

  private selectRandomSample<T>(array: T[], sampleSize: number): T[] {
    if (array.length <= sampleSize) return array;
    
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, sampleSize);
  }
}