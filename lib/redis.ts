// ═══════════════════════════════════════════════════════════════════════════
// REDIS CONNECTION - UPSTASH SERVERLESS REDIS (CACHE ONLY)
// ═══════════════════════════════════════════════════════════════════════════
// Production-grade Redis for caching only
// No TCP/IORedis - pure HTTP REST API
// ═══════════════════════════════════════════════════════════════════════════

import { Redis } from '@upstash/redis';

// Upstash Redis (Serverless - HTTP-based)
// Gracefully handle missing or invalid credentials
export const upstashRedis = (() => {
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      return new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    }
    console.warn('[Redis] Credentials not configured - caching disabled');
    return null;
  } catch (error) {
    console.error('[Redis] Initialization failed:', error);
    return null;
  }
})();

// Health check
export async function checkRedisHealth(): Promise<boolean> {
  try {
    if (upstashRedis) {
      await upstashRedis.ping();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Cache operations
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    if (!upstashRedis) return null;
    const value = await upstashRedis.get<T>(key);
    return value ?? null;
  } catch (error) {
    console.error('[Redis] Get error:', error);
    return null;
  }
}

export async function setCached<T>(key: string, value: T, ttl: number = 60): Promise<void> {
  try {
    if (!upstashRedis) return;
    
    // Check payload size (Upstash limit: 1MB free, 10MB paid)
    const serialized = JSON.stringify(value);
    const sizeInMB = Buffer.byteLength(serialized, 'utf8') / (1024 * 1024);
    
    if (sizeInMB > 5) {
      console.warn(`[Redis] Payload too large (${sizeInMB.toFixed(2)}MB), skipping cache for key: ${key}`);
      return;
    }
    
    await upstashRedis.set(key, value, { ex: ttl });
  } catch (error) {
    console.error('[Redis] Set error:', error);
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    if (!upstashRedis) return;
    const keys = await upstashRedis.keys(pattern);
    if (keys.length > 0) {
      await upstashRedis.del(...keys);
    }
  } catch (error) {
    console.error('[Redis] Invalidate error:', error);
  }
}

export function getRedisClient() {
  return upstashRedis;
}
