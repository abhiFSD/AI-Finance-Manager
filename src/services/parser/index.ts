import { 
  ParsedDocument, 
  DocumentType, 
  BankType, 
  OCRResult, 
  ParsingError, 
  ApiResponse 
} from '@/types';
import { parserLogger } from '@/utils/logger';
import { BankStatementParser } from './bank-statement-parser';
import { CreditCardParser } from './credit-card-parser';
import { InvestmentParser } from './investment-parser';
import { LoanStatementParser } from './loan-statement-parser';
import { PatternMatcher } from './pattern-matcher';

export class DocumentParserService {
  private bankStatementParser: BankStatementParser;
  private creditCardParser: CreditCardParser;
  private investmentParser: InvestmentParser;
  private loanStatementParser: LoanStatementParser;
  private patternMatcher: PatternMatcher;

  constructor() {
    this.bankStatementParser = new BankStatementParser();
    this.creditCardParser = new CreditCardParser();
    this.investmentParser = new InvestmentParser();
    this.loanStatementParser = new LoanStatementParser();
    this.patternMatcher = new PatternMatcher();
  }

  public async parseDocument(
    ocrResult: OCRResult, 
    documentId: string,
    expectedType?: DocumentType
  ): Promise<ApiResponse<ParsedDocument>> {
    const startTime = Date.now();

    try {
      parserLogger.info('Starting document parsing', { 
        documentId, 
        textLength: ocrResult.text.length,
        expectedType,
        ocrEngine: ocrResult.engine,
        ocrConfidence: ocrResult.confidence
      });

      // Detect document type if not provided
      const documentType = expectedType || await this.detectDocumentType(ocrResult.text);
      
      parserLogger.info('Document type detected', { 
        documentId, 
        documentType 
      });

      let parsedDocument: ParsedDocument;

      switch (documentType) {
        case DocumentType.BANK_STATEMENT:
          parsedDocument = await this.bankStatementParser.parse(ocrResult, documentId);
          break;
        
        case DocumentType.CREDIT_CARD_STATEMENT:
          parsedDocument = await this.creditCardParser.parse(ocrResult, documentId);
          break;
        
        case DocumentType.INVESTMENT_STATEMENT:
          parsedDocument = await this.investmentParser.parse(ocrResult, documentId);
          break;
        
        case DocumentType.LOAN_STATEMENT:
          parsedDocument = await this.loanStatementParser.parse(ocrResult, documentId);
          break;
        
        default:
          throw new ParsingError(
            `Unsupported document type: ${documentType}`,
            documentType
          );
      }

      const parsingTime = Date.now() - startTime;
      parsedDocument.metadata.parsingTime = parsingTime;
      parsedDocument.metadata.extractedOn = new Date();

      parserLogger.info('Document parsing completed', {
        documentId,
        documentType,
        bankType: parsedDocument.bankType,
        transactionCount: parsedDocument.transactions.length,
        confidence: parsedDocument.metadata.confidence,
        parsingTime
      });

      // Validate parsing result
      const validationResult = this.validateParsedDocument(parsedDocument);
      if (!validationResult.isValid) {
        parserLogger.warn('Parsed document failed validation', {
          documentId,
          errors: validationResult.errors
        });
        
        // Add validation errors to metadata
        parsedDocument.metadata.errors.push(...validationResult.errors);
      }

      return {
        success: true,
        data: parsedDocument
      };

    } catch (error) {
      const parsingTime = Date.now() - startTime;
      
      parserLogger.error('Document parsing failed', {
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        parsingTime
      });

      return {
        success: false,
        error: {
          code: 'DOCUMENT_PARSING_FAILED',
          message: error instanceof Error ? error.message : 'Document parsing failed',
          details: { 
            documentId, 
            parsingTime,
            ocrConfidence: ocrResult.confidence
          }
        }
      };
    }
  }

  public async detectDocumentType(text: string): Promise<DocumentType> {
    try {
      parserLogger.debug('Detecting document type', { textLength: text.length });

      const normalizedText = text.toLowerCase().replace(/\s+/g, ' ');

      // Bank statement indicators
      const bankStatementPatterns = [
        /statement\s+of\s+account/,
        /account\s+statement/,
        /transaction\s+history/,
        /account\s+summary/,
        /savings\s+account/,
        /current\s+account/,
        /opening\s+balance/,
        /closing\s+balance/,
        /account\s+number/
      ];

      // Credit card statement indicators
      const creditCardPatterns = [
        /credit\s+card\s+statement/,
        /card\s+statement/,
        /payment\s+due\s+date/,
        /minimum\s+amount\s+due/,
        /credit\s+limit/,
        /available\s+credit/,
        /outstanding\s+amount/,
        /card\s+number/
      ];

      // Investment statement indicators
      const investmentPatterns = [
        /mutual\s+fund/,
        /investment\s+statement/,
        /portfolio\s+summary/,
        /sip\s+investment/,
        /nav\s+price/,
        /fund\s+name/,
        /units/,
        /folio\s+number/
      ];

      // Loan statement indicators
      const loanStatementPatterns = [
        /loan\s+statement/,
        /loan\s+account/,
        /emi\s+details/,
        /principal\s+amount/,
        /interest\s+amount/,
        /outstanding\s+balance/,
        /loan\s+number/
      ];

      // Score each document type
      const scores = {
        [DocumentType.BANK_STATEMENT]: this.calculatePatternScore(normalizedText, bankStatementPatterns),
        [DocumentType.CREDIT_CARD_STATEMENT]: this.calculatePatternScore(normalizedText, creditCardPatterns),
        [DocumentType.INVESTMENT_STATEMENT]: this.calculatePatternScore(normalizedText, investmentPatterns),
        [DocumentType.LOAN_STATEMENT]: this.calculatePatternScore(normalizedText, loanStatementPatterns)
      };

      // Find the document type with highest score
      const bestMatch = Object.entries(scores).reduce((best, [type, score]) => 
        score > best.score ? { type: type as DocumentType, score } : best,
        { type: DocumentType.OTHER, score: 0 }
      );

      // Require minimum confidence for classification
      const minConfidenceThreshold = 2;
      if (bestMatch.score < minConfidenceThreshold) {
        parserLogger.info('Document type detection inconclusive, defaulting to OTHER', {
          scores,
          bestMatch
        });
        return DocumentType.OTHER;
      }

      parserLogger.info('Document type detected', {
        detectedType: bestMatch.type,
        confidence: bestMatch.score,
        allScores: scores
      });

      return bestMatch.type;

    } catch (error) {
      parserLogger.error('Document type detection failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return DocumentType.OTHER;
    }
  }

  public async detectBankType(text: string): Promise<BankType> {
    try {
      parserLogger.debug('Detecting bank type', { textLength: text.length });

      const normalizedText = text.toLowerCase().replace(/\s+/g, ' ');

      // Bank-specific patterns
      const bankPatterns = {
        [BankType.HDFC]: [
          /hdfc\s+bank/,
          /housing\s+development\s+finance/,
          /hdfc/
        ],
        [BankType.SBI]: [
          /state\s+bank\s+of\s+india/,
          /sbi/,
          /state\s+bank/
        ],
        [BankType.ICICI]: [
          /icici\s+bank/,
          /icici/
        ],
        [BankType.AXIS]: [
          /axis\s+bank/,
          /axis/
        ],
        [BankType.PNB]: [
          /punjab\s+national\s+bank/,
          /pnb/
        ],
        [BankType.KOTAK]: [
          /kotak\s+mahindra\s+bank/,
          /kotak/
        ],
        [BankType.INDUSIND]: [
          /indusind\s+bank/,
          /indusind/
        ],
        [BankType.YES_BANK]: [
          /yes\s+bank/,
          /yes\s+bank\s+limited/
        ],
        [BankType.BOI]: [
          /bank\s+of\s+india/,
          /boi/
        ]
      };

      // Score each bank type
      const scores: Record<BankType, number> = {} as any;
      
      for (const [bankType, patterns] of Object.entries(bankPatterns)) {
        scores[bankType as BankType] = this.calculatePatternScore(normalizedText, patterns);
      }

      // Find the bank type with highest score
      const bestMatch = Object.entries(scores).reduce((best, [type, score]) => 
        score > best.score ? { type: type as BankType, score } : best,
        { type: BankType.UNKNOWN, score: 0 }
      );

      parserLogger.info('Bank type detected', {
        detectedType: bestMatch.type,
        confidence: bestMatch.score,
        allScores: scores
      });

      return bestMatch.type;

    } catch (error) {
      parserLogger.error('Bank type detection failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return BankType.UNKNOWN;
    }
  }

  private calculatePatternScore(text: string, patterns: RegExp[]): number {
    let score = 0;
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        // Higher score for exact matches, lower for partial matches
        score += matches.length;
      }
    }
    
    return score;
  }

  private validateParsedDocument(document: ParsedDocument): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate required fields
    if (!document.accountNumber) {
      errors.push('Account number is missing');
    }

    if (!document.accountHolder) {
      errors.push('Account holder name is missing');
    }

    if (!document.statementPeriod.from || !document.statementPeriod.to) {
      errors.push('Statement period is incomplete');
    }

    // Validate transactions
    if (document.transactions.length === 0) {
      errors.push('No transactions found');
    }

    // Validate transaction data
    for (let i = 0; i < document.transactions.length; i++) {
      const transaction = document.transactions[i];
      
      if (!transaction.date) {
        errors.push(`Transaction ${i + 1}: Missing date`);
      }
      
      if (!transaction.description) {
        errors.push(`Transaction ${i + 1}: Missing description`);
      }
      
      if (transaction.amount === undefined || transaction.amount === null) {
        errors.push(`Transaction ${i + 1}: Missing amount`);
      }
      
      if (transaction.confidence < 50) {
        errors.push(`Transaction ${i + 1}: Low confidence (${transaction.confidence}%)`);
      }
    }

    // Validate summary calculations
    if (document.summary.totalTransactions !== document.transactions.length) {
      errors.push('Transaction count mismatch in summary');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public getSupportedDocumentTypes(): DocumentType[] {
    return [
      DocumentType.BANK_STATEMENT,
      DocumentType.CREDIT_CARD_STATEMENT,
      DocumentType.INVESTMENT_STATEMENT,
      DocumentType.LOAN_STATEMENT
    ];
  }

  public getSupportedBankTypes(): BankType[] {
    return [
      BankType.HDFC,
      BankType.SBI,
      BankType.ICICI,
      BankType.AXIS,
      BankType.PNB,
      BankType.KOTAK,
      BankType.INDUSIND,
      BankType.YES_BANK,
      BankType.BOI
    ];
  }
}

export default DocumentParserService;