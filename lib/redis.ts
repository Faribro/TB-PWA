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
export const ioredis = (() => {
  // Try REDIS_URL first, then construct from Upstash credentials
  let redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    // Extract hostname from REST URL (remove https://)
    const hostname = process.env.UPSTASH_REDIS_REST_URL.replace('https://', '').replace('http://', '');
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    // Construct rediss:// URL for IORedis
    redisUrl = `rediss://default:${token}@${hostname}:6379`;
    console.log(`[IORedis] Constructed URL from Upstash credentials: rediss://default:***@${hostname}:6379`);
  }
  
  if (!redisUrl) {
    console.warn('[IORedis] ⚠️ No Redis configuration found (REDIS_URL or UPSTASH_REDIS_REST_TOKEN)');
    return null;
  }

  try {
    const client = new IORedis(redisUrl, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn(`[IORedis] ⚠️ Max retries (3) reached, giving up`);
          return null; // Stop retrying after 3 attempts
        }
        const delay = Math.min(times * 50, 2000);
        console.log(`[IORedis] 🔄 Retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
      lazyConnect: true, // Don't connect immediately
      tls: redisUrl.startsWith('rediss://') ? {
        rejectUnauthorized: false // Accept self-signed certs from Upstash
      } : undefined,
      connectTimeout: 10000, // 10 second timeout
      commandTimeout: 5000, // 5 second command timeout
    });
    
    // Handle connection errors gracefully
    client.on('error', (err) => {
      console.warn('[IORedis] ❌ Connection error:', err.message);
    });
    
    client.on('connect', () => {
      console.log('[IORedis] ✅ Connected to Redis successfully');
    });
    
    client.on('ready', () => {
      console.log('[IORedis] 🚀 Redis client ready');
    });
    
    client.on('close', () => {
      console.warn('[IORedis] ⚠️ Connection closed');
    });
    
    // Try to connect, but don't fail if it doesn't work
    client.connect().catch((err) => {
      console.error('[IORedis] ❌ Failed to connect:', err.message);
      console.warn('[IORedis] ℹ️ Continuing without Redis - will use in-memory fallback');
    });
    
    return client;
  } catch (error: any) {
    console.error('[IORedis] ❌ Failed to initialize:', error.message);
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
