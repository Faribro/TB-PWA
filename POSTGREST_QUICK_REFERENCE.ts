// ============================================================================
// POSTGREST 1000-ROW LIMIT FIX - QUICK REFERENCE
// ============================================================================

// ============================================================================
// TASK 1: KPI "Screened" Counter - HEAD Query Pattern
// ============================================================================

// ❌ WRONG: Only gets first 1000 rows
const { count } = await supabase
  .from('patients')
  .select('*', { count: 'exact' });

// ✅ CORRECT: Bypasses 1000-row limit
const { count } = await supabase
  .from('patients')
  .select('*', { count: 'exact', head: true });

// ============================================================================
// TASK 2: Batch Fetching Pattern - For Stats/Aggregations
// ============================================================================

async function fetchAllPatientStats() {
  const batchSize = 1000;
  const allPatients: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('patients')
      .select('tb_diagnosed, referral_date, att_start_date')
      .range(offset, offset + batchSize - 1);

    if (error || !data) break;
    
    allPatients.push(...data);
    hasMore = data.length === batchSize;
    offset += batchSize;
  }

  return allPatients;
}

// ============================================================================
// TASK 3: Pagination Pattern - For UI Lists
// ============================================================================

// State
const [currentPage, setCurrentPage] = useState(0);
const ITEMS_PER_PAGE = 50;

// Compute paginated slice
const paginatedPatients = useMemo(() => {
  const start = currentPage * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  return filteredPatients.slice(start, end);
}, [filteredPatients, currentPage]);

// Calculate total pages
const totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);

// Navigation
<button onClick={() => setCurrentPage(p => Math.max(0, p - 1))}>
  Previous
</button>
<span>Page {currentPage + 1} of {totalPages}</span>
<button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}>
  Next
</button>

// ============================================================================
// TASK 4: SWR Hook Pattern - Sequential Batch Fetching
// ============================================================================

const allPatientsFetcher = async (userState?: string) => {
  const batchSize = 1000;
  const allData: any[] = [];
  let offset = 0;
  let hasMore = true;

  // Sequential batching (not parallel)
  while (hasMore) {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .range(offset, offset + batchSize - 1)
      .then(result => {
        if (userState) {
          return supabase
            .from('patients')
            .select('*')
            .eq('screening_state', userState)
            .range(offset, offset + batchSize - 1);
        }
        return result;
      });

    if (error || !data) break;

    allData.push(...data);
    hasMore = data.length === batchSize;
    offset += batchSize;
  }

  return allData;
};

// ============================================================================
// COMMON PATTERNS
// ============================================================================

// Pattern 1: Count without fetching data
const { count } = await supabase
  .from('patients')
  .select('*', { count: 'exact', head: true });

// Pattern 2: Fetch with filters and pagination
const { data } = await supabase
  .from('patients')
  .select('*')
  .eq('screening_state', 'Maharashtra')
  .range(0, 49); // First 50 records

// Pattern 3: Batch fetch with retry
async function batchFetchWithRetry(table: string, batchSize = 1000) {
  const allData: any[] = [];
  let offset = 0;
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .range(offset, offset + batchSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allData.push(...data);
      offset += batchSize;
      retries = 0; // Reset on success
    } catch (error) {
      retries++;
      if (retries >= maxRetries) throw error;
      await new Promise(r => setTimeout(r, 1000 * retries)); // Exponential backoff
    }
  }

  return allData;
}

// ============================================================================
// PERFORMANCE TIPS
// ============================================================================

// ✅ DO: Select only needed columns
const { data } = await supabase
  .from('patients')
  .select('id, name, screening_date')
  .range(0, 999);

// ❌ DON'T: Select all columns if not needed
const { data } = await supabase
  .from('patients')
  .select('*')
  .range(0, 999);

// ✅ DO: Use filters before pagination
const { data } = await supabase
  .from('patients')
  .select('*')
  .eq('screening_state', 'Maharashtra')
  .range(0, 49);

// ❌ DON'T: Fetch all then filter client-side
const { data } = await supabase
  .from('patients')
  .select('*')
  .range(0, 999);
// Then filter in JavaScript

// ✅ DO: Cache batch results
const cache = new Map();
async function getCachedBatch(offset: number) {
  if (cache.has(offset)) return cache.get(offset);
  const data = await supabase
    .from('patients')
    .select('*')
    .range(offset, offset + 999);
  cache.set(offset, data);
  return data;
}

// ============================================================================
// DEBUGGING
// ============================================================================

// Log batch progress
let offset = 0;
while (hasMore) {
  console.log(`Fetching batch: offset ${offset} to ${offset + 999}`);
  const { data } = await supabase
    .from('patients')
    .select('*')
    .range(offset, offset + 999);
  
  console.log(`Got ${data?.length || 0} records`);
  offset += 1000;
  hasMore = (data?.length || 0) === 1000;
}

// Verify total count
const { count } = await supabase
  .from('patients')
  .select('*', { count: 'exact', head: true });
console.log(`Total records in database: ${count}`);

// ============================================================================
// MIGRATION CHECKLIST
// ============================================================================

// [ ] Update ScreenedMetric.tsx to use HEAD query
// [ ] Update FollowUpPipeline.tsx to add pagination
// [ ] Update useSWRPatients.ts to use sequential batching
// [ ] Test KPI counter shows 14,000+
// [ ] Test pagination controls work
// [ ] Test filters work with pagination
// [ ] Test bulk triage on paginated results
// [ ] Monitor Supabase logs for errors
// [ ] Check performance metrics
// [ ] Deploy to production

// ============================================================================
