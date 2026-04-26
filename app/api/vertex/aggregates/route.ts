/**
 * VERTEX AGGREGATES API - Redis-Backed Scoped Caching
 * 
 * Architecture:
 * 1. Supabase Realtime detects changes
 * 2. SWR revalidates client view
 * 3. Redis stores scoped aggregate results
 * 4. Database is source of truth and fallback
 * 
 * Cache Strategy:
 * - Stale-while-revalidate (30s TTL)
 * - Scoped keys (year/month/state/district/role)
 * - Targeted invalidation on patient changes
 * 
 * Version: 2.0.1 - Fixed Supabase 1000-row default cap
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase-server-admin';
import { normalizeRole, Role } from '@/lib/constants/roles';
import { getRedisClient } from '@/lib/redis';

export const maxDuration = 15;
export const dynamic = 'force-dynamic';

interface HeatmapDay {
  date: string;
  screenedCount: number;
  breachCount: number;
}

interface MonthSummary {
  screened: number;
  suspected: number;
  diagnosed: number;
  attStarted: number;
  referred: number;
}

interface DailySummary {
  totalScreened: number;
  pendingSputum: number;
  diagnosed: number;
  onTrack: number;
}

interface AggregateResponse {
  heatmap?: HeatmapDay[];
  monthSummary?: MonthSummary;
  dailySummary?: DailySummary;
  meta: {
    cached: boolean;
    durationMs: number;
    cacheKey: string;
  };
}

function getCacheKey(
  type: 'heatmap' | 'month' | 'daily',
  params: {
    year?: number;
    month?: number;
    date?: string;
    state?: string;
    district?: string;
    role: string;
  }
): string {
  const { year, month, date, state, district, role } = params;
  const stateKey = state || 'all';
  const districtKey = district || 'all';
  
  switch (type) {
    case 'heatmap':
      return `vertex:heatmap:${year}:${stateKey}:${districtKey}:${role}`;
    case 'month':
      return `vertex:month:${year}:${month}:${stateKey}:${districtKey}:${role}`;
    case 'daily':
      return `vertex:daily:${date}:${stateKey}:${districtKey}:${role}`;
    default:
      return `vertex:unknown`;
  }
}

function applyRBACFilters(query: any, role: typeof Role[keyof typeof Role], state?: string | null, staffName?: string | null) {
  if (role === Role.ADMIN || role === Role.PROGRAM_MANAGER) {
    return query;
  } else if (role === Role.STATE_PROGRAM_MANAGER || role === Role.ME_OFFICER) {
    if (state && state !== 'All') {
      if (state === 'Maharashtra') {
        query = query.in('screening_state', ['Maharashtra', 'Mumbai']);
      } else {
        query = query.eq('screening_state', state);
      }
    }
  } else if (role === Role.PRISON_COORDINATOR) {
    if (staffName) {
      query = query.ilike('staff_name', staffName.trim());
    }
  }
  return query;
}

function applyFilterParams(query: any, filterState?: string, filterDistrict?: string) {
  if (filterState && filterState !== 'all') {
    if (filterState === 'Maharashtra') {
      query = query.in('screening_state', ['Maharashtra', 'Mumbai']);
    } else {
      query = query.eq('screening_state', filterState);
    }
  }
  if (filterDistrict && filterDistrict !== 'all') {
    query = query.eq('screening_district', filterDistrict);
  }
  return query;
}

async function computeYearlyHeatmap(
  supabase: any,
  year: number,
  role: typeof Role[keyof typeof Role],
  state?: string | null,
  staffName?: string | null,
  filterState?: string,
  filterDistrict?: string
): Promise<HeatmapDay[]> {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  let query = supabase
    .from('patients')
    .select('screening_date, referral_date')
    .gte('screening_date', yearStart)
    .lte('screening_date', yearEnd)
    .not('screening_date', 'is', null)
    .range(0, 99999); // Bypass Supabase 1000-row default limit

  query = applyRBACFilters(query, role, state, staffName);
  query = applyFilterParams(query, filterState, filterDistrict);

  const { data, error } = await query;
  if (error) throw error;

  const dailyMap = new Map<string, HeatmapDay>();
  
  (data || []).forEach((record: any) => {
    const date = record.screening_date;
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { date, screenedCount: 0, breachCount: 0 });
    }
    const dayStats = dailyMap.get(date)!;
    dayStats.screenedCount++;
    if (!record.referral_date) dayStats.breachCount++;
  });

  return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

async function computeMonthlySummary(
  supabase: any,
  year: number,
  month: number,
  role: typeof Role[keyof typeof Role],
  state?: string | null,
  staffName?: string | null,
  filterState?: string,
  filterDistrict?: string
): Promise<MonthSummary> {
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  let query = supabase
    .from('patients')
    .select('screening_date, xray_result, tb_diagnosed, att_start_date, referral_date')
    .gte('screening_date', monthStart)
    .lte('screening_date', monthEnd)
    .not('screening_date', 'is', null)
    .range(0, 99999); // Bypass Supabase 1000-row default limit

  query = applyRBACFilters(query, role, state, staffName);
  query = applyFilterParams(query, filterState, filterDistrict);

  const { data, error } = await query;
  if (error) throw error;

  let screened = 0;
  let suspected = 0;
  let diagnosed = 0;
  let attStarted = 0;
  let referred = 0;

  (data || []).forEach((record: any) => {
    screened++;
    if (record.xray_result === 'Suspected TB Case') suspected++;
    if (record.tb_diagnosed === 'Y') diagnosed++;
    if (record.att_start_date) attStarted++;
    if (record.referral_date) referred++;
  });

  return { screened, suspected, diagnosed, attStarted, referred };
}

async function computeDailySummary(
  supabase: any,
  date: string,
  role: typeof Role[keyof typeof Role],
  state?: string | null,
  staffName?: string | null,
  filterState?: string,
  filterDistrict?: string
): Promise<DailySummary> {
  let query = supabase
    .from('patients')
    .select('screening_date, xray_result, tb_diagnosed, referral_date')
    .eq('screening_date', date)
    .range(0, 99999); // Bypass Supabase 1000-row default limit

  query = applyRBACFilters(query, role, state, staffName);
  query = applyFilterParams(query, filterState, filterDistrict);

  const { data, error } = await query;
  if (error) throw error;

  let totalScreened = 0;
  let pendingSputum = 0;
  let diagnosed = 0;
  let onTrack = 0;

  (data || []).forEach((record: any) => {
    totalScreened++;
    if (!record.referral_date) pendingSputum++;
    if (record.tb_diagnosed === 'Y') diagnosed++;
    if (record.xray_result === 'Suspected TB Case') onTrack++;
  });

  return { totalScreened, pendingSputum, diagnosed, onTrack };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'heatmap' | 'month' | 'daily';
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const date = searchParams.get('date');
    const filterState = searchParams.get('state') || undefined;
    const filterDistrict = searchParams.get('district') || undefined;

    const rawRole = session.user.role ?? 'ME';
    const role = normalizeRole(rawRole) ?? Role.ME_OFFICER;
    const state = session.user.state;
    const staffName = (session.user as any).staffName;

    const cacheKey = getCacheKey(type, {
      year,
      month,
      date: date || undefined,
      state: filterState,
      district: filterDistrict,
      role: rawRole,
    });

    let cached: any = null;
    let isCached = false;

    const redis = getRedisClient();
    if (redis) {
      try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
          // Upstash Redis auto-deserializes - data is already an object
          cached = cachedData;
          isCached = true;
          console.log(`[vertex/aggregates] Cache HIT: ${cacheKey}`);
        }
      } catch (err) {
        console.error('[vertex/aggregates] Redis read error:', err);
      }
    }

    if (isCached && cached) {
      return NextResponse.json({
        ...cached,
        meta: {
          ...cached.meta,
          cached: true,
          durationMs: Date.now() - startTime,
          cacheKey,
        },
      });
    }

    const supabase = createServerClient();
    let result: AggregateResponse;

    switch (type) {
      case 'heatmap': {
        const heatmap = await computeYearlyHeatmap(
          supabase,
          year,
          role,
          state,
          staffName,
          filterState,
          filterDistrict
        );
        result = {
          heatmap,
          meta: {
            cached: false,
            durationMs: Date.now() - startTime,
            cacheKey,
          },
        };
        break;
      }

      case 'month': {
        const monthSummary = await computeMonthlySummary(
          supabase,
          year,
          month,
          role,
          state,
          staffName,
          filterState,
          filterDistrict
        );
        result = {
          monthSummary,
          meta: {
            cached: false,
            durationMs: Date.now() - startTime,
            cacheKey,
          },
        };
        break;
      }

      case 'daily': {
        if (!date) {
          return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
        }
        const dailySummary = await computeDailySummary(
          supabase,
          date,
          role,
          state,
          staffName,
          filterState,
          filterDistrict
        );
        result = {
          dailySummary,
          meta: {
            cached: false,
            durationMs: Date.now() - startTime,
            cacheKey,
          },
        };
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    if (redis) {
      try {
        // Upstash Redis auto-serializes, no need for JSON.stringify
        await redis.set(cacheKey, result, { ex: 30 });
        console.log(`[vertex/aggregates] Cache SET: ${cacheKey} (30s TTL)`);
      } catch (err) {
        console.error('[vertex/aggregates] Redis write error:', err);
      }
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        'X-Cache': 'MISS',
        'X-Cache-Key': cacheKey,
      },
    });
  } catch (error) {
    console.error('[vertex/aggregates] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
