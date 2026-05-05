@echo off
REM Vercel Environment Variables Setup Script (Windows)
REM Run this after: vercel login && vercel link

echo ========================================
echo Setting up Vercel Environment Variables
echo ========================================
echo.

REM Core Supabase
echo Adding Supabase variables...
echo https://fgtrkxadiszoyhslwesu.supabase.co | vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo sb_publishable_h3ZAJH2NvnhbAOJIlTMyag_eHBOym20 | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndHJreGFkaXN6b3loc2x3ZXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjMyNDc1NiwiZXhwIjoyMDkxOTAwNzU2fQ.IwKVDUZIhyiV6dew6CepShYo5ZCTBlbC-WHS0xn3mKU | vercel env add SUPABASE_SERVICE_ROLE_KEY production
echo samadhaan_sheets_sync_secure_2026 | vercel env add SUPABASE_WEBHOOK_SECRET production

REM Prisma Database
echo Adding Prisma database URLs...
echo postgresql://postgres.fgtrkxadiszoyhslwesu:Alliance@infinity2026@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true | vercel env add DATABASE_URL production
echo postgresql://postgres.fgtrkxadiszoyhslwesu:Alliance@infinity2026@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres | vercel env add DIRECT_URL production

REM NextAuth
echo Adding NextAuth configuration...
echo https://hhxr-tb-engine.vercel.app | vercel env add NEXTAUTH_URL production
echo generate_with_openssl_rand_base64_32 | vercel env add NEXTAUTH_SECRET production

REM QStash (CRITICAL)
echo Adding QStash configuration...
echo https://qstash-us-east-1.upstash.io | vercel env add QSTASH_URL production
echo eyJVc2VySUQiOiIyZjZiOWUwNC04MTkwLTQxYTQtODMzYy02OTM2NTQ0Yjc1Y2IiLCJQYXNzd29yZCI6IjE5NjkxNjQ5YjI3NTRjMDM5M2QwNTE0NzkwMmU2YjUzIn0= | vercel env add QSTASH_TOKEN production
echo sig_4pTf55MEQ1qJRVmB48dgjoh1Jwfb | vercel env add QSTASH_CURRENT_SIGNING_KEY production
echo sig_6LReUmaTGHpiAHRn9fTWpibd6Fcf | vercel env add QSTASH_NEXT_SIGNING_KEY production

REM Upstash Redis
echo Adding Upstash Redis configuration...
echo https://infinite-snail-94217.upstash.io | vercel env add UPSTASH_REDIS_REST_URL production
echo gQAAAAAAAXAJAAIgcDI1MTRmYTAyZjdmNjI0YzJhOTk0OTE5YjAzMGEwMWIyYw | vercel env add UPSTASH_REDIS_REST_TOKEN production
echo redis://default:AZLgASQgNzJkNzY4YzQtMzE0Zi00YzE5LWI3YzAtMzE0ZjRjMTliN2MwYjE4ZjE4YzE4ZjE4YzE4ZjE4YzE4ZjE4YzE4Yw==@gusc1-merry-mink-40234.upstash.io:40234 | vercel env add REDIS_URL production

REM OpenRouter API Keys
echo Adding OpenRouter API keys...
echo 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 | vercel env add OPENROUTER_API_KEY_1 production
echo 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 | vercel env add OPENROUTER_API_KEY_2 production
echo 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 | vercel env add OPENROUTER_API_KEY_3 production
echo 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 | vercel env add OPENROUTER_API_KEY_4 production
echo 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 | vercel env add OPENROUTER_API_KEY_5 production
echo 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 | vercel env add OPENROUTER_API_KEY_6 production
echo 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 | vercel env add OPENROUTER_API_KEY_7 production
echo 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 | vercel env add OPENROUTER_API_KEY_8 production
echo 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 | vercel env add OPENROUTER_API_KEY_9 production
echo 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 | vercel env add OPENROUTER_API_KEY_10 production

REM OpenRouter Config
echo Adding OpenRouter configuration...
echo openai/gpt-4o-2024-11-20 | vercel env add OPENROUTER_DEFAULT_MODEL production
echo anthropic/claude-3.5-sonnet | vercel env add OPENROUTER_FALLBACK_MODEL production
echo https://samadhaan.allianceindia.org/ | vercel env add OPENROUTER_SITE_URL production
echo SAMADHAAN-TB-PWA | vercel env add OPENROUTER_APP_NAME production

REM PostHog Analytics
echo Adding PostHog analytics...
echo phc_rry25F3rJWzJRhDCooYR2YZRVMnw6P9n9273AoWPJavp | vercel env add NEXT_PUBLIC_POSTHOG_KEY production
echo https://us.i.posthog.com | vercel env add NEXT_PUBLIC_POSTHOG_HOST production

REM Google Sheets
echo Adding Google Sheets integration...
echo https://script.google.com/macros/s/AKfycbyBwLUKiFDY-eLdNOIzNZRsyem0rWiTA6IvelapBjHg8sGdtkTuhQs2hGbXrydeUZSu/exec | vercel env add GOOGLE_SCRIPT_WEBHOOK_URL production
echo true | vercel env add ENABLE_SHEETS_SYNC production

REM KoboToolbox
echo Adding KoboToolbox webhook secret...
echo alliance_kobo_secure_2026 | vercel env add KOBO_WEBHOOK_SECRET production

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo MANUAL STEPS REQUIRED:
echo 1. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
echo 2. Add GOOGLE_GENERATIVE_AI_API_KEY_1 and _2
echo 3. Add SENTRY_DSN and SENTRY_AUTH_TOKEN (optional)
echo 4. Add VAPI keys (optional)
echo 5. Add Azure keys (optional)
echo.
echo Next: Run 'vercel --prod' to redeploy
echo.
pause
