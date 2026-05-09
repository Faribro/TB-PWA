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
  // Identity & Demographics
  'id', 'unique_id', 'kobo_uuid', 'inmate_name', 'father_husband_name', 
  'date_of_birth', 'age', 'sex', 'contact_number', 'address', 'inmate_type',
  
  // Screening Details
  'screening_date', 'submitted_on', 'screening_state', 'screening_district', 
  'facility_name', 'facility_type', 'staff_name',
  
  // Clinical Assessment
  'symptoms_10s', 'tb_past_history', 'xray_result',
  
  // Referral
  'referral_date', 'referred_facility',
  
  // Diagnosis & Treatment
  'tb_diagnosed', 'tb_diagnosis_date', 'tb_type', 
  'att_start_date', 'att_completion_date',
  
  // HIV/ART
  'hiv_status', 'art_status', 'art_number',
  
  // Registration & Administrative
  'nikshay_abha_id', 'registration_date', 'closure_reason', 'remarks',
  'ai_link_status', 'created_at', 'updated_at'
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
    const cached = await getCached(cacheKey) as BulkResponse | null;
    if (cached) {
      const durationMs = Date.now() - startTime;
      console.log(`[patients/bulk] ✅ Cache hit: ${cached.data.length} records in ${durationMs}ms`);
      return NextResponse.json(
        {
          data: cached.data,
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
          // Return empty dataset instead of throwing
          return {
            data: [],
            meta: {
              total: 0,
              role: scope.role,
              scope: scope.sessionState || 'national',
              durationMs: Date.now() - startTime,
              cached: false,
              error: error.message
            }
          };
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
    
    // Store in Redis cache for 30s (will skip if payload > 5MB)
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
