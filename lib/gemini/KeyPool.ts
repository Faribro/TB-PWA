/**
 * lib/gemini/KeyPool.ts
 *
 * Serverless-safe, round-robin Gemini key pool.
 * - 11 keys, 60 RPM limit per key
 * - 429 → 60-second cooldown on that key
 * - Persists counters to `gemini_key_usage` in Supabase so cold starts
 *   don't reset the minute-window counts
 */

import { createClient } from '@supabase/supabase-js';

const TOTAL_KEYS = 11;
const RPM_LIMIT = 55; // conservative buffer under the 60 RPM hard limit
const COOLDOWN_MS = 60_000;

// Service-role client — server-only, never imported by client bundles
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getKey(index: number): string {
  const suffix = index === 0 ? '' : `_${index + 1}`;
  // Keys are named KEY_1 … KEY_11 in .env; index 0 → KEY_1
  const envName = `GOOGLE_GENERATIVE_AI_API_KEY${index === 0 ? '' : `_${index + 1}`}`;
  return process.env[envName] ?? '';
}

export interface AcquiredKey {
  apiKey: string;
  keyIndex: number;
  /** Call this after the request completes */
  release: (wasRateLimited: boolean) => Promise<void>;
}

class KeyPool {
  private static instance: KeyPool;
  // In-process cache to avoid a DB round-trip on every request
  private cooldownUntil: (number | null)[] = Array(TOTAL_KEYS).fill(null);
  private requestsThisMinute: number[] = Array(TOTAL_KEYS).fill(0);
  private minuteWindowStart: number[] = Array(TOTAL_KEYS).fill(Date.now());
  private cursor = 0;

  static getInstance(): KeyPool {
    if (!KeyPool.instance) KeyPool.instance = new KeyPool();
    return KeyPool.instance;
  }

  /**
   * Returns the next available key in round-robin order.
   * Skips keys that are on cooldown or have hit RPM_LIMIT.
   * Throws if all keys are exhausted.
   */
  async acquire(): Promise<AcquiredKey> {
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

      // Advance cursor past this key for next caller
      this.cursor = (idx + 1) % TOTAL_KEYS;
      this.requestsThisMinute[idx]++;

      // Persist increment asynchronously (fire-and-forget, non-blocking)
      this.persistIncrement(idx).catch(() => {});

      return {
        apiKey,
        keyIndex: idx,
        release: (wasRateLimited: boolean) => this.release(idx, wasRateLimited),
      };
    }

    throw new Error('[KeyPool] All 11 Gemini keys are rate-limited or on cooldown.');
  }

  private async release(idx: number, wasRateLimited: boolean): Promise<void> {
    if (!wasRateLimited) return;

    const cooldownUntil = Date.now() + COOLDOWN_MS;
    this.cooldownUntil[idx] = cooldownUntil;

    // Persist cooldown to Supabase so other serverless instances see it
    try {
      const sb = getServiceClient();
      await sb
        .from('gemini_key_usage')
        .update({ cooldown_until: new Date(cooldownUntil).toISOString() })
        .eq('key_index', idx);
    } catch (err) {
      console.warn('[KeyPool] Failed to persist cooldown:', err);
    }
  }

  private async persistIncrement(idx: number): Promise<void> {
    try {
      const sb = getServiceClient();
      await sb.rpc('increment_gemini_key_usage', { p_key_index: idx });
    } catch {
      // Non-critical — in-process counter is the source of truth within a warm instance
    }
  }

  /**
   * Hydrate in-process state from Supabase on first warm-up.
   * Call once at the top of any route that uses the pool.
   */
  async hydrate(): Promise<void> {
    try {
      const sb = getServiceClient();
      const { data } = await sb
        .from('gemini_key_usage')
        .select('key_index, requests_this_minute, cooldown_until, last_reset_minute');

      if (!data) return;
      const now = Date.now();

      for (const row of data) {
        const i: number = row.key_index;
        const windowStart = new Date(row.last_reset_minute).getTime();
        const windowAge = now - windowStart;

        // Only restore if the DB window is still within the current minute
        if (windowAge < 60_000) {
          this.requestsThisMinute[i] = row.requests_this_minute ?? 0;
          this.minuteWindowStart[i] = windowStart;
        }

        if (row.cooldown_until) {
          const cooldownTs = new Date(row.cooldown_until).getTime();
          if (cooldownTs > now) this.cooldownUntil[i] = cooldownTs;
        }
      }
    } catch (err) {
      console.warn('[KeyPool] Hydration failed (non-fatal):', err);
    }
  }

  /** Diagnostic snapshot — used by /api/ai/health */
  status() {
    const now = Date.now();
    return Array.from({ length: TOTAL_KEYS }, (_, i) => ({
      keyIndex: i,
      configured: !!getKey(i),
      rpm: this.requestsThisMinute[i],
      cooldownRemainingMs: this.cooldownUntil[i]
        ? Math.max(0, this.cooldownUntil[i]! - now)
        : 0,
      available:
        !!getKey(i) &&
        this.requestsThisMinute[i] < RPM_LIMIT &&
        (!this.cooldownUntil[i] || now >= this.cooldownUntil[i]!),
    }));
  }
}

export const keyPool = KeyPool.getInstance();
