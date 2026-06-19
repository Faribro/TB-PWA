export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { Redis } from '@upstash/redis';
import { REDIS_KEYS } from '../../../lib/redis-keys';
import { parseExcelBuffer } from '../../../lib/ingestion/parsers/excel';
import { parsePdfBuffer } from '../../../lib/ingestion/parsers/pdf';
import { parseImageBuffer } from '../../../lib/ingestion/parsers/image';
import { matchAndReconcileRow } from '../../../lib/ingestion/matching/probabilistic';
import { normalizeDate } from '../../../lib/ingestion/matching/normalize-date';
import { QuarantineRecord } from '../../../types/ingestion';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  let fileHash = '';

  try {
    const payload = await req.json();
    fileHash = payload.fileHash;
    const fileName = payload.fileName || '';
    const fileType = payload.fileType || '';
    const fileSize = payload.fileSize || 0;
    const screeningDate = payload.screeningDate;
    const facilityName = payload.facilityName;
    const screeningDistrict = payload.screeningDistrict;
    const screeningState = payload.screeningState;

    // Step 1: Retrieve file buffer from Redis
    const fileStorageKey = `${REDIS_KEYS.UPLOAD_FILE_PREFIX}${fileHash}`;
    const base64Data = await redis.get<string>(fileStorageKey);

    if (!base64Data) {
      throw new Error(`File not found in storage: ${fileHash}. It may have expired.`);
    }

    const buffer = Buffer.from(base64Data, 'base64');

    // Verify buffer integrity
    if (fileSize > 0 && buffer.length !== fileSize) {
      console.warn(`[Worker] File size mismatch: expected ${fileSize}, got ${buffer.length}`);
    }

    let extractedRows: any[] = [];

    // Step 2: Route to appropriate parser lane
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || fileType.includes('spreadsheet') || fileType.includes('excel')) {
      console.log(`[Worker] Route: Excel parser lane for ${fileName}`);
      extractedRows = await parseExcelBuffer(buffer);
    } else if (lowerName.endsWith('.pdf') || fileType === 'application/pdf') {
      console.log(`[Worker] Route: PDF parser lane for ${fileName}`);
      extractedRows = await parsePdfBuffer(buffer);
    } else if (
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.webp') ||
      fileType.startsWith('image/')
    ) {
      console.log(`[Worker] Route: Image Vision parser lane for ${fileName}`);
      extractedRows = await parseImageBuffer(buffer);
    } else {
      throw new Error(`Unsupported file type extension: ${fileName}`);
    }

    console.log(`[Worker] Extracted ${extractedRows.length} patient rows successfully.`);

    // Step 3: Fetch current sheet rows (utilize Redis cache for 5 minutes)
    const sheetsWebhookUrl = process.env.GOOGLE_SCRIPT_WEBHOOK_URL || process.env.GOOGLE_APPSCRIPT_URL;
    let existingPatients: any[] = [];

    if (sheetsWebhookUrl) {
      const cached = await redis.get<any[]>(REDIS_KEYS.SHEETS_CACHE);
      if (cached && Array.isArray(cached)) {
        existingPatients = cached;
        console.log(`[Worker] Sheets cache HIT. Loaded ${existingPatients.length} existing patient records.`);
      } else {
        console.log(`[Worker] Sheets cache MISS. Loading from Google Sheets Apps Script...`);
        const fetchRes = await fetch(sheetsWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'fetch' }),
        });

        if (fetchRes.ok) {
          const resJson = await fetchRes.json();
          // Extract data array (handle row arrays or object arrays)
          const rawData = Array.isArray(resJson) ? resJson : (resJson.data || []);
          
          // Map to standard form if they are raw arrays (GAS setValues outputs)
          existingPatients = rawData.map((row: any, idx: number) => {
            if (Array.isArray(row)) {
              // Assume standard 35-column order. Map key columns
              return {
                id: row[0] || `row-${idx + 1}`,
                inmate_name: row[3] || '',
                screening_date: row[2] || '',
                facility_name: row[9] || '',
                status: row[10] || '',
                screening_state: row[7] || '',
                screening_district: row[8] || '',
              };
            }
            return row;
          });

          await redis.set(REDIS_KEYS.SHEETS_CACHE, existingPatients, { ex: REDIS_KEYS.SHEETS_CACHE_EXPIRE });
          console.log(`[Worker] Fetched and cached ${existingPatients.length} records in Redis.`);
        } else {
          console.warn(`[Worker] Failed to load Sheet data from AppScript: HTTP ${fetchRes.status}`);
        }
      }
    }

    // Step 4: Run Iterative Probabilistic Record Linkage Matcher
    const stagedRecords: Record<string, string> = {};

    for (const extracted of extractedRows) {
      // Overwrite extracted dates/facilities with scope parameters if missing
      if (!extracted.screening_date && screeningDate) {
        extracted.screening_date = screeningDate;
      }
      if ((!extracted.facility_name || extracted.facility_name === 'Unknown Facility') && facilityName && facilityName !== 'All') {
        extracted.facility_name = facilityName;
      }

      const matchInfo = matchAndReconcileRow(
        extracted, 
        existingPatients, 
        screeningState, 
        screeningDistrict
      );

      const recordId = crypto.randomUUID();
      const quarantineRecord: QuarantineRecord = {
        id: recordId,
        patient_name: extracted.patient_name || 'Unknown Name',
        screening_date: normalizeDate(extracted.screening_date || screeningDate),
        facility_name: extracted.facility_name || facilityName || 'All',
        status: extracted.status || 'Screened',
        confidence_score: matchInfo.confidence_score,
        quarantine_status: matchInfo.status,
        conflict_reason: matchInfo.conflict_reason,
        candidate_match: matchInfo.candidate_match,
        extracted_details: {
          ...extracted.raw_details,
          xray_result: extracted.status,
          screening_state: screeningState !== 'All' ? screeningState : undefined,
          screening_district: screeningDistrict !== 'All' ? screeningDistrict : undefined,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      stagedRecords[recordId] = JSON.stringify(quarantineRecord);
    }

    // Step 5: Write all staged records atomically into the Redis Hash
    if (Object.keys(stagedRecords).length > 0) {
      await redis.hset(REDIS_KEYS.QUARANTINE_HASH, stagedRecords);
      console.log(`[Worker] Quarantine Hash updated successfully with ${Object.keys(stagedRecords).length} records.`);
    }

    // Clean up file from Redis storage
    await redis.del(fileStorageKey);
    await redis.del(`${REDIS_KEYS.UPLOAD_LOCK_PREFIX}${fileHash}`);
    console.log(`[Worker] Cleaned up Redis storage for ${fileHash}.`);

    return NextResponse.json({ success: true, processedCount: Object.keys(stagedRecords).length });
  } catch (error: any) {
    console.error('[Worker API] Process error:', error);
    
    // Release upload lock to allow retry
    if (fileHash) {
      try {
        await redis.del(`${REDIS_KEYS.UPLOAD_FILE_PREFIX}${fileHash}`);
        await redis.del(`${REDIS_KEYS.UPLOAD_LOCK_PREFIX}${fileHash}`);
      } catch {}
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}