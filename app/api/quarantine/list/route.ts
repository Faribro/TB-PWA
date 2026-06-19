export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { REDIS_KEYS } from '../../../../lib/redis-keys';
import { QuarantineRecord } from '../../../../types/ingestion';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET() {
  try {
    const rawRecords = await redis.hgetall(REDIS_KEYS.QUARANTINE_HASH);
    if (!rawRecords) {
      return NextResponse.json({ records: [] });
    }

    const records: QuarantineRecord[] = Object.values(rawRecords).map((val: any) => {
      return typeof val === 'string' ? JSON.parse(val) : val;
    });

    // Sort by creation timestamp (newest staged records first)
    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ records });
  } catch (error: any) {
    console.error('[Quarantine List API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
