import { GraphQLResolveInfo } from 'graphql';
import { dataLoaders } from './dataloaders';
import { cache, CACHE_TTL } from '@/lib/cache';
import { recordDatabaseQuery, recordError } from '@/app/api/metrics/route';

// Context type for GraphQL resolvers
export interface GraphQLContext {
  user?: {
    id: string;
    email: string;
  };
  dataloaders: typeof dataLoaders;
  cache: typeof cache;
}

// Custom scalar resolvers
const scalarResolvers = {
  Date: {
    serialize: (date: Date) => date.toISOString(),
    parseValue: (value: string) => new Date(value),
    parseLiteral: (ast: any) => new Date(ast.value),
  },
  JSON: {
    serialize: (value: any) => value,
    parseValue: (value: any) => value,
    parseLiteral: (ast: any) => JSON.parse(ast.value),
  },
};

// Query resolvers
const Query = {
  // User queries
  me: async (_: any, __: any, context: GraphQLContext) => {
    if (!context.user) {
      throw new Error('Authentication required');
    }
    
    try {
      const startTime = Date.now();
      const user = await context.dataloaders.getUser(context.user.id);
      recordDatabaseQuery('select', 'users', Date.now() - startTime);
      return user;
    } catch (error) {
      recordError('database', 'error');
      throw error;
    }
  },

  user: async (_: any, args: { id: string }, context: GraphQLContext) => {
    // Admin-only query
    if (!context.user || !isAdmin(context.user)) {
      throw new Error('Admin access required');
    }
    
    return context.dataloaders.getUser(args.id);
  },

  // Account queries
  accounts: async (_: any, __: any, context: GraphQLContext) => {
    if (!context.user) {
      throw new Error('Authentication required');
    }
    
    const cacheKey = `accounts:${context.user.id}`;
    const cached = await context.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const accounts = await context.dataloaders.getAccountsByUser(context.user.id);
    await context.cache.set(cacheKey, accounts, CACHE_TTL.MEDIUM);
    
    return accounts;
  },

  account: async (_: any, args: { id: string }, context: GraphQLContext) => {
    if (!context.user) {
      throw new Error('Authentication required');
    }
    
    const account = await context.dataloaders.getAccount(args.id);
    
    if (!account || account.userId !== context.user.id) {
      throw new Error('Account not found or access denied');
    }
    
    return account;
  },

  // Transaction queries with pagination
  transactions: async (
    _: any, 
    args: {
      first?: number;
      after?: string;
      filter?: any;
    }, 
    context: GraphQLContext
  ) => {
    if (!context.user) {
      throw new Error('Authentication required');
    }

    const limit = Math.min(args.first || 50, 100); // Cap at 100
    const offset = args.after ? parseInt(Buffer.from(args.after, 'base64').toString()) : 0;
    
    // Build cache key based on filters
    const cacheKey = `transactions:${context.user.id}:${JSON.stringify(args)}`;
    const cached = await context.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const startTime = Date.now();
      
      // Get transactions with filters applied
      const transactions = await getTransactionsWithFilters(
        context.user.id,
        args.filter,
        limit,
        offset
      );
      
      const totalCount = await getTransactionCount(context.user.id, args.filter);
      
      recordDatabaseQuery('select', 'transactions', Date.now() - startTime);
      
      // Build connection response
      const edges = transactions.map((transaction, index) => ({
        node: transaction,
        cursor: Buffer.from((offset + index).toString()).toString('base64'),
      }));
      
      const hasNextPage = transactions.length === limit;
      const hasPreviousPage = offset > 0;
      
      const result = {
        edges,
        pageInfo: {
          hasNextPage,
          hasPreviousPage,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount,
      };
      
      // Cache for a short time since transactions change frequently
      await context.cache.set(cacheKey, result, CACHE_TTL.SHORT);
      
      return result;
    } catch (error) {
      recordError('database', 'error');
      throw error;
    }
  },

  transaction: async (_: any, args: { id: string }, context: GraphQLContext) => {
    if (!context.user) {
      throw new Error('Authentication required');
    }
    
    const transaction = await context.dataloaders.getTransaction(args.id);
    
    if (!transaction || transaction.userId !== context.user.id) {
      throw new Error('Transaction not found or access denied');
    }
    
    return transaction;
  },

  // Category queries
  categories: async (_: any, __: any, context: GraphQLContext) => {
    if (!context.user) {
      throw new Error('Authentication required');
    }
    
    const cacheKey = `categories:${context.user.id}`;
    const cached = await context.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const categories = await context.dataloaders.getCategoriesByUser(context.user.id);
    await context.cache.set(cacheKey, categories, CACHE_TTL.LONG);
    
    return categories;
  },

  // Dashboard query with heavy caching
  dashboard: async (_: any, __: any, context: GraphQLContext) => {
    if (!context.user) {
      throw new Error('Authentication required');
    }
    
    const cacheKey = `dashboard:${context.user.id}`;
    const cached = await context.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    try {
      const startTime = Date.now();
      
      // Fetch all dashboard data in parallel
      const [accounts, recentTransactions, upcomingBills, budgets] = await Promise.all([
        context.dataloaders.getAccountsByUser(context.user.id),
        getRecentTransactions(context.user.id),
        getUpcomingBills(context.user.id),
        getBudgets(context.user.id),
      ]);
      
      // Calculate derived metrics
      const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
      const monthlyExpenses = calculateMonthlyExpenses(recentTransactions);
      const monthlyIncome = calculateMonthlyIncome(recentTransactions);
      const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
      
      const analytics = await generateSpendingAnalytics(context.user.id);
      
      recordDatabaseQuery('complex', 'dashboard', Date.now() - startTime);
      
      const dashboardData = {
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        savingsRate,
        accounts,
        recentTransactions,
        upcomingBills,
        budgetSummary: budgets,
        analytics,
      };
      
      // Cache dashboard data for 5 minutes
      await context.cache.set(cacheKey, dashboardData, CACHE_TTL.SHORT);
      
      return dashboardData;
    } catch (error) {
      recordError('dashboard', 'error');
      throw error;
    }
  },

  // Search functionality
  search: async (_: any, args: { query: string }, context: GraphQLContext) => {
    if (!context.user) {
      throw new Error('Authentication required');
    }
    
    if (!args.query || args.query.length < 2) {
      return {
        transactions: [],
        accounts: [],
        categories: [],
        merchants: [],
      };
    }
    
    const cacheKey = `search:${context.user.id}:${args.query}`;
    const cached = await context.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    try {
      const searchResults = await performSearch(context.user.id, args.query);
      
      // Cache search results for 1 minute
      await context.cache.set(cacheKey, searchResults, 60);
      
      return searchResults;
    } catch (error) {
      recordError('search', 'error');
      throw error;
    }
  },
};

// Mutation resolvers
const Mutation = {
  createTransaction: async (
    _: any, 
    args: { input: any }, 
    context: GraphQLContext
  ) => {
    if (!context.user) {
      throw new Error('Authentication required');
    }
    
    try {
      const transaction = await createTransaction({
        ...args.input,
        userId: context.user.id,
      });
      
      // Invalidate related caches
      await invalidateTransactionCaches(context.user.id);
      
      return transaction;
    } catch (error) {
      recordError('mutation', 'error');
      throw error;
    }
  },

  updateTransaction: async (
    _: any,
    args: { id: string; input: any },
    context: GraphQLContext
  ) => {
    if (!context.user) {
      throw new Error('Authentication required');
    }
    
    // Verify ownership
    const existingTransaction = await context.dataloaders.getTransaction(args.id);
    if (!existingTransaction || existingTransaction.userId !== context.user.id) {
      throw new Error('Transaction not found or access denied');
    }
    
    try {
      const transaction = await updateTransaction(args.id, args.input);
      
      // Clear caches
      context.dataloaders.clearTransaction(args.id);
      await invalidateTransactionCaches(context.user.id);
      
      return transaction;
    } catch (error) {
      recordError('mutation', 'error');
      throw error;
    }
  },

  deleteTransaction: async (
    _: any,
    args: { id: string },
    context: GraphQLContext
  ) => {
    if (!context.user) {
      throw new Error('Authentication required');
    }
    
    // Verify ownership
    const existingTransaction = await context.dataloaders.getTransaction(args.id);
    if (!existingTransaction || existingTransaction.userId !== context.user.id) {
      throw new Error('Transaction not found or access denied');
    }
    
    try {
      const success = await deleteTransaction(args.id);
      
      // Clear caches
      context.dataloaders.clearTransaction(args.id);
      await invalidateTransactionCaches(context.user.id);
      
      return success;
    } catch (error) {
      recordError('mutation', 'error');
      throw error;
    }
  },
};

// Type resolvers for related data
const User = {
  accounts: (parent: any, _: any, context: GraphQLContext) => {
    return context.dataloaders.getAccountsByUser(parent.id);
  },
  transactions: (parent: any, _: any, context: GraphQLContext) => {
    return context.dataloaders.getTransactionsByUser(parent.id);
  },
};

const Account = {
  user: (parent: any, _: any, context: GraphQLContext) => {
    return context.dataloaders.getUser(parent.userId);
  },
  transactions: (parent: any, _: any, context: GraphQLContext) => {
    return context.dataloaders.getTransactionsByAccount(parent.id);
  },
};

const Transaction = {
  account: (parent: any, _: any, context: GraphQLContext) => {
    return context.dataloaders.getAccount(parent.accountId);
  },
  user: (parent: any, _: any, context: GraphQLContext) => {
    return context.dataloaders.getUser(parent.userId);
  },
  category: (parent: any, _: any, context: GraphQLContext) => {
    return parent.categoryId 
      ? context.dataloaders.getCategory(parent.categoryId)
      : null;
  },
};

// Export all resolvers
export const resolvers = {
  ...scalarResolvers,
  Query,
  Mutation,
  User,
  Account,
  Transaction,
};

// Helper functions (replace with actual implementations)
async function getTransactionsWithFilters(
  userId: string,
  filter: any,
  limit: number,
  offset: number
): Promise<any[]> {
  // Mock implementation
  return [];
}

async function getTransactionCount(userId: string, filter: any): Promise<number> {
  // Mock implementation
  return 0;
}

async function getRecentTransactions(userId: string): Promise<any[]> {
  // Mock implementation
  return [];
}

async function getUpcomingBills(userId: string): Promise<any[]> {
  // Mock implementation
  return [];
}

async function getBudgets(userId: string): Promise<any[]> {
  // Mock implementation
  return [];
}

async function generateSpendingAnalytics(userId: string): Promise<any> {
  // Mock implementation
  return {
    totalSpending: 0,
    categoryBreakdown: [],
    monthlyTrend: [],
    averageTransaction: 0,
    transactionCount: 0,
    topMerchants: [],
  };
}

async function performSearch(userId: string, query: string): Promise<any> {
  // Mock implementation
  return {
    transactions: [],
    accounts: [],
    categories: [],
    merchants: [],
  };
}

function calculateMonthlyExpenses(transactions: any[]): number {
  // Mock implementation
  return 0;
}

function calculateMonthlyIncome(transactions: any[]): number {
  // Mock implementation
  return 0;
}

async function createTransaction(input: any): Promise<any> {
  // Mock implementation
  return input;
}

async function updateTransaction(id: string, input: any): Promise<any> {
  // Mock implementation
  return { id, ...input };
}

async function deleteTransaction(id: string): Promise<boolean> {
  // Mock implementation
  return true;
}

async function invalidateTransactionCaches(userId: string): Promise<void> {
  const patterns = [
    `transactions:${userId}*`,
    `dashboard:${userId}`,
    `accounts:${userId}`,
  ];
  
  for (const pattern of patterns) {
    await cache.invalidatePattern(pattern);
  }
}

function isAdmin(user: any): boolean {
  // Mock implementation
  return false;
}