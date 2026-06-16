/**
 * lib/openrouter.ts
 * 
 * OpenRouter API client with round-robin key rotation
 * Automatically retries on 429 rate limits with next key
 * 
 * OPTIMIZED VERSION with:
 * - Per-key failure tracking
 * - Request timeout (30s)
 * - Typed interfaces
 * - Diagnostic utilities
 */

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: { url: string };
  }>;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  response_format?: { type: 'json_object' };
  max_tokens?: number;
  temperature?: number;
}

export const OPENROUTER_KEYS = [
  process.env.OPENROUTER_API_KEY_1,
  process.env.OPENROUTER_API_KEY_2,
  process.env.OPENROUTER_API_KEY_3,
  process.env.OPENROUTER_API_KEY_4,
  process.env.OPENROUTER_API_KEY_5,
  process.env.OPENROUTER_API_KEY_6,
  process.env.OPENROUTER_API_KEY_7,
  process.env.OPENROUTER_API_KEY_8,
  process.env.OPENROUTER_API_KEY_9,
  process.env.OPENROUTER_API_KEY_10,
].filter(Boolean) as string[];

// Round-robin index — persists across requests in the same server process
let currentKeyIndex = 0;

// Per-key failure tracking
const keyFailureCounts = new Map<number, number>();

function getNextKey(): { key: string; index: number } {
  const index = currentKeyIndex % OPENROUTER_KEYS.length;
  const key = OPENROUTER_KEYS[index];
  currentKeyIndex++;
  return { key, index };
}

/**
 * Call OpenRouter with automatic key rotation on 429
 * Tries each key once before giving up
 */
export async function callOpenRouter(payload: OpenRouterRequest): Promise<string> {
  const totalKeys = OPENROUTER_KEYS.length;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < totalKeys; attempt++) {
    const { key, index } = getNextKey();
    
    // Create abort controller for 30s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://samadhaan.app',
          'X-Title': 'SAMADHAAN TB Screening',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.status === 429) {
        // Rate limited — track failure and try next key
        keyFailureCounts.set(index, (keyFailureCounts.get(index) || 0) + 1);
        lastError = new Error(`Key ${index + 1} rate limited (429)`);
        console.warn(`[OpenRouter] Key ${index + 1} rate limited, rotating...`);
        continue;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(`OpenRouter error ${res.status}: ${body?.error?.message ?? 'Unknown'}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('OpenRouter returned empty content');
      
      return content;

    } catch (err) {
      clearTimeout(timeoutId);
      
      if ((err as Error).name === 'AbortError') {
        lastError = new Error(`Key ${index + 1} timeout (30s)`);
        console.warn(`[OpenRouter] Key ${index + 1} timeout, rotating...`);
        continue;
      }
      
      if ((err as Error).message?.includes('rate limited')) {
        lastError = err as Error;
        continue; // Try next key
      }
      
      throw err; // Non-429 errors are re-thrown immediately
    }
  }

  throw lastError ?? new Error('All OpenRouter keys exhausted');
}

/**
 * Get diagnostic info about key pool health
 */
export function getKeyPoolStatus() {
  return {
    totalKeys: OPENROUTER_KEYS.length,
    currentIndex: currentKeyIndex % OPENROUTER_KEYS.length,
    keyPreviews: OPENROUTER_KEYS.map((k, i) => ({
      index: i,
      preview: `${k.slice(0, 12)}...${k.slice(-4)}`,
      failures: keyFailureCounts.get(i) || 0,
    })),
    totalFailures: Array.from(keyFailureCounts.values()).reduce((a, b) => a + b, 0),
  };
}

/**
 * Reset failure tracking (call on cron to clear stale counts)
 */
export function resetKeyHealthTracking() {
  keyFailureCounts.clear();
  console.log('[OpenRouter] Key health tracking reset');
}
