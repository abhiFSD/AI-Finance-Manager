import moment from 'moment';
import { 
  ParsedDocument, 
  DocumentType, 
  BankType, 
  OCRResult, 
  Transaction, 
  TransactionType, 
  Balance, 
  BalanceType, 
  BankParserConfig,
  DocumentSummary,
  ParsedMetadata,
  ParsingError
} from '@/types';
import { parserLogger } from '@/utils/logger';
import { validateAmount, validateDate } from '@/utils/validators';
import { PatternMatcher } from './pattern-matcher';

export class BankStatementParser {
  private patternMatcher: PatternMatcher;
  private bankConfigs: Map<BankType, BankParserConfig>;

  constructor() {
    this.patternMatcher = new PatternMatcher();
    this.initializeBankConfigs();
  }

  public async parse(ocrResult: OCRResult, documentId: string): Promise<ParsedDocument> {
    const startTime = Date.now();

    try {
      parserLogger.info('Starting bank statement parsing', { documentId });

      // Detect bank type
      const bankType = await this.detectBankType(ocrResult.text);
      const config = this.bankConfigs.get(bankType);

      if (!config) {
        throw new ParsingError(
          `No parser configuration found for bank type: ${bankType}`,
          DocumentType.BANK_STATEMENT,
          bankType
        );
      }

      // Extract basic information
      const accountNumber = await this.extractAccountNumber(ocrResult.text, config);
      const accountHolder = await this.extractAccountHolder(ocrResult.text, config);
      const statementPeriod = await this.extractStatementPeriod(ocrResult.text, config);

      // Extract transactions
      const transactions = await this.extractTransactions(ocrResult.text, config);

      // Extract balances
      const balances = await this.extractBalances(ocrResult.text, config);

      // Calculate summary
      const summary = this.calculateSummary(transactions, statementPeriod);

      // Create metadata
      const metadata: ParsedMetadata = {
        parsingEngine: 'bank-statement-parser',
        parsingTime: Date.now() - startTime,
        confidence: this.calculateOverallConfidence(transactions, ocrResult.confidence),
        errors: [],
        warnings: [],
        extractedOn: new Date()
      };

      const parsedDocument: ParsedDocument = {
        documentType: DocumentType.BANK_STATEMENT,
        bankType,
        accountNumber,
        accountHolder,
        statementPeriod,
        transactions,
        balances,
        summary,
        metadata
      };

      parserLogger.info('Bank statement parsing completed', {
        documentId,
        bankType,
        transactionCount: transactions.length,
        balanceCount: balances.length
      });

      return parsedDocument;

    } catch (error) {
      parserLogger.error('Bank statement parsing failed', {
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new ParsingError(
        `Bank statement parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        DocumentType.BANK_STATEMENT
      );
    }
  }

  private async detectBankType(text: string): Promise<BankType> {
    const normalizedText = text.toLowerCase();

    const bankPatterns = {
      [BankType.HDFC]: /hdfc\s*bank|housing\s*development\s*finance/i,
      [BankType.SBI]: /state\s*bank\s*of\s*india|sbi/i,
      [BankType.ICICI]: /icici\s*bank/i,
      [BankType.AXIS]: /axis\s*bank/i,
      [BankType.PNB]: /punjab\s*national\s*bank|pnb/i,
      [BankType.KOTAK]: /kotak\s*mahindra\s*bank|kotak/i,
      [BankType.INDUSIND]: /indusind\s*bank/i,
      [BankType.YES_BANK]: /yes\s*bank/i,
      [BankType.BOI]: /bank\s*of\s*india/i
    };

    for (const [bankType, pattern] of Object.entries(bankPatterns)) {
      if (pattern.test(normalizedText)) {
        return bankType as BankType;
      }
    }

    return BankType.UNKNOWN;
  }

  private async extractAccountNumber(text: string, config: BankParserConfig): Promise<string> {
    try {
      const matches = text.match(config.patterns.accountPattern);
      
      if (matches && matches[1]) {
        const accountNumber = matches[1].replace(/\s/g, '');
        parserLogger.debug('Account number extracted', { accountNumber });
        return accountNumber;
      }

      // Fallback patterns
      const fallbackPatterns = [
        /account\s*number\s*:?\s*(\d+)/i,
        /a\/c\s*no\.?\s*:?\s*(\d+)/i,
        /account\s*no\.?\s*:?\s*(\d+)/i
      ];

      for (const pattern of fallbackPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const accountNumber = match[1].replace(/\s/g, '');
          parserLogger.debug('Account number extracted with fallback pattern', { accountNumber });
          return accountNumber;
        }
      }

      throw new Error('Account number not found');

    } catch (error) {
      parserLogger.warn('Failed to extract account number', { error });
      throw new ParsingError('Could not extract account number from statement');
    }
  }

  private async extractAccountHolder(text: string, config: BankParserConfig): Promise<string> {
    try {
      // Common patterns for account holder name
      const patterns = [
        /account\s*holder\s*:?\s*(.+?)(?:\n|$)/i,
        /name\s*:?\s*(.+?)(?:\n|account)/i,
        /customer\s*name\s*:?\s*(.+?)(?:\n|$)/i,
        /(?:mr\.?|mrs\.?|ms\.?|dr\.?)\s+([a-z\s]+)/i
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const accountHolder = match[1].trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '')
            .toUpperCase();
          
          if (accountHolder.length > 2) {
            parserLogger.debug('Account holder extracted', { accountHolder });
            return accountHolder;
          }
        }
      }

      throw new Error('Account holder name not found');

    } catch (error) {
      parserLogger.warn('Failed to extract account holder', { error });
      return 'UNKNOWN';
    }
  }

  private async extractStatementPeriod(text: string, config: BankParserConfig): Promise<{
    from: Date;
    to: Date;
  }> {
    try {
      // Common patterns for statement period
      const patterns = [
        /from\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*to\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /period\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*to\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /statement\s*period\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*to\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1] && match[2]) {
          const fromDateValidation = validateDate(match[1]);
          const toDateValidation = validateDate(match[2]);

          if (fromDateValidation.isValid && toDateValidation.isValid) {
            parserLogger.debug('Statement period extracted', {
              from: fromDateValidation.date,
              to: toDateValidation.date
            });

            return {
              from: fromDateValidation.date!,
              to: toDateValidation.date!
            };
          }
        }
      }

      // Fallback: try to find date range from transaction dates
      const transactions = await this.extractTransactions(text, config);
      if (transactions.length >= 2) {
        const dates = transactions.map(t => t.date).sort((a, b) => a.getTime() - b.getTime());
        return {
          from: dates[0],
          to: dates[dates.length - 1]
        };
      }

      throw new Error('Statement period not found');

    } catch (error) {
      parserLogger.warn('Failed to extract statement period', { error });
      
      // Return current month as fallback
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      return {
        from: firstDay,
        to: lastDay
      };
    }
  }

  private async extractTransactions(text: string, config: BankParserConfig): Promise<Transaction[]> {
    try {
      parserLogger.debug('Extracting transactions from statement');

      const transactions: Transaction[] = [];
      const lines = text.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Try to match transaction pattern
        const match = line.match(config.patterns.transactionPattern);
        
        if (match) {
          try {
            const transaction = await this.parseTransactionLine(line, config, i);
            if (transaction) {
              transactions.push(transaction);
            }
          } catch (parseError) {
            parserLogger.debug('Failed to parse transaction line', {
              line,
              lineNumber: i + 1,
              error: parseError
            });
          }
        }
      }

      // Sort transactions by date
      transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

      parserLogger.info('Transactions extracted', {
        count: transactions.length
      });

      return transactions;

    } catch (error) {
      parserLogger.error('Failed to extract transactions', { error });
      return [];
    }
  }

  private async parseTransactionLine(
    line: string, 
    config: BankParserConfig, 
    lineNumber: number
  ): Promise<Transaction | null> {
    try {
      // Common transaction line patterns for Indian banks
      const patterns = [
        // Date | Description | Amount | Balance
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\d,]+\.?\d*)\s*([\d,]+\.?\d*)?/,
        // Date Description Amount Dr/Cr Balance
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\d,]+\.?\d*)\s*(dr|cr)?\s*([\d,]+\.?\d*)?/i,
        // More flexible pattern
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})(.+)/
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        
        if (match) {
          // Extract date
          const dateValidation = validateDate(match[1]);
          if (!dateValidation.isValid) continue;

          // Extract description
          let description = match[2]?.trim();
          if (!description || description.length < 3) continue;

          // Clean up description
          description = description
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s\-\.\/]/g, ' ')
            .trim();

          // Extract amount
          let amountStr = '';
          let transactionType = TransactionType.DEBIT;
          let balance: number | undefined;

          // Different parsing based on pattern match
          if (match[3]) {
            amountStr = match[3];
            
            // Check for Dr/Cr indicator
            if (match[4]?.toLowerCase() === 'cr') {
              transactionType = TransactionType.CREDIT;
            }
            
            // Balance might be in match[4] or match[5]
            if (match[5]) {
              const balanceValidation = validateAmount(match[5]);
              if (balanceValidation.isValid) {
                balance = balanceValidation.amount;
              }
            } else if (match[4] && !['dr', 'cr'].includes(match[4].toLowerCase())) {
              const balanceValidation = validateAmount(match[4]);
              if (balanceValidation.isValid) {
                balance = balanceValidation.amount;
              }
            }
          } else {
            // Try to extract amount from description
            const amountMatch = description.match(/([\d,]+\.?\d*)/);
            if (amountMatch) {
              amountStr = amountMatch[1];
              description = description.replace(amountMatch[0], '').trim();
            }
          }

          // Validate amount
          const amountValidation = validateAmount(amountStr);
          if (!amountValidation.isValid) continue;

          // Determine transaction type from keywords if not already determined
          if (match[4]?.toLowerCase() !== 'cr') {
            const creditKeywords = ['credit', 'deposit', 'salary', 'transfer in', 'refund'];
            const debitKeywords = ['debit', 'withdrawal', 'payment', 'purchase', 'fee'];
            
            const descLower = description.toLowerCase();
            
            if (creditKeywords.some(keyword => descLower.includes(keyword))) {
              transactionType = TransactionType.CREDIT;
            } else if (debitKeywords.some(keyword => descLower.includes(keyword))) {
              transactionType = TransactionType.DEBIT;
            }
          }

          // Calculate confidence based on parsing quality
          let confidence = 70; // Base confidence
          
          if (balance !== undefined) confidence += 10;
          if (description.length > 10) confidence += 10;
          if (amountValidation.amount > 0) confidence += 10;
          
          const transaction: Transaction = {
            date: dateValidation.date!,
            description,
            amount: amountValidation.amount!,
            type: transactionType,
            balance,
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

  private async extractBalances(text: string, config: BankParserConfig): Promise<Balance[]> {
    try {
      const balances: Balance[] = [];

      // Opening balance patterns
      const openingPatterns = [
        /opening\s+balance\s*:?\s*([\d,]+\.?\d*)/i,
        /balance\s+b\/f\s*:?\s*([\d,]+\.?\d*)/i,
        /brought\s+forward\s*:?\s*([\d,]+\.?\d*)/i
      ];

      // Closing balance patterns
      const closingPatterns = [
        /closing\s+balance\s*:?\s*([\d,]+\.?\d*)/i,
        /balance\s+c\/f\s*:?\s*([\d,]+\.?\d*)/i,
        /carried\s+forward\s*:?\s*([\d,]+\.?\d*)/i
      ];

      // Extract opening balance
      for (const pattern of openingPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const amountValidation = validateAmount(match[1]);
          if (amountValidation.isValid) {
            balances.push({
              amount: amountValidation.amount!,
              date: new Date(), // This would be the statement start date
              type: BalanceType.OPENING
            });
            break;
          }
        }
      }

      // Extract closing balance
      for (const pattern of closingPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const amountValidation = validateAmount(match[1]);
          if (amountValidation.isValid) {
            balances.push({
              amount: amountValidation.amount!,
              date: new Date(), // This would be the statement end date
              type: BalanceType.CLOSING
            });
            break;
          }
        }
      }

      parserLogger.debug('Balances extracted', { count: balances.length });
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
    
    // Weighted average: 60% OCR confidence, 40% parsing confidence
    return Math.round((ocrConfidence * 0.6) + (avgTransactionConfidence * 0.4));
  }

  private initializeBankConfigs(): void {
    this.bankConfigs = new Map();

    // HDFC Bank configuration
    this.bankConfigs.set(BankType.HDFC, {
      bankType: BankType.HDFC,
      patterns: {
        transactionPattern: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\d,]+\.?\d*)/,
        datePattern: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
        amountPattern: /([\d,]+\.?\d*)/,
        balancePattern: /balance\s*:?\s*([\d,]+\.?\d*)/i,
        accountPattern: /account\s*number\s*:?\s*(\d+)/i
      },
      dateFormat: 'DD/MM/YYYY',
      currency: 'INR',
      statementIdentifiers: ['hdfc', 'statement of account']
    });

    // SBI Bank configuration
    this.bankConfigs.set(BankType.SBI, {
      bankType: BankType.SBI,
      patterns: {
        transactionPattern: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\d,]+\.?\d*)/,
        datePattern: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
        amountPattern: /([\d,]+\.?\d*)/,
        balancePattern: /balance\s*:?\s*([\d,]+\.?\d*)/i,
        accountPattern: /account\s*number\s*:?\s*(\d+)/i
      },
      dateFormat: 'DD/MM/YYYY',
      currency: 'INR',
      statementIdentifiers: ['sbi', 'state bank of india']
    });

    // Add more bank configurations as needed...
  }
}

export default BankStatementParser;