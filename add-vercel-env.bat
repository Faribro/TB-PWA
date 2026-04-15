@echo off
echo Adding environment variables to Vercel...
echo.

vercel env add NEXT_PUBLIC_SUPABASE_URL production -y < nul
echo https://wwcgybgvfulotflitogu.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production -y < nul
echo eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODk5NDEsImV4cCI6MjA4ODI2NTk0MX0.-6bbuayttYMEhSKih0T4yUU_FFFvuKcWtrxW9yiwDE8

vercel env add SUPABASE_SERVICE_ROLE_KEY production -y < nul
echo eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M

vercel env add GOOGLE_CLIENT_ID production -y < nul
echo 224533121737-bqufgmoukeohomosvt0o144du46pm0op.apps.googleusercontent.com

vercel env add GOOGLE_CLIENT_SECRET production -y < nul
echo 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

vercel env add NEXTAUTH_SECRET production -y < nul
echo e1ec36ccfface5abd4d6075ea83f627ee932b3bd105ff4e364589c8ed9283166

vercel env add AUTH_SECRET production -y < nul
echo e1ec36ccfface5abd4d6075ea83f627ee932b3bd105ff4e364589c8ed9283166

vercel env add NEXTAUTH_URL production -y < nul
echo https://tb-pwa.vercel.app

vercel env add AUTH_URL production -y < nul
echo https://tb-pwa.vercel.app

echo.
echo ✅ All environment variables added!
echo Now run: vercel --prod
