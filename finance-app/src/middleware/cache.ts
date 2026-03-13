import { NextRequest, NextResponse } from 'next/server';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';
import { createHash } from 'crypto';

export interface CacheOptions {
  ttl?: number;
  keyPrefix?: string;
  varyBy?: string[];
  skipCache?: boolean;
}

/**
 * Cache middleware for API routes
 * Provides intelligent caching based on request patterns
 */
export function withCache(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: CacheOptions = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const {
      ttl = CACHE_TTL.MEDIUM,
      keyPrefix = CACHE_KEYS.API_RESPONSE,
      varyBy = [],
      skipCache = false
    } = options;

    // Skip caching for non-GET requests
    if (req.method !== 'GET' || skipCache) {
      return handler(req);
    }

    // Generate cache key
    const cacheKey = generateCacheKey(req, keyPrefix, varyBy);

    try {
      // Try to get from cache
      const cachedResponse = await cache.get<CachedResponse>(cacheKey);
      
      if (cachedResponse && !isExpired(cachedResponse)) {
        // Return cached response with appropriate headers
        const response = new NextResponse(cachedResponse.body, {
          status: cachedResponse.status,
          headers: {
            ...cachedResponse.headers,
            'X-Cache': 'HIT',
            'X-Cache-Key': cacheKey,
            'Cache-Control': `public, max-age=${Math.floor((cachedResponse.expiresAt - Date.now()) / 1000)}`
          }
        });
        
        return response;
      }

      // Execute handler
      const response = await handler(req);
      
      // Only cache successful responses
      if (response.status >= 200 && response.status < 300) {
        const responseBody = await response.text();
        const cachedResponse: CachedResponse = {
          body: responseBody,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          cachedAt: Date.now(),
          expiresAt: Date.now() + (ttl * 1000)
        };

        // Cache the response (fire and forget)
        cache.set(cacheKey, cachedResponse, ttl).catch(console.error);

        // Return response with cache headers
        return new NextResponse(responseBody, {
          status: response.status,
          headers: {
            ...Object.fromEntries(response.headers.entries()),
            'X-Cache': 'MISS',
            'X-Cache-Key': cacheKey,
            'Cache-Control': `public, max-age=${ttl}`
          }
        });
      }

      return response;
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Fall back to executing handler without caching
      return handler(req);
    }
  };
}

interface CachedResponse {
  body: string;
  status: number;
  headers: Record<string, string>;
  cachedAt: number;
  expiresAt: number;
}

function generateCacheKey(req: NextRequest, prefix: string, varyBy: string[]): string {
  const url = req.url;
  const method = req.method;
  
  // Include vary-by headers in cache key
  const varyByValues = varyBy.map(header => 
    `${header}:${req.headers.get(header) || ''}`
  ).join('|');

  const keyData = `${method}:${url}:${varyByValues}`;
  const hash = createHash('sha256').update(keyData).digest('hex').substring(0, 16);
  
  return `${prefix}${hash}`;
}

function isExpired(cachedResponse: CachedResponse): boolean {
  return Date.now() > cachedResponse.expiresAt;
}

/**
 * Cache invalidation helper
 */
export class CacheInvalidator {
  static async invalidateByPattern(pattern: string): Promise<void> {
    await cache.invalidatePattern(pattern);
  }

  static async invalidateByUser(userId: string): Promise<void> {
    await cache.invalidateUserCache(userId);
  }

  static async invalidateByKey(key: string): Promise<void> {
    await cache.del(key);
  }

  static async invalidateByTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await cache.invalidatePattern(`*:${tag}:*`);
    }
  }
}

/**
 * Enhanced cache decorator for specific data types
 */
export function cacheQuery<T>(
  queryFn: () => Promise<T>,
  cacheKey: string,
  ttl: number = CACHE_TTL.MEDIUM
): Promise<T> {
  return cache.get<T>(cacheKey).then(async (cachedResult) => {
    if (cachedResult) {
      return cachedResult;
    }

    const result = await queryFn();
    await cache.set(cacheKey, result, ttl);
    return result;
  });
}

/**
 * Conditional caching based on request characteristics
 */
export function shouldCache(req: NextRequest): boolean {
  // Don't cache authenticated requests with sensitive data
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    return false;
  }

  // Don't cache requests with query parameters that indicate user-specific data
  const url = new URL(req.url);
  const sensitiveParams = ['userId', 'token', 'session'];
  
  for (const param of sensitiveParams) {
    if (url.searchParams.has(param)) {
      return false;
    }
  }

  return true;
}

/**
 * Cache warming utility
 */
export class CacheWarmer {
  static async warmDashboardCache(userId: string): Promise<void> {
    // Pre-load common dashboard queries
    const cachePromises = [
      // Warm transaction cache
      cache.getCachedTransactions(userId),
      // Warm dashboard data
      cache.getCachedDashboardData(userId),
    ];

    await Promise.allSettled(cachePromises);
  }

  static async warmPublicCache(): Promise<void> {
    // Pre-load public data that's frequently accessed
    const publicEndpoints = [
      '/api/health',
      '/api/stats/public',
    ];

    // Simulate requests to warm cache
    await Promise.allSettled(
      publicEndpoints.map(endpoint => 
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL}${endpoint}`)
      )
    );
  }
}