const profileCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 1000;

export function getCachedProfile(email: string): unknown | null {
  const cached = profileCache.get(email);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > CACHE_TTL) {
    profileCache.delete(email);
    return null;
  }

  // Refresh position (LRU: delete + re-insert moves to end)
  profileCache.delete(email);
  profileCache.set(email, cached);
  return cached.data;
}

export function setCachedProfile(email: string, data: unknown): void {
  // Evict oldest entry when at capacity
  if (profileCache.size >= MAX_CACHE_SIZE && !profileCache.has(email)) {
    const oldestKey = profileCache.keys().next().value;
    if (oldestKey) profileCache.delete(oldestKey);
  }
  profileCache.set(email, { data, timestamp: Date.now() });
}

export function clearProfileCache(email?: string): void {
  if (email) {
    profileCache.delete(email);
  } else {
    profileCache.clear();
  }
}
