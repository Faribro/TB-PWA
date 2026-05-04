# Execute sync_queue Migration in Supabase

## Quick Steps

1. **Open Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/fgtrkxadiszoyhslwesu/sql
   ```

2. **Copy SQL from:**
   ```
   supabase/migrations/002_sync_queue_manual.sql
   ```

3. **Paste into SQL Editor and click "Run"**

4. **Verify success** (all queries should return expected results)

---

## Detailed Instructions

### Step 1: Access Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select project: **fgtrkxadiszoyhslwesu** (TB-PWA-Clean)
3. Click **SQL Editor** in left sidebar
4. Click **New query** button

### Step 2: Copy Migration SQL

Open file: `supabase/migrations/002_sync_queue_manual.sql`

Or copy this SQL:

```sql
-- Create sync_queue table
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('insert', 'update')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue (status, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_patient ON sync_queue (patient_id);

-- Enable RLS
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Service role full access" ON sync_queue
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE sync_queue IS 'Fallback queue for Google Sheets sync when QStash unavailable';
```

### Step 3: Execute Migration

1. Paste SQL into SQL Editor
2. Click **Run** button (or press Ctrl+Enter)
3. Wait for success message

### Step 4: Verify Migration

Run these verification queries one by one:

**Check table exists:**
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'sync_queue'
);
```
Expected: `true`

**Check indexes:**
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'sync_queue';
```
Expected: 2 rows (idx_sync_queue_status, idx_sync_queue_patient)

**Check RLS enabled:**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'sync_queue';
```
Expected: `rowsecurity = true`

**Check policies:**
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'sync_queue';
```
Expected: 1 row ("Service role full access")

### Step 5: Test Insert

```sql
-- Test insert (should succeed)
INSERT INTO sync_queue (patient_id, payload, operation)
VALUES (
  (SELECT id FROM patients LIMIT 1),
  '{"test": true}'::jsonb,
  'update'
);

-- Verify insert
SELECT * FROM sync_queue ORDER BY created_at DESC LIMIT 1;

-- Clean up test data
DELETE FROM sync_queue WHERE payload->>'test' = 'true';
```

---

## Troubleshooting

### Error: "relation patients does not exist"
**Cause:** patients table not found  
**Fix:** Verify you're connected to correct database

### Error: "permission denied"
**Cause:** Insufficient privileges  
**Fix:** Use service role key or run as postgres user

### Error: "policy already exists"
**Cause:** Migration already run  
**Fix:** This is safe to ignore, table already exists

### Error: "syntax error"
**Cause:** SQL formatting issue  
**Fix:** Copy SQL exactly from file, don't modify

---

## Rollback (If Needed)

```sql
-- Drop table and all dependencies
DROP TABLE IF EXISTS sync_queue CASCADE;
```

---

## Success Checklist

- [ ] Table `sync_queue` exists
- [ ] 2 indexes created
- [ ] RLS enabled
- [ ] 1 policy created
- [ ] Test insert succeeds
- [ ] Test select succeeds
- [ ] Test delete succeeds

---

## Next Steps After Migration

1. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

2. **Test patient save:**
   - Update a patient in production
   - Check logs for QStash queuing
   - Verify Google Sheets sync

3. **Monitor QStash:**
   - https://console.upstash.com/qstash
   - Check message delivery
   - Verify success rate

4. **Check fallback queue:**
   ```sql
   SELECT COUNT(*) FROM sync_queue WHERE status = 'pending';
   ```
   Should be 0 if QStash working correctly

---

## Support

**Migration issues:**
- Check Supabase logs: https://supabase.com/dashboard/project/fgtrkxadiszoyhslwesu/logs
- Review SQL syntax in migration file
- Verify database connection

**QStash issues:**
- Check dashboard: https://console.upstash.com/qstash
- Verify environment variables in Vercel
- Review webhook handler logs

**Documentation:**
- Full guide: `docs/QSTASH_MIGRATION.md`
- Quick reference: `docs/QSTASH_SUMMARY.md`
- Deployment checklist: `docs/DEPLOYMENT_CHECKLIST.md`
