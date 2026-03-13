import { 
  ParsedDocument, 
  DocumentType, 
  BankType, 
  OCRResult, 
  Transaction, 
  TransactionType, 
  Balance, 
  BalanceType, 
  DocumentSummary,
  ParsedMetadata,
  ParsingError
} from '@/types';
import { parserLogger } from '@/utils/logger';
import { validateAmount, validateDate } from '@/utils/validators';

export class CreditCardParser {
  public async parse(ocrResult: OCRResult, documentId: string): Promise<ParsedDocument> {
    const startTime = Date.now();

    try {
      parserLogger.info('Starting credit card statement parsing', { documentId });

      const text = ocrResult.text;

      // Extract basic information
      const accountNumber = await this.extractCardNumber(text);
      const accountHolder = await this.extractCardHolderName(text);
      const statementPeriod = await this.extractStatementPeriod(text);
      const bankType = await this.detectBankType(text);

      // Extract transactions
      const transactions = await this.extractTransactions(text);

      // Extract balances (credit limit, outstanding balance, etc.)
      const balances = await this.extractBalances(text);

      // Calculate summary
      const summary = this.calculateSummary(transactions, statementPeriod);

      // Create metadata
      const metadata: ParsedMetadata = {
        parsingEngine: 'credit-card-parser',
        parsingTime: Date.now() - startTime,
        confidence: this.calculateOverallConfidence(transactions, ocrResult.confidence),
        errors: [],
        warnings: [],
        extractedOn: new Date()
      };

      const parsedDocument: ParsedDocument = {
        documentType: DocumentType.CREDIT_CARD_STATEMENT,
        bankType,
        accountNumber,
        accountHolder,
        statementPeriod,
        transactions,
        balances,
        summary,
        metadata
      };

      parserLogger.info('Credit card statement parsing completed', {
        documentId,
        bankType,
        transactionCount: transactions.length
      });

      return parsedDocument;

    } catch (error) {
      parserLogger.error('Credit card statement parsing failed', {
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new ParsingError(
        `Credit card statement parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        DocumentType.CREDIT_CARD_STATEMENT
      );
    }
  }

  private async detectBankType(text: string): Promise<BankType> {
    const normalizedText = text.toLowerCase();

    const bankPatterns = {
      [BankType.HDFC]: /hdfc\s*bank|hdfc\s*credit/i,
      [BankType.SBI]: /state\s*bank\s*of\s*india|sbi\s*card/i,
      [BankType.ICICI]: /icici\s*bank|icici\s*credit/i,
      [BankType.AXIS]: /axis\s*bank|axis\s*credit/i,
      [BankType.KOTAK]: /kotak\s*mahindra|kotak\s*credit/i,
      [BankType.INDUSIND]: /indusind\s*bank|indusind\s*credit/i,
      [BankType.YES_BANK]: /yes\s*bank|yes\s*credit/i
    };

    for (const [bankType, pattern] of Object.entries(bankPatterns)) {
      if (pattern.test(normalizedText)) {
        return bankType as BankType;
      }
    }

    return BankType.UNKNOWN;
  }

  private async extractCardNumber(text: string): Promise<string> {
    try {
      // Credit card number patterns (masked)
      const patterns = [
        /card\s*number\s*:?\s*(\d{4}\s*\*+\s*\*+\s*\d{4})/i,
        /(\d{4}\s*\*+\s*\*+\s*\d{4})/,
        /card\s*no\.?\s*:?\s*(\d{4}\s*\*+\s*\*+\s*\d{4})/i
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const cardNumber = match[1].replace(/\s/g, '');
          parserLogger.debug('Card number extracted', { cardNumber });
          return cardNumber;
        }
      }

      throw new Error('Card number not found');

    } catch (error) {
      parserLogger.warn('Failed to extract card number', { error });
      return 'UNKNOWN';
    }
  }

  private async extractCardHolderName(text: string): Promise<string> {
    try {
      const patterns = [
        /card\s*holder\s*:?\s*(.+?)(?:\n|$)/i,
        /name\s*:?\s*(.+?)(?:\n|card)/i,
        /(?:mr\.?|mrs\.?|ms\.?|dr\.?)\s+([a-z\s]+)/i
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const cardHolder = match[1].trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '')
            .toUpperCase();
          
          if (cardHolder.length > 2) {
            parserLogger.debug('Card holder extracted', { cardHolder });
            return cardHolder;
          }
        }
      }

      return 'UNKNOWN';

    } catch (error) {
      parserLogger.warn('Failed to extract card holder', { error });
      return 'UNKNOWN';
    }
  }

  private async extractStatementPeriod(text: string): Promise<{
    from: Date;
    to: Date;
  }> {
    try {
      const patterns = [
        /statement\s*period\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*to\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /billing\s*period\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*to\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /from\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*to\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1] && match[2]) {
          const fromDateValidation = validateDate(match[1]);
          const toDateValidation = validateDate(match[2]);

          if (fromDateValidation.isValid && toDateValidation.isValid) {
            return {
              from: fromDateValidation.date!,
              to: toDateValidation.date!
            };
          }
        }
      }

      // Fallback to current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      return { from: firstDay, to: lastDay };

    } catch (error) {
      parserLogger.warn('Failed to extract statement period', { error });
      
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      return { from: firstDay, to: lastDay };
    }
  }

  private async extractTransactions(text: string): Promise<Transaction[]> {
    try {
      parserLogger.debug('Extracting credit card transactions');

      const transactions: Transaction[] = [];
      const lines = text.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.length < 10) continue;

        const transaction = await this.parseTransactionLine(line, i);
        if (transaction) {
          transactions.push(transaction);
        }
      }

      // Sort by date
      transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

      parserLogger.info('Credit card transactions extracted', {
        count: transactions.length
      });

      return transactions;

    } catch (error) {
      parserLogger.error('Failed to extract transactions', { error });
      return [];
    }
  }

  private async parseTransactionLine(line: string, lineNumber: number): Promise<Transaction | null> {
    try {
      // Credit card transaction patterns
      const patterns = [
        // Date | Description | Amount
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\d,]+\.?\d*)/,
        // Date Description Amount (Credit)
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\d,]+\.?\d*)\s*(cr)?/i
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        
        if (match && match[1] && match[2] && match[3]) {
          // Validate date
          const dateValidation = validateDate(match[1]);
          if (!dateValidation.isValid) continue;

          // Clean description
          let description = match[2].trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s\-\.\/]/g, ' ')
            .trim();

          if (description.length < 3) continue;

          // Validate amount
          const amountValidation = validateAmount(match[3]);
          if (!amountValidation.isValid) continue;

          // Determine transaction type
          let transactionType = TransactionType.DEBIT; // Default for credit cards

          // Check for credit indicator
          if (match[4]?.toLowerCase() === 'cr') {
            transactionType = TransactionType.CREDIT;
          }

          // Check description for credit keywords
          const creditKeywords = ['payment', 'credit', 'refund', 'cashback', 'reward'];
          if (creditKeywords.some(keyword => description.toLowerCase().includes(keyword))) {
            transactionType = TransactionType.CREDIT;
          }

          // Calculate confidence
          let confidence = 75;
          if (description.length > 10) confidence += 10;
          if (amountValidation.amount! > 0) confidence += 10;
          if (match[4]) confidence += 5; // Has type indicator

          const transaction: Transaction = {
            date: dateValidation.date!,
            description,
            amount: amountValidation.amount!,
            type: transactionType,
            confidence: Math.min(confidence, 100),
            rawText: line
          };

          return transaction;
        }
      }

      return null;

    } catch (error) {
      parserLogger.debug('Failed to parse transaction line', {
        line,
        lineNumber,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  private async extractBalances(text: string): Promise<Balance[]> {
    try {
      const balances: Balance[] = [];

      // Credit limit
      const limitPatterns = [
        /credit\s+limit\s*:?\s*([\d,]+\.?\d*)/i,
        /limit\s*:?\s*([\d,]+\.?\d*)/i
      ];

      for (const pattern of limitPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const amountValidation = validateAmount(match[1]);
          if (amountValidation.isValid) {
            balances.push({
              amount: amountValidation.amount!,
              date: new Date(),
              type: BalanceType.CURRENT // Represents credit limit
            });
            break;
          }
        }
      }

      // Outstanding balance
      const outstandingPatterns = [
        /outstanding\s+balance\s*:?\s*([\d,]+\.?\d*)/i,
        /total\s+outstanding\s*:?\s*([\d,]+\.?\d*)/i,
        /amount\s+due\s*:?\s*([\d,]+\.?\d*)/i
      ];

      for (const pattern of outstandingPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const amountValidation = validateAmount(match[1]);
          if (amountValidation.isValid) {
            balances.push({
              amount: amountValidation.amount!,
              date: new Date(),
              type: BalanceType.CLOSING // Represents outstanding amount
            });
            break;
          }
        }
      }

      parserLogger.debug('Credit card balances extracted', { count: balances.length });
      return balances;

    } catch (error) {
      parserLogger.warn('Failed to extract balances', { error });
      return [];
    }
  }

  private calculateSummary(
    transactions: Transaction[],
    statementPeriod: { from: Date; to: Date }
  ): DocumentSummary {
    const totalDebits = transactions
      .filter(t => t.type === TransactionType.DEBIT)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalCredits = transactions
      .filter(t => t.type === TransactionType.CREDIT)
      .reduce((sum, t) => sum + t.amount, 0);

    const statementPeriodDays = Math.ceil(
      (statementPeriod.to.getTime() - statementPeriod.from.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      totalTransactions: transactions.length,
      totalDebits,
      totalCredits,
      statementPeriodDays
    };
  }

  private calculateOverallConfidence(transactions: Transaction[], ocrConfidence: number): number {
    if (transactions.length === 0) return 0;

    const avgTransactionConfidence = transactions.reduce((sum, t) => sum + t.confidence, 0) / transactions.length;
    
    return Math.round((ocrConfidence * 0.6) + (avgTransactionConfidence * 0.4));
  }
}

export default CreditCardParser;