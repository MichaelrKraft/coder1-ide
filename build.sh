#!/bin/bash

# Render Build Script - Ensures proper directory and dependencies
echo "🚀 Starting Coder1 IDE build process..."

# Change to the correct directory
cd coder1-ide-next

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run the build
echo "🔨 Building Next.js application..."
npm run build

echo "✅ Build complete!"