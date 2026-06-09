/**
 * VERTEX GEO-CHOROPLETH API
 * Returns pre-aggregated district/state-level metrics for the GIS map.
 * Replaces the client-side O(n) scan of the full patient array.
 *
 * Response shape:
 * {
 *   districts: { [normalizedKey: string]: ChoroplethMetrics }
 *   states:    { [normalizedKey: string]: ChoroplethMetrics }
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { normalizeRole, Role } from '@/lib/constants/roles';
import { getCachedWithMemory } from '@/lib/memory-cache';
import { CacheNamespace, buildVersionedKey } from '@/lib/cache-version';
import { prisma } from '@/lib/prisma';
import { normalizeGeographicKey } from '@/lib/normalizeGeographicKey';

export const maxDuration = 15;
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normalizeKey(str: string): string {
  return normalizeGeographicKey(str);
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterState = searchParams.get('state') || null;
    const filterDistrict = searchParams.get('district') || null;

    const rawRole = session.user.role ?? 'ME';
    const role = normalizeRole(rawRole) ?? Role.ME_OFFICER;
    const userState = session.user.state;

    const cacheKey = await buildVersionedKey(
      CacheNamespace.VERTEX_METRICS,
      'geo-choropleth',
      filterState || 'all',
      filterDistrict || 'all',
      rawRole,
      userState || 'all'
    );

    const data = await getCachedWithMemory(
      cacheKey,
      async () => {
        // Determine RBAC state constraint
        let stateConstraint: string | null = null;
        if (filterState && filterState !== 'all') {
          stateConstraint = filterState;
        } else if (
          (role === Role.STATE_PROGRAM_MANAGER || role === Role.ME_OFFICER) &&
          userState &&
          userState !== 'All'
        ) {
          stateConstraint = userState;
        }

        let queryStr = `
          SELECT
            LOWER(TRIM(screening_state))    AS state_key,
            LOWER(TRIM(screening_district)) AS district_key,
            TRIM(screening_state)           AS state_name,
            TRIM(screening_district)        AS district_name,
            COUNT(*)::integer               AS screened,
            SUM(CASE WHEN tb_diagnosed = 'Y' OR tb_diagnosed = 'Yes' THEN 1 ELSE 0 END)::integer AS diagnosed,
            SUM(CASE WHEN tb_diagnosed IS NULL OR (tb_diagnosed <> 'Yes' AND tb_diagnosed <> 'Y' AND tb_diagnosed <> 'No' AND tb_diagnosed <> 'N') THEN 1 ELSE 0 END)::integer AS suspected,
            SUM(CASE WHEN tb_diagnosed = 'No' OR tb_diagnosed = 'N' THEN 1 ELSE 0 END)::integer AS normal,
            SUM(CASE WHEN att_start_date IS NOT NULL THEN 1 ELSE 0 END)::integer AS initiated,
            SUM(CASE WHEN att_completion_date IS NOT NULL THEN 1 ELSE 0 END)::integer AS completed,
            SUM(
              CASE WHEN referral_date IS NULL
                        AND screening_date IS NOT NULL
                        AND (CURRENT_DATE - screening_date::date) > 7
               THEN 1 ELSE 0 END
            )::integer AS breaches
          FROM public.patients
          WHERE 1=1
        `;

        const params: any[] = [];

        if (stateConstraint) {
          if (stateConstraint.toLowerCase() === 'maharashtra') {
            queryStr += ` AND LOWER(TRIM(screening_state)) IN ('maharashtra', 'mumbai')`;
          } else {
            params.push(stateConstraint);
            queryStr += ` AND LOWER(TRIM(screening_state)) = LOWER($${params.length})`;
          }
        }

        if (filterDistrict && filterDistrict !== 'all') {
          params.push(filterDistrict);
          queryStr += ` AND LOWER(TRIM(screening_district)) = LOWER($${params.length})`;
        }

        queryStr += `
          GROUP BY
            LOWER(TRIM(screening_state)),
            LOWER(TRIM(screening_district)),
            TRIM(screening_state),
            TRIM(screening_district)
          ORDER BY screened DESC
        `;

        const rows = await prisma.$queryRawUnsafe<any[]>(queryStr, ...params);

        // Build district-level and state-level dictionaries
        const districts: Record<string, any> = {};
        const states: Record<string, any> = {};

        for (const row of rows) {
          const dk = normalizeKey(row.district_key || row.district_name || '');
          const sk = normalizeKey(row.state_key || row.state_name || '');

          const metrics = {
            name:       row.district_name || '',
            state:      row.state_name || '',
            screened:   Number(row.screened   || 0),
            diagnosed:  Number(row.diagnosed  || 0),
            suspected:  Number(row.suspected  || 0),
            normal:     Number(row.normal     || 0),
            initiated:  Number(row.initiated  || 0),
            completed:  Number(row.completed  || 0),
            breaches:   Number(row.breaches   || 0),
          };

          if (dk) {
            districts[dk] = metrics;
          }

          // Accumulate state-level totals
          if (sk) {
            if (!states[sk]) {
              states[sk] = {
                name:       row.state_name || '',
                screened:   0,
                diagnosed:  0,
                suspected:  0,
                normal:     0,
                initiated:  0,
                completed:  0,
                breaches:   0,
              };
            }
            states[sk].screened   += metrics.screened;
            states[sk].diagnosed  += metrics.diagnosed;
            states[sk].suspected  += metrics.suspected;
            states[sk].normal     += metrics.normal;
            states[sk].initiated  += metrics.initiated;
            states[sk].completed  += metrics.completed;
            states[sk].breaches   += metrics.breaches;
          }
        }

        return { districts, states };
      },
      60 // 60-second TTL
    );

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'X-Cache': 'GEO-CHOROPLETH',
      },
    });
  } catch (error) {
    console.error('[/api/vertex/geo-choropleth] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
