@echo off
REM TB-PWA Vercel Environment Variables Setup (Windows)
REM Run: scripts\setup-vercel-env.bat

echo ========================================
echo TB-PWA Vercel Environment Setup
echo ========================================
echo.

echo [1/6] Setting NEXT_PUBLIC_SUPABASE_URL...
echo https://fgtrkxadiszoyhslwesu.supabase.co | vercel env add NEXT_PUBLIC_SUPABASE_URL production

echo [2/6] Setting NEXT_PUBLIC_SUPABASE_ANON_KEY...
echo sb_publishable_h3ZAJH2NvnhbAOJIlTMyag_eHBOym20 | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

echo [3/6] Setting SUPABASE_SERVICE_ROLE_KEY...
echo eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndHJreGFkaXN6b3loc2x3ZXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjMyNDc1NiwiZXhwIjoyMDkxOTAwNzU2fQ.IwKVDUZIhyiV6dew6CepShYo5ZCTBlbC-WHS0xn3mKU | vercel env add SUPABASE_SERVICE_ROLE_KEY production

echo [4/6] Setting DATABASE_URL...
echo postgresql://postgres.fgtrkxadiszoyhslwesu:Alliance@infinity2026@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true | vercel env add DATABASE_URL production

echo [5/6] Setting DIRECT_URL...
echo postgresql://postgres.fgtrkxadiszoyhslwesu:Alliance@infinity2026@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres | vercel env add DIRECT_URL production

echo [6/6] Setting NEXTAUTH_URL...
echo https://hhxr-tb-engine.vercel.app | vercel env add NEXTAUTH_URL production

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next Steps:
echo 1. Deploy: vercel --prod
echo 2. Test: https://hhxr-tb-engine.vercel.app
echo 3. Monitor logs for any issues
echo.
pause
