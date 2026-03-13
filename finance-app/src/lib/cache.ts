import Redis from 'ioredis';

// Redis configuration with clustering support
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  connectTimeout: 10000,
  commandTimeout: 5000,
  db: parseInt(process.env.REDIS_DB || '0'),
});

// Redis Sentinel configuration for high availability
const redisSentinel = process.env.REDIS_SENTINELS ? new Redis({
  sentinels: JSON.parse(process.env.REDIS_SENTINELS),
  name: process.env.REDIS_MASTER_NAME || 'mymaster',
  sentinelPassword: process.env.REDIS_SENTINEL_PASSWORD,
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  connectTimeout: 10000,
  commandTimeout: 5000,
}) : null;

const client = redisSentinel || redis;

// Cache key prefixes for different data types
export const CACHE_KEYS = {
  USER_SESSION: 'session:',
  TRANSACTION: 'transaction:',
  ACCOUNT: 'account:',
  DASHBOARD_DATA: 'dashboard:',
  RATE_LIMIT: 'rate_limit:',
  API_RESPONSE: 'api:',
  QUERY_RESULT: 'query:',
} as const;

// Cache TTL configurations (in seconds)
export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  EXTRA_LONG: 86400, // 24 hours
  WEEK: 604800, // 7 days
} as const;

export class CacheManager {
  private redis: Redis;

  constructor() {
    this.redis = client;
  }

  // Generic cache operations
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = CACHE_TTL.MEDIUM): Promise<boolean> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key: string | string[]): Promise<boolean> {
    try {
      await this.redis.del(Array.isArray(key) ? key : [key]);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  // Specialized cache operations for finance app
  async cacheUserSession(userId: string, sessionData: any, ttl: number = CACHE_TTL.LONG): Promise<void> {
    const key = `${CACHE_KEYS.USER_SESSION}${userId}`;
    await this.set(key, sessionData, ttl);
  }

  async getUserSession(userId: string): Promise<any | null> {
    const key = `${CACHE_KEYS.USER_SESSION}${userId}`;
    return await this.get(key);
  }

  async cacheTransactions(userId: string, transactions: any[], ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
    const key = `${CACHE_KEYS.TRANSACTION}${userId}`;
    await this.set(key, transactions, ttl);
  }

  async getCachedTransactions(userId: string): Promise<any[] | null> {
    const key = `${CACHE_KEYS.TRANSACTION}${userId}`;
    return await this.get(key);
  }

  async cacheDashboardData(userId: string, data: any, ttl: number = CACHE_TTL.SHORT): Promise<void> {
    const key = `${CACHE_KEYS.DASHBOARD_DATA}${userId}`;
    await this.set(key, data, ttl);
  }

  async getCachedDashboardData(userId: string): Promise<any | null> {
    const key = `${CACHE_KEYS.DASHBOARD_DATA}${userId}`;
    return await this.get(key);
  }

  // Rate limiting implementation
  async checkRateLimit(identifier: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `${CACHE_KEYS.RATE_LIMIT}${identifier}`;
    
    try {
      const current = await this.redis.get(key);
      const now = Date.now();
      const windowStart = Math.floor(now / (window * 1000)) * (window * 1000);
      
      if (!current) {
        await this.redis.setex(key, window, JSON.stringify({ count: 1, windowStart }));
        return { allowed: true, remaining: limit - 1, resetTime: windowStart + (window * 1000) };
      }
      
      const data = JSON.parse(current);
      
      if (data.windowStart !== windowStart) {
        await this.redis.setex(key, window, JSON.stringify({ count: 1, windowStart }));
        return { allowed: true, remaining: limit - 1, resetTime: windowStart + (window * 1000) };
      }
      
      if (data.count >= limit) {
        return { allowed: false, remaining: 0, resetTime: windowStart + (window * 1000) };
      }
      
      data.count += 1;
      await this.redis.setex(key, window, JSON.stringify(data));
      return { allowed: true, remaining: limit - data.count, resetTime: windowStart + (window * 1000) };
    } catch (error) {
      console.error('Rate limit error:', error);
      return { allowed: true, remaining: limit - 1, resetTime: now + (window * 1000) };
    }
  }

  // Cache invalidation patterns
  async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      `${CACHE_KEYS.USER_SESSION}${userId}`,
      `${CACHE_KEYS.TRANSACTION}${userId}`,
      `${CACHE_KEYS.ACCOUNT}${userId}`,
      `${CACHE_KEYS.DASHBOARD_DATA}${userId}`,
    ];
    
    await this.del(patterns);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.del(keys);
      }
    } catch (error) {
      console.error('Pattern invalidation error:', error);
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; latency: number }> {
    const start = Date.now();
    try {
      await this.redis.ping();
      return { status: 'healthy', latency: Date.now() - start };
    } catch (error) {
      return { status: 'unhealthy', latency: Date.now() - start };
    }
  }

  // Close connection
  async close(): Promise<void> {
    await this.redis.disconnect();
  }
}

export const cache = new CacheManager();

// Event listeners for Redis connection
client.on('connect', () => {
  console.log('Redis connected successfully');
});

client.on('error', (err) => {
  console.error('Redis connection error:', err);
});

client.on('reconnecting', () => {
  console.log('Redis reconnecting...');
});