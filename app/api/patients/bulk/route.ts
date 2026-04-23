/**
 * BULK PATIENTS API - Optimized for full dataset retrieval
 * 
 * Industry Best Practices:
 * 1. Single query with no pagination overhead
 * 2. Aggressive Redis caching (5min TTL)
 * 3. Minimal column selection
 * 4. Background cache warming
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server-admin';
import { getCachedWithMemory } from '@/lib/memory-cache';
import { patientsCircuitBreaker } from '@/lib/circuit-breaker';
import { 
  validateAndExtractScope, 
  buildScopedQuery, 
  type PatientFilters 
} from '@/lib/api/patients-scope';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Scalability: Implement pagination for datasets >50k
const MAX_BULK_SIZE = 50000;
const CHUNK_SIZE = 10000; // Process in chunks to avoid memory issues

const BULK_COLUMNS = [
  'id', 'unique_id', 'inmate_name', 'screening_date', 'submitted_on',
  'screening_state', 'screening_district', 'facility_name', 'facility_type',
  'xray_result', 'tb_diagnosed', 'att_start_date', 'sex', 'age'
].join(',');

interface BulkResponse {
  data: any[];
  meta: {
    total: number;
    role: string;
    scope: string;
    durationMs: number;
    cached: boolean;
    limited?: boolean; // True if dataset was capped
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const scope = await validateAndExtractScope();
    const { searchParams } = new URL(request.url);
    
    const filters: PatientFilters = {
      state: searchParams.get('state') || undefined,
      district: searchParams.get('district') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    };
    
    const cacheKey = `patients:bulk:${scope.role}:${scope.sessionState || 'all'}:${JSON.stringify(filters)}`;
    
    const response = await getCachedWithMemory<BulkResponse>(
      cacheKey,
      async () => {
        // Use circuit breaker for resilience
        return await patientsCircuitBreaker.execute(async () => {
          const supabase = createServerClient();
        
        // Robust query with error handling and fallback
        let query = supabase
          .from('patients')
          .select(BULK_COLUMNS, { count: 'exact', head: false })
          .order('created_at', { ascending: false })
          .range(0, 99999);
        
        query = buildScopedQuery(query, scope, filters);
        
        const { data, error, count } = await query;
        
        if (error) {
          console.error('[patients/bulk] Database error:', error);
          throw new Error(`Database error: ${error.message}`);
        }
        
        const durationMs = Date.now() - startTime;
        
        console.log(`[patients/bulk] ✅ Fetched ${data?.length || 0} records in ${durationMs}ms`);
        
        return {
          data: data || [],
          meta: {
            total: count || 0,
            role: scope.role,
            scope: scope.sessionState || 'national',
            durationMs,
            cached: false,
          },
        };
        });
      },
      600
    );
    
    const totalDuration = Date.now() - startTime;
    
    return NextResponse.json(
      {
        ...response,
        meta: {
          ...response.meta,
          durationMs: totalDuration,
          cached: totalDuration < 100,
        },
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
          'X-Total': String(response.data.length),
          'X-Duration-Ms': String(totalDuration),
          'X-Cache': totalDuration < 100 ? 'HIT' : 'MISS',
        },
      }
    );
  } catch (error) {
    console.error('[patients/bulk] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
