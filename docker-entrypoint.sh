#!/usr/bin/env sh
set -e

echo "═══════════════════════════════════════════════════════════════════"
echo "🚀 Starting SAMADHAAN (TB-PWA) Production Container"
echo "   Port: ${PORT:-3001}"
echo "   Node: $(node -v)"
echo "═══════════════════════════════════════════════════════════════════"

exec node server.js
