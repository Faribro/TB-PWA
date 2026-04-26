/**
 * Cache Version Manager - Event-Driven Invalidation
 * 
 * Industry Best Practice:
 * - Versioned cache keys for instant invalidation
 * - No Redis KEYS scans
 * - No waiting for TTL expiry
 * - Event-driven version bumps
 */

import { getRedisClient } from './redis';

export enum CacheNamespace {
  PATIENTS_BULK = 'patients:bulk',
  PATIENTS_SUMMARY = 'patients:summary',
  VERTEX_HEATMAP = 'vertex:heatmap',
  VERTEX_MONTH = 'vertex:month',
  VERTEX_DAILY = 'vertex:daily',
  VERTEX_METRICS = 'vertex:metrics',
}

/**
 * Get current version for a namespace
 * Returns 1 if version doesn't exist yet
 */
export async function getCacheVersion(namespace: CacheNamespace): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return 1;

  try {
    const versionKey = `cache:version:${namespace}`;
    const version = await redis.get(versionKey);
    return version ? parseInt(version as string, 10) : 1;
  } catch (error) {
    console.error(`[CacheVersion] Error getting version for ${namespace}:`, error);
    return 1;
  }
}

/**
 * Bump version for one or more namespaces
 * This instantly invalidates all cached entries in those namespaces
 */
export async function bumpCacheVersion(...namespaces: CacheNamespace[]): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const pipeline = redis.pipeline();
    
    for (const namespace of namespaces) {
      const versionKey = `cache:version:${namespace}`;
      pipeline.incr(versionKey);
      pipeline.expire(versionKey, 86400); // 24h TTL on version key itself
    }
    
    await pipeline.exec();
    
    console.log(`[CacheVersion] ✅ Bumped versions for: ${namespaces.join(', ')}`);
  } catch (error) {
    console.error('[CacheVersion] Error bumping versions:', error);
  }
}

/**
 * Build versioned cache key
 * Format: namespace:v{version}:scope:...params
 */
export async function buildVersionedKey(
  namespace: CacheNamespace,
  ...params: string[]
): Promise<string> {
  const version = await getCacheVersion(namespace);
  return `${namespace}:v${version}:${params.join(':')}`;
}

/**
 * Invalidate all patient-related caches
 * Call this on any patient INSERT/UPDATE/DELETE
 */
export async function invalidatePatientCaches(): Promise<void> {
  await bumpCacheVersion(
    CacheNamespace.PATIENTS_BULK,
    CacheNamespace.PATIENTS_SUMMARY,
    CacheNamespace.VERTEX_HEATMAP,
    CacheNamespace.VERTEX_MONTH,
    CacheNamespace.VERTEX_DAILY,
    CacheNamespace.VERTEX_METRICS
  );
}

/**
 * Invalidate only aggregate caches (for minor updates)
 */
export async function invalidateAggregateCaches(): Promise<void> {
  await bumpCacheVersion(
    CacheNamespace.VERTEX_HEATMAP,
    CacheNamespace.VERTEX_MONTH,
    CacheNamespace.VERTEX_DAILY,
    CacheNamespace.VERTEX_METRICS
  );
}
