#!/bin/bash
# Render build script for standalone deployment

echo "=== Starting standalone build ==="
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

echo "=== Installing dependencies ==="
npm ci

echo "=== Building Next.js app in standalone mode ==="
npm run build

echo "=== Copying static assets to standalone ==="
cp -r public .next/standalone/public 2>/dev/null || true
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true

echo "=== Verifying standalone build ==="
if [ -f ".next/standalone/server.js" ]; then
  echo "✅ Standalone server.js exists"
  echo "=== Standalone directory contents ==="
  ls -la .next/standalone/
else
  echo "❌ Standalone build failed!"
  exit 1
fi

echo "=== Build complete ==="