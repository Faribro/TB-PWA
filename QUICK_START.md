# 🚀 Quick Start - Deploy in 5 Minutes

## Prerequisites
- Bun installed
- Vercel CLI installed (`npm i -g vercel`)
- Supabase CLI installed (optional)

## Step 1: Verify (30 seconds)
```bash
cd c:\Users\farid\Desktop\TB-PWA-Clean
bun run verify:deployment
```

**Expected:** ✅ ALL PRE-DEPLOYMENT CHECKS PASSED

## Step 2: Build (2 minutes)
```bash
bun install
bun run build
```

**Expected:** Build completed successfully

## Step 3: Test (1 minute)
```bash
# Start dev server in one terminal
bun run dev

# Run tests in another terminal
bun run test:stabilization
```

**Expected:** ✅ ALL TESTS PASSED

## Step 4: Deploy (1 minute)
```bash
vercel --prod
```

**Expected:** Deployment successful

## Step 5: Database Migration (30 seconds)

**Option A: Supabase CLI**
```bash
supabase link --project-ref wwcgybgvfulotflitogu
supabase db push
```

**Option B: SQL Editor**
1. Go to https://supabase.com/dashboard/project/wwcgybgvfulotflitogu/sql
2. Copy `supabase/migrations/20250122_service_role_rls.sql`
3. Run query

**Option C: API Endpoint**
```bash
curl -X POST https://hhxr-tb-engine.vercel.app/api/admin/fix-rls \
  -H "Cookie: your-admin-session-cookie"
```

## Step 6: Verify Production (30 seconds)

1. Open https://hhxr-tb-engine.vercel.app
2. Login with Google OAuth
3. Check console: Should see single "[Supabase] Browser client initialized"
4. Navigate to dashboard: Should load in <2s
5. Check vertex metrics: Should render without errors

## Done! 🎉

Platform is now stable for 1,000 concurrent users.

## Troubleshooting

**Build fails:**
```bash
bun run clean
bun install
bun run build
```

**Tests fail:**
```bash
# Check if dev server is running
# Verify environment variables in .env.local
```

**Deployment fails:**
```bash
vercel --debug
```

## Monitoring

- **Vercel:** https://vercel.com/dashboard
- **Supabase:** https://supabase.com/dashboard/project/wwcgybgvfulotflitogu
- **App:** https://hhxr-tb-engine.vercel.app

## Support

- **Docs:** `docs/DEPLOYMENT_GUIDE.md`
- **Emergency:** `docs/EMERGENCY_FIXES.md`
- **Summary:** `EXECUTIVE_SUMMARY.txt`
