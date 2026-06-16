/**
 * lib/openrouter/KeyPool.ts
 *
 * Serverless-safe, round-robin OpenRouter key pool.
 * - Supports up to 10 keys
 * - 429 → 60-second cooldown on that key
 * - Kept in-process for speed without DB dependency.
 */

const TOTAL_KEYS = 10;
const RPM_LIMIT = 180; // Conservative limit for OpenRouter under typical 200 RPM limits
const COOLDOWN_MS = 60_000;

function getKey(index: number): string {
  const envName = `OPENROUTER_API_KEY_${index + 1}`;
  return process.env[envName] ?? '';
}

export interface AcquiredOpenRouterKey {
  apiKey: string;
  keyIndex: number;
  /** Call this after the request completes */
  release: (wasRateLimited: boolean, costUsd?: number) => Promise<void>;
}

class OpenRouterKeyPool {
  private static instance: OpenRouterKeyPool;
  private cooldownUntil: (number | null)[] = Array(TOTAL_KEYS).fill(null);
  private requestsThisMinute: number[] = Array(TOTAL_KEYS).fill(0);
  private minuteWindowStart: number[] = Array(TOTAL_KEYS).fill(Date.now());
  private cursor = 0;

  static getInstance(): OpenRouterKeyPool {
    if (!OpenRouterKeyPool.instance) OpenRouterKeyPool.instance = new OpenRouterKeyPool();
    return OpenRouterKeyPool.instance;
  }

  async acquire(): Promise<AcquiredOpenRouterKey> {
    const now = Date.now();

    // Refresh in-process minute windows
    for (let i = 0; i < TOTAL_KEYS; i++) {
      if (now - this.minuteWindowStart[i] >= 60_000) {
        this.requestsThisMinute[i] = 0;
        this.minuteWindowStart[i] = now;
      }
    }

    // Find next available key starting from cursor
    for (let attempt = 0; attempt < TOTAL_KEYS; attempt++) {
      const idx = (this.cursor + attempt) % TOTAL_KEYS;
      const cooldown = this.cooldownUntil[idx];
      const rpm = this.requestsThisMinute[idx];

      if (cooldown && now < cooldown) continue;   // still cooling down
      if (rpm >= RPM_LIMIT) continue;              // minute quota hit

      const apiKey = getKey(idx);
      if (!apiKey) continue;                       // key not configured

      // Advance cursor
      this.cursor = (idx + 1) % TOTAL_KEYS;
      this.requestsThisMinute[idx]++;

      return {
        apiKey,
        keyIndex: idx,
        release: async (wasRateLimited: boolean, costUsd?: number) => {
          if (wasRateLimited) {
            this.cooldownUntil[idx] = Date.now() + COOLDOWN_MS;
            console.warn(`[OpenRouterKeyPool] Key ${idx + 1} rate limited. Cooling down for 60s.`);
          }
          if (costUsd) {
            // Future compatibility: Tracking costs could plug in here.
          }
        },
      };
    }

    throw new Error('[OpenRouterKeyPool] All keys are rate-limited or exhausted.');
  }
}

export const keyPool = OpenRouterKeyPool.getInstance();
