import moment from 'moment';
import { 
  ParsedDocument, 
  Transaction, 
  TransactionType, 
  ExtractionResult,
  AccountInfo,
  ExtractionSummary,
  AmountParsingResult,
  DateParsingResult,
  ApiResponse,
  DocumentProcessingError
} from '@/types';
import { extractionLogger } from '@/utils/logger';
import { validateAmount, validateDate } from '@/utils/validators';
import { TransactionNormalizer } from './transaction-normalizer';
import { DuplicateDetector } from './duplicate-detector';
import { AmountParser } from './amount-parser';
import { MerchantExtractor } from './merchant-extractor';

export class DataExtractionService {
  private transactionNormalizer: TransactionNormalizer;
  private duplicateDetector: DuplicateDetector;
  private amountParser: AmountParser;
  private merchantExtractor: MerchantExtractor;

  constructor() {
    this.transactionNormalizer = new TransactionNormalizer();
    this.duplicateDetector = new DuplicateDetector();
    this.amountParser = new AmountParser();
    this.merchantExtractor = new MerchantExtractor();
  }

  public async extractAndNormalize(
    parsedDocument: ParsedDocument,
    documentId: string
  ): Promise<ApiResponse<ExtractionResult>> {
    const startTime = Date.now();

    try {
      extractionLogger.info('Starting data extraction and normalization', {
        documentId,
        documentType: parsedDocument.documentType,
        transactionCount: parsedDocument.transactions.length
      });

      // Step 1: Normalize transactions
      const normalizedTransactions = await this.normalizeTransactions(
        parsedDocument.transactions,
        parsedDocument
      );

      // Step 2: Extract merchant names
      const transactionsWithMerchants = await this.extractMerchantNames(normalizedTransactions);

      // Step 3: Detect and handle duplicates
      const deduplicatedTransactions = await this.detectAndHandleDuplicates(
        transactionsWithMerchants,
        documentId
      );

      // Step 4: Extract account information
      const accountInfo = this.extractAccountInfo(parsedDocument);

      // Step 5: Validate and clean transactions
      const validatedTransactions = await this.validateTransactions(deduplicatedTransactions);

      // Step 6: Calculate extraction summary
      const summary = this.calculateExtractionSummary(
        parsedDocument.transactions,
        validatedTransactions
      );

      const extractionTime = Date.now() - startTime;

      const extractionResult: ExtractionResult = {
        transactions: validatedTransactions,
        accountInfo,
        summary,
        confidence: this.calculateExtractionConfidence(validatedTransactions, parsedDocument),
        extractionTime
      };

      extractionLogger.info('Data extraction completed successfully', {
        documentId,
        originalTransactions: parsedDocument.transactions.length,
        finalTransactions: validatedTransactions.length,
        duplicatesDetected: summary.duplicatesDetected,
        extractionTime
      });

      return {
        success: true,
        data: extractionResult
      };

    } catch (error) {
      const extractionTime = Date.now() - startTime;

      extractionLogger.error('Data extraction failed', {
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        extractionTime
      });

      return {
        success: false,
        error: {
          code: 'DATA_EXTRACTION_FAILED',
          message: error instanceof Error ? error.message : 'Data extraction failed',
          details: { documentId, extractionTime }
        }
      };
    }
  }

  private async normalizeTransactions(
    transactions: Transaction[],
    parsedDocument: ParsedDocument
  ): Promise<Transaction[]> {
    try {
      extractionLogger.debug('Normalizing transactions', {
        count: transactions.length,
        documentType: parsedDocument.documentType
      });

      const normalizedTransactions: Transaction[] = [];

      for (const transaction of transactions) {
        try {
          const normalized = await this.transactionNormalizer.normalize(
            transaction,
            parsedDocument
          );
          
          if (normalized) {
            normalizedTransactions.push(normalized);
          }
        } catch (error) {
          extractionLogger.warn('Failed to normalize transaction', {
            transaction: transaction.rawText,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          // Include original transaction with warning
          normalizedTransactions.push({
            ...transaction,
            metadata: {
              ...transaction.metadata,
              normalizationError: error instanceof Error ? error.message : 'Unknown error'
            }
          });
        }
      }

      extractionLogger.debug('Transaction normalization completed', {
        original: transactions.length,
        normalized: normalizedTransactions.length
      });

      return normalizedTransactions;

    } catch (error) {
      extractionLogger.error('Transaction normalization failed', { error });
      throw new DocumentProcessingError(
        'Failed to normalize transactions',
        'NORMALIZATION_FAILED'
      );
    }
  }

  private async extractMerchantNames(transactions: Transaction[]): Promise<Transaction[]> {
    try {
      extractionLogger.debug('Extracting merchant names', {
        transactionCount: transactions.length
      });

      const transactionsWithMerchants = await Promise.all(
        transactions.map(async (transaction) => {
          try {
            const merchant = await this.merchantExtractor.extractMerchant(
              transaction.description
            );

            return {
              ...transaction,
              merchant: merchant.name,
              metadata: {
                ...transaction.metadata,
                merchantExtraction: {
                  confidence: merchant.confidence,
                  category: merchant.category,
                  originalDescription: transaction.description
                }
              }
            };
          } catch (error) {
            extractionLogger.debug('Merchant extraction failed for transaction', {
              description: transaction.description,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            return transaction;
          }
        })
      );

      const successCount = transactionsWithMerchants.filter(t => t.merchant).length;

      extractionLogger.debug('Merchant name extraction completed', {
        totalTransactions: transactions.length,
        successfulExtractions: successCount
      });

      return transactionsWithMerchants;

    } catch (error) {
      extractionLogger.error('Merchant name extraction failed', { error });
      throw new DocumentProcessingError(
        'Failed to extract merchant names',
        'MERCHANT_EXTRACTION_FAILED'
      );
    }
  }

  private async detectAndHandleDuplicates(
    transactions: Transaction[],
    documentId: string
  ): Promise<Transaction[]> {
    try {
      extractionLogger.debug('Detecting duplicate transactions', {
        transactionCount: transactions.length,
        documentId
      });

      const deduplicationResult = await this.duplicateDetector.detectDuplicates(
        transactions,
        documentId
      );

      extractionLogger.info('Duplicate detection completed', {
        originalCount: transactions.length,
        duplicatesFound: deduplicationResult.duplicatesFound,
        uniqueTransactions: deduplicationResult.uniqueTransactions.length,
        documentId
      });

      return deduplicationResult.uniqueTransactions;

    } catch (error) {
      extractionLogger.error('Duplicate detection failed', { 
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      // Return original transactions if deduplication fails
      return transactions;
    }
  }

  private extractAccountInfo(parsedDocument: ParsedDocument): AccountInfo {
    try {
      return {
        accountNumber: parsedDocument.accountNumber,
        accountHolder: parsedDocument.accountHolder,
        accountType: this.determineAccountType(parsedDocument),
        branchCode: this.extractBranchCode(parsedDocument),
        ifscCode: this.extractIFSCCode(parsedDocument),
        bankName: this.getBankName(parsedDocument.bankType)
      };
    } catch (error) {
      extractionLogger.warn('Failed to extract account info', { error });
      
      return {
        accountNumber: parsedDocument.accountNumber || 'UNKNOWN',
        accountHolder: parsedDocument.accountHolder || 'UNKNOWN',
        accountType: 'UNKNOWN',
        bankName: 'UNKNOWN'
      };
    }
  }

  private determineAccountType(parsedDocument: ParsedDocument): string {
    const type = parsedDocument.documentType;
    
    switch (type) {
      case 'bank_statement':
        return this.inferAccountTypeFromTransactions(parsedDocument.transactions);
      case 'credit_card_statement':
        return 'CREDIT_CARD';
      case 'loan_statement':
        return 'LOAN';
      case 'investment_statement':
        return 'INVESTMENT';
      default:
        return 'UNKNOWN';
    }
  }

  private inferAccountTypeFromTransactions(transactions: Transaction[]): string {
    // Analyze transaction patterns to infer account type
    const totalTransactions = transactions.length;
    
    if (totalTransactions === 0) return 'UNKNOWN';

    const salaryTransactions = transactions.filter(t => 
      t.description.toLowerCase().includes('salary') ||
      t.description.toLowerCase().includes('sal')
    ).length;

    const savingsIndicators = transactions.filter(t => 
      t.description.toLowerCase().includes('savings') ||
      t.description.toLowerCase().includes('int')
    ).length;

    // If high salary transactions, likely current account
    if (salaryTransactions / totalTransactions > 0.1) {
      return 'CURRENT';
    }

    // If interest transactions, likely savings account
    if (savingsIndicators > 0) {
      return 'SAVINGS';
    }

    return 'SAVINGS'; // Default assumption
  }

  private extractBranchCode(parsedDocument: ParsedDocument): string | undefined {
    // This would extract branch code from the document
    // Implementation depends on bank-specific formats
    return undefined;
  }

  private extractIFSCCode(parsedDocument: ParsedDocument): string | undefined {
    // This would extract IFSC code from the document
    // Implementation depends on bank-specific formats
    return undefined;
  }

  private getBankName(bankType?: string): string {
    const bankNames: Record<string, string> = {
      'hdfc': 'HDFC Bank',
      'sbi': 'State Bank of India',
      'icici': 'ICICI Bank',
      'axis': 'Axis Bank',
      'pnb': 'Punjab National Bank',
      'kotak': 'Kotak Mahindra Bank',
      'indusind': 'IndusInd Bank',
      'yes_bank': 'YES Bank',
      'boi': 'Bank of India'
    };

    return bankNames[bankType || ''] || 'UNKNOWN';
  }

  private async validateTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    try {
      extractionLogger.debug('Validating transactions', {
        transactionCount: transactions.length
      });

      const validatedTransactions: Transaction[] = [];
      let invalidCount = 0;

      for (const transaction of transactions) {
        if (this.isValidTransaction(transaction)) {
          // Additional validation and cleaning
          const cleanedTransaction = this.cleanTransaction(transaction);
          validatedTransactions.push(cleanedTransaction);
        } else {
          invalidCount++;
          extractionLogger.debug('Invalid transaction found', {
            transaction: transaction.rawText,
            reason: 'Failed validation checks'
          });
        }
      }

      extractionLogger.info('Transaction validation completed', {
        totalTransactions: transactions.length,
        validTransactions: validatedTransactions.length,
        invalidTransactions: invalidCount
      });

      return validatedTransactions;

    } catch (error) {
      extractionLogger.error('Transaction validation failed', { error });
      throw new DocumentProcessingError(
        'Failed to validate transactions',
        'VALIDATION_FAILED'
      );
    }
  }

  private isValidTransaction(transaction: Transaction): boolean {
    // Basic validation rules
    return !!(
      transaction.date &&
      transaction.description &&
      transaction.description.trim().length > 0 &&
      transaction.amount !== undefined &&
      transaction.amount !== null &&
      transaction.amount >= 0 &&
      transaction.type &&
      transaction.confidence > 0
    );
  }

  private cleanTransaction(transaction: Transaction): Transaction {
    return {
      ...transaction,
      description: transaction.description.trim().replace(/\s+/g, ' '),
      amount: Math.round(transaction.amount * 100) / 100, // Round to 2 decimal places
      confidence: Math.min(Math.max(transaction.confidence, 0), 100) // Ensure 0-100 range
    };
  }

  private calculateExtractionSummary(
    originalTransactions: Transaction[],
    finalTransactions: Transaction[]
  ): ExtractionSummary {
    const duplicatesDetected = originalTransactions.length - finalTransactions.length;
    
    const validTransactions = finalTransactions.filter(t => 
      this.isValidTransaction(t) && t.confidence >= 50
    );
    
    const invalidTransactions = finalTransactions.filter(t => 
      !this.isValidTransaction(t) || t.confidence < 50
    );

    const averageConfidence = finalTransactions.length > 0 
      ? finalTransactions.reduce((sum, t) => sum + t.confidence, 0) / finalTransactions.length
      : 0;

    const processingErrors: string[] = [];
    
    // Collect processing errors from metadata
    for (const transaction of finalTransactions) {
      if (transaction.metadata?.normalizationError) {
        processingErrors.push(transaction.metadata.normalizationError);
      }
    }

    return {
      totalTransactionsFound: originalTransactions.length,
      duplicatesDetected: Math.max(0, duplicatesDetected),
      validTransactions: validTransactions.length,
      invalidTransactions: invalidTransactions.length,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      processingErrors: [...new Set(processingErrors)] // Remove duplicates
    };
  }

  private calculateExtractionConfidence(
    transactions: Transaction[],
    parsedDocument: ParsedDocument
  ): number {
    if (transactions.length === 0) return 0;

    const transactionConfidence = transactions.reduce((sum, t) => sum + t.confidence, 0) / transactions.length;
    const documentConfidence = parsedDocument.metadata.confidence;
    
    // Factor in data quality
    let qualityScore = 100;
    
    // Reduce confidence for missing merchants
    const merchantsFound = transactions.filter(t => t.merchant && t.merchant !== 'UNKNOWN').length;
    const merchantPercentage = merchantsFound / transactions.length;
    qualityScore *= (0.7 + 0.3 * merchantPercentage);
    
    // Reduce confidence for low individual transaction confidence
    const lowConfidenceTransactions = transactions.filter(t => t.confidence < 70).length;
    const lowConfidencePercentage = lowConfidenceTransactions / transactions.length;
    qualityScore *= (1 - 0.3 * lowConfidencePercentage);
    
    // Weighted average: 50% transaction confidence, 30% document confidence, 20% quality
    const finalConfidence = (
      transactionConfidence * 0.5 +
      documentConfidence * 0.3 +
      qualityScore * 0.2
    );

    return Math.round(Math.min(Math.max(finalConfidence, 0), 100));
  }
}

export default DataExtractionService;