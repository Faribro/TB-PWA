/**
 * Targeted Redis Cache Invalidation for Vertex Aggregates
 * 
 * Production-safe invalidation without KEYS scan
 * Uses deterministic key computation based on affected dimensions
 */

import { getRedisClient } from '@/lib/redis';

interface PatientChange {
  screening_date?: string;
  screening_state?: string;
  screening_district?: string;
}

/**
 * Compute all affected cache keys deterministically
 * No KEYS scan - direct key computation
 */
function computeAffectedKeys(patient: PatientChange): string[] {
  const keys: string[] = [];
  
  const date = patient.screening_date;
  if (!date) return keys;

  const [year, month] = date.split('-');
  const state = patient.screening_state || 'all';
  const district = patient.screening_district || 'all';

  // All roles that might have cached this data
  const roles = ['admin', 'PM', 'SPM', 'ME', 'PC'];

  // Heatmap keys (year-level)
  for (const role of roles) {
    keys.push(`vertex:heatmap:${year}:${state}:${district}:${role}`);
    keys.push(`vertex:heatmap:${year}:${state}:all:${role}`);
    keys.push(`vertex:heatmap:${year}:all:${district}:${role}`);
    keys.push(`vertex:heatmap:${year}:all:all:${role}`);
  }

  // Month keys (month-level)
  for (const role of roles) {
    keys.push(`vertex:month:${year}:${month}:${state}:${district}:${role}`);
    keys.push(`vertex:month:${year}:${month}:${state}:all:${role}`);
    keys.push(`vertex:month:${year}:${month}:all:${district}:${role}`);
    keys.push(`vertex:month:${year}:${month}:all:all:${role}`);
  }

  // Daily keys (date-level)
  for (const role of roles) {
    keys.push(`vertex:daily:${date}:${state}:${district}:${role}`);
    keys.push(`vertex:daily:${date}:${state}:all:${role}`);
    keys.push(`vertex:daily:${date}:all:${district}:${role}`);
    keys.push(`vertex:daily:${date}:all:all:${role}`);
  }

  return keys;
}

/**
 * Invalidate Vertex cache with deterministic key deletion
 * Production-safe: no KEYS scan, direct DEL operations
 */
export async function invalidateVertexCache(patient: PatientChange) {
  const redis = getRedisClient();
  if (!redis) {
    console.warn('[invalidateVertexCache] Redis not available');
    return;
  }

  try {
    const keysToDelete = computeAffectedKeys(patient);
    
    if (keysToDelete.length === 0) {
      console.log('[invalidateVertexCache] No keys to invalidate');
      return;
    }

    // Batch delete all affected keys (no KEYS scan)
    const deleted = await redis.del(...keysToDelete);
    console.log(`[invalidateVertexCache] Deleted ${deleted} keys (${keysToDelete.length} attempted)`);
  } catch (error) {
    console.error('[invalidateVertexCache] Error:', error);
  }
}
