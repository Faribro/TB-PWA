# Vercel Environment Variables Setup Guide

## 🚀 Quick Setup via Vercel Dashboard

### Step 1: Access Environment Variables
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **hhxr-tb-engine**
3. Click **Settings** → **Environment Variables**

### Step 2: Add Variables (Copy-Paste Ready)

**CRITICAL: Add these to ALL environments (Production, Preview, Development)**

---

## 📋 Core Application Variables

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://fgtrkxadiszoyhslwesu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_h3ZAJH2NvnhbAOJIlTMyag_eHBOym20
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndHJreGFkaXN6b3loc2x3ZXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjMyNDc1NiwiZXhwIjoyMDkxOTAwNzU2fQ.IwKVDUZIhyiV6dew6CepShYo5ZCTBlbC-WHS0xn3mKU
SUPABASE_WEBHOOK_SECRET=samadhaan_sheets_sync_secure_2026
```

### Prisma Database URLs
```
DATABASE_URL=postgresql://postgres.fgtrkxadiszoyhslwesu:Alliance@infinity2026@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.fgtrkxadiszoyhslwesu:Alliance@infinity2026@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

### NextAuth Configuration
```
NEXTAUTH_URL=https://hhxr-tb-engine.vercel.app
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
```

### Google OAuth
```
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret
```

---

## 🔥 QStash Configuration (CRITICAL FOR SHEETS SYNC)

```
QSTASH_URL=https://qstash-us-east-1.upstash.io
QSTASH_TOKEN=eyJVc2VySUQiOiIyZjZiOWUwNC04MTkwLTQxYTQtODMzYy02OTM2NTQ0Yjc1Y2IiLCJQYXNzd29yZCI6IjE5NjkxNjQ5YjI3NTRjMDM5M2QwNTE0NzkwMmU2YjUzIn0=
QSTASH_CURRENT_SIGNING_KEY=sig_4pTf55MEQ1qJRVmB48dgjoh1Jwfb
QSTASH_NEXT_SIGNING_KEY=sig_6LReUmaTGHpiAHRn9fTWpibd6Fcf
```

---

## 📊 Upstash Redis Configuration

### Performance Cache
```
UPSTASH_REDIS_REST_URL=https://infinite-snail-94217.upstash.io
UPSTASH_REDIS_REST_TOKEN=gQAAAAAAAXAJAAIgcDI1MTRmYTAyZjdmNjI0YzJhOTk0OTE5YjAzMGEwMWIyYw
```

### Redis Queue (BullMQ)
```
REDIS_URL=redis://default:AZLgASQgNzJkNzY4YzQtMzE0Zi00YzE5LWI3YzAtMzE0ZjRjMTliN2MwYjE4ZjE4YzE4ZjE4YzE4ZjE4YzE4ZjE4YzE4Yw==@gusc1-merry-mink-40234.upstash.io:40234
```

---

## 🤖 AI Configuration

### OpenRouter API Keys (10 keys for rotation)
```
OPENROUTER_API_KEY_1=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
OPENROUTER_API_KEY_2=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
OPENROUTER_API_KEY_3=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
OPENROUTER_API_KEY_4=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
OPENROUTER_API_KEY_5=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
OPENROUTER_API_KEY_6=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
OPENROUTER_API_KEY_7=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
OPENROUTER_API_KEY_8=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
OPENROUTER_API_KEY_9=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
OPENROUTER_API_KEY_10=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
```

### OpenRouter Configuration
```
OPENROUTER_DEFAULT_MODEL=openai/gpt-4o-2024-11-20
OPENROUTER_FALLBACK_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_SITE_URL=https://samadhaan.allianceindia.org/
OPENROUTER_APP_NAME=SAMADHAAN-TB-PWA
```

### Gemini API Keys (Add your actual keys)
```
GOOGLE_GENERATIVE_AI_API_KEY_1=your_actual_key_1
GOOGLE_GENERATIVE_AI_API_KEY_2=your_actual_key_2
```

---

## 📈 Analytics & Monitoring

### PostHog Analytics
```
NEXT_PUBLIC_POSTHOG_KEY=phc_rry25F3rJWzJRhDCooYR2YZRVMnw6P9n9273AoWPJavp
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### Sentry (Add your actual tokens)
```
SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_sentry_auth_token
```

---

## 📄 Google Sheets Integration

```
GOOGLE_SCRIPT_WEBHOOK_URL=https://script.google.com/macros/s/AKfycbyBwLUKiFDY-eLdNOIzNZRsyem0rWiTA6IvelapBjHg8sGdtkTuhQs2hGbXrydeUZSu/exec
ENABLE_SHEETS_SYNC=true
```

---

## 🎤 VAPI Voice Assistant (Optional)

```
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key
VAPI_PRIVATE_KEY=your_vapi_private_key
NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_assistant_id
```

---

## ☁️ Azure Services (Optional)

### Azure Blob Storage
```
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account_name
AZURE_STORAGE_ACCOUNT_KEY=your_storage_account_key
AZURE_STORAGE_CONTAINER_NAME=xray-images
```

### Azure Computer Vision
```
AZURE_COMPUTER_VISION_ENDPOINT=https://your-region.api.cognitive.microsoft.com/
AZURE_COMPUTER_VISION_KEY=your_computer_vision_key
```

---

## 📦 KoboToolbox ETL (Optional)

```
KOBO_API_URL=your_kobo_api_url
KOBO_ASSET_UID=your_asset_uid
KOBO_API_TOKEN=your_kobo_token
KOBO_WEBHOOK_SECRET=alliance_kobo_secure_2026
```

---

## 🚀 Alternative: Bulk Import via Vercel CLI

### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

### Step 2: Login
```bash
vercel login
```

### Step 3: Link Project
```bash
cd c:\Users\farid\Desktop\TB-PWA-Clean
vercel link
```

### Step 4: Create .env.production file
Create a file named `.env.production` with all variables above, then:

```bash
# Import all variables to production
vercel env pull .env.production

# Or add individual variables
vercel env add QSTASH_TOKEN production
vercel env add QSTASH_CURRENT_SIGNING_KEY production
vercel env add QSTASH_NEXT_SIGNING_KEY production
```

---

## ✅ Verification Checklist

After adding all variables:

1. **Redeploy Application**
   - Go to Deployments tab
   - Click "Redeploy" on latest deployment
   - Select "Use existing Build Cache" = OFF

2. **Test Critical Features**
   - [ ] Login with Google OAuth works
   - [ ] Supabase data loads correctly
   - [ ] Google Sheets sync triggers successfully
   - [ ] QStash queue processes jobs
   - [ ] Redis cache responds
   - [ ] AI features work (OpenRouter/Gemini)

3. **Check Logs**
   - Go to Deployments → Click deployment → View Function Logs
   - Look for any missing environment variable errors

---

## 🔒 Security Best Practices

1. **Never commit `.env.local` or `.env.production` to Git**
2. **Rotate secrets regularly** (every 90 days)
3. **Use different keys for Preview vs Production** (if possible)
4. **Monitor Upstash/Vercel usage** to detect anomalies
5. **Enable Vercel's "Secure Environment Variables"** feature

---

## 🐛 Troubleshooting

### Issue: "Environment variable not found"
**Solution:** Make sure variable is added to ALL environments (Production, Preview, Development)

### Issue: QStash jobs not processing
**Solution:** 
1. Verify `QSTASH_TOKEN` is correct
2. Check QStash dashboard: https://console.upstash.com/qstash
3. Ensure webhook endpoint is publicly accessible

### Issue: Redis connection timeout
**Solution:**
1. Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
2. Check Upstash Redis dashboard for connection limits
3. Ensure Vercel region matches Upstash region (use `us-east-1`)

### Issue: Google Sheets sync fails
**Solution:**
1. Test webhook URL directly: `curl -X POST [GOOGLE_SCRIPT_WEBHOOK_URL]`
2. Verify `ENABLE_SHEETS_SYNC=true`
3. Check Apps Script logs in Google Cloud Console

---

## 📞 Support

- **Vercel Docs:** https://vercel.com/docs/environment-variables
- **Upstash QStash:** https://upstash.com/docs/qstash
- **Upstash Redis:** https://upstash.com/docs/redis

---

**Last Updated:** 2025-01-21  
**Project:** SAMADHAAN Health OS (TB-PWA-Clean)  
**Deployment:** https://hhxr-tb-engine.vercel.app
