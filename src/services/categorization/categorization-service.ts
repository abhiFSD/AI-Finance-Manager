import { Transaction } from '../../types';
import { CategorizationResult, CategorySuggestion } from './types';
import { MLCategorizationService } from './ml-categorization';
import { MerchantMappingService } from './merchant-mapping';
import { CategoryHierarchyService } from './category-hierarchy';
import { BulkCategorizationService } from './bulk-categorization';

interface CategorizationConfig {
  useMLFallback: boolean;
  minConfidenceThreshold: number;
  enableLearning: boolean;
  cacheResults: boolean;
}

export class CategorizationService {
  private mlService: MLCategorizationService;
  private merchantService: MerchantMappingService;
  private categoryService: CategoryHierarchyService;
  private bulkService: BulkCategorizationService;
  private cache: Map<string, CategorizationResult> = new Map();
  private config: CategorizationConfig;

  constructor(config: Partial<CategorizationConfig> = {}) {
    this.config = {
      useMLFallback: true,
      minConfidenceThreshold: 0.5,
      enableLearning: true,
      cacheResults: true,
      ...config
    };

    this.mlService = new MLCategorizationService();
    this.merchantService = new MerchantMappingService();
    this.categoryService = new CategoryHierarchyService();
    this.bulkService = new BulkCategorizationService();
  }

  async categorizeTransaction(transaction: Transaction): Promise<CategorizationResult> {
    // Check cache first
    if (this.config.cacheResults) {
      const cacheKey = this.generateCacheKey(transaction);
      const cachedResult = this.cache.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
    }

    let result: CategorizationResult;

    try {
      // Step 1: Try merchant mapping (highest accuracy)
      const merchant = this.merchantService.findMerchantByDescription(transaction.description);
      if (merchant && merchant.confidence >= this.config.minConfidenceThreshold) {
        this.merchantService.incrementTransactionCount(merchant.id);
        result = {
          categoryId: merchant.categoryId,
          confidence: merchant.confidence,
          reason: `Matched known merchant: ${merchant.name}`,
          merchantId: merchant.id,
          suggestions: await this.generateSuggestions(transaction, merchant.categoryId)
        };
      } else {
        // Step 2: Try pattern matching
        const patternMatch = this.merchantService.getCategoryByPattern(transaction.description);
        if (patternMatch && patternMatch.confidence >= this.config.minConfidenceThreshold) {
          result = {
            categoryId: patternMatch.categoryId,
            confidence: patternMatch.confidence,
            reason: 'Matched transaction pattern',
            suggestions: await this.generateSuggestions(transaction, patternMatch.categoryId)
          };
        } else if (this.config.useMLFallback) {
          // Step 3: Use ML categorization as fallback
          result = await this.mlService.categorizeTransaction(transaction);
        } else {
          // Return default with suggestions
          result = {
            categoryId: this.getDefaultCategory(transaction),
            confidence: 0.1,
            reason: 'No matching patterns found, using default category',
            suggestions: await this.generateSuggestions(transaction)
          };
        }
      }

      // Cache the result
      if (this.config.cacheResults && result.confidence >= this.config.minConfidenceThreshold) {
        const cacheKey = this.generateCacheKey(transaction);
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error('Error categorizing transaction:', error);
      
      // Fallback to default category
      return {
        categoryId: this.getDefaultCategory(transaction),
        confidence: 0.1,
        reason: 'Error occurred during categorization, using default',
        suggestions: []
      };
    }
  }

  async categorizeBatch(transactions: Transaction[]): Promise<CategorizationResult[]> {
    const results: CategorizationResult[] = [];
    
    for (const transaction of transactions) {
      const result = await this.categorizeTransaction(transaction);
      results.push(result);
    }

    return results;
  }

  async getSuggestions(transaction: Transaction, count: number = 5): Promise<CategorySuggestion[]> {
    const suggestions: CategorySuggestion[] = [];
    
    try {
      // Get ML suggestions
      const mlResult = await this.mlService.categorizeTransaction(transaction);
      suggestions.push(...mlResult.suggestions);

      // Get pattern-based suggestions
      const patternMatch = this.merchantService.getCategoryByPattern(transaction.description);
      if (patternMatch) {
        const category = this.categoryService.getCategoryById(patternMatch.categoryId);
        if (category) {
          suggestions.push({
            categoryId: patternMatch.categoryId,
            categoryName: category.name,
            confidence: patternMatch.confidence,
            reason: 'Pattern match'
          });
        }
      }

      // Get merchant-based suggestions
      const merchant = this.merchantService.findMerchantByDescription(transaction.description);
      if (merchant) {
        const category = this.categoryService.getCategoryById(merchant.categoryId);
        if (category) {
          suggestions.push({
            categoryId: merchant.categoryId,
            categoryName: category.name,
            confidence: merchant.confidence,
            reason: `Known merchant: ${merchant.name}`
          });
        }
      }

      // Remove duplicates and sort by confidence
      const uniqueSuggestions = suggestions.filter((suggestion, index, self) =>
        index === self.findIndex(s => s.categoryId === suggestion.categoryId)
      );

      return uniqueSuggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, count);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return this.getDefaultSuggestions(transaction, count);
    }
  }

  private async generateSuggestions(
    transaction: Transaction, 
    excludeCategoryId?: string
  ): Promise<CategorySuggestion[]> {
    const allSuggestions = await this.getSuggestions(transaction, 10);
    return allSuggestions.filter(s => s.categoryId !== excludeCategoryId).slice(0, 3);
  }

  private getDefaultSuggestions(transaction: Transaction, count: number): CategorySuggestion[] {
    const amount = Math.abs(transaction.amount);
    const isCredit = transaction.type === 'credit';
    
    if (isCredit) {
      return [{
        categoryId: 'income',
        categoryName: 'Income',
        confidence: 0.3,
        reason: 'Credit transaction'
      }];
    }

    // Suggest based on amount patterns
    const suggestions: CategorySuggestion[] = [];
    
    if (amount < 500) {
      suggestions.push(
        { categoryId: 'food_delivery', categoryName: 'Food Delivery', confidence: 0.2, reason: 'Small amount pattern' },
        { categoryId: 'transport_taxi', categoryName: 'Transportation', confidence: 0.2, reason: 'Small amount pattern' }
      );
    } else if (amount < 2000) {
      suggestions.push(
        { categoryId: 'food_grocery', categoryName: 'Groceries', confidence: 0.2, reason: 'Medium amount pattern' },
        { categoryId: 'utilities_electricity', categoryName: 'Utilities', confidence: 0.2, reason: 'Medium amount pattern' }
      );
    } else {
      suggestions.push(
        { categoryId: 'shopping_online', categoryName: 'Shopping', confidence: 0.2, reason: 'Large amount pattern' },
        { categoryId: 'healthcare_doctor', categoryName: 'Healthcare', confidence: 0.2, reason: 'Large amount pattern' }
      );
    }

    return suggestions.slice(0, count);
  }

  private getDefaultCategory(transaction: Transaction): string {
    if (transaction.type === 'credit') {
      return 'income';
    }
    
    const amount = Math.abs(transaction.amount);
    if (amount < 500) return 'food_delivery';
    if (amount < 2000) return 'food_grocery';
    return 'shopping_online';
  }

  private generateCacheKey(transaction: Transaction): string {
    return `${transaction.description}_${Math.abs(transaction.amount)}_${transaction.type}`;
  }

  async learnFromUserInput(
    transaction: Transaction,
    selectedCategoryId: string,
    confidence: number = 1.0
  ): Promise<void> {
    if (!this.config.enableLearning) return;

    try {
      // Add to ML training data
      this.mlService.trainFromUserFeedback(transaction, selectedCategoryId);

      // Check if we should create/update merchant mapping
      const merchant = this.merchantService.findMerchantByDescription(transaction.description);
      if (!merchant && confidence >= 0.8) {
        // Create new merchant mapping
        const merchantName = this.extractMerchantName(transaction.description);
        if (merchantName) {
          this.merchantService.addMerchant({
            name: merchantName,
            normalizedName: merchantName.toLowerCase().replace(/[^a-z0-9]/g, ''),
            categoryId: selectedCategoryId,
            aliases: [merchantName],
            confidence: confidence,
            transactionCount: 1
          });
        }
      } else if (merchant && merchant.categoryId !== selectedCategoryId) {
        // Update existing merchant if user correction has high confidence
        if (confidence >= 0.9) {
          this.merchantService.updateMerchant(merchant.id, {
            categoryId: selectedCategoryId,
            confidence: Math.min(merchant.confidence + 0.1, 0.95)
          });
        }
      }

      // Clear cache for this transaction pattern
      const cacheKey = this.generateCacheKey(transaction);
      this.cache.delete(cacheKey);

    } catch (error) {
      console.error('Error learning from user input:', error);
    }
  }

  private extractMerchantName(description: string): string | null {
    // Simple merchant name extraction
    // Remove common banking terms
    const cleaned = description
      .replace(/\b(UPI|IMPS|NEFT|RTGS|ACH|DEBIT|CREDIT|CARD|TXN|PAYMENT)\b/gi, '')
      .replace(/\b\d+\b/g, '') // Remove numbers
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned.length < 3 || cleaned.length > 50) return null;
    
    return cleaned;
  }

  getBulkService(): BulkCategorizationService {
    return this.bulkService;
  }

  getMerchantService(): MerchantMappingService {
    return this.merchantService;
  }

  getCategoryService(): CategoryHierarchyService {
    return this.categoryService;
  }

  getMLService(): MLCategorizationService {
    return this.mlService;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.cache.size,
      hitRate: undefined // Would need to track hits/misses to calculate this
    };
  }

  async exportConfiguration(): Promise<{
    merchants: any[];
    categories: any[];
    trainingData: any[];
    patterns: any[];
  }> {
    return {
      merchants: this.merchantService.getAllMerchants(),
      categories: this.categoryService.getAllCategories(),
      trainingData: this.mlService.exportTrainingData(),
      patterns: this.merchantService.getPatterns()
    };
  }

  async importConfiguration(config: {
    merchants?: any[];
    categories?: any[];
    trainingData?: any[];
    patterns?: any[];
  }): Promise<void> {
    if (config.trainingData) {
      this.mlService.importTrainingData(config.trainingData);
    }

    if (config.patterns) {
      config.patterns.forEach(pattern => {
        this.merchantService.addPattern(pattern);
      });
    }

    // Clear cache after import
    this.clearCache();
  }

  getServiceStats(): {
    mlModel: any;
    merchants: Record<string, number>;
    categories: Record<string, number>;
    cache: { size: number };
  } {
    return {
      mlModel: this.mlService.getModelInfo(),
      merchants: this.merchantService.getMerchantStats(),
      categories: this.categoryService.getCategoryStats(),
      cache: this.getCacheStats()
    };
  }

  updateConfig(newConfig: Partial<CategorizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Clear cache if caching was disabled
    if (!this.config.cacheResults) {
      this.clearCache();
    }
  }

  getConfig(): CategorizationConfig {
    return { ...this.config };
  }
}