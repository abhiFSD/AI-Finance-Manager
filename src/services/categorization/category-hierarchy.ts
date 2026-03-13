import { Category } from '../../types';

interface CategoryNode extends Category {
  children: CategoryNode[];
  level: number;
}

export class CategoryHierarchyService {
  private categories: Map<string, CategoryNode> = new Map();
  private rootCategories: CategoryNode[] = [];

  constructor() {
    this.initializeDefaultCategories();
  }

  private initializeDefaultCategories(): void {
    const defaultCategories = this.getDefaultIndianCategories();
    
    // First pass: create all categories
    defaultCategories.forEach(cat => {
      const node: CategoryNode = {
        ...cat,
        children: [],
        level: cat.parentId ? 1 : 0
      };
      this.categories.set(cat.id, node);
    });

    // Second pass: build hierarchy
    defaultCategories.forEach(cat => {
      const node = this.categories.get(cat.id)!;
      if (cat.parentId) {
        const parent = this.categories.get(cat.parentId);
        if (parent) {
          parent.children.push(node);
          node.level = parent.level + 1;
        }
      } else {
        this.rootCategories.push(node);
      }
    });
  }

  private getDefaultIndianCategories(): Category[] {
    const now = new Date();
    return [
      // Root Categories
      { id: 'food', name: 'Food & Dining', parentId: undefined, color: '#FF6B6B', icon: '🍽️', isCustom: false, keywords: ['restaurant', 'food', 'dining', 'cafe', 'kitchen'], created_at: now, updated_at: now },
      { id: 'transport', name: 'Transportation', parentId: undefined, color: '#4ECDC4', icon: '🚗', isCustom: false, keywords: ['taxi', 'uber', 'ola', 'metro', 'bus', 'train', 'fuel', 'petrol'], created_at: now, updated_at: now },
      { id: 'shopping', name: 'Shopping', parentId: undefined, color: '#45B7D1', icon: '🛍️', isCustom: false, keywords: ['amazon', 'flipkart', 'shopping', 'purchase', 'buy'], created_at: now, updated_at: now },
      { id: 'utilities', name: 'Bills & Utilities', parentId: undefined, color: '#96CEB4', icon: '💡', isCustom: false, keywords: ['electricity', 'water', 'gas', 'internet', 'mobile', 'bill'], created_at: now, updated_at: now },
      { id: 'healthcare', name: 'Healthcare', parentId: undefined, color: '#FFEAA7', icon: '🏥', isCustom: false, keywords: ['hospital', 'doctor', 'medicine', 'pharmacy', 'health'], created_at: now, updated_at: now },
      { id: 'entertainment', name: 'Entertainment', parentId: undefined, color: '#DDA0DD', icon: '🎬', isCustom: false, keywords: ['movie', 'netflix', 'amazon prime', 'spotify', 'game'], created_at: now, updated_at: now },
      { id: 'investment', name: 'Investment', parentId: undefined, color: '#98D8C8', icon: '📈', isCustom: false, keywords: ['mutual fund', 'sip', 'stock', 'fd', 'investment'], created_at: now, updated_at: now },
      { id: 'education', name: 'Education', parentId: undefined, color: '#F7DC6F', icon: '📚', isCustom: false, keywords: ['school', 'college', 'course', 'book', 'education'], created_at: now, updated_at: now },
      { id: 'personal', name: 'Personal Care', parentId: undefined, color: '#BB8FCE', icon: '💄', isCustom: false, keywords: ['salon', 'spa', 'cosmetic', 'grooming'], created_at: now, updated_at: now },
      { id: 'income', name: 'Income', parentId: undefined, color: '#52C41A', icon: '💰', isCustom: false, keywords: ['salary', 'income', 'bonus', 'refund'], created_at: now, updated_at: now },

      // Food Subcategories
      { id: 'food_restaurant', name: 'Restaurants', parentId: 'food', color: '#FF5252', icon: '🍽️', isCustom: false, keywords: ['restaurant', 'dining', 'hotel'], created_at: now, updated_at: now },
      { id: 'food_fast', name: 'Fast Food', parentId: 'food', color: '#FF7043', icon: '🍔', isCustom: false, keywords: ['mcdonalds', 'kfc', 'burger king', 'pizza', 'dominos'], created_at: now, updated_at: now },
      { id: 'food_delivery', name: 'Food Delivery', parentId: 'food', color: '#FF8A65', icon: '🛵', isCustom: false, keywords: ['zomato', 'swiggy', 'food delivery', 'uber eats'], created_at: now, updated_at: now },
      { id: 'food_grocery', name: 'Groceries', parentId: 'food', color: '#FFA726', icon: '🛒', isCustom: false, keywords: ['grocery', 'supermarket', 'reliance fresh', 'big bazaar', 'dmart'], created_at: now, updated_at: now },
      { id: 'food_cafe', name: 'Cafe & Coffee', parentId: 'food', color: '#FFB74D', icon: '☕', isCustom: false, keywords: ['starbucks', 'cafe coffee day', 'coffee', 'cafe'], created_at: now, updated_at: now },

      // Transport Subcategories
      { id: 'transport_taxi', name: 'Taxi & Ride Share', parentId: 'transport', color: '#26C6DA', icon: '🚕', isCustom: false, keywords: ['uber', 'ola', 'taxi', 'cab'], created_at: now, updated_at: now },
      { id: 'transport_public', name: 'Public Transport', parentId: 'transport', color: '#42A5F5', icon: '🚌', isCustom: false, keywords: ['metro', 'bus', 'train', 'auto', 'rickshaw'], created_at: now, updated_at: now },
      { id: 'transport_fuel', name: 'Fuel & Parking', parentId: 'transport', color: '#66BB6A', icon: '⛽', isCustom: false, keywords: ['petrol', 'diesel', 'fuel', 'parking', 'toll'], created_at: now, updated_at: now },
      { id: 'transport_maintenance', name: 'Vehicle Maintenance', parentId: 'transport', color: '#9CCC65', icon: '🔧', isCustom: false, keywords: ['service', 'repair', 'maintenance', 'insurance'], created_at: now, updated_at: now },

      // Shopping Subcategories
      { id: 'shopping_online', name: 'Online Shopping', parentId: 'shopping', color: '#5C6BC0', icon: '💻', isCustom: false, keywords: ['amazon', 'flipkart', 'myntra', 'online'], created_at: now, updated_at: now },
      { id: 'shopping_clothing', name: 'Clothing', parentId: 'shopping', color: '#7E57C2', icon: '👕', isCustom: false, keywords: ['clothing', 'apparel', 'fashion', 'dress'], created_at: now, updated_at: now },
      { id: 'shopping_electronics', name: 'Electronics', parentId: 'shopping', color: '#8E24AA', icon: '📱', isCustom: false, keywords: ['mobile', 'laptop', 'electronics', 'gadget'], created_at: now, updated_at: now },
      { id: 'shopping_home', name: 'Home & Garden', parentId: 'shopping', color: '#D81B60', icon: '🏠', isCustom: false, keywords: ['furniture', 'home', 'garden', 'decor'], created_at: now, updated_at: now },

      // Utilities Subcategories
      { id: 'utilities_electricity', name: 'Electricity', parentId: 'utilities', color: '#FFD54F', icon: '⚡', isCustom: false, keywords: ['electricity', 'power', 'electric'], created_at: now, updated_at: now },
      { id: 'utilities_water', name: 'Water', parentId: 'utilities', color: '#4FC3F7', icon: '💧', isCustom: false, keywords: ['water', 'municipal'], created_at: now, updated_at: now },
      { id: 'utilities_internet', name: 'Internet & Phone', parentId: 'utilities', color: '#81C784', icon: '📡', isCustom: false, keywords: ['internet', 'broadband', 'mobile bill', 'telecom'], created_at: now, updated_at: now },
      { id: 'utilities_gas', name: 'Gas', parentId: 'utilities', color: '#A1887F', icon: '🔥', isCustom: false, keywords: ['gas', 'lpg', 'cylinder'], created_at: now, updated_at: now },

      // Healthcare Subcategories
      { id: 'healthcare_doctor', name: 'Doctor & Consultation', parentId: 'healthcare', color: '#E57373', icon: '👨‍⚕️', isCustom: false, keywords: ['doctor', 'consultation', 'clinic'], created_at: now, updated_at: now },
      { id: 'healthcare_pharmacy', name: 'Pharmacy & Medicine', parentId: 'healthcare', color: '#F06292', icon: '💊', isCustom: false, keywords: ['pharmacy', 'medicine', 'drug', 'apollo'], created_at: now, updated_at: now },
      { id: 'healthcare_hospital', name: 'Hospital & Emergency', parentId: 'healthcare', color: '#BA68C8', icon: '🏥', isCustom: false, keywords: ['hospital', 'emergency', 'surgery'], created_at: now, updated_at: now },
      { id: 'healthcare_insurance', name: 'Health Insurance', parentId: 'healthcare', color: '#9575CD', icon: '🛡️', isCustom: false, keywords: ['insurance', 'premium', 'policy'], created_at: now, updated_at: now },

      // Entertainment Subcategories
      { id: 'entertainment_streaming', name: 'Streaming Services', parentId: 'entertainment', color: '#64B5F6', icon: '📺', isCustom: false, keywords: ['netflix', 'amazon prime', 'hotstar', 'spotify'], created_at: now, updated_at: now },
      { id: 'entertainment_movies', name: 'Movies & Theater', parentId: 'entertainment', color: '#4DB6AC', icon: '🎬', isCustom: false, keywords: ['movie', 'cinema', 'theater', 'ticket'], created_at: now, updated_at: now },
      { id: 'entertainment_games', name: 'Games & Apps', parentId: 'entertainment', color: '#AED581', icon: '🎮', isCustom: false, keywords: ['game', 'app', 'play store', 'gaming'], created_at: now, updated_at: now },
      { id: 'entertainment_sports', name: 'Sports & Fitness', parentId: 'entertainment', color: '#FFB74D', icon: '🏃‍♂️', isCustom: false, keywords: ['gym', 'fitness', 'sports', 'workout'], created_at: now, updated_at: now },

      // Investment Subcategories
      { id: 'investment_mutual_funds', name: 'Mutual Funds', parentId: 'investment', color: '#81C784', icon: '📊', isCustom: false, keywords: ['mutual fund', 'sip', 'mf'], created_at: now, updated_at: now },
      { id: 'investment_stocks', name: 'Stocks & Trading', parentId: 'investment', color: '#4CAF50', icon: '📈', isCustom: false, keywords: ['stock', 'shares', 'trading', 'zerodha', 'upstox'], created_at: now, updated_at: now },
      { id: 'investment_fd', name: 'Fixed Deposits', parentId: 'investment', color: '#8BC34A', icon: '🏦', isCustom: false, keywords: ['fixed deposit', 'fd', 'term deposit'], created_at: now, updated_at: now },
      { id: 'investment_ppf', name: 'PPF & Tax Saving', parentId: 'investment', color: '#CDDC39', icon: '💰', isCustom: false, keywords: ['ppf', 'elss', 'nps', 'tax saving'], created_at: now, updated_at: now }
    ];
  }

  getCategoryHierarchy(): CategoryNode[] {
    return this.rootCategories;
  }

  getCategoryById(id: string): CategoryNode | undefined {
    return this.categories.get(id);
  }

  getCategoryPath(categoryId: string): Category[] {
    const path: Category[] = [];
    let current = this.categories.get(categoryId);
    
    while (current) {
      path.unshift({
        id: current.id,
        name: current.name,
        parentId: current.parentId,
        color: current.color,
        icon: current.icon,
        isCustom: current.isCustom,
        keywords: current.keywords,
        description: current.description,
        created_at: current.created_at,
        updated_at: current.updated_at
      });
      
      if (current.parentId) {
        current = this.categories.get(current.parentId);
      } else {
        current = undefined;
      }
    }
    
    return path;
  }

  getSubcategories(parentId: string): CategoryNode[] {
    const parent = this.categories.get(parentId);
    return parent ? parent.children : [];
  }

  getAllCategories(): Category[] {
    return Array.from(this.categories.values()).map(node => ({
      id: node.id,
      name: node.name,
      parentId: node.parentId,
      color: node.color,
      icon: node.icon,
      isCustom: node.isCustom,
      keywords: node.keywords,
      description: node.description,
      created_at: node.created_at,
      updated_at: node.updated_at
    }));
  }

  addCustomCategory(category: Omit<Category, 'id' | 'created_at' | 'updated_at'>): string {
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const newCategory: CategoryNode = {
      ...category,
      id,
      isCustom: true,
      created_at: now,
      updated_at: now,
      children: [],
      level: category.parentId ? (this.categories.get(category.parentId)?.level ?? 0) + 1 : 0
    };

    this.categories.set(id, newCategory);

    if (category.parentId) {
      const parent = this.categories.get(category.parentId);
      if (parent) {
        parent.children.push(newCategory);
      }
    } else {
      this.rootCategories.push(newCategory);
    }

    return id;
  }

  updateCategory(id: string, updates: Partial<Category>): boolean {
    const category = this.categories.get(id);
    if (!category) return false;

    Object.assign(category, {
      ...updates,
      updated_at: new Date()
    });

    return true;
  }

  deleteCategory(id: string): boolean {
    const category = this.categories.get(id);
    if (!category || !category.isCustom) return false;

    // Remove from parent's children
    if (category.parentId) {
      const parent = this.categories.get(category.parentId);
      if (parent) {
        parent.children = parent.children.filter(child => child.id !== id);
      }
    } else {
      this.rootCategories = this.rootCategories.filter(cat => cat.id !== id);
    }

    // Move children to parent or root
    category.children.forEach(child => {
      child.parentId = category.parentId;
      if (category.parentId) {
        const parent = this.categories.get(category.parentId);
        if (parent) {
          parent.children.push(child);
        }
      } else {
        this.rootCategories.push(child);
      }
    });

    this.categories.delete(id);
    return true;
  }

  searchCategories(query: string): Category[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.categories.values())
      .filter(cat => 
        cat.name.toLowerCase().includes(lowerQuery) ||
        cat.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery)) ||
        (cat.description && cat.description.toLowerCase().includes(lowerQuery))
      )
      .map(node => ({
        id: node.id,
        name: node.name,
        parentId: node.parentId,
        color: node.color,
        icon: node.icon,
        isCustom: node.isCustom,
        keywords: node.keywords,
        description: node.description,
        created_at: node.created_at,
        updated_at: node.updated_at
      }));
  }

  getCategoryStats(): Record<string, number> {
    return {
      total: this.categories.size,
      custom: Array.from(this.categories.values()).filter(cat => cat.isCustom).length,
      rootCategories: this.rootCategories.length,
      maxDepth: Math.max(...Array.from(this.categories.values()).map(cat => cat.level)) + 1
    };
  }
}