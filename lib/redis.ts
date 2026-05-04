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
  // Check for required Upstash TCP credentials
  const host = process.env.UPSTASH_REDIS_HOST;
  const password = process.env.UPSTASH_REDIS_PASSWORD;
  const port = parseInt(process.env.UPSTASH_REDIS_PORT || '6379', 10);
  
  if (!host || !password) {
    console.warn(
      '[IORedis] ⚠️  UPSTASH_REDIS_HOST or UPSTASH_REDIS_PASSWORD missing.\n' +
      '  Get from: Upstash Console → Your DB → Details → Password\n' +
      '  Add to Vercel: Settings → Environment Variables\n' +
      '  Falling back to in-memory queue.'
    );
    return null;
  }

  try {
    console.log(`[IORedis] 🔧 Connecting to ${host}:${port} with TCP credentials`);
    
    const client = new IORedis({
      host,
      port,
      password,
      tls: {}, // Required for Upstash TLS - empty object enables TLS
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn(`[IORedis] ⚠️  Max retries (3) reached, giving up`);
          return null;
        }
        const delay = Math.min(times * 200, 2000);
        console.log(`[IORedis] 🔄 Retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
    });
    
    // Event handlers
    client.on('error', (err) => {
      console.error('[IORedis] ❌ Connection error:', err.message);
    });
    
    client.on('connect', () => {
      console.log('[IORedis] ✅ TCP connection established');
    });
    
    client.on('ready', () => {
      console.log('[IORedis] 🚀 Redis client ready');
    });
    
    client.on('close', () => {
      console.warn('[IORedis] ⚠️  Connection closed');
    });
    
    // Verify connection works with actual credentials
    client.connect()
      .then(() => client.ping())
      .then(() => console.log('[IORedis] ✅ Upstash TCP connection verified'))
      .catch((err) => {
        console.error('[IORedis] ❌ Connection failed — check UPSTASH_REDIS_PASSWORD:', err.message);
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
