export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { REDIS_KEYS } from '../../../../lib/redis-keys';
import { QuarantineRecord } from '../../../../types/ingestion';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { resolutions } = (await req.json()) as { resolutions: any[] };
    if (!resolutions || !Array.isArray(resolutions) || resolutions.length === 0) {
      return NextResponse.json({ error: 'No resolutions array provided' }, { status: 400 });
    }

    const sheetsWebhookUrl = process.env.GOOGLE_SCRIPT_WEBHOOK_URL || process.env.GOOGLE_APPSCRIPT_URL;
    if (!sheetsWebhookUrl) {
      return NextResponse.json({ error: 'Google Sheets Apps Script URL not configured in environment' }, { status: 500 });
    }

    // Load records currently staged in quarantine
    const rawRecords = await redis.hgetall(REDIS_KEYS.QUARANTINE_HASH);
    if (!rawRecords) {
      return NextResponse.json({ error: 'No staged quarantine records found in database' }, { status: 404 });
    }

    const recordsToSync: any[] = [];
    const deleteKeys: string[] = [];
    const updateRecordsMap: Record<string, string> = {};

    for (const res of resolutions) {
      const rawRec = rawRecords[res.id];
      if (!rawRec) continue;
      
      const record: QuarantineRecord = typeof rawRec === 'string' ? JSON.parse(rawRec) : rawRec;

      if (res.action === 'REJECT') {
        deleteKeys.push(res.id);
        continue;
      }

      // Format payload in standard structure mapped to Apps Script's IngestionBatchHandler
      recordsToSync.push({
        id: res.action === 'MERGE_CANDIDATE' ? (res.candidateId || record.candidate_match?.id) : record.id,
        inmate_name: record.patient_name,
        screening_date: record.screening_date,
        facility_name: record.facility_name,
        xray_result: record.status,
        reconciliation_type: res.action === 'MERGE_CANDIDATE' ? 'UPDATE' : 'INSERT',
        target_row_id: res.action === 'MERGE_CANDIDATE' ? (res.candidateId || record.candidate_match?.id) : undefined,
        raw_uuid: record.id, // Stage ID reference to trace sync outcomes
        details: {
          ...record.extracted_details,
          reconciliation_action: res.action,
        }
      });
    }

    // If we only have deletion requests
    if (recordsToSync.length === 0 && deleteKeys.length > 0) {
      await redis.hdel(REDIS_KEYS.QUARANTINE_HASH, ...deleteKeys);
      return NextResponse.json({ success: true, message: 'Rejections purged from staging.' });
    }

    // Execute post request to Google Sheets Web App Script endpoint
    let sheetsSyncSuccess = false;
    let failedCorrelatedIds: string[] = [];

    try {
      const response = await fetch(sheetsWebhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          action: 'batch_reconcile',
          batch: recordsToSync,
          count: recordsToSync.length
        })
      });

      if (response.ok) {
        const responseJson = await response.json().catch(() => ({}));
        // If App Script Webhook indicates partial success, it outputs: { success: true, failedIds: [...] }
        sheetsSyncSuccess = true;
        failedCorrelatedIds = responseJson.failedIds || [];
      } else {
        console.error('[Quarantine Resolve] Sheets script HTTP status error:', response.status);
      }
    } catch (err) {
      console.error('[Quarantine Resolve] Sheets script connection failed:', err);
    }

    // Clean staging state based on sync outcome
    const processedDeleteIds: string[] = [...deleteKeys];

    for (const recordSync of recordsToSync) {
      const rawRec = rawRecords[recordSync.raw_uuid];
      if (!rawRec) continue;

      const record: QuarantineRecord = typeof rawRec === 'string' ? JSON.parse(rawRec) : rawRec;

      if (sheetsSyncSuccess && !failedCorrelatedIds.includes(recordSync.raw_uuid)) {
        // Sync succeeded: remove from staging terminal
        processedDeleteIds.push(recordSync.raw_uuid);
      } else {
        // Sync failed: update record status to FAILED_RETRY to preserve it in review board
        record.quarantine_status = 'FAILED_RETRY';
        record.updatedAt = new Date().toISOString();
        updateRecordsMap[recordSync.raw_uuid] = JSON.stringify(record);
      }
    }

    // Commit staging data adjustments in Redis
    if (processedDeleteIds.length > 0) {
      await redis.hdel(REDIS_KEYS.QUARANTINE_HASH, ...processedDeleteIds);
    }
    if (Object.keys(updateRecordsMap).length > 0) {
      await redis.hset(REDIS_KEYS.QUARANTINE_HASH, updateRecordsMap);
    }

    // Invalidate Sheets cache in Redis to trigger fresh fetch next time
    await redis.del(REDIS_KEYS.SHEETS_CACHE);

    if (sheetsSyncSuccess && failedCorrelatedIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: `Successfully synchronized ${recordsToSync.length} records to Google Sheets.`
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Google Sheets synchronization failed. Quarantine records marked as FAILED_RETRY.',
        failedCount: failedCorrelatedIds.length || recordsToSync.length
      }, { status: 502 });
    }
  } catch (error: any) {
    console.error('[Quarantine Resolve API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
