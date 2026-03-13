export interface CategorizationResult {
  categoryId: string;
  subcategoryId?: string;
  confidence: number;
  reason: string;
  merchantId?: string;
  suggestions: CategorySuggestion[];
}

export interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reason: string;
}

export interface MerchantPattern {
  pattern: string;
  categoryId: string;
  confidence: number;
  type: 'exact' | 'contains' | 'regex';
}

export interface TrainingData {
  description: string;
  amount: number;
  categoryId: string;
  userId?: string;
  verified: boolean;
}

export interface MLFeatures {
  amount: number;
  amountBucket: string;
  dayOfWeek: number;
  dayOfMonth: number;
  month: number;
  hour?: number;
  description: string;
  descriptionLength: number;
  hasNumbers: boolean;
  hasSpecialChars: boolean;
  merchantType?: string;
  location?: string;
}

export interface CategoryKeywords {
  [categoryId: string]: {
    positive: string[];
    negative: string[];
    patterns: string[];
  };
}

export interface IndianMerchants {
  [merchantName: string]: {
    categoryId: string;
    aliases: string[];
    type: 'online' | 'offline' | 'app';
    confidence: number;
  };
}