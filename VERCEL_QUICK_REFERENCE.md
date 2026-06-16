# 🚨 CRITICAL VERCEL ENVIRONMENT VARIABLES - QUICK REFERENCE

## ⚡ Must-Have for Production (Copy-Paste Ready)

### 1. QStash (Serverless Queue) - REQUIRED FOR SHEETS SYNC
```
QSTASH_URL=https://qstash-us-east-1.upstash.io
QSTASH_TOKEN=eyJVc2VySUQiOiIyZjZiOWUwNC04MTkwLTQxYTQtODMzYy02OTM2NTQ0Yjc1Y2IiLCJQYXNzd29yZCI6IjE5NjkxNjQ5YjI3NTRjMDM5M2QwNTE0NzkwMmU2YjUzIn0=
QSTASH_CURRENT_SIGNING_KEY=sig_4pTf55MEQ1qJRVmB48dgjoh1Jwfb
QSTASH_NEXT_SIGNING_KEY=sig_6LReUmaTGHpiAHRn9fTWpibd6Fcf
```

### 2. Supabase (Database) - REQUIRED
```
NEXT_PUBLIC_SUPABASE_URL=https://fgtrkxadiszoyhslwesu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_h3ZAJH2NvnhbAOJIlTMyag_eHBOym20
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndHJreGFkaXN6b3loc2x3ZXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjMyNDc1NiwiZXhwIjoyMDkxOTAwNzU2fQ.IwKVDUZIhyiV6dew6CepShYo5ZCTBlbC-WHS0xn3mKU
```

### 3. NextAuth (Authentication) - REQUIRED
```
NEXTAUTH_URL=https://hhxr-tb-engine.vercel.app
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
```

### 4. Upstash Redis (Cache) - REQUIRED
```
UPSTASH_REDIS_REST_URL=https://infinite-snail-94217.upstash.io
UPSTASH_REDIS_REST_TOKEN=gQAAAAAAAXAJAAIgcDI1MTRmYTAyZjdmNjI0YzJhOTk0OTE5YjAzMGEwMWIyYw
```

### 5. OpenRouter (AI) - REQUIRED
```
OPENROUTER_API_KEY_1=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
OPENROUTER_DEFAULT_MODEL=openai/gpt-4o-2024-11-20
```

---

## 📋 Quick Add via Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Select: **hhxr-tb-engine**
3. Click: **Settings** → **Environment Variables**
4. For each variable above:
   - Click **Add New**
   - Paste **Key** (e.g., `QSTASH_TOKEN`)
   - Paste **Value** (e.g., `eyJVc2VySUQi...`)
   - Select: **Production, Preview, Development** (all 3)
   - Click **Save**

---

## ✅ Verification Commands

```bash
# Check if variables are set
vercel env ls

# Pull environment variables locally
vercel env pull .env.vercel

# Redeploy with new variables
vercel --prod
```

---

## 🔍 Test Endpoints After Deployment

```bash
# Test QStash webhook
curl -X POST https://hhxr-tb-engine.vercel.app/api/qstash/test

# Test Supabase connection
curl https://hhxr-tb-engine.vercel.app/api/health

# Test Redis cache
curl https://hhxr-tb-engine.vercel.app/api/cache/test
```

---

## 🐛 Common Issues

### Issue: "QSTASH_TOKEN is not defined"
**Fix:** Add variable to ALL environments (Production + Preview + Development)

### Issue: "Failed to connect to Upstash"
**Fix:** Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are correct

### Issue: "Supabase RLS policy error"
**Fix:** Ensure `SUPABASE_SERVICE_ROLE_KEY` is set (bypasses RLS)

---

## 📞 Quick Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **QStash Console:** https://console.upstash.com/qstash
- **Redis Console:** https://console.upstash.com/redis
- **Supabase Dashboard:** https://supabase.com/dashboard/project/fgtrkxadiszoyhslwesu

---

**Last Updated:** 2025-01-21  
**Project:** SAMADHAAN Health OS  
**Deployment:** https://hhxr-tb-engine.vercel.app
