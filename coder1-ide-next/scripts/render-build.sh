#!/bin/bash

# Render Build Script
# Optimized for production deployment on Render

echo "🚀 Starting Render production build..."

# Set environment variables for build
export NODE_ENV=production
export RENDER=true
export SKIP_BRIDGE_VALIDATION=true
export NEXT_TELEMETRY_DISABLED=1

# Memory optimization for Render's 512MB limit
export NODE_OPTIONS="--max-old-space-size=400"

echo "📦 Installing dependencies..."
npm ci --production=false

echo "🔨 Building Next.js application..."
npm run build

echo "✅ Build complete!"

# Clean up unnecessary files to save space
echo "🧹 Cleaning up build artifacts..."
rm -rf .next/cache
rm -rf node_modules/.cache

echo "📊 Build size:"
du -sh .next

echo "✨ Render build completed successfully!"