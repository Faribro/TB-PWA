#!/bin/bash

# Deployment Optimization Script for Vercel

echo "🚀 Starting deployment optimization..."

# Clean up build artifacts
echo "🧹 Cleaning build artifacts..."
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies with production optimizations
echo "📦 Installing optimized dependencies..."
bun install --production

# Build with optimizations
echo "🔨 Building with optimizations..."
NODE_ENV=production bun run build

# Analyze bundle size
echo "📊 Analyzing bundle size..."
npx @next/bundle-analyzer

echo "✅ Deployment optimization complete!"
echo "📝 Remember to:"
echo "   1. Update NEXTAUTH_URL in Vercel environment variables"
echo "   2. Update NEXT_PUBLIC_APP_URL in Vercel environment variables"
echo "   3. Add Google OAuth redirect URI for your Vercel domain"