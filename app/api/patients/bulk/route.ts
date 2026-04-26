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
    
    console.log('[patients/bulk] Executing fresh query (no Redis cache for raw data)');
    
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
        
        // PAGINATED FETCH LOOP: Fetch in 5000-row chunks to bypass Supabase limit
        const PAGE_SIZE = 5000;
        let allData: any[] = [];
        let page = 0;
        let hasMore = true;
        let totalCount = 0;
        
        console.log('[patients/bulk] Starting paginated fetch...');
        
        while (hasMore && page < 20) { // Safety: max 20 pages (100k rows)
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
          
          allData = allData.concat(pageData || []);
          
          console.log(`[patients/bulk] Page ${page}: Fetched ${pageData?.length || 0} rows (total so far: ${allData.length})`);
          
          hasMore = (pageData?.length || 0) === PAGE_SIZE;
          page++;
        }
        
        const durationMs = Date.now() - startTime;
        
        console.log(`[patients/bulk] ✅ Fetched ${allData.length} / ${totalCount} records in ${durationMs}ms (${page} pages)`);
        
        if (page >= 20) {
          console.warn('[patients/bulk] ⚠️ WARNING: Hit 20-page safety cap (100k rows)!');
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
    });
    
    const totalDuration = Date.now() - startTime;
    
    console.log(`[patients/bulk] Returning response: ${response.data.length} records`);
    
    return NextResponse.json(
      response,
      {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
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
