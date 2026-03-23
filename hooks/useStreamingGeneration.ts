'use client';

import { useState, useCallback, useRef } from 'react';

type StreamStatus = 'idle' | 'streaming' | 'complete' | 'error';

interface UseStreamingGenerationReturn {
  generate: (prompt: string, type: string) => void;
  text: string;
  status: StreamStatus;
  error: string | undefined;
  reset: () => void;
  stop: () => void;
}

export function useStreamingGeneration(): UseStreamingGenerationReturn {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setText('');
    setStatus('idle');
    setError(undefined);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStatus('complete');
  }, []);

  const generate = useCallback(
    async (prompt: string, type: string) => {
      // Issue 3: Prevent double-submit
      if (status === 'streaming') return;

      reset();
      setStatus('streaming');

      abortRef.current = new AbortController();

      try {
        const res = await fetch('/api/generate-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, type }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Generation failed');
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          const lines = chunk.split('\n').filter(Boolean);
          for (const line of lines) {
            // Issue 1: Robust stream parser for all Vercel AI SDK formats
            // Text delta: 0:"token"
            if (line.startsWith('0:')) {
              try {
                const token = JSON.parse(line.slice(2));
                setText((prev) => prev + token);
              } catch {
                // skip malformed chunks
              }
            }
            // Error frame: 3:"error message"
            else if (line.startsWith('3:')) {
              try {
                const errorMsg = JSON.parse(line.slice(2));
                throw new Error(errorMsg);
              } catch (e: any) {
                setError(e.message);
                setStatus('error');
                return;
              }
            }
            // Finish reason: d:{finishReason:"stop"} — stream is truly done
            else if (line.startsWith('d:')) {
              setStatus('complete');
              return;
            }
          }
        }

        setStatus('complete');
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        // Issue 3: Friendly 429 rate limit error message
        const msg = err.message?.includes('429')
          ? 'AI is busy! Too many requests. Please wait 10 seconds and try again. 🔄'
          : err.message || 'Streaming failed';
        setError(msg);
        setStatus('error');
      }
    },
    [status, reset]
  );

  return { generate, text, status, error, reset, stop };
}
