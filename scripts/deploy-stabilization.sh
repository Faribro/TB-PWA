#!/usr/bin/env bash
set -e

echo "═══════════════════════════════════════════════════════════════════════════"
echo "🚀 TB-PWA ENTERPRISE STABILIZATION DEPLOYMENT"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

# Check if on correct branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "enterprise-stabilization" ]; then
  echo "⚠️  Not on enterprise-stabilization branch. Creating..."
  git checkout -b enterprise-stabilization
fi

echo "📦 Step 1: Installing dependencies..."
bun install

echo ""
echo "🔍 Step 2: Type checking..."
bun x tsc --noEmit

echo ""
echo "🏗️  Step 3: Building production bundle..."
bun run build

echo ""
echo "✅ Build successful!"
echo ""
echo "📊 Step 4: Running database migrations..."
echo "Run manually: supabase db push"
echo "Or apply via Supabase Dashboard SQL Editor:"
echo "  - supabase/migrations/20250122_service_role_rls.sql"
echo ""

echo "🧪 Step 5: Testing locally..."
echo "Start dev server: bun run dev"
echo "Test endpoints:"
echo "  - http://localhost:3000/api/patients?page=1&pageSize=100"
echo "  - http://localhost:3000/api/vertex/metrics?view=month"
echo ""

echo "🚢 Step 6: Deploy to Vercel..."
echo "Preview: vercel"
echo "Production: vercel --prod"
echo ""

echo "📈 Step 7: Monitor deployment..."
echo "Vercel Logs: https://vercel.com/dashboard"
echo "Supabase Analytics: https://supabase.com/dashboard/project/wwcgybgvfulotflitogu"
echo ""

echo "✅ SUCCESS CRITERIA:"
echo "  [ ] Single GoTrueClient warning in console"
echo "  [ ] Dashboard loads <2s with 100 patients"
echo "  [ ] Vertex metrics render (no 522 errors)"
echo "  [ ] Patient drawer save <1s"
echo "  [ ] No 500 errors in Vercel logs"
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
