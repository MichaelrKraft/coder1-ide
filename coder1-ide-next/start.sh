#!/bin/bash
# Render start script - ensures .next directory exists

echo "=== Checking for .next directory ==="
if [ ! -d ".next" ]; then
  echo "❌ .next directory not found, rebuilding..."
  npm run build
  
  if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
  fi
  
  echo "✅ Build completed"
else
  echo "✅ .next directory exists"
fi

echo "=== Starting Next.js server ==="
npx next start -p $PORT