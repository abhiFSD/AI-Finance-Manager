import { parserLogger } from '@/utils/logger';
import { validateAmount, validateDate } from '@/utils/validators';

export class PatternMatcher {
  // Indian financial document patterns
  public readonly patterns = {
    // Amount patterns (Indian number format)
    amount: {
      withCommas: /₹?\s*([\d,]+\.?\d*)/g,
      withoutCommas: /₹?\s*(\d+\.?\d*)/g,
      negative: /-\s*₹?\s*([\d,]+\.?\d*)/g,
      inParentheses: /\(\s*₹?\s*([\d,]+\.?\d*)\s*\)/g
    },

    // Date patterns (Indian format)
    date: {
      ddmmyyyy: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,
      ddmmyy: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/g,
      monthNames: /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{1,2})[,\s]*(\d{4})/gi
    },

    // Account patterns
    account: {
      number: /(?:account\s*(?:number|no\.?)\s*:?\s*)?(\d{4,20})/gi,
      ifsc: /([A-Z]{4}0[A-Z0-9]{6})/g,
      micr: /(\d{9})/g
    },

    // Transaction patterns
    transaction: {
      // Common Indian bank statement formats
      hdfc: /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+([\d,]+\.?\d*)\s*(dr|cr)?\s*([\d,]+\.?\d*)?/gi,
      sbi: /(\d{1,2}-\d{1,2}-\d{2,4})\s+(.+?)\s+([\d,]+\.?\d*)\s*([\d,]+\.?\d*)?/gi,
      icici: /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+([\d,]+\.?\d*)\s*([\d,]+\.?\d*)/gi,
      generic: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+)/gi
    },

    // Balance patterns
    balance: {
      opening: /(?:opening|opening\s+balance|balance\s+b\/f)\s*:?\s*([\d,]+\.?\d*)/gi,
      closing: /(?:closing|closing\s+balance|balance\s+c\/f)\s*:?\s*([\d,]+\.?\d*)/gi,
      available: /(?:available|available\s+balance)\s*:?\s*([\d,]+\.?\d*)/gi
    },

    // Credit card patterns
    creditCard: {
      number: /(?:card\s*(?:number|no\.?)\s*:?\s*)?(\d{4}\s*\*+\s*\*+\s*\d{4})/gi,
      limit: /(?:credit\s+limit|limit)\s*:?\s*([\d,]+\.?\d*)/gi,
      dueDate: /(?:payment\s+due\s+date|due\s+date)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      minimumDue: /(?:minimum\s+(?:amount\s+)?due|min\s+due)\s*:?\s*([\d,]+\.?\d*)/gi
    },

    // Investment patterns
    investment: {
      folio: /(?:folio\s*(?:number|no\.?)\s*:?\s*)?(\d+\/\d+)/gi,
      nav: /(?:nav|net\s+asset\s+value)\s*:?\s*([\d,]+\.?\d*)/gi,
      units: /(?:units|no\.?\s*of\s*units)\s*:?\s*([\d,]+\.?\d*)/gi,
      sip: /(?:sip|systematic\s+investment\s+plan)\s*:?\s*([\d,]+\.?\d*)/gi
    },

    // Loan patterns
    loan: {
      number: /(?:loan\s*(?:account\s*)?(?:number|no\.?)\s*:?\s*)?([A-Z0-9]{10,20})/gi,
      emi: /(?:emi|equated\s+monthly\s+installment)\s*:?\s*([\d,]+\.?\d*)/gi,
      principal: /(?:principal|principal\s+amount)\s*:?\s*([\d,]+\.?\d*)/gi,
      interest: /(?:interest|interest\s+amount)\s*:?\s*([\d,]+\.?\d*)/gi,
      outstanding: /(?:outstanding|outstanding\s+balance)\s*:?\s*([\d,]+\.?\d*)/gi
    },

    // Common Indian bank identifiers
    bankIdentifiers: {
      hdfc: /hdfc|housing\s+development\s+finance/gi,
      sbi: /state\s+bank\s+of\s+india|sbi/gi,
      icici: /icici\s+bank|icici/gi,
      axis: /axis\s+bank|axis/gi,
      pnb: /punjab\s+national\s+bank|pnb/gi,
      kotak: /kotak\s+mahindra\s+bank|kotak/gi,
      indusind: /indusind\s+bank|indusind/gi,
      yesBank: /yes\s+bank/gi,
      boi: /bank\s+of\s+india|boi/gi
    }
  };

  public extractAmounts(text: string): Array<{
    amount: number;
    originalText: string;
    position: number;
    confidence: number;
  }> {
    const results: Array<{
      amount: number;
      originalText: string;
      position: number;
      confidence: number;
    }> = [];

    // Try different amount patterns
    for (const [patternName, pattern] of Object.entries(this.patterns.amount)) {
      let match;
      const regex = new RegExp(pattern.source, 'gi');
      
      while ((match = regex.exec(text)) !== null) {
        const amountValidation = validateAmount(match[1]);
        
        if (amountValidation.isValid && amountValidation.amount! > 0) {
          let confidence = 80; // Base confidence
          
          // Adjust confidence based on pattern type
          switch (patternName) {
            case 'withCommas':
              confidence = 90; // High confidence for properly formatted amounts
              break;
            case 'negative':
            case 'inParentheses':
              confidence = 85; // Good confidence for negative amounts
              break;
            default:
              confidence = 75;
          }

          results.push({
            amount: amountValidation.amount!,
            originalText: match[0],
            position: match.index!,
            confidence
          });
        }
      }
    }

    // Sort by position and remove duplicates
    return this.removeDuplicateAmounts(results);
  }

  public extractDates(text: string): Array<{
    date: Date;
    originalText: string;
    position: number;
    confidence: number;
    format: string;
  }> {
    const results: Array<{
      date: Date;
      originalText: string;
      position: number;
      confidence: number;
      format: string;
    }> = [];

    // Try different date patterns
    for (const [formatName, pattern] of Object.entries(this.patterns.date)) {
      let match;
      const regex = new RegExp(pattern.source, 'gi');
      
      while ((match = regex.exec(text)) !== null) {
        let dateStr = match[0];
        let confidence = 70;
        
        // Handle different date formats
        if (formatName === 'monthNames') {
          // Convert month name to number
          const monthMap: Record<string, string> = {
            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
            'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
            'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
          };
          
          const monthName = match[1].toLowerCase().substring(0, 3);
          const day = match[2].padStart(2, '0');
          const year = match[3];
          
          dateStr = `${day}/${monthMap[monthName]}/${year}`;
          confidence = 85;
        }

        const dateValidation = validateDate(dateStr);
        
        if (dateValidation.isValid) {
          // Adjust confidence based on format
          if (formatName === 'ddmmyyyy') {
            confidence = 90;
          } else if (formatName === 'ddmmyy') {
            confidence = 80;
          }

          results.push({
            date: dateValidation.date!,
            originalText: match[0],
            position: match.index!,
            confidence,
            format: formatName
          });
        }
      }
    }

    // Sort by position and remove duplicates
    return this.removeDuplicateDates(results);
  }

  public extractTransactionLines(text: string, bankType?: string): Array<{
    line: string;
    lineNumber: number;
    confidence: number;
    pattern: string;
  }> {
    const results: Array<{
      line: string;
      lineNumber: number;
      confidence: number;
      pattern: string;
    }> = [];

    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.length < 10) continue;

      // Try bank-specific patterns first
      if (bankType) {
        const bankPattern = this.patterns.transaction[bankType as keyof typeof this.patterns.transaction];
        if (bankPattern && bankPattern.test(line)) {
          results.push({
            line,
            lineNumber: i + 1,
            confidence: 90,
            pattern: bankType
          });
          continue;
        }
      }

      // Try generic patterns
      for (const [patternName, pattern] of Object.entries(this.patterns.transaction)) {
        if (pattern.test(line)) {
          let confidence = 70;
          
          // Higher confidence for bank-specific patterns
          if (patternName !== 'generic') {
            confidence = 85;
          }

          results.push({
            line,
            lineNumber: i + 1,
            confidence,
            pattern: patternName
          });
          break;
        }
      }
    }

    parserLogger.debug('Transaction lines extracted', { count: results.length });
    return results;
  }

  public detectBankFromText(text: string): {
    bank: string;
    confidence: number;
    matches: string[];
  } {
    const normalizedText = text.toLowerCase();
    const results: Array<{ bank: string; confidence: number; matches: string[] }> = [];

    for (const [bankName, pattern] of Object.entries(this.patterns.bankIdentifiers)) {
      const matches = [...normalizedText.matchAll(pattern)];
      
      if (matches.length > 0) {
        let confidence = Math.min(90, 60 + (matches.length * 10));
        
        results.push({
          bank: bankName,
          confidence,
          matches: matches.map(m => m[0])
        });
      }
    }

    // Return the bank with highest confidence
    const bestMatch = results.reduce(
      (best, current) => current.confidence > best.confidence ? current : best,
      { bank: 'unknown', confidence: 0, matches: [] }
    );

    return bestMatch;
  }

  public extractAccountInfo(text: string): {
    accountNumber?: string;
    ifscCode?: string;
    micrCode?: string;
  } {
    const accountMatch = text.match(this.patterns.account.number);
    const ifscMatch = text.match(this.patterns.account.ifsc);
    const micrMatch = text.match(this.patterns.account.micr);

    return {
      accountNumber: accountMatch?.[1]?.replace(/\s/g, ''),
      ifscCode: ifscMatch?.[1],
      micrCode: micrMatch?.[1]
    };
  }

  private removeDuplicateAmounts(amounts: Array<{
    amount: number;
    originalText: string;
    position: number;
    confidence: number;
  }>): Array<{
    amount: number;
    originalText: string;
    position: number;
    confidence: number;
  }> {
    const seen = new Set<string>();
    const unique: Array<{
      amount: number;
      originalText: string;
      position: number;
      confidence: number;
    }> = [];

    // Sort by position first
    amounts.sort((a, b) => a.position - b.position);

    for (const amount of amounts) {
      const key = `${amount.amount}_${Math.floor(amount.position / 10)}`; // Group nearby positions
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(amount);
      }
    }

    return unique;
  }

  private removeDuplicateDates(dates: Array<{
    date: Date;
    originalText: string;
    position: number;
    confidence: number;
    format: string;
  }>): Array<{
    date: Date;
    originalText: string;
    position: number;
    confidence: number;
    format: string;
  }> {
    const seen = new Set<string>();
    const unique: Array<{
      date: Date;
      originalText: string;
      position: number;
      confidence: number;
      format: string;
    }> = [];

    // Sort by position first
    dates.sort((a, b) => a.position - b.position);

    for (const dateItem of dates) {
      const key = `${dateItem.date.toISOString()}_${Math.floor(dateItem.position / 10)}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(dateItem);
      }
    }

    return unique;
  }

  public scorePatternMatch(text: string, patterns: RegExp[]): number {
    let score = 0;
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        score += matches.length;
      }
    }
    
    return score;
  }
}

export default PatternMatcher;