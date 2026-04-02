#!/bin/bash
# Rebuild and restart the GGCoder RC PWA server
set -e

PROJ_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="/tmp/ggcoder-pwa-server.log"

cd "$PROJ_DIR"
echo "Building frontend..."
npx vite build 2>&1 | tail -3
echo "Killing old server..."
fuser -k 3847/tcp 2>/dev/null || true
fuser -k 3848/tcp 2>/dev/null || true
sleep 1
echo "Starting server..."
NODE_ENV=production nohup npx tsx server/index.ts >> "$LOG_FILE" 2>&1 &
sleep 2
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3847/)
HTTPS_STATUS=$(curl -sk -o /dev/null -w "%{http_code}" https://localhost:3848/ 2>/dev/null || echo "N/A")
if [ "$STATUS" = "200" ]; then
  echo "✅ HTTP  running on http://0.0.0.0:3847/"
  if [ "$HTTPS_STATUS" = "200" ]; then
    echo "✅ HTTPS running on https://0.0.0.0:3848/ (PWA-ready)"
  else
    echo "⚠️  HTTPS not available (status: $HTTPS_STATUS) — PWA install won't work on mobile"
  fi
else
  echo "❌ Server failed (HTTP $STATUS)"
  tail -10 "$LOG_FILE"
fi
