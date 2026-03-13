import { extractionLogger } from '@/utils/logger';

export interface MerchantExtractionResult {
  name: string;
  confidence: number;
  category?: string;
  location?: string;
  originalText: string;
}

export class MerchantExtractor {
  private readonly merchantPatterns: Array<{
    pattern: RegExp;
    category: string;
    confidence: number;
  }> = [];

  private readonly knownMerchants: Map<string, {
    name: string;
    category: string;
    aliases: string[];
  }> = new Map();

  private readonly transactionPrefixes = [
    'upi', 'pos', 'atm', 'neft', 'rtgs', 'imps', 'ecs', 'nach',
    'payment', 'transfer', 'withdrawal', 'deposit'
  ];

  constructor() {
    this.initializeMerchantDatabase();
    this.initializePatterns();
  }

  public async extractMerchant(description: string): Promise<MerchantExtractionResult> {
    try {
      extractionLogger.debug('Extracting merchant from description', {
        description: description.substring(0, 50)
      });

      // Clean the description first
      const cleanedDescription = this.cleanDescription(description);

      // Try different extraction methods in order of confidence
      
      // 1. Known merchant lookup (highest confidence)
      const knownMerchant = this.findKnownMerchant(cleanedDescription);
      if (knownMerchant) {
        return knownMerchant;
      }

      // 2. Pattern-based extraction
      const patternMatch = this.extractUsingPatterns(cleanedDescription);
      if (patternMatch) {
        return patternMatch;
      }

      // 3. UPI merchant extraction
      const upiMerchant = this.extractUpiMerchant(cleanedDescription);
      if (upiMerchant) {
        return upiMerchant;
      }

      // 4. Generic merchant name extraction
      const genericMerchant = this.extractGenericMerchant(cleanedDescription);
      if (genericMerchant) {
        return genericMerchant;
      }

      // 5. Fallback - return cleaned description
      return {
        name: this.extractFallbackName(cleanedDescription),
        confidence: 30,
        category: 'OTHER',
        originalText: description
      };

    } catch (error) {
      extractionLogger.error('Merchant extraction failed', {
        description,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        name: 'UNKNOWN',
        confidence: 0,
        category: 'OTHER',
        originalText: description
      };
    }
  }

  private cleanDescription(description: string): string {
    let cleaned = description.trim();

    // Remove common bank prefixes
    cleaned = cleaned.replace(/^(UPI|POS|ATM|NEFT|RTGS|IMPS|ECS|NACH)\s*/i, '');
    
    // Remove transaction reference numbers
    cleaned = cleaned.replace(/REF\s*NO\s*\d+/gi, '');
    cleaned = cleaned.replace(/TXN\s*ID\s*\w+/gi, '');
    cleaned = cleaned.replace(/\d{10,}/g, ''); // Remove long numbers
    
    // Remove dates in various formats
    cleaned = cleaned.replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, '');
    
    // Remove common noise words
    const noiseWords = ['to', 'from', 'via', 'by', 'on', 'at', 'for', 'with'];
    const words = cleaned.split(/\s+/);
    const filteredWords = words.filter(word => 
      word.length > 1 && 
      !noiseWords.includes(word.toLowerCase()) &&
      !/^\d+$/.test(word) // Remove pure numbers
    );
    
    cleaned = filteredWords.join(' ');
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  private findKnownMerchant(description: string): MerchantExtractionResult | null {
    const lowerDescription = description.toLowerCase();

    for (const [key, merchant] of this.knownMerchants) {
      // Check main name
      if (lowerDescription.includes(key)) {
        return {
          name: merchant.name,
          confidence: 95,
          category: merchant.category,
          originalText: description
        };
      }

      // Check aliases
      for (const alias of merchant.aliases) {
        if (lowerDescription.includes(alias.toLowerCase())) {
          return {
            name: merchant.name,
            confidence: 90,
            category: merchant.category,
            originalText: description
          };
        }
      }
    }

    return null;
  }

  private extractUsingPatterns(description: string): MerchantExtractionResult | null {
    for (const { pattern, category, confidence } of this.merchantPatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return {
          name: this.formatMerchantName(match[1]),
          confidence,
          category,
          originalText: description
        };
      }
    }

    return null;
  }

  private extractUpiMerchant(description: string): MerchantExtractionResult | null {
    // UPI patterns: "UPI-MERCHANT NAME-XXXX"
    const upiPatterns = [
      /UPI[\/\-\s](.+?)[\/\-\s][\w\d]+$/i,
      /UPI[\/\-\s](.+?)$/i,
      /TO\s+(.+?)\s+UPI/i,
      /FROM\s+(.+?)\s+UPI/i
    ];

    for (const pattern of upiPatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        const merchantName = this.formatMerchantName(match[1]);
        if (merchantName && merchantName.length > 2) {
          return {
            name: merchantName,
            confidence: 80,
            category: this.categorizeByName(merchantName),
            originalText: description
          };
        }
      }
    }

    return null;
  }

  private extractGenericMerchant(description: string): MerchantExtractionResult | null {
    // Remove transaction prefixes and extract the main part
    let cleaned = description;
    
    for (const prefix of this.transactionPrefixes) {
      const prefixPattern = new RegExp(`^${prefix}\\s*[\\-\\/\\s]*`, 'i');
      cleaned = cleaned.replace(prefixPattern, '');
    }

    // Extract meaningful parts
    const words = cleaned.split(/\s+/).filter(word => 
      word.length > 2 && 
      !/^\d+$/.test(word) &&
      !this.isCommonWord(word)
    );

    if (words.length > 0) {
      const merchantName = words.slice(0, 3).join(' '); // Take first 3 meaningful words
      
      if (merchantName.length > 3) {
        return {
          name: this.formatMerchantName(merchantName),
          confidence: 60,
          category: this.categorizeByName(merchantName),
          originalText: description
        };
      }
    }

    return null;
  }

  private extractFallbackName(description: string): string {
    // Extract first meaningful word/phrase as fallback
    const words = description.split(/\s+/).filter(word => 
      word.length > 2 && !/^\d+$/.test(word)
    );

    if (words.length > 0) {
      return this.formatMerchantName(words[0]);
    }

    return 'UNKNOWN';
  }

  private formatMerchantName(name: string): string {
    return name
      .trim()
      .replace(/[^\w\s\-&]/g, '') // Remove special chars except dash and ampersand
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private categorizeByName(merchantName: string): string {
    const lowerName = merchantName.toLowerCase();

    // Categories based on keywords
    const categories = {
      'FOOD': ['restaurant', 'cafe', 'food', 'pizza', 'burger', 'zomato', 'swiggy', 'dominos', 'kfc', 'mcdonalds'],
      'RETAIL': ['mart', 'store', 'shop', 'amazon', 'flipkart', 'myntra', 'reliance', 'dmart', 'big bazaar'],
      'TRANSPORT': ['uber', 'ola', 'metro', 'bus', 'taxi', 'rapido', 'auto'],
      'ENTERTAINMENT': ['netflix', 'hotstar', 'youtube', 'spotify', 'movie', 'cinema', 'ticket'],
      'UTILITY': ['electricity', 'water', 'gas', 'mobile', 'internet', 'broadband', 'airtel', 'jio', 'bsnl'],
      'FUEL': ['petrol', 'diesel', 'fuel', 'iocl', 'bpcl', 'hpcl'],
      'HEALTHCARE': ['hospital', 'clinic', 'medical', 'pharmacy', 'doctor', 'apollo'],
      'EDUCATION': ['school', 'college', 'university', 'course', 'education', 'tuition'],
      'FINANCIAL': ['insurance', 'mutual', 'fund', 'loan', 'emi', 'sip']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerName.includes(keyword))) {
        return category;
      }
    }

    return 'OTHER';
  }

  private isCommonWord(word: string): boolean {
    const commonWords = [
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'ltd', 'pvt', 'inc', 'corp', 'company', 'co', 'bank', 'limited', 'private'
    ];

    return commonWords.includes(word.toLowerCase());
  }

  private initializeMerchantDatabase(): void {
    // Popular Indian merchants and their variations
    const merchants = [
      // E-commerce
      { name: 'Amazon', category: 'RETAIL', aliases: ['amzn', 'amazon.in', 'amazon india'] },
      { name: 'Flipkart', category: 'RETAIL', aliases: ['flipkart.com', 'fkrt'] },
      { name: 'Myntra', category: 'RETAIL', aliases: ['myntra.com'] },
      
      // Food delivery
      { name: 'Zomato', category: 'FOOD', aliases: ['zomato.com', 'zmt'] },
      { name: 'Swiggy', category: 'FOOD', aliases: ['swiggy.in', 'swgy'] },
      { name: 'Dominos', category: 'FOOD', aliases: ['dominos pizza', 'domino'] },
      { name: 'KFC', category: 'FOOD', aliases: ['kentucky fried chicken'] },
      { name: 'McDonalds', category: 'FOOD', aliases: ['mcd', 'mcdonalds india'] },
      
      // Transportation
      { name: 'Uber', category: 'TRANSPORT', aliases: ['uber india', 'uber.com'] },
      { name: 'Ola', category: 'TRANSPORT', aliases: ['ola cabs', 'olacabs'] },
      
      // Entertainment
      { name: 'Netflix', category: 'ENTERTAINMENT', aliases: ['netflix.com'] },
      { name: 'Hotstar', category: 'ENTERTAINMENT', aliases: ['disney hotstar', 'star india'] },
      { name: 'YouTube', category: 'ENTERTAINMENT', aliases: ['youtube premium', 'google youtube'] },
      { name: 'Spotify', category: 'ENTERTAINMENT', aliases: ['spotify premium'] },
      
      // Utilities
      { name: 'Airtel', category: 'UTILITY', aliases: ['bharti airtel', 'airtel payment'] },
      { name: 'Jio', category: 'UTILITY', aliases: ['reliance jio', 'jio payment'] },
      { name: 'BSNL', category: 'UTILITY', aliases: ['bsnl mobile'] },
      
      // Retail chains
      { name: 'DMart', category: 'RETAIL', aliases: ['avenue supermarts', 'dmart retail'] },
      { name: 'Big Bazaar', category: 'RETAIL', aliases: ['future retail', 'bigbazaar'] },
      { name: 'Reliance Digital', category: 'RETAIL', aliases: ['reliance retail'] },
      
      // Fuel
      { name: 'Indian Oil', category: 'FUEL', aliases: ['iocl', 'indian oil corp'] },
      { name: 'BPCL', category: 'FUEL', aliases: ['bharat petroleum'] },
      { name: 'HPCL', category: 'FUEL', aliases: ['hindustan petroleum'] }
    ];

    for (const merchant of merchants) {
      this.knownMerchants.set(merchant.name.toLowerCase(), merchant);
      
      // Also add aliases as keys
      for (const alias of merchant.aliases) {
        this.knownMerchants.set(alias.toLowerCase(), merchant);
      }
    }
  }

  private initializePatterns(): void {
    // Common merchant extraction patterns
    this.merchantPatterns = [
      // Card payments: "POS MERCHANT NAME LOCATION"
      {
        pattern: /POS\s+(.+?)\s+(?:MUMBAI|DELHI|BANGALORE|CHENNAI|KOLKATA|HYDERABAD|PUNE|AHMEDABAD)/i,
        category: 'RETAIL',
        confidence: 85
      },
      
      // UPI payments
      {
        pattern: /UPI[\/\-\s](.+?)[\/\-\s]/i,
        category: 'OTHER',
        confidence: 80
      },
      
      // NEFT/RTGS transfers
      {
        pattern: /(?:NEFT|RTGS)[\/\-\s](.+?)[\/\-\s]/i,
        category: 'TRANSFER',
        confidence: 75
      },
      
      // Online payments
      {
        pattern: /(?:ECOM|ONLINE)[\/\-\s](.+?)$/i,
        category: 'RETAIL',
        confidence: 70
      },
      
      // Mobile/wallet payments
      {
        pattern: /(?:MOBILE|WALLET)[\/\-\s](.+?)$/i,
        category: 'UTILITY',
        confidence: 70
      }
    ];
  }

  // Additional utility methods

  public getMerchantSuggestions(partialName: string): string[] {
    const suggestions: string[] = [];
    const lowerPartial = partialName.toLowerCase();

    for (const [key, merchant] of this.knownMerchants) {
      if (key.includes(lowerPartial) || merchant.name.toLowerCase().includes(lowerPartial)) {
        if (!suggestions.includes(merchant.name)) {
          suggestions.push(merchant.name);
        }
      }
    }

    return suggestions.slice(0, 10); // Return top 10 suggestions
  }

  public categorizeMerchant(merchantName: string): string {
    const knownMerchant = this.knownMerchants.get(merchantName.toLowerCase());
    if (knownMerchant) {
      return knownMerchant.category;
    }

    return this.categorizeByName(merchantName);
  }

  public addCustomMerchant(name: string, category: string, aliases: string[] = []): void {
    const merchant = {
      name,
      category,
      aliases
    };

    this.knownMerchants.set(name.toLowerCase(), merchant);
    
    for (const alias of aliases) {
      this.knownMerchants.set(alias.toLowerCase(), merchant);
    }

    extractionLogger.info('Custom merchant added', { name, category, aliases });
  }
}

export default MerchantExtractor;