#!/bin/bash
# Render build script

echo "=== Starting build ==="
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

echo "=== Installing dependencies ==="
npm ci

echo "=== Building Next.js app ==="
npm run build

echo "=== Verifying build output ==="
if [ -d ".next" ]; then
  echo "✅ Build directory exists"
  ls -la .next/
else
  echo "❌ Build directory missing!"
  exit 1
fi

echo "=== Build complete ==="