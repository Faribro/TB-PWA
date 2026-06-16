# State Name Normalization - Complete Resolution

## Issue Summary

**Problem**: Uttarakhand state showing duplicate entries across the application:
- GIS Map: 784 + 118 = 902 patients split into two entries
- Vertex Tab: Still showing 784 after database normalization
- Care Cascade: Confirmed showing 784 instead of 902

## Root Cause Analysis

### TRUE ROOT CAUSE: Missing State Mapping in Webhook ⚠️

**File**: `lib/stateMapper.ts`

**Problem**: The KoboToolbox webhook normalization was missing Uttarakhand in the STATE_MAPPING dictionary.

**What Happened**:
1. New KoboCollect version sends state names in lowercase: `"uttarakhand"`
2. Webhook calls `normalizeState("uttarakhand")`
3. STATE_MAPPING didn't have `'uttarakhand': 'Uttarakhand'` entry
4. Function returned lowercase value as-is: `"uttarakhand"`
5. Database stored 118 records with lowercase state name
6. Existing 784 records had proper capitalization from older Kobo version

**Code Evidence**:
```typescript
// BEFORE (Missing Uttarakhand)
const STATE_MAPPING: Record<string, string> = {
  'gujarat': 'Gujarat',
  'maharashtra': 'Maharashtra',
  'madhya pradesh': 'Madhya Pradesh',
  // ❌ 'uttarakhand' was MISSING!
};

export function normalizeState(state: string | null | undefined): string | null {
  // ...
  const normalized = STATE_MAPPING[trimmed];
  if (normalized) return normalized;
  
  // ⚠️ Fallback returns original value if not in mapping
  console.warn(`[stateMapper] Unknown state: "${state}" - using as-is`);
  return trimmed; // Returns "uttarakhand" instead of "Uttarakhand"
}
```

**AFTER (Fixed)**:
```typescript
const STATE_MAPPING: Record<string, string> = {
  'uttarakhand': 'Uttarakhand',
  'UTTARAKHAND': 'Uttarakhand',
  'Uttarakhand': 'Uttarakhand',
  'uttrakhand': 'Uttarakhand', // Common typo
  // ... other states
};
```

### Secondary Issue: Redis Cache Layer

**Problem**: After database normalization, Redis cache served stale data

**Cache Details**:
- Endpoint: `/api/patients/bulk`
- TTL: 30 seconds
- Keys: `patients:bulk:{role}:{state}:{district}:{filters}`

**Impact**: 
- Database was fixed but application still showed old data
- Cache invalidation required to see updated records

## Solution Implementation

### Step 0: Fix Webhook State Mapping (PREVENTION) ✅
**File**: `lib/stateMapper.ts`

**Changes**:
```typescript
const STATE_MAPPING: Record<string, string> = {
  // Added missing states
  'uttarakhand': 'Uttarakhand',
  'UTTARAKHAND': 'Uttarakhand',
  'Uttarakhand': 'Uttarakhand',
  'uttrakhand': 'Uttarakhand', // Common typo
  
  'chandigarh': 'Chandigarh',
  'CHANDIGARH': 'Chandigarh',
  'Chandigarh': 'Chandigarh',
  
  // Added Madhya Pradesh variations
  'madhyapradesh': 'Madhya Pradesh',
  'Madhyapradesh': 'Madhya Pradesh',
  'madhya_pradesh': 'Madhya Pradesh',
  
  // ... existing mappings
};
```

**Impact**: 
- ✅ Future Kobo submissions will be normalized correctly
- ✅ Prevents new lowercase state names from entering database
- ✅ Handles common typos and variations

### Step 1: Database Normalization ✅
**Script**: `scripts/normalize-state-names.js`

```bash
node scripts/normalize-state-names.js
```

**Actions**:
- Identified 118 records with lowercase "uttarakhand"
- Updated all to proper "Uttarakhand" capitalization
- Verified: 902 total records (784 + 118)

**SQL Equivalent**:
```sql
UPDATE patients 
SET screening_state = 'Uttarakhand' 
WHERE screening_state = 'uttarakhand';
```

### Step 2: Cache Invalidation ✅
**Script**: `scripts/clear-patient-cache.js`

```bash
npm run clear:cache
```

**Actions**:
- Cleared all `patients:bulk:*` Redis keys
- Cleared all `vertex:*` Redis keys (3 keys deleted)
- Cleared all `metrics:*` Redis keys
- Next API call fetches fresh normalized data

**Cache Keys Cleared**:
```
vertex:metrics:v365:filters:admin
vertex:month:v234:2026:2:none:all:all:admin
vertex:month:v234:2026:3:none:all:all:admin
```

### Step 3: Care Cascade Filter Fix ✅
**File**: `components/Vertex.tsx`

**Changes**:
1. Created `filteredYearPatients` for bar chart (all 12 months)
2. Kept `filteredMonthPatients` for pie chart (current month)
3. Both respect state/district filters

**Before**:
```typescript
// Bar chart only showed current month
<ScreeningFrequencyTimeline patients={filteredMonthPatients} />
```

**After**:
```typescript
// Bar chart shows all 12 months with filters
const filteredYearPatients = globalPatients.filter(p => {
  if (filterState !== 'All' && p.screening_state !== filterState) return false;
  if (filterDistrict !== 'All' && p.screening_district !== filterDistrict) return false;
  return true;
});

<ScreeningFrequencyTimeline patients={filteredYearPatients} />
```

## Verification Steps

### 1. Database Verification
```bash
node scripts/check-all-states.js
```

**Expected Output**:
```
Uttarakhand: 902 records
✅ No variations found
```

### 2. Cache Verification
```bash
npm run clear:cache
```

**Expected Output**:
```
Patient cache keys deleted:  0
Vertex cache keys deleted:   3
Metrics cache keys deleted:  0
✅ Cache cleared successfully!
```

### 3. Application Verification
1. **GIS Map**: Should show unified "Uttarakhand" with 902 patients
2. **Vertex Tab**: Care Cascade should show 902 when Uttarakhand filter applied
3. **Bar Chart**: Should display all 12 months with filtered data
4. **Pie Chart**: Should show current month breakdown with filters

## Prevention Guidelines

### When to Clear Cache

**Always run cache clearing after**:
1. Database schema changes
2. Bulk data updates/migrations
3. State/district name normalization
4. Patient record imports

**Command**:
```bash
npm run clear:cache
```

### Cache TTL Considerations

**Current Settings**:
- Bulk API: 30 seconds
- Vertex aggregates: 5 minutes
- Metrics: 5 minutes

**Recommendation**: During migrations, consider:
1. Temporarily disabling cache
2. Reducing TTL to 5 seconds
3. Using cache versioning (add version to cache key)

### Code-Level Prevention

**Geographic Key Normalization**:
```typescript
// Always normalize geographic keys for comparison
import { normalizeGeographicKey } from '@/lib/normalizeGeographicKey';

const key = normalizeGeographicKey(stateName); // "uttarakhand" → "uttarakhand"
```

**Database Constraints**:
```sql
-- Consider adding CHECK constraint for state names
ALTER TABLE patients 
ADD CONSTRAINT valid_state_names 
CHECK (screening_state IN ('Uttarakhand', 'Madhya Pradesh', 'Maharashtra', ...));
```

## Files Modified

### New Files
- `scripts/clear-patient-cache.js` - Redis cache invalidation utility
- `docs/STATE_NORMALIZATION.md` - This documentation

### Modified Files
- `components/Vertex.tsx` - Care Cascade filter integration
- `package.json` - Added `clear:cache` script
- `scripts/normalize-state-names.js` - Database normalization (existing)

## Commits

1. **94d8d4f** - Bar chart fix (all 12 months with filters)
2. **c473349** - Cache clearing solution and root cause analysis

## Testing Checklist

- [x] Database shows 902 Uttarakhand records (no duplicates)
- [x] Redis cache cleared (3 vertex keys deleted)
- [x] GIS map displays unified state count
- [x] Vertex tab Care Cascade shows correct count
- [x] Bar chart displays all 12 months
- [x] Pie chart respects state/district filters
- [x] `npm run clear:cache` script works
- [x] Documentation complete

## Future Improvements

1. **Cache Versioning**: Add version number to cache keys
   ```typescript
   const CACHE_VERSION = 'v2';
   const cacheKey = `patients:bulk:${CACHE_VERSION}:${role}:${state}`;
   ```

2. **Automatic Cache Invalidation**: Trigger on database changes
   ```typescript
   // In Supabase realtime listener
   supabase.channel('db-changes')
     .on('postgres_changes', { event: '*', table: 'patients' }, () => {
       invalidatePattern('patients:bulk:*');
     });
   ```

3. **State Name Validation**: Add enum type in database
   ```sql
   CREATE TYPE state_name AS ENUM ('Uttarakhand', 'Madhya Pradesh', ...);
   ALTER TABLE patients ALTER COLUMN screening_state TYPE state_name;
   ```

4. **Migration Checklist**: Add to deployment process
   - [ ] Run database migrations
   - [ ] Clear Redis cache
   - [ ] Verify data integrity
   - [ ] Test critical paths

## Support

For issues related to state normalization:
1. Check database: `node scripts/check-all-states.js`
2. Clear cache: `npm run clear:cache`
3. Verify API response: Check browser DevTools Network tab
4. Check Redis logs: Look for "Cache HIT/MISS" messages

---

**Last Updated**: 2025-01-23  
**Status**: ✅ Resolved  
**Impact**: All 902 Uttarakhand patients now correctly aggregated
