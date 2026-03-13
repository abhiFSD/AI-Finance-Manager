import moment from 'moment';
import { 
  Transaction, 
  TransactionType, 
  ParsedDocument, 
  DocumentType,
  BankType 
} from '@/types';
import { extractionLogger } from '@/utils/logger';
import { validateAmount, validateDate } from '@/utils/validators';

export class TransactionNormalizer {
  private bankSpecificNormalizers: Map<BankType, (transaction: Transaction) => Transaction>;

  constructor() {
    this.initializeBankSpecificNormalizers();
  }

  public async normalize(
    transaction: Transaction,
    parsedDocument: ParsedDocument
  ): Promise<Transaction | null> {
    try {
      // Start with a copy of the original transaction
      let normalized = { ...transaction };

      // Step 1: Normalize date
      normalized = this.normalizeDate(normalized);

      // Step 2: Normalize amount
      normalized = this.normalizeAmount(normalized);

      // Step 3: Normalize description
      normalized = this.normalizeDescription(normalized, parsedDocument);

      // Step 4: Determine transaction type
      normalized = this.normalizeTransactionType(normalized, parsedDocument);

      // Step 5: Apply bank-specific normalization
      if (parsedDocument.bankType) {
        const bankNormalizer = this.bankSpecificNormalizers.get(parsedDocument.bankType);
        if (bankNormalizer) {
          normalized = bankNormalizer(normalized);
        }
      }

      // Step 6: Calculate confidence adjustments
      normalized = this.adjustConfidence(normalized, transaction);

      // Step 7: Validate the normalized transaction
      if (!this.isValidNormalizedTransaction(normalized)) {
        extractionLogger.warn('Transaction failed normalization validation', {
          original: transaction.rawText,
          normalized: normalized.description
        });
        return null;
      }

      return normalized;

    } catch (error) {
      extractionLogger.error('Transaction normalization failed', {
        transaction: transaction.rawText,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return null;
    }
  }

  private normalizeDate(transaction: Transaction): Transaction {
    try {
      // Ensure date is valid and properly formatted
      const date = moment(transaction.date);
      
      if (!date.isValid()) {
        throw new Error('Invalid date');
      }

      // Normalize to start of day in local timezone
      const normalizedDate = date.startOf('day').toDate();

      return {
        ...transaction,
        date: normalizedDate
      };

    } catch (error) {
      extractionLogger.warn('Date normalization failed', {
        originalDate: transaction.date,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Return original if normalization fails
      return transaction;
    }
  }

  private normalizeAmount(transaction: Transaction): Transaction {
    try {
      let amount = transaction.amount;

      // Handle negative amounts (convert to positive)
      if (amount < 0) {
        amount = Math.abs(amount);
      }

      // Round to 2 decimal places
      amount = Math.round(amount * 100) / 100;

      // Validate amount is reasonable (not too large)
      const maxAmount = 10000000; // 1 crore
      if (amount > maxAmount) {
        extractionLogger.warn('Unusually large amount detected', {
          amount,
          transaction: transaction.description
        });
      }

      return {
        ...transaction,
        amount
      };

    } catch (error) {
      extractionLogger.warn('Amount normalization failed', {
        originalAmount: transaction.amount,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return transaction;
    }
  }

  private normalizeDescription(
    transaction: Transaction,
    parsedDocument: ParsedDocument
  ): Transaction {
    try {
      let description = transaction.description.trim();

      // Remove extra whitespace
      description = description.replace(/\s+/g, ' ');

      // Remove common OCR artifacts
      description = description.replace(/[^\w\s\-\.\/()]/g, ' ');
      description = description.replace(/\s+/g, ' ').trim();

      // Remove bank-specific prefixes/suffixes that add no value
      description = this.removeBankSpecificNoise(description, parsedDocument.bankType);

      // Standardize common transaction types
      description = this.standardizeTransactionTypes(description);

      // Ensure minimum description length
      if (description.length < 3) {
        description = transaction.description; // Revert to original if too short
      }

      return {
        ...transaction,
        description
      };

    } catch (error) {
      extractionLogger.warn('Description normalization failed', {
        originalDescription: transaction.description,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return transaction;
    }
  }

  private removeBankSpecificNoise(description: string, bankType?: BankType): string {
    if (!bankType) return description;

    const noisePatterns: Record<BankType, RegExp[]> = {
      [BankType.HDFC]: [
        /^HDFC\s*/i,
        /\s*HDFC$/i,
        /REF\s*NO\s*\d+/i
      ],
      [BankType.SBI]: [
        /^SBI\s*/i,
        /\s*SBI$/i,
        /UPI\s*REF\s*\d+/i
      ],
      [BankType.ICICI]: [
        /^ICICI\s*/i,
        /\s*ICICI$/i,
        /MMT\s*REF\s*\d+/i
      ],
      // Add more bank-specific patterns as needed
      [BankType.AXIS]: [],
      [BankType.PNB]: [],
      [BankType.KOTAK]: [],
      [BankType.INDUSIND]: [],
      [BankType.YES_BANK]: [],
      [BankType.BOI]: [],
      [BankType.UNKNOWN]: []
    };

    const patterns = noisePatterns[bankType] || [];
    
    let cleaned = description;
    for (const pattern of patterns) {
      cleaned = cleaned.replace(pattern, ' ');
    }

    return cleaned.replace(/\s+/g, ' ').trim();
  }

  private standardizeTransactionTypes(description: string): string {
    const standardizations: Record<string, string> = {
      // UPI transactions
      'upi': 'UPI Transfer',
      'phonepe': 'UPI Transfer - PhonePe',
      'googlepay': 'UPI Transfer - Google Pay',
      'paytm': 'UPI Transfer - Paytm',
      'amazonpay': 'UPI Transfer - Amazon Pay',
      
      // Card transactions
      'pos': 'Card Payment',
      'ecom': 'Online Card Payment',
      'atm': 'ATM Withdrawal',
      
      // Bank transfers
      'neft': 'NEFT Transfer',
      'rtgs': 'RTGS Transfer',
      'imps': 'IMPS Transfer',
      'nach': 'NACH Payment',
      
      // Common descriptions
      'salary': 'Salary Credit',
      'interest': 'Interest Credit',
      'dividend': 'Dividend Credit',
      'cashback': 'Cashback Credit',
      'refund': 'Refund Credit'
    };

    let standardized = description;
    const lowerDescription = description.toLowerCase();

    for (const [pattern, replacement] of Object.entries(standardizations)) {
      if (lowerDescription.includes(pattern)) {
        // Only replace if it makes the description more meaningful
        if (description.length < replacement.length + 10) {
          standardized = replacement;
          break;
        }
      }
    }

    return standardized;
  }

  private normalizeTransactionType(
    transaction: Transaction,
    parsedDocument: ParsedDocument
  ): Transaction {
    try {
      let type = transaction.type;
      const description = transaction.description.toLowerCase();
      const amount = transaction.amount;

      // For credit card statements, most transactions are debits (charges)
      if (parsedDocument.documentType === DocumentType.CREDIT_CARD_STATEMENT) {
        // Credits are payments, refunds, cashbacks
        const creditKeywords = ['payment', 'credit', 'refund', 'cashback', 'reward'];
        const isCredit = creditKeywords.some(keyword => description.includes(keyword));
        
        type = isCredit ? TransactionType.CREDIT : TransactionType.DEBIT;
      }
      
      // For bank statements, determine based on description
      else if (parsedDocument.documentType === DocumentType.BANK_STATEMENT) {
        const creditKeywords = [
          'salary', 'credit', 'deposit', 'transfer in', 'refund', 
          'interest', 'dividend', 'cashback', 'bonus'
        ];
        const debitKeywords = [
          'withdrawal', 'payment', 'purchase', 'transfer out', 'fee', 
          'charge', 'emi', 'loan', 'investment'
        ];

        const isCredit = creditKeywords.some(keyword => description.includes(keyword));
        const isDebit = debitKeywords.some(keyword => description.includes(keyword));

        if (isCredit && !isDebit) {
          type = TransactionType.CREDIT;
        } else if (isDebit && !isCredit) {
          type = TransactionType.DEBIT;
        }
        // If unclear, keep original type
      }

      return {
        ...transaction,
        type
      };

    } catch (error) {
      extractionLogger.warn('Transaction type normalization failed', {
        transaction: transaction.description,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return transaction;
    }
  }

  private adjustConfidence(normalized: Transaction, original: Transaction): Transaction {
    let confidence = original.confidence;

    // Increase confidence for successful normalizations
    if (normalized.description !== original.description) {
      confidence += 5; // Cleaned description
    }

    if (normalized.amount !== original.amount && normalized.amount > 0) {
      confidence += 3; // Fixed amount issues
    }

    // Decrease confidence for potential issues
    if (normalized.description.length < 5) {
      confidence -= 10; // Very short description
    }

    if (normalized.amount > 1000000) { // > 10 lakhs
      confidence -= 5; // Unusually large amount
    }

    // Ensure confidence stays in valid range
    confidence = Math.min(Math.max(confidence, 0), 100);

    return {
      ...normalized,
      confidence
    };
  }

  private isValidNormalizedTransaction(transaction: Transaction): boolean {
    return !!(
      transaction.date &&
      transaction.description &&
      transaction.description.trim().length >= 3 &&
      transaction.amount !== undefined &&
      transaction.amount !== null &&
      transaction.amount > 0 &&
      transaction.type &&
      transaction.confidence >= 0 &&
      transaction.confidence <= 100
    );
  }

  private initializeBankSpecificNormalizers(): void {
    this.bankSpecificNormalizers = new Map();

    // HDFC Bank specific normalization
    this.bankSpecificNormalizers.set(BankType.HDFC, (transaction: Transaction) => {
      let description = transaction.description;
      
      // HDFC specific cleanups
      description = description.replace(/HDFC\s*BANK/gi, '').trim();
      description = description.replace(/A\/C\s*NO\s*\d+/gi, '').trim();
      description = description.replace(/\s+/g, ' ');

      return {
        ...transaction,
        description: description || transaction.description
      };
    });

    // SBI Bank specific normalization
    this.bankSpecificNormalizers.set(BankType.SBI, (transaction: Transaction) => {
      let description = transaction.description;
      
      // SBI specific cleanups
      description = description.replace(/STATE\s*BANK\s*OF\s*INDIA/gi, '').trim();
      description = description.replace(/SBI/gi, '').trim();
      description = description.replace(/\s+/g, ' ');

      return {
        ...transaction,
        description: description || transaction.description
      };
    });

    // Add more bank-specific normalizers as needed
  }
}

export default TransactionNormalizer;