@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM SAMADHAAN OS - Environment Variable Verification Script
REM Checks that all critical environment variables are set correctly
REM ═══════════════════════════════════════════════════════════════════════════

echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo SAMADHAAN OS - Environment Variable Verification
echo ═══════════════════════════════════════════════════════════════════════════
echo.

REM Check if .env.local exists
if not exist ".env.local" (
    echo ❌ ERROR: .env.local file not found!
    echo Please create .env.local from .env.example
    pause
    exit /b 1
)

echo ✅ .env.local file found
echo.
echo Checking critical environment variables...
echo.

REM Check GOOGLE_SCRIPT_WEBHOOK_URL
findstr /C:"GOOGLE_SCRIPT_WEBHOOK_URL" .env.local >nul
if %errorlevel% equ 0 (
    echo ✅ GOOGLE_SCRIPT_WEBHOOK_URL is set
    findstr /C:"GOOGLE_SCRIPT_WEBHOOK_URL" .env.local
) else (
    echo ❌ GOOGLE_SCRIPT_WEBHOOK_URL is MISSING!
    echo Add this line to .env.local:
    echo GOOGLE_SCRIPT_WEBHOOK_URL=https://script.google.com/macros/s/AKfycby3f0PRiH-Gp8dPVegdbptNKSa2qDqwONH-MLq0wdl37pu5GC6jthXNIYpQ7AaObx2I/exec
)
echo.

REM Check for old GOOGLE_APPSCRIPT_URL (should NOT exist)
findstr /C:"GOOGLE_APPSCRIPT_URL" .env.local >nul
if %errorlevel% equ 0 (
    echo ⚠️  WARNING: GOOGLE_APPSCRIPT_URL found (deprecated)
    echo Please remove it and use GOOGLE_SCRIPT_WEBHOOK_URL instead
    findstr /C:"GOOGLE_APPSCRIPT_URL" .env.local
) else (
    echo ✅ No deprecated GOOGLE_APPSCRIPT_URL found
)
echo.

REM Check GOOGLE_SHEET_ID
findstr /C:"GOOGLE_SHEET_ID" .env.local >nul
if %errorlevel% equ 0 (
    echo ✅ GOOGLE_SHEET_ID is set
) else (
    echo ❌ GOOGLE_SHEET_ID is MISSING!
)
echo.

REM Check GOOGLE_SERVICE_ACCOUNT_KEY
findstr /C:"GOOGLE_SERVICE_ACCOUNT_KEY" .env.local >nul
if %errorlevel% equ 0 (
    echo ✅ GOOGLE_SERVICE_ACCOUNT_KEY is set
) else (
    echo ❌ GOOGLE_SERVICE_ACCOUNT_KEY is MISSING!
)
echo.

REM Check Supabase credentials
findstr /C:"NEXT_PUBLIC_SUPABASE_URL" .env.local >nul
if %errorlevel% equ 0 (
    echo ✅ NEXT_PUBLIC_SUPABASE_URL is set
) else (
    echo ❌ NEXT_PUBLIC_SUPABASE_URL is MISSING!
)
echo.

findstr /C:"SUPABASE_SERVICE_ROLE_KEY" .env.local >nul
if %errorlevel% equ 0 (
    echo ✅ SUPABASE_SERVICE_ROLE_KEY is set
) else (
    echo ❌ SUPABASE_SERVICE_ROLE_KEY is MISSING!
)
echo.

echo ═══════════════════════════════════════════════════════════════════════════
echo Verification Complete
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo Next steps:
echo 1. Fix any ❌ errors above
echo 2. Run: add-vercel-env-sheets-webhook.bat (to sync to Vercel)
echo 3. Run: vercel env ls (to verify Vercel environment)
echo 4. Run: vercel --prod (to redeploy with new env vars)
echo.
pause
