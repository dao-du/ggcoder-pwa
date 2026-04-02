#!/bin/bash
# Rebuild and restart the GGCoder RC PWA server
set -e
cd /tmp/ggcoder-pwa
echo "Building frontend..."
npx vite build 2>&1 | tail -3
echo "Killing old server..."
fuser -k 3847/tcp 2>/dev/null || true
sleep 1
echo "Starting server..."
NODE_ENV=production nohup npx tsx server/index.ts >> /tmp/ggcoder-pwa-server.log 2>&1 &
sleep 2
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3847/)
if [ "$STATUS" = "200" ]; then
  echo "✅ PWA running on http://0.0.0.0:3847/"
else
  echo "❌ Server failed (HTTP $STATUS)"
  tail -10 /tmp/ggcoder-pwa-server.log
fi
