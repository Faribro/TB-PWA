import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// 🔧 FIX #2: Enhanced job record with lastAccessed tracking
interface JobRecord {
  operationName: string;
  createdAt: number;
  lastAccessed: number;
}

// In-memory store for video generation operations
export const operationStore = new Map<string, JobRecord>();

interface StartRequest {
  prompt: string;
}

// 🔧 FIX #2: Cleanup function to remove stale jobs
function cleanupStaleJobs() {
  const now = Date.now();
  const STALE_THRESHOLD = 10 * 60 * 1000; // 10 minutes
  const NOT_ACCESSED_THRESHOLD = 2 * 60 * 1000; // 2 minutes

  for (const [jobId, job] of operationStore.entries()) {
    const age = now - job.createdAt;
    const timeSinceLastAccess = now - job.lastAccessed;

    // Remove if older than 10 minutes OR not accessed in 2 minutes
    if (age > STALE_THRESHOLD || timeSinceLastAccess > NOT_ACCESSED_THRESHOLD) {
      console.log(`🧹 Cleaning up stale job: ${jobId} (age: ${Math.round(age / 1000)}s, last access: ${Math.round(timeSinceLastAccess / 1000)}s ago)`);
      operationStore.delete(jobId);
    }
  }
}

// 🔧 FIX #2: Run cleanup every 2 minutes (only once globally)
if (typeof global !== 'undefined' && !(global as any).__videoGenCleanupInterval) {
  (global as any).__videoGenCleanupInterval = setInterval(cleanupStaleJobs, 120000);
}

export async function POST(request: NextRequest) {
  try {
    const body: StartRequest = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid prompt' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Call Gemini Veo 2 API via raw fetch (SDK doesn't expose generateVideos yet)
    const veoResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:predictLongRunning`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY!,
        },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { aspectRatio: '16:9', sampleCount: 1 },
        }),
      }
    );

    if (!veoResponse.ok) {
      const err = await veoResponse.json();
      throw new Error(err?.error?.message || `Veo API error: ${veoResponse.status}`);
    }

    const veoData = await veoResponse.json();
    const operationName = veoData?.name;

    if (!operationName) {
      return NextResponse.json(
        { error: 'Failed to start video generation' },
        { status: 500 }
      );
    }

    // Generate unique job ID and store operation
    const jobId = randomUUID();
    const now = Date.now();
    
    // 🔧 FIX #2: Store job with lastAccessed timestamp
    operationStore.set(jobId, {
      operationName,
      createdAt: now,
      lastAccessed: now,
    });

    // 🔧 FIX #2: Run cleanup on every request
    cleanupStaleJobs();

    console.log(`✅ Started video generation job: ${jobId}`);

    return NextResponse.json({ jobId }, { status: 200 });
  } catch (error) {
    console.error('Video generation start error:', error);
    
    // 🔧 FIX #2: Better error messages for rate limiting
    if (error instanceof Error && error.message?.includes('429')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a few minutes.' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
