/**
 * Redis Cache Client for SAMADHAAN OS
 * Uses Upstash Redis for serverless-friendly caching
 */

import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('[Redis] Not configured - caching disabled');
    return null;
  }

  redis = new Redis({
    url,
    token,
  });

  console.log('[Redis] Client initialized');
  return redis;
}

/**
 * Get cached value
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const value = await client.get<T>(key);
    if (value) {
      console.log(`[Redis] Cache HIT: ${key}`);
    } else {
      console.log(`[Redis] Cache MISS: ${key}`);
    }
    return value;
  } catch (error) {
    console.error('[Redis] Get error:', error);
    return null;
  }
}

/**
 * Set cached value with TTL
 */
export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds: number = 60
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    // Upstash Redis auto-serializes, no need for JSON.stringify
    await client.setex(key, ttlSeconds, value);
    console.log(`[Redis] Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
  } catch (error) {
    console.error('[Redis] Set error:', error);
  }
}

/**
 * Delete cached value
 */
export async function deleteCached(key: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.del(key);
    console.log(`[Redis] Cache DELETE: ${key}`);
  } catch (error) {
    console.error('[Redis] Delete error:', error);
  }
}

/**
 * Invalidate cache by pattern (with fallback for Upstash limitations)
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    // Upstash REST API may not support KEYS command reliably
    // Use SCAN instead for production reliability
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await Promise.all(keys.map(key => client.del(key)));
      console.log(`[Redis] Invalidated ${keys.length} keys matching: ${pattern}`);
    } else {
      console.log(`[Redis] No keys found matching: ${pattern}`);
    }
  } catch (error) {
    console.error('[Redis] Invalidate pattern error:', error);
    // Fallback: Try to delete common metric keys directly
    try {
      const commonKeys = [
        'metrics:year:2026:4:all:all:admin:All',
        'metrics:month:2026:4:all:all:admin:All',
        'metrics:year:2026:4:all:all:Program Manager:All',
        'metrics:month:2026:4:all:all:Program Manager:All',
      ];
      await Promise.all(commonKeys.map(key => client.del(key).catch(() => {})));
      console.log('[Redis] Fallback: Deleted common metric keys');
    } catch (fallbackError) {
      console.error('[Redis] Fallback deletion failed:', fallbackError);
    }
  }
}

/**
 * Invalidate all metrics cache (called after patient data changes)
 */
export async function invalidateMetricsCache(): Promise<void> {
  await invalidatePattern('metrics:*');
}

/**
 * Flush all vertex cache (use after schema changes)
 */
export async function flushVertexCache(): Promise<void> {
  await invalidatePattern('vertex:*');
}
