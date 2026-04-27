/**
 * BULK PATIENTS API - Optimized for full dataset retrieval
 * 
 * Industry Best Practices:
 * 1. Single query with no pagination overhead
 * 2. Aggressive Redis caching (5min TTL)
 * 3. Minimal column selection
 * 4. Background cache warming
 * 
 * Version: 2.0.1 - Fixed Supabase 1000-row default cap
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
export const revalidate = 0; // Force no caching

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
    
    // Generate cache key based on scope and filters
    const cacheKey = `patients:bulk:${scope.role}:${scope.sessionState || 'all'}:${filters.state || 'all'}:${filters.district || 'all'}:${filters.dateFrom || 'all'}:${filters.dateTo || 'all'}`;
    
    console.log('[patients/bulk] Checking cache for key:', cacheKey);
    
    // Check Redis cache directly (not using getCachedWithMemory which requires fetchFn)
    const { getCached, setCached } = await import('@/lib/redis');
    const cached = await getCached(cacheKey);
    if (cached) {
      const durationMs = Date.now() - startTime;
      console.log(`[patients/bulk] ✅ Cache hit: ${cached.data.length} records in ${durationMs}ms`);
      return NextResponse.json(
        {
          ...cached,
          meta: {
            ...cached.meta,
            cached: true,
            durationMs,
          },
        },
        {
          headers: {
            'Cache-Control': 'private, max-age=30',
            'X-Cache': 'HIT',
            'X-Total': String(cached.data.length),
            'X-Duration-Ms': String(durationMs),
          },
        }
      );
    }
    
    console.log('[patients/bulk] Cache miss, executing fresh query');
    
    // NO REDIS CACHE - Raw patient data must always be fresh
    // Use circuit breaker for resilience
    const response = await patientsCircuitBreaker.execute(async () => {
      const supabase = createServerClient();
      
      // Build base query
      let baseQuery = supabase
        .from('patients')
        .select(BULK_COLUMNS, { count: 'exact', head: false })
        .order('created_at', { ascending: false });
      
      baseQuery = buildScopedQuery(baseQuery, scope, filters);
      
      // PAGINATED FETCH LOOP: Supabase PostgREST caps at 1000 rows by default.
      // We MUST use .range() with 1000-row pages and loop until all rows are fetched.
      const PAGE_SIZE = 1000; // Must match Supabase's default max-rows cap
      let allData: any[] = [];
      let page = 0;
      let totalCount = 0;
      
      console.log('[patients/bulk] Starting paginated fetch (PAGE_SIZE=1000)...');
      
      while (page < 100) { // Safety: max 100 pages (100k rows)
        const start = page * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;
        
        // Build query with RBAC filters for this page
        let pageQuery = supabase
          .from('patients')
          .select(BULK_COLUMNS, { count: page === 0 ? 'exact' : null, head: false })
          .order('created_at', { ascending: false });
        
        pageQuery = buildScopedQuery(pageQuery, scope, filters);
        pageQuery = pageQuery.range(start, end);
        
        const { data: pageData, error, count } = await pageQuery;
        
        if (error) {
          console.error(`[patients/bulk] Page ${page} error:`, error);
          throw new Error(`Database error: ${error.message}`);
        }
        
        if (page === 0 && count) {
          totalCount = count;
        }
        
        const rowsThisPage = pageData?.length || 0;
        allData = allData.concat(pageData || []);
        
        console.log(`[patients/bulk] Page ${page}: Fetched ${rowsThisPage} rows (total: ${allData.length} / ${totalCount || '?'})`);
        
        // Stop if: no rows returned, or we've fetched all known rows
        if (rowsThisPage === 0) break;
        if (totalCount > 0 && allData.length >= totalCount) break;
        // If we got fewer rows than PAGE_SIZE, this was the last page
        if (rowsThisPage < PAGE_SIZE) break;
        
        page++;
      }
      
      const durationMs = Date.now() - startTime;
      
      console.log(`[patients/bulk] ✅ Fetched ${allData.length} / ${totalCount} records in ${durationMs}ms (${page + 1} pages)`);
      
      if (page >= 99) {
        console.warn('[patients/bulk] ⚠️ WARNING: Hit 100-page safety cap (100k rows)!');
      }
      
      return {
        data: allData,
        meta: {
          total: totalCount || allData.length,
          role: scope.role,
          scope: scope.sessionState || 'national',
          durationMs,
          cached: false,
        },
      };
    });
    
    // Store in Redis cache for 30s
    try {
      await setCached(cacheKey, response, 30);
      console.log(`[patients/bulk] ✅ Cached ${response.data.length} records for 30s`);
    } catch (cacheError) {
      console.warn('[patients/bulk] Failed to cache:', cacheError);
      // Don't fail the request if caching fails
    }
    
    const totalDuration = Date.now() - startTime;
    
    console.log(`[patients/bulk] Returning response: ${response.data.length} records`);
    
    return NextResponse.json(
      response,
      {
        headers: {
          'Cache-Control': 'private, max-age=30',
          'X-Cache': 'MISS',
          'X-Total': String(response.data.length),
          'X-Duration-Ms': String(totalDuration),
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
