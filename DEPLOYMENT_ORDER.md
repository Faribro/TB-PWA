# SAMADHAAN OS Refactor - Deployment Order

## Pre-Deployment Checklist
- [ ] Backup production database
- [ ] Test migration on staging environment
- [ ] Verify GOOGLE_SCRIPT_WEBHOOK_URL is set in production

## Deployment Steps (Execute in Order)

### 1. Deploy Migration (Remove Sync Tracking Columns)
```bash
supabase db push
# Or manually run: supabase/migrations/20250127_remove_sheets_sync_tracking.sql
```

### 2. Deploy Code Changes
```bash
git add .
git commit -m "refactor: fire-and-forget Sheets sync + Realtime"
git push origin main
# Vercel will auto-deploy
```

### 3. Verify Deployment
- [ ] Check `/api/webhook/kobo` health endpoint
- [ ] Test patient update from UI drawer
- [ ] Verify Realtime subscription in browser console
- [ ] Confirm Google Sheets still receiving updates

### 4. Monitor for 24 Hours
- [ ] Check Vercel logs for errors
- [ ] Verify Sheets sync success rate
- [ ] Monitor Supabase Realtime connections

## Rollback Plan (If Needed)
1. Revert code deployment via Vercel dashboard
2. Restore sync tracking columns:
```sql
ALTER TABLE patients 
  ADD COLUMN synced_to_sheets BOOLEAN DEFAULT false,
  ADD COLUMN sheets_sync_attempts INTEGER DEFAULT 0,
  ADD COLUMN sheets_sync_error TEXT,
  ADD COLUMN sheets_synced_at TIMESTAMPTZ;
```

## Files Changed
- ✅ lib/sheetsSync.ts (fire-and-forget helper)
- ✅ app/api/webhook/kobo/route.ts (use new helper)
- ✅ app/api/patient-sync/route.ts (use new helper)
- ✅ hooks/usePatientRealtime.ts (new Realtime hook)
- ✅ app/dashboard/follow-up/page.tsx (add Realtime)
- ✅ app/dashboard/command-hub/page.tsx (add Realtime)
- ✅ supabase/migrations/20250127_remove_sheets_sync_tracking.sql (new migration)

## Files Deleted
- ✅ C:\Users\farid\Desktop\Alliance-India-TB\SupabaseSync.js (dead code)

## Architecture After Refactor
- Supabase = source of truth
- Google Sheets = reporting mirror (fire-and-forget)
- Realtime = live UI updates
- No sync tracking = cleaner schema
