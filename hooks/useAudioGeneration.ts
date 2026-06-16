'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

type GenerationStatus = 'idle' | 'starting' | 'generating' | 'complete' | 'error';

interface UseAudioGenerationReturn {
  generate: (prompt: string, style: string) => void;
  audioUrl: string | null;
  progress: number;
  status: GenerationStatus;
  error: string | null;
  reset: () => void;
}

export function useAudioGeneration(): UseAudioGenerationReturn {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const generate = useCallback(async (prompt: string, style: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setAudioUrl(null);
    setProgress(0);
    setError(null);
    setStatus('starting');

    try {
      const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate audio');
      }

      const data = await response.json();
      setAudioUrl(data.audioUrl);
      setProgress(100);
      setStatus('complete');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setAudioUrl(null);
    setProgress(0);
    setStatus('idle');
    setError(null);
  }, []);

  return {
    generate,
    audioUrl,
    progress,
    status,
    error,
    reset,
  };
}
