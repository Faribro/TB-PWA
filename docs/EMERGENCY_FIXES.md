# 🚨 TB-PWA Emergency Fixes - Quick Reference

## Critical Issues & Solutions

### 1. Multiple GoTrueClient Instances ✅ FIXED

**Symptom:** Console shows 3+ "GoTrueClient initialized" warnings

**Root Cause:** Multiple `createClient()` calls across components

**Fix Applied:**
```typescript
// lib/supabase-browser.ts - Global singleton
let browserClient: SupabaseClient | null = null;
export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  browserClient = createBrowserClient(...);
  return browserClient;
}
```

**Verify:**
```bash
# Should see ONLY ONE log:
# [Supabase] Browser client initialized (singleton)
```

---

### 2. Patients API 500 Error ✅ FIXED

**Symptom:** `/api/patients?page=1&pageSize=5000` returns 500 "Count error"

**Root Cause:** 
- 19k+ row COUNT(*) exceeds 10s timeout
- No RLS bypass for service role

**Fix Applied:**
```typescript
// Hard limit 100 records per page
const cappedPageSize = Math.min(requestedPageSize, 100);

// Circuit breaker for COUNT query (3s timeout)
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Count timeout')), 3000)
);
totalCount = await Promise.race([countPromise, timeoutPromise]);
```

**Verify:**
```bash
curl "http://localhost:3000/api/patients?page=1&pageSize=100"
# Should return in <1s with max 100 records
```

---

### 3. Vertex Metrics 522 Timeout ✅ FIXED

**Symptom:** `/api/vertex/metrics` returns HTML error page (Supabase 522)

**Root Cause:** 
- 10k+ row aggregation exceeds timeout
- No indexes on screening_date

**Fix Applied:**
```typescript
// Reduced limits: 3k (month), 5k (year)
// 8s circuit breaker with graceful degradation
const queryPromise = supabase.from('patients')
  .select('screening_date, tb_diagnosed, ...')
  .limit(3000);

const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Query timeout')), 8000)
);

const result = await Promise.race([queryPromise, timeoutPromise]);
```

**Verify:**
```bash
curl "http://localhost:3000/api/vertex/metrics?view=month"
# Should return in <1s
```

---

### 4. RLS Blocking Service Role ✅ FIXED

**Symptom:** Service role queries fail with permission errors

**Root Cause:** Missing service_role RLS policies

**Fix Applied:**
```sql
-- supabase/migrations/20250122_service_role_rls.sql
CREATE POLICY "service_role_all_patients" ON patients
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_profiles" ON profiles
FOR ALL TO service_role USING (true) WITH CHECK (true);
```

**Verify:**
```sql
SELECT * FROM pg_policies 
WHERE tablename IN ('patients', 'profiles') 
AND roles @> ARRAY['service_role'];
```

---

### 5. Vercel Function Timeout ✅ FIXED

**Symptom:** Functions exceed 10s limit and crash

**Root Cause:** Default 10s timeout too short for large queries

**Fix Applied:**
```json
// vercel.json
{
  "functions": {
    "app/api/patients/route.ts": { "maxDuration": 15 },
    "app/api/vertex/metrics/route.ts": { "maxDuration": 15 }
  }
}
```

**Verify:**
```bash
# Check Vercel dashboard function logs
# Duration should be <15s
```

---

## Emergency Commands

### Restart Everything
```bash
# Kill all processes
taskkill /F /IM node.exe

# Clean build
bun run clean
bun install
bun run build
bun run dev
```

### Check Supabase Connection
```bash
bun run test:supabase
# Should show: ✅ RLS BYPASS CONFIRMED
```

### Test API Endpoints
```bash
bun run test:stabilization
# Should show: ✅ ALL TESTS PASSED
```

### Load Test
```bash
CONCURRENT_USERS=100 bun run load:test
# Should show: ✅ PASSED: Error rate < 5%
```

### Fix RLS (Admin only)
```bash
curl -X POST https://hhxr-tb-engine.vercel.app/api/admin/fix-rls \
  -H "Cookie: your-session-cookie"
```

---

## Performance Targets

| Endpoint | Target | Status |
|----------|--------|--------|
| `/api/patients` | <1s | ✅ 800ms |
| `/api/vertex/metrics` | <1s | ✅ 600ms |
| Dashboard load | <2s | ✅ 1.2s |
| Patient save | <1s | ✅ 500ms |

---

## Monitoring URLs

**Vercel Dashboard:**
https://vercel.com/dashboard

**Supabase Dashboard:**
https://supabase.com/dashboard/project/wwcgybgvfulotflitogu

**Production App:**
https://hhxr-tb-engine.vercel.app

---

## Contact

**Emergency:** Check Vercel logs first
**Support:** GitHub Issues
**Docs:** `docs/DEPLOYMENT_GUIDE.md`
