import { AmountParsingResult } from '@/types';
import { extractionLogger } from '@/utils/logger';

export class AmountParser {
  private readonly indianNumberPattern = /(?:₹\s*)?(?:RS\.?\s*)?(?:INR\s*)?([\d,]+(?:\.\d{1,2})?)/gi;
  private readonly wordToNumberMap: Record<string, number> = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
    'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
    'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
    'eighty': 80, 'ninety': 90, 'hundred': 100, 'thousand': 1000,
    'lakh': 100000, 'crore': 10000000
  };

  public parseAmount(text: string): AmountParsingResult[] {
    const results: AmountParsingResult[] = [];

    try {
      // Extract all potential amounts from text
      const amounts = this.extractAmounts(text);
      
      for (const amountData of amounts) {
        const parsed = this.parseIndividualAmount(amountData.text);
        
        if (parsed.amount > 0) {
          results.push({
            amount: parsed.amount,
            currency: parsed.currency,
            confidence: parsed.confidence,
            originalText: amountData.text
          });
        }
      }

      return results;

    } catch (error) {
      extractionLogger.error('Amount parsing failed', {
        text: text.substring(0, 100),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return [];
    }
  }

  private extractAmounts(text: string): Array<{ text: string; position: number }> {
    const amounts: Array<{ text: string; position: number }> = [];
    
    // Pattern 1: Standard numeric amounts with currency symbols
    let match;
    const regex1 = /(?:₹\s*|RS\.?\s*|INR\s*)?([\d,]+(?:\.\d{1,2})?)/gi;
    
    while ((match = regex1.exec(text)) !== null) {
      amounts.push({
        text: match[0],
        position: match.index
      });
    }

    // Pattern 2: Amounts in parentheses (often negative)
    const regex2 = /\(\s*(?:₹\s*|RS\.?\s*|INR\s*)?([\d,]+(?:\.\d{1,2})?)\s*\)/gi;
    
    while ((match = regex2.exec(text)) !== null) {
      amounts.push({
        text: match[0],
        position: match.index
      });
    }

    // Pattern 3: Written amounts (e.g., "one lakh fifty thousand")
    const wordAmounts = this.extractWordAmounts(text);
    amounts.push(...wordAmounts);

    // Remove duplicates and overlapping matches
    return this.deduplicateAmounts(amounts);
  }

  private extractWordAmounts(text: string): Array<{ text: string; position: number }> {
    const wordAmounts: Array<{ text: string; position: number }> = [];
    
    // Pattern for written amounts
    const wordPattern = /(?:\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|lakh|crore)\b\s*)+/gi;
    
    let match;
    while ((match = wordPattern.exec(text)) !== null) {
      const matchText = match[0].trim();
      
      // Validate that this looks like an amount (contains number words)
      if (this.containsNumberWords(matchText)) {
        wordAmounts.push({
          text: matchText,
          position: match.index
        });
      }
    }

    return wordAmounts;
  }

  private containsNumberWords(text: string): boolean {
    const numberWords = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 
                         'ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 
                         'ninety', 'hundred', 'thousand', 'lakh', 'crore'];
    
    const lowerText = text.toLowerCase();
    return numberWords.some(word => lowerText.includes(word));
  }

  private parseIndividualAmount(text: string): {
    amount: number;
    currency: string;
    confidence: number;
  } {
    try {
      // Clean the text
      let cleanText = text.trim().toLowerCase();
      
      // Detect currency
      let currency = 'INR'; // Default
      const currencyPatterns = [
        { pattern: /₹|rs\.?|inr|rupees?/i, currency: 'INR' },
        { pattern: /\$|usd|dollars?/i, currency: 'USD' },
        { pattern: /€|eur|euros?/i, currency: 'EUR' },
        { pattern: /£|gbp|pounds?/i, currency: 'GBP' }
      ];

      for (const { pattern, currency: curr } of currencyPatterns) {
        if (pattern.test(cleanText)) {
          currency = curr;
          cleanText = cleanText.replace(pattern, '').trim();
          break;
        }
      }

      let amount = 0;
      let confidence = 70; // Base confidence

      // Try parsing as numeric first
      const numericAmount = this.parseNumericAmount(cleanText);
      if (numericAmount.amount > 0) {
        amount = numericAmount.amount;
        confidence = numericAmount.confidence;
      } else {
        // Try parsing as word amount
        const wordAmount = this.parseWordAmount(cleanText);
        if (wordAmount.amount > 0) {
          amount = wordAmount.amount;
          confidence = wordAmount.confidence;
        }
      }

      // Handle negative amounts (in parentheses)
      if (text.includes('(') && text.includes(')')) {
        amount = Math.abs(amount); // We'll handle sign elsewhere
        confidence -= 5; // Slightly lower confidence for parenthetical amounts
      }

      return {
        amount,
        currency,
        confidence: Math.max(Math.min(confidence, 100), 0)
      };

    } catch (error) {
      extractionLogger.debug('Individual amount parsing failed', {
        text,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        amount: 0,
        currency: 'INR',
        confidence: 0
      };
    }
  }

  private parseNumericAmount(text: string): {
    amount: number;
    confidence: number;
  } {
    try {
      // Remove all non-numeric characters except commas and dots
      let numericText = text.replace(/[^\d,.-]/g, '');
      
      if (!numericText) {
        return { amount: 0, confidence: 0 };
      }

      // Handle Indian number format (lakhs, crores)
      if (text.includes('lakh') || text.includes('crore')) {
        return this.parseIndianFormat(text);
      }

      // Handle standard comma-separated numbers
      let amount = 0;
      let confidence = 85;

      // Remove commas and parse
      const cleanNumber = numericText.replace(/,/g, '');
      
      // Validate decimal places
      const decimalParts = cleanNumber.split('.');
      if (decimalParts.length > 2) {
        confidence -= 20; // Multiple decimal points
      }

      amount = parseFloat(cleanNumber);
      
      if (isNaN(amount) || amount < 0) {
        return { amount: 0, confidence: 0 };
      }

      // Validate reasonable amount ranges
      if (amount > 1000000000) { // > 100 crore
        confidence -= 30; // Very large amount
      } else if (amount > 10000000) { // > 1 crore
        confidence -= 10;
      }

      return { amount, confidence };

    } catch (error) {
      return { amount: 0, confidence: 0 };
    }
  }

  private parseIndianFormat(text: string): {
    amount: number;
    confidence: number;
  } {
    try {
      let amount = 0;
      let confidence = 80;

      const lowerText = text.toLowerCase();

      // Extract crores
      const croreMatch = lowerText.match(/([\d,]+(?:\.\d+)?)\s*crores?/);
      if (croreMatch) {
        const croreValue = parseFloat(croreMatch[1].replace(/,/g, ''));
        if (!isNaN(croreValue)) {
          amount += croreValue * 10000000; // 1 crore = 10^7
        }
      }

      // Extract lakhs
      const lakhMatch = lowerText.match(/([\d,]+(?:\.\d+)?)\s*lakhs?/);
      if (lakhMatch) {
        const lakhValue = parseFloat(lakhMatch[1].replace(/,/g, ''));
        if (!isNaN(lakhValue)) {
          amount += lakhValue * 100000; // 1 lakh = 10^5
        }
      }

      // Extract thousands
      const thousandMatch = lowerText.match(/([\d,]+(?:\.\d+)?)\s*thousands?/);
      if (thousandMatch) {
        const thousandValue = parseFloat(thousandMatch[1].replace(/,/g, ''));
        if (!isNaN(thousandValue)) {
          amount += thousandValue * 1000;
        }
      }

      // Extract remaining number
      let remainingText = lowerText
        .replace(/([\d,]+(?:\.\d+)?)\s*crores?/g, '')
        .replace(/([\d,]+(?:\.\d+)?)\s*lakhs?/g, '')
        .replace(/([\d,]+(?:\.\d+)?)\s*thousands?/g, '');

      const remainingMatch = remainingText.match(/([\d,]+(?:\.\d+)?)/);
      if (remainingMatch) {
        const remainingValue = parseFloat(remainingMatch[1].replace(/,/g, ''));
        if (!isNaN(remainingValue)) {
          amount += remainingValue;
        }
      }

      return { amount, confidence };

    } catch (error) {
      return { amount: 0, confidence: 0 };
    }
  }

  private parseWordAmount(text: string): {
    amount: number;
    confidence: number;
  } {
    try {
      const words = text.toLowerCase().split(/\s+/);
      let amount = 0;
      let confidence = 60; // Lower confidence for word amounts

      let currentNumber = 0;
      let tempNumber = 0;

      for (const word of words) {
        const cleanWord = word.replace(/[^\w]/g, '');
        
        if (this.wordToNumberMap.hasOwnProperty(cleanWord)) {
          const value = this.wordToNumberMap[cleanWord];
          
          if (value === 100) {
            tempNumber *= 100;
          } else if (value === 1000) {
            currentNumber += tempNumber;
            currentNumber *= 1000;
            tempNumber = 0;
          } else if (value === 100000) { // lakh
            currentNumber += tempNumber;
            currentNumber *= 100000;
            tempNumber = 0;
          } else if (value === 10000000) { // crore
            currentNumber += tempNumber;
            currentNumber *= 10000000;
            tempNumber = 0;
          } else {
            tempNumber += value;
          }
        }
      }

      amount = currentNumber + tempNumber;

      if (amount > 0) {
        confidence = 70; // Higher confidence if we found a valid amount
      }

      return { amount, confidence };

    } catch (error) {
      return { amount: 0, confidence: 0 };
    }
  }

  private deduplicateAmounts(amounts: Array<{ text: string; position: number }>): Array<{ text: string; position: number }> {
    // Sort by position
    amounts.sort((a, b) => a.position - b.position);

    const deduplicated: Array<{ text: string; position: number }> = [];
    
    for (const amount of amounts) {
      // Check if this amount overlaps with any previous amount
      const isOverlapping = deduplicated.some(existing => {
        const existingEnd = existing.position + existing.text.length;
        const currentEnd = amount.position + amount.text.length;
        
        return (
          (amount.position >= existing.position && amount.position < existingEnd) ||
          (existing.position >= amount.position && existing.position < currentEnd)
        );
      });

      if (!isOverlapping) {
        deduplicated.push(amount);
      }
    }

    return deduplicated;
  }

  public validateAmount(amount: number, context?: string): {
    isValid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let isValid = true;

    // Check if amount is reasonable
    if (amount <= 0) {
      isValid = false;
      warnings.push('Amount must be positive');
    }

    if (amount > 1000000000) { // > 100 crore
      warnings.push('Unusually large amount detected');
    }

    // Check decimal places (should not have more than 2 for currency)
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      warnings.push('Too many decimal places for currency amount');
    }

    return { isValid, warnings };
  }
}

export default AmountParser;