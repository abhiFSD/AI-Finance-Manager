/**
 * AI Document Analyzer Service
 * Analyzes extracted transactions using rule-based AI
 * - Auto-categorizes based on description/merchant
 * - Detects duplicates against existing transactions
 * - Normalizes merchant names
 * - Flags suspicious amounts
 * - Calculates confidence scores
 */

import { prisma } from '../lib/prisma';
import { 
  normalizeMerchant, 
  calculateSimilarity, 
  normalizationAmountMatch 
} from '../utils/merchant-normalizer';

interface AnalyzedTransaction {
  id?: string;
  tempId?: string;
  date: Date;
  description: string;
  amount: number;
  merchantName?: string;
  type: string;
  category?: string;
  categoryId?: string;
  tags?: string[];
  notes?: string;
  // AI Analysis fields
  aiSuggestions?: {
    suggestedCategory?: string;
    suggestedCategoryId?: string;
    categoryConfidence?: number;
    normalizedMerchant?: string;
    merchantConfidence?: number;
    duplicateDetected?: boolean;
    duplicateOf?: string;
    suspiciousAmount?: boolean;
    overallConfidence?: number;
  };
}

interface AnalysisResult {
  analyzedTransactions: AnalyzedTransaction[];
  summary: {
    categorized: number;
    duplicatesFound: number;
    merchantsNormalized: number;
    flagged: number;
    totalProcessed: number;
    averageConfidence: number;
  };
}

/**
 * Find similar existing transactions for the same user
 */
async function findSimilarTransactions(
  userId: string,
  transaction: AnalyzedTransaction,
  dateToleranceDays: number = 3
) {
  const startDate = new Date(transaction.date);
  startDate.setDate(startDate.getDate() - dateToleranceDays);

  const endDate = new Date(transaction.date);
  endDate.setDate(endDate.getDate() + dateToleranceDays);

  const similar = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      // Exclude transactions from same document
      documentId: {
        not: transaction.id,
      },
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return similar;
}

/**
 * Score a potential duplicate based on multiple criteria
 */
function scoreDuplicate(
  existing: any,
  extracted: AnalyzedTransaction,
  descriptionSimilarity: number,
  amountMatch: boolean
): number {
  let score = 0;

  // Amount match (highest priority) - 50%
  if (amountMatch) score += 50;

  // Description similarity - 30%
  score += descriptionSimilarity * 30;

  // Merchant/description contains similar keywords - 20%
  const keywords1 = (existing.merchantName || existing.description).toLowerCase().split(/\s+/);
  const keywords2 = (extracted.merchantName || extracted.description).toLowerCase().split(/\s+/);
  const commonKeywords = keywords1.filter((k: string) => keywords2.includes(k)).length;
  const keywordScore = Math.min(commonKeywords / Math.max(keywords1.length, keywords2.length), 1);
  score += keywordScore * 20;

  return Math.min(score, 100);
}

/**
 * Detect if transaction is suspicious based on amount
 */
function isSuspiciousAmount(amount: number, type: string): boolean {
  // Flag amounts greater than ₹1,00,000 (100,000)
  const suspiciousThreshold = 100000;

  if (type === 'EXPENSE' || type === 'expense') {
    return amount > suspiciousThreshold;
  }

  if (type === 'INCOME' || type === 'income') {
    return amount > suspiciousThreshold * 2; // Higher threshold for income
  }

  return false;
}

/**
 * Find best matching category from user's transaction history
 */
async function findBestCategory(
  userId: string,
  description: string,
  merchantName: string | undefined,
  transactionType: string
) {
  // Get categories with transaction counts (include system categories)
  const categories = await prisma.category.findMany({
    where: {
      OR: [
        { userId: userId },     // User's custom categories
        { userId: null }        // System categories
      ]
    },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });

  if (categories.length === 0) {
    return null;
  }

  // Find recent transactions with similar descriptions (get first word)
  const firstWord = description.split(/\s+/)[0];
  
  const recentTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      description: {
        contains: firstWord,
      },
    },
    select: {
      categoryId: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      date: 'desc',
    },
    take: 10,
  });

  // Find most common category
  if (recentTransactions.length > 0) {
    const categoryMap = new Map<string, number>();
    recentTransactions.forEach((txn: any) => {
      if (txn.categoryId) {
        categoryMap.set(txn.categoryId, (categoryMap.get(txn.categoryId) || 0) + 1);
      }
    });

    if (categoryMap.size > 0) {
      const mostCommonCategoryId = Array.from(categoryMap.entries()).sort(
        (a: [string, number], b: [string, number]) => b[1] - a[1]
      )[0][0];

      const category = categories.find((c: any) => c.id === mostCommonCategoryId);
      if (category) {
        return category;
      }
    }
  }

  // If no similar transaction found, try keyword-based matching
  const normalizedDesc = (merchantName || description).toLowerCase();
  
  // Common keywords for categories
  const categoryKeywords: { [key: string]: string[] } = {
    'Food & Dining': ['food', 'restaurant', 'cafe', 'zomato', 'swiggy', 'delivery', 'meal', 'breakfast', 'lunch', 'dinner', 'pizza', 'burger', 'coffee', 'starbucks'],
    'Shopping': ['amazon', 'amzn', 'flipkart', 'shopping', 'store', 'mall', 'retail', 'purchase', 'myntra', 'ajio'],
    'Entertainment': ['netflix', 'prime', 'spotify', 'hotstar', 'disney', 'movie', 'cinema', 'theatre', 'game', 'entertainment'],
    'Bills & Utilities': ['electricity', 'water', 'gas', 'bill', 'utility', 'internet', 'broadband', 'wifi', 'mobile', 'recharge', 'paytm'],
    'Transportation': ['uber', 'ola', 'rapido', 'metro', 'bus', 'train', 'flight', 'taxi', 'fuel', 'petrol', 'diesel'],
    'Healthcare': ['hospital', 'doctor', 'pharmacy', 'medicine', 'medical', 'clinic', 'health', 'insurance'],
    'Groceries': ['grocery', 'vegetables', 'fruits', 'supermarket', 'mart', 'bazar', 'bigbasket', 'grofers', 'milk', 'bread'],
    'Salary': ['salary', 'income', 'payroll', 'payment', 'credit salary', 'wage'],
  };
  
  // Try to match keywords
  for (const [categoryName, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => normalizedDesc.includes(keyword))) {
      // Try exact match first
      let matchedCategory = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
      
      // Try partial match (e.g., "Food" matches "Food & Dining")
      if (!matchedCategory) {
        matchedCategory = categories.find(c => {
          const catNameLower = c.name.toLowerCase();
          const searchNameLower = categoryName.toLowerCase();
          return catNameLower.includes(searchNameLower) || searchNameLower.includes(catNameLower.split(' ')[0]);
        });
      }
      
      if (matchedCategory) {
        return matchedCategory;
      }
    }
  }
  
  // If still no match, return null instead of defaulting to most common
  return null;
}

/**
 * Main function to analyze transactions
 */
export async function analyzeDocumentTransactions(
  transactions: AnalyzedTransaction[],
  userId: string
): Promise<AnalysisResult> {
  const analyzedTransactions: AnalyzedTransaction[] = [];
  let categorizedCount = 0;
  let duplicatesFoundCount = 0;
  let merchantsNormalizedCount = 0;
  let flaggedCount = 0;
  const confidenceScores: number[] = [];

  for (const transaction of transactions) {
    const analyzed: AnalyzedTransaction = { ...transaction };
    let overallConfidence = 0;
    let confidenceFactors = 0;

    analyzed.aiSuggestions = {};

    // 1. Normalize merchant name
    if (transaction.merchantName || transaction.description) {
      const merchantName = transaction.merchantName || transaction.description;
      const normalized = normalizeMerchant(merchantName);

      if (normalized !== merchantName) {
        analyzed.aiSuggestions.normalizedMerchant = normalized;
        analyzed.aiSuggestions.merchantConfidence = 0.9; // High confidence for known merchants
        merchantsNormalizedCount++;
      } else if (normalized !== 'Unknown') {
        analyzed.aiSuggestions.normalizedMerchant = normalized;
        analyzed.aiSuggestions.merchantConfidence = 0.7; // Medium confidence for generic normalization
      }
    }

    // 2. Find best matching category
    const suggestedCategory = await findBestCategory(
      userId,
      transaction.description,
      transaction.merchantName,
      transaction.type
    );

    if (suggestedCategory) {
      analyzed.aiSuggestions.suggestedCategoryId = suggestedCategory.id;
      analyzed.aiSuggestions.suggestedCategory = suggestedCategory.name;

      // Confidence based on match strength
      // If user already has a category, assign high confidence
      if (transaction.categoryId === suggestedCategory.id) {
        analyzed.aiSuggestions.categoryConfidence = 1.0;
      } else {
        // 0.8 - good suggestion, 0.6 - ok suggestion
        analyzed.aiSuggestions.categoryConfidence = suggestedCategory._count.transactions > 5 ? 0.8 : 0.6;
      }

      categorizedCount++;
      confidenceFactors++;
      overallConfidence += analyzed.aiSuggestions.categoryConfidence;
    }

    // 3. Detect duplicates
    const similarTransactions = await findSimilarTransactions(userId, analyzed);

    for (const similar of similarTransactions) {
      const descriptionSimilarity = calculateSimilarity(
        transaction.description,
        similar.description
      );

      const amountMatch = normalizationAmountMatch(transaction.amount, similar.amount, 10);

      // If both description is similar and amount matches closely, flag as duplicate
      if (descriptionSimilarity >= 0.7 && amountMatch) {
        analyzed.aiSuggestions.duplicateDetected = true;
        analyzed.aiSuggestions.duplicateOf = similar.id;
        duplicatesFoundCount++;
        flaggedCount++;

        // Reduce confidence for duplicates
        overallConfidence -= 0.3;
        break;
      }
    }

    // 4. Flag suspicious amounts
    if (isSuspiciousAmount(transaction.amount, transaction.type)) {
      analyzed.aiSuggestions.suspiciousAmount = true;
      flaggedCount++;
      overallConfidence -= 0.2;
    }

    // 5. Calculate overall confidence
    if (confidenceFactors > 0) {
      analyzed.aiSuggestions.overallConfidence = Math.max(0, Math.min(1, overallConfidence / confidenceFactors));
    } else {
      analyzed.aiSuggestions.overallConfidence = 0.5; // Default for unanalyzable transactions
    }

    confidenceScores.push(analyzed.aiSuggestions.overallConfidence);
    analyzedTransactions.push(analyzed);
  }

  const averageConfidence =
    confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 0;

  return {
    analyzedTransactions,
    summary: {
      categorized: categorizedCount,
      duplicatesFound: duplicatesFoundCount,
      merchantsNormalized: merchantsNormalizedCount,
      flagged: flaggedCount,
      totalProcessed: transactions.length,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
    },
  };
}

export default {
  analyzeDocumentTransactions,
};
