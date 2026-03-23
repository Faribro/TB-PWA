import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { operationStore } from '../../start/route';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface SSEEvent {
  type: 'progress' | 'complete' | 'error';
  percent?: number;
  videoUrl?: string;
  message?: string;
}

function sendSSEEvent(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;

  // Validate job exists
  const operation = operationStore.get(jobId);
  if (!operation) {
    return NextResponse.json(
      { error: 'Job not found or expired' },
      { status: 404 }
    );
  }

  // 🔧 FIX #2: Update lastAccessed timestamp
  operation.lastAccessed = Date.now();

  // Create SSE stream
  const encoder = new TextEncoder();
  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let pollCount = 0;
        // 🔧 FIX #2: Max 30 polls (5 minutes at 10s intervals) to match Vercel maxDuration
        const maxPolls = 30;
        let currentProgress = 5;

        const pollOperation = async () => {
          if (isClosed) {
            controller.close();
            return;
          }

          try {
            pollCount++;

            // 🔧 FIX #2: Update lastAccessed on each poll
            operation.lastAccessed = Date.now();

            // Fetch operation status using the operation name
            const operationResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/operations/${operation.operationName}`,
              {
                headers: {
                  'x-goog-api-key': process.env.GEMINI_API_KEY || '',
                },
              }
            );

            if (!operationResponse.ok) {
              throw new Error(`Failed to fetch operation status: ${operationResponse.statusText}`);
            }

            const operationData = await operationResponse.json() as any;

            // Send progress update
            currentProgress = Math.min(5 + pollCount * 3, 94);
            const progressEvent = sendSSEEvent({
              type: 'progress',
              percent: currentProgress,
            });
            controller.enqueue(encoder.encode(progressEvent));

            // Check if operation is complete
            if (operationData.done) {
              // Extract video URI from response
              const videoUri = operationData.response?.video?.uri;

              if (!videoUri) {
                throw new Error('No video URI in response');
              }

              // Append API key to video URI for download
              const videoUrlWithKey = `${videoUri}?key=${process.env.GEMINI_API_KEY}`;

              // Send complete event
              const completeEvent = sendSSEEvent({
                type: 'complete',
                videoUrl: videoUrlWithKey,
              });
              controller.enqueue(encoder.encode(completeEvent));

              // 🔧 FIX #2: Clean up operation store after completion
              operationStore.delete(jobId);
              isClosed = true;
              controller.close();
              console.log(`✅ Video generation completed: ${jobId}`);
              return;
            }

            // Continue polling if not complete
            // 🔧 FIX #2: Enforce max poll count to prevent infinite loops
            if (pollCount < maxPolls) {
              setTimeout(pollOperation, 10000); // Poll every 10 seconds
            } else {
              // 🔧 FIX #2: Timeout after 5 minutes (30 polls * 10 seconds)
              console.warn(`⏱️ Video generation timeout after ${pollCount * 10}s: ${jobId}`);
              const errorEvent = sendSSEEvent({
                type: 'error',
                message: 'Video generation timed out after 5 minutes',
              });
              controller.enqueue(encoder.encode(errorEvent));
              operationStore.delete(jobId);
              isClosed = true;
              controller.close();
            }
          } catch (error) {
            console.error('Polling error:', error);
            const errorEvent = sendSSEEvent({
              type: 'error',
              message: error instanceof Error ? error.message : 'Unknown error',
            });
            controller.enqueue(encoder.encode(errorEvent));
            operationStore.delete(jobId);
            isClosed = true;
            controller.close();
          }
        };

        // Start polling
        pollOperation();
      } catch (error) {
        console.error('Stream setup error:', error);
        const errorEvent = sendSSEEvent({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        controller.enqueue(encoder.encode(errorEvent));
        isClosed = true;
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
