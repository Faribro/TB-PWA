# Redis Payload Size Fix

## Issue
When caching large datasets (24,000+ patient records), Upstash Redis was throwing errors due to payload size limits:
- **Free tier**: 1MB max payload
- **Paid tier**: 10MB max payload

## Error Message
```
[Redis] Set error: Error: Request body larger than maxBodyLength limit
```

## Solution
Added payload size checking in `lib/redis.ts` before attempting to cache:

```typescript
export async function setCached<T>(key: string, value: T, ttl: number = 60): Promise<void> {
  try {
    if (!upstashRedis) return;
    
    // Check payload size (Upstash limit: 1MB free, 10MB paid)
    const serialized = JSON.stringify(value);
    const sizeInMB = Buffer.byteLength(serialized, 'utf8') / (1024 * 1024);
    
    if (sizeInMB > 5) {
      console.warn(`[Redis] Payload too large (${sizeInMB.toFixed(2)}MB), skipping cache for key: ${key}`);
      return;
    }
    
    await upstashRedis.set(key, value, { ex: ttl });
  } catch (error) {
    console.error('[Redis] Set error:', error);
  }
}
```

## Behavior
- **Payloads < 5MB**: Cached normally in Redis
- **Payloads > 5MB**: Skipped with warning log, no error thrown
- **Cache miss**: Application continues to work, just without caching benefit

## Impact
- ✅ No more Redis errors for large datasets
- ✅ Graceful degradation (works without cache)
- ✅ Smaller datasets still benefit from caching
- ✅ No breaking changes to API behavior

## Affected Endpoints
- `/api/patients/bulk` - Most likely to hit size limit (24k+ records)
- Other endpoints with large response payloads

## Alternative Solutions Considered
1. **Compress before caching** - Adds CPU overhead, still may exceed limits
2. **Paginate cache keys** - Complex, requires cache coordination
3. **Use different cache backend** - Not necessary, graceful skip is sufficient
4. **Increase Upstash tier** - Cost consideration, skip is free

## Monitoring
Watch for these log messages:
```
[Redis] Payload too large (X.XXmb), skipping cache for key: ...
```

If this appears frequently, consider:
- Reducing column selection in bulk queries
- Implementing pagination for large datasets
- Upgrading Upstash tier if caching is critical
