'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

type GenerationStatus = 'idle' | 'starting' | 'generating' | 'complete' | 'error';

interface UseImageGenerationReturn {
  generate: (prompt: string, style: string) => void;
  imageUrl: string | null;
  progress: number;
  status: GenerationStatus;
  error: string | null;
  reset: () => void;
}

export function useImageGeneration(): UseImageGenerationReturn {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
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

    setImageUrl(null);
    setProgress(0);
    setError(null);
    setStatus('starting');

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const data = await response.json();
      setImageUrl(data.imageUrl);
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
    setImageUrl(null);
    setProgress(0);
    setStatus('idle');
    setError(null);
  }, []);

  return {
    generate,
    imageUrl,
    progress,
    status,
    error,
    reset,
  };
}
