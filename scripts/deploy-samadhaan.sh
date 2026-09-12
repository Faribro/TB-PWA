#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="localhost/samadhaan-pwa:latest"
CONTAINER_NAME="samadhaan-pwa"
PORT=3002

echo "═══════════════════════════════════════════════════════════════════"
echo "🚀 Building SAMADHAAN (TB-PWA) Production Container"
echo "═══════════════════════════════════════════════════════════════════"

podman build -t "$IMAGE_NAME" -f Dockerfile .

echo "🛑 Stopping any previous container instance..."
podman stop "$CONTAINER_NAME" 2>/dev/null || true
podman rm "$CONTAINER_NAME" 2>/dev/null || true

echo "▶️ Launching $CONTAINER_NAME on port $PORT..."
podman run -d \
  --name "$CONTAINER_NAME" \
  --network host \
  --security-opt no-new-privileges \
  --env-file .env.production \
  --restart always \
  "$IMAGE_NAME"

echo "✅ Container started. Checking status..."
sleep 4
podman ps --filter name="$CONTAINER_NAME"
