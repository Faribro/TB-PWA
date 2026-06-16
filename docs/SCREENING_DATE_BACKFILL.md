# Screening Date Backfill Guide

## Problem
14,519 patient records (84% of data) have NULL `screening_date`, causing them to not appear in date-filtered queries.

## Solution
Backfill NULL `screening_date` values using the earliest available date from other columns.

---

## Step 1: Run the Backfill Migration

### Option A: Via Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/wwcgybgvfulotflitogu
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/007_backfill_screening_dates.sql`
4. Click **Run**
5. Review the output to see before/after counts

### Option B: Via Supabase CLI (If installed)

```bash
supabase db push
```

---

## Step 2: Verify the Backfill

Run the verification script:

```bash
# Windows
set NEXT_PUBLIC_SUPABASE_URL=https://wwcgybgvfulotflitogu.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M
node scripts/verify-backfill.js
```

---

## Step 3: Test the Application

1. Restart your dev server: `bun run dev`
2. Navigate to the dashboard
3. Check if January 2025 data now appears
4. Verify date filters are working correctly

---

## Expected Results

### Before Backfill:
- NULL screening_date: **14,519 records**
- January 2025 data: **2 records**
- Visible patients: **2,778 records**

### After Backfill:
- NULL screening_date: **0 records**
- January 2025 data: **~14,500+ records** (depending on actual dates)
- Visible patients: **17,297 records**

---

## Backfill Logic

The migration uses this priority order to fill NULL screening_date:

1. `referral_date` (most relevant clinical date)
2. `registration_date` (administrative date)
3. `tb_diagnosis_date` (diagnosis date)
4. `att_start_date` (treatment start)
5. `created_at::date` (record creation date)
6. `CURRENT_DATE` (last resort - today's date)

---

## Future Prevention

The following changes ensure future records always have screening_date:

### 1. Database Default Value
```sql
ALTER TABLE patients 
  ALTER COLUMN screening_date SET DEFAULT CURRENT_DATE;
```

### 2. Kobo Webhook Enhancement
Updated `app/api/webhook/kobo/route.ts` to automatically set screening_date:
- Uses Kobo's `Screening_Date` field if available
- Falls back to `submission_date`
- Falls back to `referral_date`
- Falls back to today's date

### 3. Optional: NOT NULL Constraint
To enforce screening_date at database level (uncomment in migration if needed):
```sql
ALTER TABLE patients 
  ALTER COLUMN screening_date SET NOT NULL;
```

---

## Rollback (If Needed)

If you need to undo the backfill:

```sql
-- This will restore NULL values, but you'll lose the backfilled data
-- Only run if you have a backup or need to re-run with different logic
UPDATE patients
SET screening_date = NULL
WHERE screening_date >= CURRENT_DATE - INTERVAL '1 day';
```

**⚠️ WARNING**: Only rollback if absolutely necessary. You cannot distinguish between original dates and backfilled dates after the migration runs.

---

## Troubleshooting

### Issue: Still seeing NULL values after backfill
**Solution**: Check if created_at is also NULL for those records:
```sql
SELECT COUNT(*) FROM patients 
WHERE screening_date IS NULL AND created_at IS NULL;
```

### Issue: Dates look incorrect
**Solution**: Review the backfill logic and adjust priority order in the migration.

### Issue: January 2025 count still low
**Solution**: The backfilled dates might be from earlier months. Check the monthly distribution:
```sql
SELECT 
  DATE_TRUNC('month', screening_date) AS month,
  COUNT(*) AS count
FROM patients
GROUP BY month
ORDER BY month DESC
LIMIT 12;
```

---

## Next Steps

After successful backfill:

1. ✅ Remove data quality filters (already done in `useSWRPatients.ts`)
2. ✅ Update Kobo webhook to prevent future NULLs (already done)
3. ✅ Test all date-based queries in the application
4. ✅ Monitor for any new NULL values in production
5. ✅ Consider adding database indexes on screening_date for performance

---

## Support

If you encounter issues:
1. Check Supabase logs for errors
2. Run the diagnostic script: `node scripts/diagnose-all-dates.js`
3. Review the migration output for any failed updates
