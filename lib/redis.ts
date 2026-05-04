// ═══════════════════════════════════════════════════════════════════════════
// REDIS CONNECTION - UPSTASH SERVERLESS REDIS
// ═══════════════════════════════════════════════════════════════════════════
// Production-grade Redis with automatic failover and connection pooling
// ═══════════════════════════════════════════════════════════════════════════

import { Redis } from '@upstash/redis';
import IORedis from 'ioredis';

// Upstash Redis (Serverless - for Vercel Edge)
export const upstashRedis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// IORedis (Traditional - for BullMQ)
export const ioredis = process.env.REDIS_URL
  ? (() => {
      const client = new IORedis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null, // Required for BullMQ
        enableReadyCheck: false,
        retryStrategy: (times) => {
          if (times > 3) return null; // Stop retrying after 3 attempts
          return Math.min(times * 50, 2000);
        },
        lazyConnect: true, // Don't connect immediately
      });
      
      // Handle connection errors gracefully
      client.on('error', (err) => {
        console.warn('[IORedis] Connection error (non-critical):', err.message);
      });
      
      // Try to connect, but don't fail if it doesn't work
      client.connect().catch((err) => {
        console.warn('[IORedis] Failed to connect (continuing without Redis):', err.message);
      });
      
      return client;
    })()
  : null;

// Health check
export async function checkRedisHealth(): Promise<boolean> {
  try {
    if (upstashRedis) {
      await upstashRedis.ping();
      return true;
    }
    if (ioredis) {
      await ioredis.ping();
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
