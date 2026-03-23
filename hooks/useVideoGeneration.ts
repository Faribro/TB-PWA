'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

type GenerationStatus = 'idle' | 'starting' | 'generating' | 'complete' | 'error';

interface UseVideoGenerationReturn {
  generate: (prompt: string) => void;
  videoUrl: string | null;
  progress: number;
  status: GenerationStatus;
  error: string | null;
  reset: () => void;
}

export function useVideoGeneration(): UseVideoGenerationReturn {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup EventSource and timeout on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const generate = useCallback(async (prompt: string) => {
    // 🔧 FIX #1: Close existing EventSource before creating new one
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Reset state
    setVideoUrl(null);
    setProgress(0);
    setError(null);
    setStatus('starting');

    try {
      // Step 1: Start video generation
      const startResponse = await fetch('/api/generate-video/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json();
        throw new Error(errorData.error || 'Failed to start video generation');
      }

      const { jobId } = await startResponse.json();

      // Step 2: Open SSE stream for status updates
      setStatus('generating');

      const eventSource = new EventSource(`/api/generate-video/status/${jobId}`);
      eventSourceRef.current = eventSource;

      // 🔧 FIX #1: Add client-side timeout (5 min to match Vercel maxDuration)
      timeoutRef.current = setTimeout(() => {
        if (eventSource.readyState !== EventSource.CLOSED) {
          eventSource.close();
          eventSourceRef.current = null;
          setError('Video generation timed out after 5 minutes');
          setStatus('error');
        }
      }, 300000); // 5 minutes

      eventSource.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'progress':
              setProgress(data.percent || 0);
              break;

            case 'complete':
              // 🔧 FIX #1: Clear timeout on success
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
              setVideoUrl(data.videoUrl);
              setProgress(100);
              setStatus('complete');
              eventSource.close();
              eventSourceRef.current = null;
              break;

            case 'error':
              // 🔧 FIX #1: Clear timeout on error
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
              setError(data.message || 'Unknown error');
              setStatus('error');
              eventSource.close();
              eventSourceRef.current = null;
              break;
          }
        } catch (parseError) {
          console.error('Failed to parse SSE event:', parseError);
        }
      });

      eventSource.addEventListener('error', () => {
        // 🔧 FIX #1: Clear timeout on connection error
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setError('Connection lost');
        setStatus('error');
        eventSource.close();
        eventSourceRef.current = null;
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setVideoUrl(null);
    setProgress(0);
    setStatus('idle');
    setError(null);
  }, []);

  return {
    generate,
    videoUrl,
    progress,
    status,
    error,
    reset,
  };
}
