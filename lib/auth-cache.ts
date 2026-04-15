// In-memory cache for profile lookups (survives across requests in same instance)
const profileCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedProfile(email: string) {
  const cached = profileCache.get(email);
  if (!cached) return null;
  
  const isExpired = Date.now() - cached.timestamp > CACHE_TTL;
  if (isExpired) {
    profileCache.delete(email);
    return null;
  }
  
  return cached.data;
}

export function setCachedProfile(email: string, data: any) {
  profileCache.set(email, { data, timestamp: Date.now() });
  
  // Auto-cleanup: keep cache under 1000 entries
  if (profileCache.size > 1000) {
    const firstKey = profileCache.keys().next().value;
    profileCache.delete(firstKey);
  }
}

export function clearProfileCache(email?: string) {
  if (email) {
    profileCache.delete(email);
  } else {
    profileCache.clear();
  }
}
