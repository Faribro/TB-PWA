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
    await client.setex(key, ttlSeconds, JSON.stringify(value));
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
 * Invalidate cache by pattern
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
      console.log(`[Redis] Invalidated ${keys.length} keys matching: ${pattern}`);
    }
  } catch (error) {
    console.error('[Redis] Invalidate pattern error:', error);
  }
}

/**
 * Invalidate all metrics cache (called after patient data changes)
 */
export async function invalidateMetricsCache(): Promise<void> {
  await invalidatePattern('metrics:*');
}
