/**
 * In-Memory LRU Cache for API Routes
 * 
 * Benefits:
 * - Sub-millisecond access time
 * - No network latency
 * - Perfect for hot data
 * 
 * Limitations:
 * - Per-instance (not shared across serverless functions)
 * - Lost on cold start
 * - Limited memory (use for small, frequently accessed data)
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.value;
  }

  set(key: string, value: T, ttlSeconds: number = 60): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000),
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global instance (persists across requests in same function instance)
const memoryCache = new LRUCache<any>(100);

export { memoryCache };

/**
 * Three-layer cache strategy
 */
export async function getCachedWithMemory<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 60
): Promise<T> {
  // Layer 1: Memory (fastest)
  const memValue = memoryCache.get(key);
  if (memValue !== null) {
    console.log(`[Cache] Memory HIT: ${key}`);
    return memValue;
  }

  // Layer 2: Redis (fast)
  const { getCached, setCached } = await import('./redis');
  const redisValue = await getCached<T>(key);
  if (redisValue !== null) {
    console.log(`[Cache] Redis HIT: ${key}`);
    // Populate memory cache
    memoryCache.set(key, redisValue, ttl);
    return redisValue;
  }

  // Layer 3: Database (source of truth)
  console.log(`[Cache] Fetching from source: ${key}`);
  const value = await fetchFn();
  
  // Populate both caches
  memoryCache.set(key, value, ttl);
  await setCached(key, value, ttl);
  
  return value;
}

/**
 * Invalidate all cache layers
 */
export async function invalidateAllLayers(pattern: string): Promise<void> {
  // Clear memory cache
  memoryCache.clear();
  
  // Clear Redis
  const { invalidatePattern } = await import('./redis');
  await invalidatePattern(pattern);
}
