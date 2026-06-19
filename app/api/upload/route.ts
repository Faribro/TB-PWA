export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { Redis } from '@upstash/redis';
import { REDIS_KEYS } from '../../../lib/redis-keys';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const screeningDate = formData.get('screeningDate') as string;
    const facilityName = formData.get('facilityName') as string || 'All';
    const screeningDistrict = formData.get('screeningDistrict') as string || 'All';
    const screeningState = formData.get('screeningState') as string || 'All';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Step 1: Get file buffer and calculate MD5 hash
    const buffer = Buffer.from(await file.arrayBuffer());
    const md5Hash = crypto.createHash('md5').update(buffer).digest('hex');
    const lockKey = `${REDIS_KEYS.UPLOAD_LOCK_PREFIX}${md5Hash}`;

    // Step 2: Atomic check-and-set lock in Redis (600s TTL)
    const acquiredLock = await redis.set(lockKey, 'processing', { nx: true, ex: 600 });
    if (!acquiredLock) {
      return NextResponse.json(
        { error: 'This file is already being processed. Please wait.' },
        { status: 409 }
      );
    }

    // Step 3: Store file buffer in Redis for worker pickup (max 10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      await redis.del(lockKey);
      return NextResponse.json({ error: 'File too large. Maximum 10MB.' }, { status: 400 });
    }

    const fileStorageKey = `${REDIS_KEYS.UPLOAD_FILE_PREFIX}${md5Hash}`;
    await redis.set(fileStorageKey, buffer.toString('base64'), { ex: 3600 }); // 1 hour TTL

    // Step 4: Dispatch execution to background worker with file hash reference
    const workerUrl = `${new URL(req.url).origin}/api/agent-worker`;
    const payload = {
      fileHash: md5Hash,
      fileName: file.name,
      fileType: file.type,
      fileSize: buffer.length,
      screeningDate,
      facilityName,
      screeningDistrict,
      screeningState,
    };

    // Fire-and-forget background invoke
    fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(err => {
      console.error('[Upload API] Background worker fetch trigger failed:', err);
    });

    return NextResponse.json(
      {
        success: true,
        message: 'File upload accepted. Processing in background.',
        fileHash: md5Hash,
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('[Upload API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}