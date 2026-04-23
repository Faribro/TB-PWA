/**
 * Targeted Redis Cache Invalidation for Vertex Aggregates
 * 
 * Invalidates only affected cache keys when patient data changes
 */

import { redis } from '@/lib/redis';

interface PatientChange {
  screening_date?: string;
  screening_state?: string;
  screening_district?: string;
}

export async function invalidateVertexCache(patient: PatientChange) {
  if (!redis) {
    console.warn('[invalidateVertexCache] Redis not available');
    return;
  }

  try {
    const date = patient.screening_date;
    if (!date) return;

    const [year, month] = date.split('-');
    const state = patient.screening_state || 'all';
    const district = patient.screening_district || 'all';

    const keysToInvalidate = [
      `vertex:heatmap:${year}:${state}:${district}:*`,
      `vertex:heatmap:${year}:all:all:*`,
      `vertex:month:${year}:${month}:${state}:${district}:*`,
      `vertex:month:${year}:${month}:all:all:*`,
      `vertex:daily:${date}:${state}:${district}:*`,
      `vertex:daily:${date}:all:all:*`,
    ];

    for (const pattern of keysToInvalidate) {
      try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
          console.log(`[invalidateVertexCache] Deleted ${keys.length} keys matching ${pattern}`);
        }
      } catch (err) {
        console.error(`[invalidateVertexCache] Error deleting pattern ${pattern}:`, err);
      }
    }
  } catch (error) {
    console.error('[invalidateVertexCache] Error:', error);
  }
}
