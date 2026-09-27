/**
 * In-Memory TTL Cache Utility for High-Frequency Read Operations.
 * 
 * Provides fast micro-caching for heavy aggregated endpoints (Deals Master Grid,
 * Project Health Overviews, Ledgers).
 * 
 * Supports exact key lookup, TTL expiration, prefix-based cache busting on mutations,
 * and total cache eviction.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Retrieves a cached value if present and unexpired.
   */
  get<T>(key: string): T | null {
    if (process.env.NODE_ENV === 'test' && !process.env.ENABLE_TEST_CACHE) {
      return null;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Caches a value with a specified Time-To-Live in milliseconds.
   */
  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Evicts an exact key or all keys matching the prefix.
   * e.g., bust('deals') clears 'deals:all', 'deals:123', etc.
   */
  bust(keyOrPrefix: string): void {
    for (const key of this.cache.keys()) {
      if (key === keyOrPrefix || key.startsWith(`${keyOrPrefix}:`) || key.startsWith(keyOrPrefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clears all cached keys.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Number of active items in cache.
   */
  get size(): number {
    return this.cache.size;
  }
}

export const appCache = new MemoryCache();
export const getCache = <T>(key: string): T | null => appCache.get<T>(key);
export const setCache = <T>(key: string, data: T, ttlMs: number): void => appCache.set(key, data, ttlMs);
export const bustCache = (keyOrPrefix: string): void => appCache.bust(keyOrPrefix);
export const clearCache = (): void => appCache.clear();
