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

echo "=== Build complete ==="