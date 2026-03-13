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

export class LoanStatementParser {
  public async parse(ocrResult: OCRResult, documentId: string): Promise<ParsedDocument> {
    const startTime = Date.now();

    try {
      parserLogger.info('Starting loan statement parsing', { documentId });

      const text = ocrResult.text;

      // Extract basic information
      const accountNumber = await this.extractLoanNumber(text);
      const accountHolder = await this.extractBorrowerName(text);
      const statementPeriod = await this.extractStatementPeriod(text);
      const bankType = await this.detectBankType(text);

      // Extract loan transactions (EMI payments, interest, principal)
      const transactions = await this.extractLoanTransactions(text);

      // Extract balances (outstanding balance, principal paid)
      const balances = await this.extractBalances(text);

      // Calculate summary
      const summary = this.calculateSummary(transactions, statementPeriod);

      // Create metadata with loan-specific information
      const metadata: ParsedMetadata = {
        parsingEngine: 'loan-statement-parser',
        parsingTime: Date.now() - startTime,
        confidence: this.calculateOverallConfidence(transactions, ocrResult.confidence),
        errors: [],
        warnings: [],
        extractedOn: new Date(),
        loanDetails: await this.extractLoanDetails(text)
      };

      const parsedDocument: ParsedDocument = {
        documentType: DocumentType.LOAN_STATEMENT,
        bankType,
        accountNumber,
        accountHolder,
        statementPeriod,
        transactions,
        balances,
        summary,
        metadata
      };

      parserLogger.info('Loan statement parsing completed', {
        documentId,
        bankType,
        transactionCount: transactions.length
      });

      return parsedDocument;

    } catch (error) {
      parserLogger.error('Loan statement parsing failed', {
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new ParsingError(
        `Loan statement parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        DocumentType.LOAN_STATEMENT
      );
    }
  }

  private async detectBankType(text: string): Promise<BankType> {
    const normalizedText = text.toLowerCase();

    const bankPatterns = {
      [BankType.HDFC]: /hdfc\s*bank|hdfc\s*home\s*loans|housing\s*development\s*finance/i,
      [BankType.SBI]: /state\s*bank\s*of\s*india|sbi\s*home\s*loan/i,
      [BankType.ICICI]: /icici\s*bank|icici\s*home\s*finance/i,
      [BankType.AXIS]: /axis\s*bank|axis\s*home\s*loan/i,
      [BankType.PNB]: /punjab\s*national\s*bank|pnb\s*housing/i,
      [BankType.KOTAK]: /kotak\s*mahindra|kotak\s*home\s*loan/i,
      [BankType.INDUSIND]: /indusind\s*bank|indusind\s*home/i,
      [BankType.YES_BANK]: /yes\s*bank|yes\s*home\s*loan/i
    };

    for (const [bankType, pattern] of Object.entries(bankPatterns)) {
      if (pattern.test(normalizedText)) {
        return bankType as BankType;
      }
    }

    return BankType.UNKNOWN;
  }

  private async extractLoanNumber(text: string): Promise<string> {
    try {
      const patterns = [
        /loan\s*account\s*number\s*:?\s*([A-Z0-9]+)/i,
        /loan\s*number\s*:?\s*([A-Z0-9]+)/i,
        /loan\s*no\.?\s*:?\s*([A-Z0-9]+)/i,
        /account\s*number\s*:?\s*([A-Z0-9]+)/i
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const loanNumber = match[1].trim();
          parserLogger.debug('Loan number extracted', { loanNumber });
          return loanNumber;
        }
      }

      return 'UNKNOWN';

    } catch (error) {
      parserLogger.warn('Failed to extract loan number', { error });
      return 'UNKNOWN';
    }
  }

  private async extractBorrowerName(text: string): Promise<string> {
    try {
      const patterns = [
        /borrower\s*name\s*:?\s*(.+?)(?:\n|$)/i,
        /customer\s*name\s*:?\s*(.+?)(?:\n|$)/i,
        /name\s*:?\s*(.+?)(?:\n|loan)/i,
        /(?:mr\.?|mrs\.?|ms\.?|dr\.?)\s+([a-z\s]+)/i
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const borrowerName = match[1].trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '')
            .toUpperCase();
          
          if (borrowerName.length > 2) {
            parserLogger.debug('Borrower name extracted', { borrowerName });
            return borrowerName;
          }
        }
      }

      return 'UNKNOWN';

    } catch (error) {
      parserLogger.warn('Failed to extract borrower name', { error });
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

  private async extractLoanTransactions(text: string): Promise<Transaction[]> {
    try {
      parserLogger.debug('Extracting loan transactions');

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

      parserLogger.info('Loan transactions extracted', {
        count: transactions.length
      });

      return transactions;

    } catch (error) {
      parserLogger.error('Failed to extract loan transactions', { error });
      return [];
    }
  }

  private async parseTransactionLine(line: string, lineNumber: number): Promise<Transaction | null> {
    try {
      // Loan transaction patterns
      const patterns = [
        // Date | Description | EMI | Principal | Interest | Outstanding
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(emi|payment|interest|principal)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i,
        // Date | Description | Amount
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\d,]+\.?\d*)/,
        // EMI specific pattern
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+emi\s+(.+?)\s+([\d,]+\.?\d*)/i
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        
        if (match && match[1] && match[2] && match[3]) {
          // Validate date
          const dateValidation = validateDate(match[1]);
          if (!dateValidation.isValid) continue;

          // Extract description and determine type
          let description = match[2].trim();
          let transactionType = TransactionType.DEBIT; // Default (payment)

          // Determine transaction type based on keywords
          const lowerDesc = description.toLowerCase();
          if (lowerDesc.includes('disbursement') || lowerDesc.includes('loan') && lowerDesc.includes('credit')) {
            transactionType = TransactionType.CREDIT; // Loan disbursement
          } else if (lowerDesc.includes('emi') || lowerDesc.includes('payment') || lowerDesc.includes('interest')) {
            transactionType = TransactionType.DEBIT; // Payment
          }

          // Validate amount
          const amountValidation = validateAmount(match[3]);
          if (!amountValidation.isValid) continue;

          // Extract loan-specific components
          const principal = match[4] ? parseFloat(match[4].replace(/,/g, '')) : undefined;
          const interest = match[5] ? parseFloat(match[5].replace(/,/g, '')) : undefined;
          const outstanding = match[6] ? parseFloat(match[6].replace(/,/g, '')) : undefined;

          // Calculate confidence
          let confidence = 70;
          if (description.length > 5) confidence += 10;
          if (amountValidation.amount! > 0) confidence += 10;
          if (principal && interest) confidence += 10; // Has detailed loan breakdown

          const transaction: Transaction = {
            date: dateValidation.date!,
            description: description,
            amount: amountValidation.amount!,
            type: transactionType,
            balance: outstanding,
            confidence: Math.min(confidence, 100),
            rawText: line,
            // Store loan-specific metadata
            metadata: {
              principal,
              interest,
              outstanding,
              transactionType: this.determineLoanTransactionType(description)
            }
          };

          return transaction;
        }
      }

      return null;

    } catch (error) {
      parserLogger.debug('Failed to parse loan transaction line', {
        line,
        lineNumber,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  private determineLoanTransactionType(description: string): string {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('emi')) return 'EMI';
    if (lowerDesc.includes('principal')) return 'Principal Payment';
    if (lowerDesc.includes('interest')) return 'Interest Payment';
    if (lowerDesc.includes('disbursement')) return 'Loan Disbursement';
    if (lowerDesc.includes('prepayment')) return 'Prepayment';
    if (lowerDesc.includes('penalty')) return 'Penalty';
    if (lowerDesc.includes('processing')) return 'Processing Fee';
    
    return 'Other';
  }

  private async extractBalances(text: string): Promise<Balance[]> {
    try {
      const balances: Balance[] = [];

      // Outstanding balance
      const outstandingPatterns = [
        /outstanding\s+balance\s*:?\s*([\d,]+\.?\d*)/i,
        /loan\s+outstanding\s*:?\s*([\d,]+\.?\d*)/i,
        /principal\s+outstanding\s*:?\s*([\d,]+\.?\d*)/i
      ];

      for (const pattern of outstandingPatterns) {
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

      // Total loan amount
      const loanAmountPatterns = [
        /loan\s+amount\s*:?\s*([\d,]+\.?\d*)/i,
        /sanctioned\s+amount\s*:?\s*([\d,]+\.?\d*)/i,
        /principal\s+amount\s*:?\s*([\d,]+\.?\d*)/i
      ];

      for (const pattern of loanAmountPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const amountValidation = validateAmount(match[1]);
          if (amountValidation.isValid) {
            balances.push({
              amount: amountValidation.amount!,
              date: new Date(),
              type: BalanceType.OPENING, // Original loan amount
              metadata: { type: 'original_loan_amount' }
            });
            break;
          }
        }
      }

      parserLogger.debug('Loan balances extracted', { count: balances.length });
      return balances;

    } catch (error) {
      parserLogger.warn('Failed to extract balances', { error });
      return [];
    }
  }

  private async extractLoanDetails(text: string): Promise<any> {
    try {
      const details: any = {};

      // Interest rate
      const rateMatch = text.match(/interest\s+rate\s*:?\s*([\d.]+)%?/i);
      if (rateMatch) {
        details.interestRate = parseFloat(rateMatch[1]);
      }

      // Loan tenure
      const tenureMatch = text.match(/tenure\s*:?\s*(\d+)\s*(years?|months?)/i);
      if (tenureMatch) {
        details.tenure = parseInt(tenureMatch[1]);
        details.tenureUnit = tenureMatch[2].toLowerCase();
      }

      // EMI amount
      const emiMatch = text.match(/emi\s*:?\s*([\d,]+\.?\d*)/i);
      if (emiMatch) {
        const amountValidation = validateAmount(emiMatch[1]);
        if (amountValidation.isValid) {
          details.emiAmount = amountValidation.amount;
        }
      }

      // Loan type
      const typeMatch = text.match(/(home\s+loan|personal\s+loan|car\s+loan|education\s+loan)/i);
      if (typeMatch) {
        details.loanType = typeMatch[1];
      }

      return details;

    } catch (error) {
      parserLogger.warn('Failed to extract loan details', { error });
      return {};
    }
  }

  private calculateSummary(
    transactions: Transaction[],
    statementPeriod: { from: Date; to: Date }
  ): DocumentSummary {
    const payments = transactions.filter(t => t.type === TransactionType.DEBIT);
    const disbursements = transactions.filter(t => t.type === TransactionType.CREDIT);

    const totalDebits = payments.reduce((sum, t) => sum + t.amount, 0);
    const totalCredits = disbursements.reduce((sum, t) => sum + t.amount, 0);

    // Calculate total principal and interest from metadata
    let totalPrincipal = 0;
    let totalInterest = 0;
    
    for (const transaction of payments) {
      if (transaction.metadata?.principal) {
        totalPrincipal += transaction.metadata.principal;
      }
      if (transaction.metadata?.interest) {
        totalInterest += transaction.metadata.interest;
      }
    }

    const statementPeriodDays = Math.ceil(
      (statementPeriod.to.getTime() - statementPeriod.from.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      totalTransactions: transactions.length,
      totalDebits, // Total payments
      totalCredits, // Total disbursements
      statementPeriodDays,
      // Loan-specific summary
      metadata: {
        totalPayments: payments.length,
        totalDisbursements: disbursements.length,
        totalPrincipalPaid: totalPrincipal,
        totalInterestPaid: totalInterest,
        netPayment: totalDebits - totalCredits
      }
    };
  }

  private calculateOverallConfidence(transactions: Transaction[], ocrConfidence: number): number {
    if (transactions.length === 0) return 0;

    const avgTransactionConfidence = transactions.reduce((sum, t) => sum + t.confidence, 0) / transactions.length;
    
    return Math.round((ocrConfidence * 0.6) + (avgTransactionConfidence * 0.4));
  }
}

export default LoanStatementParser;