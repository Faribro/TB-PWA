import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════
// TRIPLE-SYNC HEALTH CHECK ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════
// Monitors all 3 sync paths and returns operational status
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  paths: {
    path1_kobo_inbound: {
      status: 'ok' | 'warning' | 'error';
      last24h: { received: number; failed: number };
    };
    path2_auto_sync: {
      status: 'ok' | 'warning' | 'error';
      unsynced_count: number;
      oldest_unsynced_hours: number | null;
      stuck_records: number;
    };
    path3_manual_update: {
      status: 'ok' | 'warning' | 'error';
      last24h_updates: number;
    };
  };
  alerts: string[];
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseClient();
  
  try {
    // Security: Require service role key in header
    const authHeader = req.headers.get('x-health-check-secret');
    
    if (!authHeader || authHeader !== SUPABASE_SERVICE_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid health check secret' },
        { status: 401 }
      );
    }

    const alerts: string[] = [];
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // ═══════════════════════════════════════════════════════════════════════
    // PATH 1: Kobo → Supabase (Inbound Webhooks)
    // ═══════════════════════════════════════════════════════════════════════
    
    // Count records received in last 24h
    const { count: received24h } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .gte('webhook_received_at', yesterday.toISOString());

    // Count failed inserts (records with no webhook_received_at but created recently)
    const { count: failed24h } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday.toISOString())
      .is('webhook_received_at', null);

    const path1Status = failed24h && failed24h > 10 ? 'error' : 'ok';
    
    if (failed24h && failed24h > 10) {
      alerts.push(`PATH 1: ${failed24h} failed webhook inserts in last 24h`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PATH 2: Supabase → Google Sheets (Auto-Sync)
    // ═══════════════════════════════════════════════════════════════════════
    
    // Count unsynced records
    const { count: unsyncedCount } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('synced_to_sheets', false)
      .lt('sheets_sync_attempts', 3);

    // Find oldest unsynced record
    const { data: oldestUnsynced } = await supabase
      .from('patients')
      .select('created_at')
      .eq('synced_to_sheets', false)
      .lt('sheets_sync_attempts', 3)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    const oldestUnsyncedHours = oldestUnsynced
      ? Math.floor((now.getTime() - new Date(oldestUnsynced.created_at).getTime()) / (1000 * 60 * 60))
      : null;

    // Count stuck records (3+ failed attempts)
    const { count: stuckRecords } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .gte('sheets_sync_attempts', 3);

    let path2Status: 'ok' | 'warning' | 'error' = 'ok';
    
    if (stuckRecords && stuckRecords > 5) {
      path2Status = 'error';
      alerts.push(`PATH 2: ${stuckRecords} stuck records (3+ failed sync attempts)`);
    } else if (unsyncedCount && unsyncedCount > 10) {
      path2Status = 'error';
      alerts.push(`PATH 2: ${unsyncedCount} unsynced records`);
    } else if (oldestUnsyncedHours && oldestUnsyncedHours > 2) {
      path2Status = 'warning';
      alerts.push(`PATH 2: Oldest unsynced record is ${oldestUnsyncedHours}h old`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PATH 3: Dashboard → Supabase + Sheets (Manual Updates)
    // ═══════════════════════════════════════════════════════════════════════
    
    // Count records updated in last 24h (excluding webhook inserts)
    const { count: updates24h } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', yesterday.toISOString())
      .neq('created_at', 'updated_at'); // Exclude new inserts

    const path3Status = 'ok'; // PATH 3 is always ok (manual updates)

    // ═══════════════════════════════════════════════════════════════════════
    // Overall Health Status
    // ═══════════════════════════════════════════════════════════════════════
    
    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (path1Status === 'error' || path2Status === 'error') {
      overallStatus = 'critical';
    } else if (path2Status === 'warning') {
      overallStatus = 'degraded';
    }

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: now.toISOString(),
      paths: {
        path1_kobo_inbound: {
          status: path1Status,
          last24h: {
            received: received24h || 0,
            failed: failed24h || 0
          }
        },
        path2_auto_sync: {
          status: path2Status,
          unsynced_count: unsyncedCount || 0,
          oldest_unsynced_hours: oldestUnsyncedHours,
          stuck_records: stuckRecords || 0
        },
        path3_manual_update: {
          status: path3Status,
          last24h_updates: updates24h || 0
        }
      },
      alerts
    };

    return NextResponse.json(healthStatus);

  } catch (error: any) {
    console.error('[health-check] Error:', error);
    
    return NextResponse.json({
      status: 'critical',
      timestamp: new Date().toISOString(),
      error: error.message,
      alerts: ['Health check failed - unable to query database']
    }, { status: 500 });
  }
}
