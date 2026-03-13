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

export class InvestmentParser {
  public async parse(ocrResult: OCRResult, documentId: string): Promise<ParsedDocument> {
    const startTime = Date.now();

    try {
      parserLogger.info('Starting investment statement parsing', { documentId });

      const text = ocrResult.text;

      // Extract basic information
      const accountNumber = await this.extractFolioNumber(text);
      const accountHolder = await this.extractInvestorName(text);
      const statementPeriod = await this.extractStatementPeriod(text);

      // Extract investment transactions (SIP, purchases, redemptions)
      const transactions = await this.extractInvestmentTransactions(text);

      // Extract balances (current value, units)
      const balances = await this.extractBalances(text);

      // Calculate summary
      const summary = this.calculateSummary(transactions, statementPeriod);

      // Create metadata
      const metadata: ParsedMetadata = {
        parsingEngine: 'investment-parser',
        parsingTime: Date.now() - startTime,
        confidence: this.calculateOverallConfidence(transactions, ocrResult.confidence),
        errors: [],
        warnings: [],
        extractedOn: new Date()
      };

      const parsedDocument: ParsedDocument = {
        documentType: DocumentType.INVESTMENT_STATEMENT,
        bankType: BankType.UNKNOWN, // Investments may not have specific bank
        accountNumber,
        accountHolder,
        statementPeriod,
        transactions,
        balances,
        summary,
        metadata
      };

      parserLogger.info('Investment statement parsing completed', {
        documentId,
        transactionCount: transactions.length
      });

      return parsedDocument;

    } catch (error) {
      parserLogger.error('Investment statement parsing failed', {
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new ParsingError(
        `Investment statement parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        DocumentType.INVESTMENT_STATEMENT
      );
    }
  }

  private async extractFolioNumber(text: string): Promise<string> {
    try {
      const patterns = [
        /folio\s*number\s*:?\s*([A-Z0-9\/]+)/i,
        /folio\s*no\.?\s*:?\s*([A-Z0-9\/]+)/i,
        /folio\s*:?\s*([A-Z0-9\/]+)/i
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const folioNumber = match[1].trim();
          parserLogger.debug('Folio number extracted', { folioNumber });
          return folioNumber;
        }
      }

      return 'UNKNOWN';

    } catch (error) {
      parserLogger.warn('Failed to extract folio number', { error });
      return 'UNKNOWN';
    }
  }

  private async extractInvestorName(text: string): Promise<string> {
    try {
      const patterns = [
        /investor\s*name\s*:?\s*(.+?)(?:\n|$)/i,
        /name\s*:?\s*(.+?)(?:\n|folio)/i,
        /(?:mr\.?|mrs\.?|ms\.?|dr\.?)\s+([a-z\s]+)/i
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const investorName = match[1].trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '')
            .toUpperCase();
          
          if (investorName.length > 2) {
            parserLogger.debug('Investor name extracted', { investorName });
            return investorName;
          }
        }
      }

      return 'UNKNOWN';

    } catch (error) {
      parserLogger.warn('Failed to extract investor name', { error });
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
        /period\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*to\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
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

      // Fallback to current year
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31);
      
      return { from: yearStart, to: yearEnd };

    } catch (error) {
      parserLogger.warn('Failed to extract statement period', { error });
      
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31);
      
      return { from: yearStart, to: yearEnd };
    }
  }

  private async extractInvestmentTransactions(text: string): Promise<Transaction[]> {
    try {
      parserLogger.debug('Extracting investment transactions');

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

      parserLogger.info('Investment transactions extracted', {
        count: transactions.length
      });

      return transactions;

    } catch (error) {
      parserLogger.error('Failed to extract investment transactions', { error });
      return [];
    }
  }

  private async parseTransactionLine(line: string, lineNumber: number): Promise<Transaction | null> {
    try {
      // Investment transaction patterns
      const patterns = [
        // Date | Transaction Type | Amount | Units | NAV
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(purchase|sip|redemption|dividend)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i,
        // Date | Description | Amount
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\d,]+\.?\d*)/,
        // SIP specific pattern
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+sip\s+(.+?)\s+([\d,]+\.?\d*)/i
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        
        if (match && match[1] && match[2] && match[3]) {
          // Validate date
          const dateValidation = validateDate(match[1]);
          if (!dateValidation.isValid) continue;

          // Extract description and determine type
          let description = match[2].trim();
          let transactionType = TransactionType.DEBIT; // Default (investment)

          // Determine transaction type based on keywords
          const lowerDesc = description.toLowerCase();
          if (lowerDesc.includes('redemption') || lowerDesc.includes('dividend')) {
            transactionType = TransactionType.CREDIT;
          } else if (lowerDesc.includes('purchase') || lowerDesc.includes('sip')) {
            transactionType = TransactionType.DEBIT;
          }

          // Validate amount
          const amountValidation = validateAmount(match[3]);
          if (!amountValidation.isValid) continue;

          // Extract additional investment-specific data
          const units = match[4] ? parseFloat(match[4].replace(/,/g, '')) : undefined;
          const nav = match[5] ? parseFloat(match[5].replace(/,/g, '')) : undefined;

          // Calculate confidence
          let confidence = 70;
          if (description.length > 5) confidence += 10;
          if (amountValidation.amount! > 0) confidence += 10;
          if (units && nav) confidence += 10; // Has detailed investment data

          const transaction: Transaction = {
            date: dateValidation.date!,
            description: description,
            amount: amountValidation.amount!,
            type: transactionType,
            confidence: Math.min(confidence, 100),
            rawText: line,
            // Store investment-specific metadata
            metadata: {
              units,
              nav,
              investmentType: this.determineInvestmentType(description)
            }
          };

          return transaction;
        }
      }

      return null;

    } catch (error) {
      parserLogger.debug('Failed to parse investment transaction line', {
        line,
        lineNumber,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  private determineInvestmentType(description: string): string {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('sip')) return 'SIP';
    if (lowerDesc.includes('lump')) return 'Lumpsum';
    if (lowerDesc.includes('dividend')) return 'Dividend';
    if (lowerDesc.includes('redemption')) return 'Redemption';
    if (lowerDesc.includes('switch')) return 'Switch';
    
    return 'Other';
  }

  private async extractBalances(text: string): Promise<Balance[]> {
    try {
      const balances: Balance[] = [];

      // Current value
      const valuePatterns = [
        /current\s+value\s*:?\s*([\d,]+\.?\d*)/i,
        /market\s+value\s*:?\s*([\d,]+\.?\d*)/i,
        /total\s+value\s*:?\s*([\d,]+\.?\d*)/i
      ];

      for (const pattern of valuePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const amountValidation = validateAmount(match[1]);
          if (amountValidation.isValid) {
            balances.push({
              amount: amountValidation.amount!,
              date: new Date(),
              type: BalanceType.CURRENT
            });
            break;
          }
        }
      }

      // Units
      const unitPatterns = [
        /total\s+units\s*:?\s*([\d,]+\.?\d*)/i,
        /units\s*:?\s*([\d,]+\.?\d*)/i
      ];

      for (const pattern of unitPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const amountValidation = validateAmount(match[1]);
          if (amountValidation.isValid) {
            // Store units as a special balance type
            balances.push({
              amount: amountValidation.amount!,
              date: new Date(),
              type: BalanceType.CURRENT, // We'll use metadata to indicate this is units
              metadata: { type: 'units' }
            });
            break;
          }
        }
      }

      parserLogger.debug('Investment balances extracted', { count: balances.length });
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
    const investments = transactions.filter(t => t.type === TransactionType.DEBIT);
    const redemptions = transactions.filter(t => t.type === TransactionType.CREDIT);

    const totalDebits = investments.reduce((sum, t) => sum + t.amount, 0);
    const totalCredits = redemptions.reduce((sum, t) => sum + t.amount, 0);

    const statementPeriodDays = Math.ceil(
      (statementPeriod.to.getTime() - statementPeriod.from.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      totalTransactions: transactions.length,
      totalDebits, // Total investments
      totalCredits, // Total redemptions
      statementPeriodDays,
      // Investment-specific summary
      metadata: {
        totalInvestments: investments.length,
        totalRedemptions: redemptions.length,
        netInvestment: totalDebits - totalCredits
      }
    };
  }

  private calculateOverallConfidence(transactions: Transaction[], ocrConfidence: number): number {
    if (transactions.length === 0) return 0;

    const avgTransactionConfidence = transactions.reduce((sum, t) => sum + t.confidence, 0) / transactions.length;
    
    return Math.round((ocrConfidence * 0.6) + (avgTransactionConfidence * 0.4));
  }
}

export default InvestmentParser;