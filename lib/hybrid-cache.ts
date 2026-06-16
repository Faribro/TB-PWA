/**
 * Hybrid Cache Strategy for SAMADHAAN OS
 * 
 * Layer 1: Vercel Edge Config (ultra-fast, read-only, global)
 * Layer 2: Upstash Redis (fast, read-write, with TTL)
 * Layer 3: Database (source of truth)
 * 
 * Use Cases:
 * - Edge Config: Static reference data (states, districts, facilities)
 * - Redis: Dynamic metrics, aggregations (30s TTL)
 * - Database: Real-time patient data
 */

import { get as getEdgeConfig } from '@vercel/edge-config';
import { getCached, setCached } from './redis';

/**
 * Multi-layer cache get with fallback
 */
export async function getFromCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    ttl?: number;
    useEdgeConfig?: boolean;
    edgeConfigKey?: string;
  } = {}
): Promise<T> {
  const { ttl = 60, useEdgeConfig = false, edgeConfigKey } = options;

  // Layer 1: Try Edge Config (if enabled)
  if (useEdgeConfig && edgeConfigKey) {
    try {
      const edgeValue = await getEdgeConfig<T>(edgeConfigKey);
      if (edgeValue !== undefined) {
        console.log(`[Cache] Edge Config HIT: ${edgeConfigKey}`);
        return edgeValue;
      }
    } catch (error) {
      console.warn('[Cache] Edge Config error:', error);
    }
  }

  // Layer 2: Try Redis
  const redisValue = await getCached<T>(key);
  if (redisValue !== null) {
    return redisValue;
  }

  // Layer 3: Fetch from source
  console.log(`[Cache] Fetching from source: ${key}`);
  const value = await fetchFn();
  
  // Cache in Redis
  await setCached(key, value, ttl);
  
  return value;
}

/**
 * Cache static reference data in Edge Config
 * (Updated via Vercel dashboard or API)
 */
export const EDGE_CONFIG_KEYS = {
  STATES: 'reference:states',
  DISTRICTS: 'reference:districts',
  FACILITIES: 'reference:facilities',
  FEATURE_FLAGS: 'feature:flags',
} as const;

/**
 * Get reference data with Edge Config fallback
 */
export async function getReferenceData<T>(
  key: string,
  fallback: T
): Promise<T> {
  try {
    const value = await getEdgeConfig<T>(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}
