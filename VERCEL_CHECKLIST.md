# ✅ Vercel Environment Variables Checklist

## Pre-Deployment Checklist

### Step 1: Access Vercel Dashboard
- [ ] Go to https://vercel.com/dashboard
- [ ] Select project: **hhxr-tb-engine**
- [ ] Navigate to: **Settings** → **Environment Variables**

---

## Core Variables (REQUIRED)

### 🔐 Authentication & Security
- [ ] `NEXTAUTH_URL` = `https://hhxr-tb-engine.vercel.app`
- [ ] `NEXTAUTH_SECRET` = `generate_with_openssl_rand_base64_32`
- [ ] `GOOGLE_CLIENT_ID` = (Your OAuth Client ID)
- [ ] `GOOGLE_CLIENT_SECRET` = (Your OAuth Client Secret)

### 🗄️ Database (Supabase)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://fgtrkxadiszoyhslwesu.supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_h3ZAJH2NvnhbAOJIlTMyag_eHBOym20`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- [ ] `SUPABASE_WEBHOOK_SECRET` = `samadhaan_sheets_sync_secure_2026`
- [ ] `DATABASE_URL` = `postgresql://postgres.fgtrkxadiszoyhslwesu:Alliance@infinity2026@...`
- [ ] `DIRECT_URL` = `postgresql://postgres.fgtrkxadiszoyhslwesu:Alliance@infinity2026@...`

### ⚡ QStash (Serverless Queue) - CRITICAL
- [ ] `QSTASH_URL` = `https://qstash-us-east-1.upstash.io`
- [ ] `QSTASH_TOKEN` = `eyJVc2VySUQiOiIyZjZiOWUwNC04MTkwLTQxYTQtODMzYy02OTM2NTQ0Yjc1Y2IiLCJQYXNzd29yZCI6IjE5NjkxNjQ5YjI3NTRjMDM5M2QwNTE0NzkwMmU2YjUzIn0=`
- [ ] `QSTASH_CURRENT_SIGNING_KEY` = `sig_4pTf55MEQ1qJRVmB48dgjoh1Jwfb`
- [ ] `QSTASH_NEXT_SIGNING_KEY` = `sig_6LReUmaTGHpiAHRn9fTWpibd6Fcf`

### 🔴 Redis (Upstash)
- [ ] `UPSTASH_REDIS_REST_URL` = `https://infinite-snail-94217.upstash.io`
- [ ] `UPSTASH_REDIS_REST_TOKEN` = `gQAAAAAAAXAJAAIgcDI1MTRmYTAyZjdmNjI0YzJhOTk0OTE5YjAzMGEwMWIyYw`
- [ ] `REDIS_URL` = `redis://default:AZLgASQgNzJkNzY4YzQtMzE0Zi00YzE5LWI3YzAtMzE0ZjRjMTliN2MwYjE4ZjE4YzE4ZjE4YzE4ZjE4YzE4ZjE4YzE4Yw==@gusc1-merry-mink-40234.upstash.io:40234`

---

## AI & Analytics (REQUIRED)

### 🤖 OpenRouter (AI)
- [ ] `OPENROUTER_API_KEY_1` = `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`
- [ ] `OPENROUTER_API_KEY_2` = `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`
- [ ] `OPENROUTER_API_KEY_3` through `OPENROUTER_API_KEY_10` (8 more keys)
- [ ] `OPENROUTER_DEFAULT_MODEL` = `openai/gpt-4o-2024-11-20`
- [ ] `OPENROUTER_FALLBACK_MODEL` = `anthropic/claude-3.5-sonnet`
- [ ] `OPENROUTER_SITE_URL` = `https://samadhaan.allianceindia.org/`
- [ ] `OPENROUTER_APP_NAME` = `SAMADHAAN-TB-PWA`

### 📊 PostHog (Analytics)
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` = `phc_rry25F3rJWzJRhDCooYR2YZRVMnw6P9n9273AoWPJavp`
- [ ] `NEXT_PUBLIC_POSTHOG_HOST` = `https://us.i.posthog.com`

---

## Integrations (REQUIRED)

### 📄 Google Sheets Sync
- [ ] `GOOGLE_SCRIPT_WEBHOOK_URL` = `https://script.google.com/macros/s/AKfycbyBwLUKiFDY-eLdNOIzNZRsyem0rWiTA6IvelapBjHg8sGdtkTuhQs2hGbXrydeUZSu/exec`
- [ ] `ENABLE_SHEETS_SYNC` = `true`

### 📦 KoboToolbox
- [ ] `KOBO_WEBHOOK_SECRET` = `alliance_kobo_secure_2026`
- [ ] `KOBO_API_URL` = (Optional - if using Kobo ETL)
- [ ] `KOBO_ASSET_UID` = (Optional)
- [ ] `KOBO_API_TOKEN` = (Optional)

---

## Optional Services

### 🎤 VAPI Voice Assistant
- [ ] `NEXT_PUBLIC_VAPI_PUBLIC_KEY` = (Your VAPI public key)
- [ ] `VAPI_PRIVATE_KEY` = (Your VAPI private key)
- [ ] `NEXT_PUBLIC_VAPI_ASSISTANT_ID` = (Your assistant ID)

### ☁️ Azure Services
- [ ] `AZURE_STORAGE_ACCOUNT_NAME` = (Your storage account)
- [ ] `AZURE_STORAGE_ACCOUNT_KEY` = (Your storage key)
- [ ] `AZURE_STORAGE_CONTAINER_NAME` = `xray-images`
- [ ] `AZURE_COMPUTER_VISION_ENDPOINT` = (Your CV endpoint)
- [ ] `AZURE_COMPUTER_VISION_KEY` = (Your CV key)

### 🔍 Sentry (Error Tracking)
- [ ] `SENTRY_DSN` = (Your Sentry DSN)
- [ ] `SENTRY_AUTH_TOKEN` = (Your Sentry auth token)

### 🧠 Google Gemini (AI Fallback)
- [ ] `GOOGLE_GENERATIVE_AI_API_KEY_1` = (Your Gemini key 1)
- [ ] `GOOGLE_GENERATIVE_AI_API_KEY_2` = (Your Gemini key 2)

---

## Post-Setup Verification

### Step 2: Verify Variables
- [ ] All variables added to **Production** environment
- [ ] All variables added to **Preview** environment
- [ ] All variables added to **Development** environment

### Step 3: Redeploy
- [ ] Go to **Deployments** tab
- [ ] Click **Redeploy** on latest deployment
- [ ] Uncheck "Use existing Build Cache"
- [ ] Click **Redeploy**

### Step 4: Test Deployment
- [ ] Visit: https://hhxr-tb-engine.vercel.app
- [ ] Test login with Google OAuth
- [ ] Check Supabase data loads
- [ ] Verify QStash queue works
- [ ] Test Redis cache
- [ ] Check Function Logs for errors

### Step 5: Monitor Services
- [ ] QStash Dashboard: https://console.upstash.com/qstash
- [ ] Redis Dashboard: https://console.upstash.com/redis
- [ ] Supabase Dashboard: https://supabase.com/dashboard/project/fgtrkxadiszoyhslwesu
- [ ] Vercel Logs: https://vercel.com/dashboard → Deployments → Function Logs

---

## 🚨 Critical Warnings

### Security
- [ ] Never commit `.env.local` to Git
- [ ] Never share `SUPABASE_SERVICE_ROLE_KEY` publicly
- [ ] Never share `QSTASH_TOKEN` publicly
- [ ] Rotate secrets every 90 days

### Performance
- [ ] Verify Vercel region matches Upstash region (us-east-1)
- [ ] Monitor QStash queue length
- [ ] Monitor Redis memory usage
- [ ] Check Supabase connection pool limits

---

## 📞 Support Resources

- **Vercel Docs:** https://vercel.com/docs/environment-variables
- **QStash Docs:** https://upstash.com/docs/qstash
- **Redis Docs:** https://upstash.com/docs/redis
- **Supabase Docs:** https://supabase.com/docs

---

**Completion Date:** _______________  
**Verified By:** _______________  
**Deployment URL:** https://hhxr-tb-engine.vercel.app
