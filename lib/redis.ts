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
  ? new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    })
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
