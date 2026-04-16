#!/bin/bash
# TB-PWA Vercel Environment Variables Setup
# Run: bash scripts/setup-vercel-env.sh

echo "🚀 Setting up Vercel Environment Variables for TB-PWA"
echo "=================================================="

# Production Environment
echo ""
echo "📦 PRODUCTION Environment"
echo "------------------------"

vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< "https://fgtrkxadiszoyhslwesu.supabase.co"
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<< "sb_publishable_h3ZAJH2NvnhbAOJIlTMyag_eHBOym20"
vercel env add SUPABASE_SERVICE_ROLE_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndHJreGFkaXN6b3loc2x3ZXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjMyNDc1NiwiZXhwIjoyMDkxOTAwNzU2fQ.IwKVDUZIhyiV6dew6CepShYo5ZCTBlbC-WHS0xn3mKU"

vercel env add DATABASE_URL production <<< "postgresql://postgres.fgtrkxadiszoyhslwesu:Alliance@infinity2026@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
vercel env add DIRECT_URL production <<< "postgresql://postgres.fgtrkxadiszoyhslwesu:Alliance@infinity2026@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

vercel env add NEXTAUTH_URL production <<< "https://hhxr-tb-engine.vercel.app"

echo ""
echo "✅ Production environment variables configured!"
echo ""
echo "🎯 Next Steps:"
echo "1. Deploy: vercel --prod"
echo "2. Test auth: https://hhxr-tb-engine.vercel.app"
echo "3. Verify database connection in production logs"
