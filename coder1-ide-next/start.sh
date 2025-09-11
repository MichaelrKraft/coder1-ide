#!/bin/bash
# Render start script - ensures complete .next build exists

echo "=== Checking for Next.js build ==="
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

if [ -f ".next/BUILD_ID" ]; then
  echo "✅ BUILD_ID found: $(cat .next/BUILD_ID)"
  echo "=== .next directory contents ==="
  ls -la .next/
else
  echo "❌ BUILD_ID not found, rebuilding..."
  
  # Clean any partial build
  rm -rf .next
  
  # Rebuild
  echo "=== Running build ==="
  npm run build
  
  if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
  fi
  
  echo "✅ Build completed"
  echo "=== Verifying build ==="
  ls -la .next/
fi

echo "=== Starting Next.js server ==="
npx next start -p $PORT