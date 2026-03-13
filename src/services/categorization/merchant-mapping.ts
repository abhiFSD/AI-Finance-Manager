import { Merchant } from '../../types';
import { IndianMerchants, MerchantPattern } from './types';

export class MerchantMappingService {
  private merchants: Map<string, Merchant> = new Map();
  private patterns: MerchantPattern[] = [];
  private normalizedMerchants: Map<string, string> = new Map(); // normalized name -> merchant id

  constructor() {
    this.initializeIndianMerchants();
    this.initializePatterns();
  }

  private initializeIndianMerchants(): void {
    const indianMerchants: IndianMerchants = {
      // Food & Dining
      'ZOMATO': { categoryId: 'food_delivery', aliases: ['zomato ltd', 'zomato online'], type: 'app', confidence: 0.95 },
      'SWIGGY': { categoryId: 'food_delivery', aliases: ['swiggy ltd', 'bundl technologies'], type: 'app', confidence: 0.95 },
      'DOMINOS': { categoryId: 'food_fast', aliases: ['dominos pizza', 'jubilant foodworks'], type: 'offline', confidence: 0.90 },
      'MCDONALDS': { categoryId: 'food_fast', aliases: ['mcd', 'hardcastle restaurants'], type: 'offline', confidence: 0.90 },
      'KFC': { categoryId: 'food_fast', aliases: ['kentucky fried chicken', 'devyani international'], type: 'offline', confidence: 0.90 },
      'STARBUCKS': { categoryId: 'food_cafe', aliases: ['starbucks coffee', 'tata starbucks'], type: 'offline', confidence: 0.90 },
      'CAFE COFFEE DAY': { categoryId: 'food_cafe', aliases: ['ccd', 'coffee day enterprises'], type: 'offline', confidence: 0.90 },
      'BIG BAZAAR': { categoryId: 'food_grocery', aliases: ['future retail', 'big bazaar ltd'], type: 'offline', confidence: 0.95 },
      'RELIANCE FRESH': { categoryId: 'food_grocery', aliases: ['reliance retail', 'fresh market'], type: 'offline', confidence: 0.95 },
      'DMART': { categoryId: 'food_grocery', aliases: ['d mart', 'avenue supermarts'], type: 'offline', confidence: 0.95 },

      // Transportation
      'UBER': { categoryId: 'transport_taxi', aliases: ['uber india', 'uber technologies'], type: 'app', confidence: 0.95 },
      'OLA': { categoryId: 'transport_taxi', aliases: ['ola cabs', 'ani technologies'], type: 'app', confidence: 0.95 },
      'INDIAN OIL': { categoryId: 'transport_fuel', aliases: ['ioc', 'indian oil corporation'], type: 'offline', confidence: 0.95 },
      'BHARAT PETROLEUM': { categoryId: 'transport_fuel', aliases: ['bpcl', 'bp petrol'], type: 'offline', confidence: 0.95 },
      'HINDUSTAN PETROLEUM': { categoryId: 'transport_fuel', aliases: ['hpcl', 'hp petrol'], type: 'offline', confidence: 0.95 },
      'DELHI METRO': { categoryId: 'transport_public', aliases: ['dmrc', 'metro rail'], type: 'offline', confidence: 0.95 },
      'MUMBAI METRO': { categoryId: 'transport_public', aliases: ['mmrda', 'metro mumbai'], type: 'offline', confidence: 0.95 },

      // Shopping
      'AMAZON': { categoryId: 'shopping_online', aliases: ['amazon pay', 'amazon seller', 'amazon india'], type: 'online', confidence: 0.95 },
      'FLIPKART': { categoryId: 'shopping_online', aliases: ['flipkart india', 'flipkart seller'], type: 'online', confidence: 0.95 },
      'MYNTRA': { categoryId: 'shopping_clothing', aliases: ['myntra designs', 'flipkart fashion'], type: 'online', confidence: 0.90 },
      'AJIO': { categoryId: 'shopping_clothing', aliases: ['reliance ajio', 'ajio fashion'], type: 'online', confidence: 0.90 },
      'NYKAA': { categoryId: 'shopping_online', aliases: ['nykaa ecommerce', 'nykaa fashion'], type: 'online', confidence: 0.90 },
      'CROMA': { categoryId: 'shopping_electronics', aliases: ['croma retail', 'infiniti retail'], type: 'offline', confidence: 0.90 },
      'VIJAY SALES': { categoryId: 'shopping_electronics', aliases: ['vijay sales ltd'], type: 'offline', confidence: 0.90 },

      // Utilities
      'TATA POWER': { categoryId: 'utilities_electricity', aliases: ['tata power company'], type: 'offline', confidence: 0.95 },
      'BSES': { categoryId: 'utilities_electricity', aliases: ['bses rajdhani', 'bses yamuna'], type: 'offline', confidence: 0.95 },
      'AIRTEL': { categoryId: 'utilities_internet', aliases: ['bharti airtel', 'airtel payments'], type: 'offline', confidence: 0.95 },
      'JIO': { categoryId: 'utilities_internet', aliases: ['reliance jio', 'jio platforms'], type: 'offline', confidence: 0.95 },
      'VODAFONE': { categoryId: 'utilities_internet', aliases: ['vodafone idea', 'vi'], type: 'offline', confidence: 0.95 },
      'ACT FIBERNET': { categoryId: 'utilities_internet', aliases: ['act broadband', 'atria convergence'], type: 'offline', confidence: 0.90 },

      // Entertainment
      'NETFLIX': { categoryId: 'entertainment_streaming', aliases: ['netflix india'], type: 'online', confidence: 0.95 },
      'AMAZON PRIME': { categoryId: 'entertainment_streaming', aliases: ['amazon video', 'prime video'], type: 'online', confidence: 0.95 },
      'HOTSTAR': { categoryId: 'entertainment_streaming', aliases: ['disney hotstar', 'star india'], type: 'online', confidence: 0.95 },
      'SPOTIFY': { categoryId: 'entertainment_streaming', aliases: ['spotify india'], type: 'online', confidence: 0.95 },
      'PAYTM INSIDER': { categoryId: 'entertainment_movies', aliases: ['insider.in', 'paytm entertainment'], type: 'online', confidence: 0.85 },
      'BOOKMYSHOW': { categoryId: 'entertainment_movies', aliases: ['book my show', 'bms'], type: 'online', confidence: 0.90 },

      // Healthcare
      'APOLLO PHARMACY': { categoryId: 'healthcare_pharmacy', aliases: ['apollo health', 'apollo hospitals'], type: 'offline', confidence: 0.95 },
      'MEDPLUS': { categoryId: 'healthcare_pharmacy', aliases: ['medplus health'], type: 'offline', confidence: 0.90 },
      'PHARMEASY': { categoryId: 'healthcare_pharmacy', aliases: ['api holdings', 'pharmeasy app'], type: 'online', confidence: 0.90 },
      '1MG': { categoryId: 'healthcare_pharmacy', aliases: ['1mg tata', 'tata 1mg'], type: 'online', confidence: 0.90 },
      'MAX HEALTHCARE': { categoryId: 'healthcare_hospital', aliases: ['max hospital', 'max super specialty'], type: 'offline', confidence: 0.90 },
      'FORTIS': { categoryId: 'healthcare_hospital', aliases: ['fortis healthcare', 'fortis hospital'], type: 'offline', confidence: 0.90 },

      // Investment & Banking
      'ZERODHA': { categoryId: 'investment_stocks', aliases: ['zerodha broking'], type: 'online', confidence: 0.95 },
      'UPSTOX': { categoryId: 'investment_stocks', aliases: ['rksv securities', 'upstox pro'], type: 'online', confidence: 0.95 },
      'GROWW': { categoryId: 'investment_mutual_funds', aliases: ['groww app', 'groww invest'], type: 'online', confidence: 0.90 },
      'PAYTM MONEY': { categoryId: 'investment_mutual_funds', aliases: ['paytm investment'], type: 'online', confidence: 0.85 },
      'SBI MUTUAL FUND': { categoryId: 'investment_mutual_funds', aliases: ['sbi mf', 'sbimf'], type: 'offline', confidence: 0.95 },
      'ICICI PRUDENTIAL': { categoryId: 'investment_mutual_funds', aliases: ['icici mf', 'icici prudential mf'], type: 'offline', confidence: 0.95 },

      // Education
      'BYJUS': { categoryId: 'education', aliases: ['byjus learning', 'think and learn'], type: 'online', confidence: 0.90 },
      'UNACADEMY': { categoryId: 'education', aliases: ['unacademy group', 'sorting hat'], type: 'online', confidence: 0.90 },
      'UDEMY': { categoryId: 'education', aliases: ['udemy india'], type: 'online', confidence: 0.85 },
      'COURSERA': { categoryId: 'education', aliases: ['coursera india'], type: 'online', confidence: 0.85 },

      // Personal Care
      'LAKME SALON': { categoryId: 'personal', aliases: ['lakme beauty'], type: 'offline', confidence: 0.90 },
      'NATURALS': { categoryId: 'personal', aliases: ['naturals salon', 'ck naturals'], type: 'offline', confidence: 0.90 }
    };

    const now = new Date();
    Object.entries(indianMerchants).forEach(([name, data]) => {
      const id = name.toLowerCase().replace(/\s+/g, '_');
      const normalizedName = this.normalizeMerchantName(name);
      
      const merchant: Merchant = {
        id,
        name,
        normalizedName,
        categoryId: data.categoryId,
        aliases: data.aliases,
        confidence: data.confidence,
        transactionCount: 0,
        created_at: now,
        updated_at: now
      };

      this.merchants.set(id, merchant);
      this.normalizedMerchants.set(normalizedName, id);
      
      // Add aliases to normalized map
      data.aliases.forEach(alias => {
        const normalizedAlias = this.normalizeMerchantName(alias);
        this.normalizedMerchants.set(normalizedAlias, id);
      });
    });
  }

  private initializePatterns(): void {
    this.patterns = [
      // Food patterns
      { pattern: 'restaurant|hotel|cafe|coffee|food|dining', categoryId: 'food_restaurant', confidence: 0.7, type: 'regex' },
      { pattern: 'grocery|supermarket|mart|store|kirana', categoryId: 'food_grocery', confidence: 0.8, type: 'regex' },
      { pattern: 'pizza|burger|fast.?food', categoryId: 'food_fast', confidence: 0.8, type: 'regex' },
      
      // Transport patterns
      { pattern: 'petrol|fuel|gas.?station|filling.?station', categoryId: 'transport_fuel', confidence: 0.9, type: 'regex' },
      { pattern: 'taxi|cab|uber|ola|ride', categoryId: 'transport_taxi', confidence: 0.8, type: 'regex' },
      { pattern: 'metro|train|bus|transport|railways', categoryId: 'transport_public', confidence: 0.8, type: 'regex' },
      
      // Shopping patterns
      { pattern: 'amazon|flipkart|shopping|ecommerce', categoryId: 'shopping_online', confidence: 0.8, type: 'regex' },
      { pattern: 'clothing|apparel|fashion|garments', categoryId: 'shopping_clothing', confidence: 0.7, type: 'regex' },
      { pattern: 'electronics|mobile|laptop|computer', categoryId: 'shopping_electronics', confidence: 0.8, type: 'regex' },
      
      // Utilities patterns
      { pattern: 'electricity|power|electric', categoryId: 'utilities_electricity', confidence: 0.9, type: 'regex' },
      { pattern: 'internet|broadband|wifi|telecom|mobile.?bill', categoryId: 'utilities_internet', confidence: 0.8, type: 'regex' },
      { pattern: 'water|municipal', categoryId: 'utilities_water', confidence: 0.9, type: 'regex' },
      
      // Healthcare patterns
      { pattern: 'hospital|clinic|medical|doctor|pharmacy', categoryId: 'healthcare_doctor', confidence: 0.8, type: 'regex' },
      { pattern: 'medicine|drugs|pharmacy|medical.?store', categoryId: 'healthcare_pharmacy', confidence: 0.8, type: 'regex' },
      
      // Entertainment patterns
      { pattern: 'netflix|prime|hotstar|streaming|subscription', categoryId: 'entertainment_streaming', confidence: 0.9, type: 'regex' },
      { pattern: 'movie|cinema|theater|multiplex', categoryId: 'entertainment_movies', confidence: 0.8, type: 'regex' },
      { pattern: 'gym|fitness|sports|workout', categoryId: 'entertainment_sports', confidence: 0.8, type: 'regex' },
      
      // Investment patterns
      { pattern: 'mutual.?fund|sip|investment|mf', categoryId: 'investment_mutual_funds', confidence: 0.9, type: 'regex' },
      { pattern: 'stock|shares|trading|equity', categoryId: 'investment_stocks', confidence: 0.9, type: 'regex' },
      { pattern: 'fixed.?deposit|fd|term.?deposit', categoryId: 'investment_fd', confidence: 0.9, type: 'regex' },
      
      // Income patterns
      { pattern: 'salary|income|pay|wages|bonus|refund', categoryId: 'income', confidence: 0.8, type: 'regex' },
      
      // Education patterns
      { pattern: 'school|college|university|education|course|book', categoryId: 'education', confidence: 0.7, type: 'regex' }
    ];
  }

  private normalizeMerchantName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  findMerchantByDescription(description: string): Merchant | null {
    const normalized = this.normalizeMerchantName(description);
    
    // First, try exact match with normalized names
    for (const [normalizedName, merchantId] of this.normalizedMerchants) {
      if (normalized.includes(normalizedName)) {
        return this.merchants.get(merchantId) || null;
      }
    }

    // Try partial matches with merchant names
    for (const merchant of this.merchants.values()) {
      const merchantNormalized = this.normalizeMerchantName(merchant.name);
      if (normalized.includes(merchantNormalized) || merchantNormalized.includes(normalized)) {
        return merchant;
      }
    }

    return null;
  }

  getCategoryByPattern(description: string): { categoryId: string; confidence: number } | null {
    const lowerDescription = description.toLowerCase();
    
    for (const pattern of this.patterns) {
      if (pattern.type === 'regex') {
        const regex = new RegExp(pattern.pattern, 'i');
        if (regex.test(description)) {
          return {
            categoryId: pattern.categoryId,
            confidence: pattern.confidence
          };
        }
      } else if (pattern.type === 'contains') {
        if (lowerDescription.includes(pattern.pattern)) {
          return {
            categoryId: pattern.categoryId,
            confidence: pattern.confidence
          };
        }
      } else if (pattern.type === 'exact') {
        if (lowerDescription === pattern.pattern) {
          return {
            categoryId: pattern.categoryId,
            confidence: pattern.confidence
          };
        }
      }
    }

    return null;
  }

  addMerchant(merchant: Omit<Merchant, 'id' | 'created_at' | 'updated_at'>): string {
    const id = `merchant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const newMerchant: Merchant = {
      ...merchant,
      id,
      created_at: now,
      updated_at: now
    };

    this.merchants.set(id, newMerchant);
    this.normalizedMerchants.set(merchant.normalizedName, id);
    
    merchant.aliases.forEach(alias => {
      const normalizedAlias = this.normalizeMerchantName(alias);
      this.normalizedMerchants.set(normalizedAlias, id);
    });

    return id;
  }

  updateMerchant(id: string, updates: Partial<Merchant>): boolean {
    const merchant = this.merchants.get(id);
    if (!merchant) return false;

    if (updates.normalizedName || updates.aliases) {
      // Remove old normalized mappings
      this.normalizedMerchants.delete(merchant.normalizedName);
      merchant.aliases.forEach(alias => {
        const normalizedAlias = this.normalizeMerchantName(alias);
        this.normalizedMerchants.delete(normalizedAlias);
      });

      // Update merchant
      Object.assign(merchant, {
        ...updates,
        updated_at: new Date()
      });

      // Add new normalized mappings
      this.normalizedMerchants.set(merchant.normalizedName, id);
      merchant.aliases.forEach(alias => {
        const normalizedAlias = this.normalizeMerchantName(alias);
        this.normalizedMerchants.set(normalizedAlias, id);
      });
    } else {
      Object.assign(merchant, {
        ...updates,
        updated_at: new Date()
      });
    }

    return true;
  }

  getAllMerchants(): Merchant[] {
    return Array.from(this.merchants.values());
  }

  getMerchantById(id: string): Merchant | undefined {
    return this.merchants.get(id);
  }

  searchMerchants(query: string): Merchant[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.merchants.values()).filter(merchant =>
      merchant.name.toLowerCase().includes(lowerQuery) ||
      merchant.aliases.some(alias => alias.toLowerCase().includes(lowerQuery))
    );
  }

  getMerchantStats(): Record<string, number> {
    const stats = { total: this.merchants.size };
    
    // Group by category
    const categoryStats: Record<string, number> = {};
    this.merchants.forEach(merchant => {
      categoryStats[merchant.categoryId] = (categoryStats[merchant.categoryId] || 0) + 1;
    });

    return { ...stats, ...categoryStats };
  }

  incrementTransactionCount(merchantId: string): void {
    const merchant = this.merchants.get(merchantId);
    if (merchant) {
      merchant.transactionCount++;
      merchant.updated_at = new Date();
    }
  }

  addPattern(pattern: MerchantPattern): void {
    this.patterns.push(pattern);
  }

  getPatterns(): MerchantPattern[] {
    return [...this.patterns];
  }
}