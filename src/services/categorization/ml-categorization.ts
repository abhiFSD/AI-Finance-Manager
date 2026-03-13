import { Transaction } from '../../types';
import { MLFeatures, TrainingData, CategorizationResult } from './types';

export class MLCategorizationService {
  private model: any = null;
  private isModelLoaded = false;
  private trainingData: TrainingData[] = [];
  private readonly CONFIDENCE_THRESHOLD = 0.7;
  private readonly FEATURES = [
    'amount',
    'amountBucket', 
    'dayOfWeek',
    'dayOfMonth',
    'month',
    'descriptionLength',
    'hasNumbers',
    'hasSpecialChars'
  ];

  constructor() {
    this.initializeModel();
    this.loadTrainingData();
  }

  private async initializeModel(): Promise<void> {
    try {
      // For now, we'll use a simple rule-based model
      // In a real implementation, you would load TensorFlow.js model here
      this.isModelLoaded = true;
    } catch (error) {
      console.error('Failed to initialize ML model:', error);
      this.isModelLoaded = false;
    }
  }

  private loadTrainingData(): void {
    // Initialize with some sample training data for Indian transactions
    this.trainingData = [
      // Food & Dining
      { description: 'ZOMATO ONLINE ORDERING', amount: 450, categoryId: 'food_delivery', verified: true },
      { description: 'SWIGGY BANGALORE', amount: 320, categoryId: 'food_delivery', verified: true },
      { description: 'DOMINOS PIZZA MUMBAI', amount: 680, categoryId: 'food_fast', verified: true },
      { description: 'STARBUCKS COFFEE DELHI', amount: 250, categoryId: 'food_cafe', verified: true },
      { description: 'BIG BAZAAR HYDERABAD', amount: 1200, categoryId: 'food_grocery', verified: true },
      { description: 'RELIANCE FRESH PUNE', amount: 850, categoryId: 'food_grocery', verified: true },
      
      // Transportation
      { description: 'UBER TRIP CHARGE', amount: 180, categoryId: 'transport_taxi', verified: true },
      { description: 'OLA CABS BANGALORE', amount: 240, categoryId: 'transport_taxi', verified: true },
      { description: 'INDIAN OIL PETROL PUMP', amount: 3500, categoryId: 'transport_fuel', verified: true },
      { description: 'DELHI METRO TRAVEL', amount: 45, categoryId: 'transport_public', verified: true },
      
      // Shopping
      { description: 'AMAZON INDIA PURCHASE', amount: 2500, categoryId: 'shopping_online', verified: true },
      { description: 'FLIPKART ORDER PAYMENT', amount: 1800, categoryId: 'shopping_online', verified: true },
      { description: 'MYNTRA FASHION STORE', amount: 1200, categoryId: 'shopping_clothing', verified: true },
      { description: 'CROMA ELECTRONICS', amount: 15000, categoryId: 'shopping_electronics', verified: true },
      
      // Utilities
      { description: 'TATA POWER ELECTRICITY BILL', amount: 2800, categoryId: 'utilities_electricity', verified: true },
      { description: 'AIRTEL MOBILE POSTPAID', amount: 600, categoryId: 'utilities_internet', verified: true },
      { description: 'JIO BROADBAND PAYMENT', amount: 850, categoryId: 'utilities_internet', verified: true },
      
      // Healthcare
      { description: 'APOLLO PHARMACY MEDICINES', amount: 450, categoryId: 'healthcare_pharmacy', verified: true },
      { description: 'MAX HOSPITAL CONSULTATION', amount: 1200, categoryId: 'healthcare_doctor', verified: true },
      { description: 'PHARMEASY MEDICINE DELIVERY', amount: 320, categoryId: 'healthcare_pharmacy', verified: true },
      
      // Entertainment
      { description: 'NETFLIX MONTHLY SUBSCRIPTION', amount: 650, categoryId: 'entertainment_streaming', verified: true },
      { description: 'AMAZON PRIME VIDEO', amount: 129, categoryId: 'entertainment_streaming', verified: true },
      { description: 'BOOKMYSHOW MOVIE TICKET', amount: 280, categoryId: 'entertainment_movies', verified: true },
      { description: 'CULT FIT GYM MEMBERSHIP', amount: 2500, categoryId: 'entertainment_sports', verified: true },
      
      // Investment
      { description: 'SBI MUTUAL FUND SIP', amount: 5000, categoryId: 'investment_mutual_funds', verified: true },
      { description: 'ZERODHA STOCK PURCHASE', amount: 10000, categoryId: 'investment_stocks', verified: true },
      { description: 'HDFC BANK FIXED DEPOSIT', amount: 100000, categoryId: 'investment_fd', verified: true },
      
      // Income
      { description: 'SALARY CREDIT TCS', amount: 75000, categoryId: 'income', verified: true },
      { description: 'BONUS PAYMENT', amount: 25000, categoryId: 'income', verified: true },
      { description: 'FREELANCE PAYMENT', amount: 15000, categoryId: 'income', verified: true },
    ];
  }

  private extractFeatures(transaction: Transaction): MLFeatures {
    const date = new Date(transaction.date);
    const description = transaction.description.toLowerCase();
    
    // Amount buckets for better categorization
    let amountBucket: string;
    const amount = Math.abs(transaction.amount);
    if (amount < 100) amountBucket = 'very_small';
    else if (amount < 500) amountBucket = 'small';
    else if (amount < 2000) amountBucket = 'medium';
    else if (amount < 10000) amountBucket = 'large';
    else amountBucket = 'very_large';

    return {
      amount: Math.abs(transaction.amount),
      amountBucket,
      dayOfWeek: date.getDay(),
      dayOfMonth: date.getDate(),
      month: date.getMonth(),
      description: transaction.description,
      descriptionLength: transaction.description.length,
      hasNumbers: /\d/.test(transaction.description),
      hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(transaction.description)
    };
  }

  private calculateSimilarity(features1: MLFeatures, features2: MLFeatures): number {
    let score = 0;
    let totalWeights = 0;

    // Description similarity (highest weight)
    const desc1 = features1.description.toLowerCase();
    const desc2 = features2.description.toLowerCase();
    const descSimilarity = this.calculateTextSimilarity(desc1, desc2);
    score += descSimilarity * 0.4;
    totalWeights += 0.4;

    // Amount bucket similarity
    if (features1.amountBucket === features2.amountBucket) {
      score += 0.2;
    }
    totalWeights += 0.2;

    // Amount range similarity
    const amountRatio = Math.min(features1.amount, features2.amount) / 
                       Math.max(features1.amount, features2.amount);
    score += amountRatio * 0.15;
    totalWeights += 0.15;

    // Day patterns
    if (features1.dayOfWeek === features2.dayOfWeek) {
      score += 0.1;
    }
    totalWeights += 0.1;

    // Month patterns
    if (features1.month === features2.month) {
      score += 0.1;
    }
    totalWeights += 0.1;

    // Description characteristics
    if (features1.hasNumbers === features2.hasNumbers) {
      score += 0.025;
    }
    if (features1.hasSpecialChars === features2.hasSpecialChars) {
      score += 0.025;
    }
    totalWeights += 0.05;

    return totalWeights > 0 ? score / totalWeights : 0;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.split(/\s+/).filter(word => word.length > 2);
    const words2 = text2.split(/\s+/).filter(word => word.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;

    // Check for exact substring matches
    if (text1.includes(text2) || text2.includes(text1)) return 0.9;

    // Calculate Jaccard similarity
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(word => set2.has(word)));
    const union = new Set([...set1, ...set2]);
    
    const jaccardSimilarity = intersection.size / union.size;

    // Check for common keywords
    const commonKeywords = this.findCommonKeywords(text1, text2);
    const keywordBonus = Math.min(commonKeywords.length * 0.1, 0.3);

    return Math.min(jaccardSimilarity + keywordBonus, 1);
  }

  private findCommonKeywords(text1: string, text2: string): string[] {
    const keywords = [
      'payment', 'purchase', 'order', 'bill', 'subscription', 'credit', 'debit',
      'online', 'app', 'mobile', 'card', 'upi', 'wallet', 'transfer'
    ];
    
    return keywords.filter(keyword => 
      text1.includes(keyword) && text2.includes(keyword)
    );
  }

  async categorizeTransaction(transaction: Transaction): Promise<CategorizationResult> {
    if (!this.isModelLoaded) {
      throw new Error('ML model not loaded');
    }

    const features = this.extractFeatures(transaction);
    const candidates = this.findSimilarTransactions(features, 5);

    if (candidates.length === 0) {
      return {
        categoryId: 'shopping_online', // default category
        confidence: 0.1,
        reason: 'No similar transactions found, using default category',
        suggestions: []
      };
    }

    // Vote based on similar transactions
    const categoryVotes: Record<string, { count: number; totalSimilarity: number; reasons: string[] }> = {};
    
    candidates.forEach(candidate => {
      if (!categoryVotes[candidate.categoryId]) {
        categoryVotes[candidate.categoryId] = {
          count: 0,
          totalSimilarity: 0,
          reasons: []
        };
      }
      
      categoryVotes[candidate.categoryId].count++;
      categoryVotes[candidate.categoryId].totalSimilarity += candidate.similarity;
      categoryVotes[candidate.categoryId].reasons.push(
        `Similar to "${candidate.trainingData.description}" (${(candidate.similarity * 100).toFixed(1)}% match)`
      );
    });

    // Calculate weighted scores
    const categoryScores = Object.entries(categoryVotes).map(([categoryId, votes]) => ({
      categoryId,
      score: (votes.count * 0.3) + (votes.totalSimilarity / votes.count * 0.7),
      count: votes.count,
      avgSimilarity: votes.totalSimilarity / votes.count,
      reasons: votes.reasons
    })).sort((a, b) => b.score - a.score);

    const topCategory = categoryScores[0];
    const confidence = Math.min(topCategory.avgSimilarity * (1 + topCategory.count * 0.1), 0.95);

    const suggestions = categoryScores.slice(0, 3).map(cat => ({
      categoryId: cat.categoryId,
      categoryName: this.getCategoryDisplayName(cat.categoryId),
      confidence: cat.avgSimilarity,
      reason: `${cat.count} similar transaction${cat.count > 1 ? 's' : ''} found`
    }));

    return {
      categoryId: topCategory.categoryId,
      confidence,
      reason: topCategory.reasons[0] || 'Based on similar transactions',
      suggestions
    };
  }

  private findSimilarTransactions(features: MLFeatures, limit: number = 10): Array<{
    trainingData: TrainingData;
    similarity: number;
    categoryId: string;
  }> {
    const similarities = this.trainingData.map(data => {
      const trainingFeatures = this.extractFeatures({
        id: 'temp',
        description: data.description,
        amount: data.amount,
        date: new Date(),
        accountId: 'temp',
        type: data.amount > 0 ? 'credit' : 'debit',
        created_at: new Date(),
        updated_at: new Date()
      });

      const similarity = this.calculateSimilarity(features, trainingFeatures);
      
      return {
        trainingData: data,
        similarity,
        categoryId: data.categoryId
      };
    });

    return similarities
      .filter(item => item.similarity > 0.1)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  private getCategoryDisplayName(categoryId: string): string {
    const categoryNames: Record<string, string> = {
      'food_delivery': 'Food Delivery',
      'food_fast': 'Fast Food',
      'food_cafe': 'Cafe & Coffee',
      'food_grocery': 'Groceries',
      'food_restaurant': 'Restaurant',
      'transport_taxi': 'Taxi & Ride Share',
      'transport_fuel': 'Fuel & Parking',
      'transport_public': 'Public Transport',
      'shopping_online': 'Online Shopping',
      'shopping_clothing': 'Clothing',
      'shopping_electronics': 'Electronics',
      'utilities_electricity': 'Electricity',
      'utilities_internet': 'Internet & Phone',
      'healthcare_pharmacy': 'Pharmacy',
      'healthcare_doctor': 'Doctor & Medical',
      'entertainment_streaming': 'Streaming Services',
      'entertainment_movies': 'Movies & Entertainment',
      'entertainment_sports': 'Sports & Fitness',
      'investment_mutual_funds': 'Mutual Funds',
      'investment_stocks': 'Stocks & Trading',
      'investment_fd': 'Fixed Deposits',
      'income': 'Income'
    };

    return categoryNames[categoryId] || categoryId;
  }

  addTrainingData(data: TrainingData): void {
    this.trainingData.push(data);
  }

  addTrainingDataBatch(data: TrainingData[]): void {
    this.trainingData.push(...data);
  }

  trainFromUserFeedback(
    transaction: Transaction, 
    correctCategoryId: string, 
    userId?: string
  ): void {
    const trainingData: TrainingData = {
      description: transaction.description,
      amount: transaction.amount,
      categoryId: correctCategoryId,
      userId,
      verified: true
    };

    this.addTrainingData(trainingData);
  }

  getModelInfo(): {
    isLoaded: boolean;
    trainingDataCount: number;
    features: string[];
    accuracy?: number;
  } {
    return {
      isLoaded: this.isModelLoaded,
      trainingDataCount: this.trainingData.length,
      features: this.FEATURES,
      accuracy: this.calculateModelAccuracy()
    };
  }

  private calculateModelAccuracy(): number {
    if (this.trainingData.length < 10) return 0;

    // Simple cross-validation accuracy estimation
    const sampleSize = Math.min(50, Math.floor(this.trainingData.length * 0.2));
    const testData = this.trainingData.slice(-sampleSize);
    let correctPredictions = 0;

    testData.forEach(testItem => {
      const features = this.extractFeatures({
        id: 'test',
        description: testItem.description,
        amount: testItem.amount,
        date: new Date(),
        accountId: 'test',
        type: testItem.amount > 0 ? 'credit' : 'debit',
        created_at: new Date(),
        updated_at: new Date()
      });

      const trainingSubset = this.trainingData.filter(item => item !== testItem);
      const originalData = this.trainingData;
      this.trainingData = trainingSubset;

      try {
        const prediction = this.findSimilarTransactions(features, 1);
        if (prediction.length > 0 && prediction[0].categoryId === testItem.categoryId) {
          correctPredictions++;
        }
      } catch (error) {
        // Handle prediction errors
      }

      this.trainingData = originalData;
    });

    return sampleSize > 0 ? correctPredictions / sampleSize : 0;
  }

  getTrainingDataStats(): Record<string, number> {
    const categoryStats: Record<string, number> = {};
    this.trainingData.forEach(data => {
      categoryStats[data.categoryId] = (categoryStats[data.categoryId] || 0) + 1;
    });

    return {
      total: this.trainingData.length,
      verified: this.trainingData.filter(d => d.verified).length,
      ...categoryStats
    };
  }

  clearTrainingData(): void {
    this.trainingData = [];
  }

  exportTrainingData(): TrainingData[] {
    return [...this.trainingData];
  }

  importTrainingData(data: TrainingData[]): void {
    this.trainingData = data;
  }
}