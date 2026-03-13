import DataLoader from 'dataloader';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';

// Mock data interfaces (replace with your actual data models)
interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  userId: string;
}

interface Transaction {
  id: string;
  amount: number;
  description: string;
  accountId: string;
  userId: string;
  categoryId?: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  userId: string;
}

// DataLoader factory for creating optimized data loaders
export class DataLoaderFactory {
  private static instance: DataLoaderFactory;
  private userLoader: DataLoader<string, User | null>;
  private accountLoader: DataLoader<string, Account | null>;
  private transactionLoader: DataLoader<string, Transaction | null>;
  private categoryLoader: DataLoader<string, Category | null>;
  private accountsByUserLoader: DataLoader<string, Account[]>;
  private transactionsByAccountLoader: DataLoader<string, Transaction[]>;
  private transactionsByUserLoader: DataLoader<string, Transaction[]>;
  private categoriesByUserLoader: DataLoader<string, Category[]>;

  private constructor() {
    this.userLoader = this.createUserLoader();
    this.accountLoader = this.createAccountLoader();
    this.transactionLoader = this.createTransactionLoader();
    this.categoryLoader = this.createCategoryLoader();
    this.accountsByUserLoader = this.createAccountsByUserLoader();
    this.transactionsByAccountLoader = this.createTransactionsByAccountLoader();
    this.transactionsByUserLoader = this.createTransactionsByUserLoader();
    this.categoriesByUserLoader = this.createCategoriesByUserLoader();
  }

  public static getInstance(): DataLoaderFactory {
    if (!DataLoaderFactory.instance) {
      DataLoaderFactory.instance = new DataLoaderFactory();
    }
    return DataLoaderFactory.instance;
  }

  // User DataLoader
  private createUserLoader(): DataLoader<string, User | null> {
    return new DataLoader(
      async (userIds: readonly string[]) => {
        const cacheKeys = userIds.map(id => `${CACHE_KEYS.USER_SESSION}${id}`);
        const cached = await this.batchGetFromCache<User>(cacheKeys);
        
        const uncachedIds = userIds.filter((id, index) => !cached[index]);
        const uncachedUsers = uncachedIds.length > 0 
          ? await this.batchFetchUsers(uncachedIds as string[])
          : [];

        // Merge cached and fetched results
        const result: (User | null)[] = [];
        let uncachedIndex = 0;

        for (let i = 0; i < userIds.length; i++) {
          if (cached[i]) {
            result[i] = cached[i];
          } else {
            result[i] = uncachedUsers[uncachedIndex++] || null;
            if (result[i]) {
              // Cache the result
              await cache.set(cacheKeys[i], result[i], CACHE_TTL.LONG);
            }
          }
        }

        return result;
      },
      {
        maxBatchSize: 100,
        cacheKeyFn: (key) => `user:${key}`,
        cacheMap: new Map(),
      }
    );
  }

  // Account DataLoader
  private createAccountLoader(): DataLoader<string, Account | null> {
    return new DataLoader(
      async (accountIds: readonly string[]) => {
        return await this.batchFetchAccounts(accountIds as string[]);
      },
      {
        maxBatchSize: 100,
        cacheKeyFn: (key) => `account:${key}`,
      }
    );
  }

  // Transaction DataLoader
  private createTransactionLoader(): DataLoader<string, Transaction | null> {
    return new DataLoader(
      async (transactionIds: readonly string[]) => {
        return await this.batchFetchTransactions(transactionIds as string[]);
      },
      {
        maxBatchSize: 500, // Transactions are frequently accessed
        cacheKeyFn: (key) => `transaction:${key}`,
      }
    );
  }

  // Category DataLoader
  private createCategoryLoader(): DataLoader<string, Category | null> {
    return new DataLoader(
      async (categoryIds: readonly string[]) => {
        return await this.batchFetchCategories(categoryIds as string[]);
      },
      {
        maxBatchSize: 50,
        cacheKeyFn: (key) => `category:${key}`,
      }
    );
  }

  // Accounts by User DataLoader
  private createAccountsByUserLoader(): DataLoader<string, Account[]> {
    return new DataLoader(
      async (userIds: readonly string[]) => {
        const cacheKeys = userIds.map(id => `${CACHE_KEYS.ACCOUNT}${id}`);
        const cached = await this.batchGetFromCache<Account[]>(cacheKeys);
        
        const uncachedIds = userIds.filter((id, index) => !cached[index]);
        const uncachedAccounts = uncachedIds.length > 0
          ? await this.batchFetchAccountsByUsers(uncachedIds as string[])
          : [];

        const result: Account[][] = [];
        let uncachedIndex = 0;

        for (let i = 0; i < userIds.length; i++) {
          if (cached[i]) {
            result[i] = cached[i];
          } else {
            const userAccounts = uncachedAccounts[uncachedIndex++] || [];
            result[i] = userAccounts;
            // Cache the result
            if (userAccounts.length > 0) {
              await cache.set(cacheKeys[i], userAccounts, CACHE_TTL.MEDIUM);
            }
          }
        }

        return result;
      },
      {
        maxBatchSize: 50,
        cacheKeyFn: (key) => `accounts_by_user:${key}`,
      }
    );
  }

  // Transactions by Account DataLoader
  private createTransactionsByAccountLoader(): DataLoader<string, Transaction[]> {
    return new DataLoader(
      async (accountIds: readonly string[]) => {
        return await this.batchFetchTransactionsByAccounts(accountIds as string[]);
      },
      {
        maxBatchSize: 100,
        cacheKeyFn: (key) => `transactions_by_account:${key}`,
      }
    );
  }

  // Transactions by User DataLoader
  private createTransactionsByUserLoader(): DataLoader<string, Transaction[]> {
    return new DataLoader(
      async (userIds: readonly string[]) => {
        const cacheKeys = userIds.map(id => `${CACHE_KEYS.TRANSACTION}${id}`);
        const cached = await this.batchGetFromCache<Transaction[]>(cacheKeys);
        
        const uncachedIds = userIds.filter((id, index) => !cached[index]);
        const uncachedTransactions = uncachedIds.length > 0
          ? await this.batchFetchTransactionsByUsers(uncachedIds as string[])
          : [];

        const result: Transaction[][] = [];
        let uncachedIndex = 0;

        for (let i = 0; i < userIds.length; i++) {
          if (cached[i]) {
            result[i] = cached[i];
          } else {
            const userTransactions = uncachedTransactions[uncachedIndex++] || [];
            result[i] = userTransactions;
            // Cache recent transactions
            if (userTransactions.length > 0) {
              await cache.set(cacheKeys[i], userTransactions, CACHE_TTL.SHORT);
            }
          }
        }

        return result;
      },
      {
        maxBatchSize: 50,
        cacheKeyFn: (key) => `transactions_by_user:${key}`,
      }
    );
  }

  // Categories by User DataLoader
  private createCategoriesByUserLoader(): DataLoader<string, Category[]> {
    return new DataLoader(
      async (userIds: readonly string[]) => {
        return await this.batchFetchCategoriesByUsers(userIds as string[]);
      },
      {
        maxBatchSize: 50,
        cacheKeyFn: (key) => `categories_by_user:${key}`,
      }
    );
  }

  // Public accessor methods
  public getUser(id: string): Promise<User | null> {
    return this.userLoader.load(id);
  }

  public getAccount(id: string): Promise<Account | null> {
    return this.accountLoader.load(id);
  }

  public getTransaction(id: string): Promise<Transaction | null> {
    return this.transactionLoader.load(id);
  }

  public getCategory(id: string): Promise<Category | null> {
    return this.categoryLoader.load(id);
  }

  public getAccountsByUser(userId: string): Promise<Account[]> {
    return this.accountsByUserLoader.load(userId);
  }

  public getTransactionsByAccount(accountId: string): Promise<Transaction[]> {
    return this.transactionsByAccountLoader.load(accountId);
  }

  public getTransactionsByUser(userId: string): Promise<Transaction[]> {
    return this.transactionsByUserLoader.load(userId);
  }

  public getCategoriesByUser(userId: string): Promise<Category[]> {
    return this.categoriesByUserLoader.load(userId);
  }

  // Clear cache methods
  public clearUser(id: string): void {
    this.userLoader.clear(id);
  }

  public clearAccount(id: string): void {
    this.accountLoader.clear(id);
  }

  public clearTransaction(id: string): void {
    this.transactionLoader.clear(id);
  }

  public clearUserData(userId: string): void {
    this.userLoader.clear(userId);
    this.accountsByUserLoader.clear(userId);
    this.transactionsByUserLoader.clear(userId);
    this.categoriesByUserLoader.clear(userId);
  }

  // Batch fetch methods (replace with actual database queries)
  private async batchFetchUsers(userIds: string[]): Promise<(User | null)[]> {
    // Mock implementation - replace with actual database query
    return userIds.map(id => ({
      id,
      email: `user${id}@example.com`,
      firstName: `User`,
      lastName: `${id}`,
    }));
  }

  private async batchFetchAccounts(accountIds: string[]): Promise<(Account | null)[]> {
    // Mock implementation - replace with actual database query
    return accountIds.map(id => ({
      id,
      name: `Account ${id}`,
      type: 'CHECKING',
      balance: Math.random() * 10000,
      userId: '1', // Mock user ID
    }));
  }

  private async batchFetchTransactions(transactionIds: string[]): Promise<(Transaction | null)[]> {
    // Mock implementation - replace with actual database query
    return transactionIds.map(id => ({
      id,
      amount: Math.random() * 1000,
      description: `Transaction ${id}`,
      accountId: '1', // Mock account ID
      userId: '1', // Mock user ID
    }));
  }

  private async batchFetchCategories(categoryIds: string[]): Promise<(Category | null)[]> {
    // Mock implementation - replace with actual database query
    return categoryIds.map(id => ({
      id,
      name: `Category ${id}`,
      color: '#FF0000',
      userId: '1', // Mock user ID
    }));
  }

  private async batchFetchAccountsByUsers(userIds: string[]): Promise<Account[][]> {
    // Mock implementation - replace with actual database query
    return userIds.map(userId => [
      {
        id: `${userId}-1`,
        name: 'Checking Account',
        type: 'CHECKING',
        balance: 5000,
        userId,
      },
      {
        id: `${userId}-2`,
        name: 'Savings Account',
        type: 'SAVINGS',
        balance: 10000,
        userId,
      },
    ]);
  }

  private async batchFetchTransactionsByAccounts(accountIds: string[]): Promise<Transaction[][]> {
    // Mock implementation - replace with actual database query
    return accountIds.map(accountId => [
      {
        id: `${accountId}-1`,
        amount: -50.00,
        description: 'Grocery Store',
        accountId,
        userId: '1',
      },
      {
        id: `${accountId}-2`,
        amount: -25.00,
        description: 'Gas Station',
        accountId,
        userId: '1',
      },
    ]);
  }

  private async batchFetchTransactionsByUsers(userIds: string[]): Promise<Transaction[][]> {
    // Mock implementation - replace with actual database query
    return userIds.map(userId => [
      {
        id: `${userId}-trans-1`,
        amount: -100.00,
        description: 'Restaurant',
        accountId: `${userId}-1`,
        userId,
      },
      {
        id: `${userId}-trans-2`,
        amount: 2000.00,
        description: 'Salary',
        accountId: `${userId}-1`,
        userId,
      },
    ]);
  }

  private async batchFetchCategoriesByUsers(userIds: string[]): Promise<Category[][]> {
    // Mock implementation - replace with actual database query
    return userIds.map(userId => [
      {
        id: `${userId}-cat-1`,
        name: 'Food & Dining',
        color: '#FF5722',
        userId,
      },
      {
        id: `${userId}-cat-2`,
        name: 'Transportation',
        color: '#2196F3',
        userId,
      },
    ]);
  }

  // Utility method for batch cache operations
  private async batchGetFromCache<T>(keys: string[]): Promise<(T | null)[]> {
    const results = await Promise.allSettled(
      keys.map(key => cache.get<T>(key))
    );
    
    return results.map(result => 
      result.status === 'fulfilled' ? result.value : null
    );
  }
}

// Export singleton instance
export const dataLoaders = DataLoaderFactory.getInstance();