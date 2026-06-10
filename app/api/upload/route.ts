import { NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
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

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Step 1: Calculate MD5 binary file hash to prevent dual-upload triggers
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

    // Step 3: Write file buffer to workspace temp directory
    const tempDir = path.join(process.cwd(), 'tmp', 'uploads');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const safeFileName = `${md5Hash}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const tempFilePath = path.join(tempDir, safeFileName);
    fs.writeFileSync(tempFilePath, buffer);

    // Step 4: Dispatch execution to background worker asynchronously
    const workerUrl = `${new URL(req.url).origin}/api/agent-worker`;
    const payload = {
      filePath: tempFilePath,
      fileHash: md5Hash,
      fileName: file.name,
      fileType: file.type,
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
