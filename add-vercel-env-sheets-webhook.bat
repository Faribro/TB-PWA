@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM Add GOOGLE_SCRIPT_WEBHOOK_URL to Vercel Environment Variables
REM Run this from project root after installing Vercel CLI: npm i -g vercel
REM ═══════════════════════════════════════════════════════════════════════════

echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo SAMADHAAN OS - Add Google Sheets Webhook URL to Vercel
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo This will add GOOGLE_SCRIPT_WEBHOOK_URL to all environments:
echo - Production
echo - Preview
echo - Development
echo.
echo URL to be added:
echo https://script.google.com/macros/s/AKfycby3f0PRiH-Gp8dPVegdbptNKSa2qDqwONH-MLq0wdl37pu5GC6jthXNIYpQ7AaObx2I/exec
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo.
pause

echo.
echo Adding to Production environment...
echo https://script.google.com/macros/s/AKfycby3f0PRiH-Gp8dPVegdbptNKSa2qDqwONH-MLq0wdl37pu5GC6jthXNIYpQ7AaObx2I/exec | vercel env add GOOGLE_SCRIPT_WEBHOOK_URL production

echo.
echo Adding to Preview environment...
echo https://script.google.com/macros/s/AKfycby3f0PRiH-Gp8dPVegdbptNKSa2qDqwONH-MLq0wdl37pu5GC6jthXNIYpQ7AaObx2I/exec | vercel env add GOOGLE_SCRIPT_WEBHOOK_URL preview

echo.
echo Adding to Development environment...
echo https://script.google.com/macros/s/AKfycby3f0PRiH-Gp8dPVegdbptNKSa2qDqwONH-MLq0wdl37pu5GC6jthXNIYpQ7AaObx2I/exec | vercel env add GOOGLE_SCRIPT_WEBHOOK_URL development

echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo ✅ GOOGLE_SCRIPT_WEBHOOK_URL added to all environments!
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo Next steps:
echo 1. Verify: vercel env ls
echo 2. Redeploy: vercel --prod
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo.
pause
