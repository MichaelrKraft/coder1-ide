#!/bin/bash

# Coder1 Local Development Startup Script
# This script starts the Coder1 platform with your Claude Code API key configured

echo "🚀 Starting Coder1 Platform - Local Development"
echo "================================================"

# Change to the correct directory
cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please ensure .env file exists with your API keys"
    exit 1
fi

# Check if API key is configured
if grep -q "ANTHROPIC_API_KEY=api03" .env; then
    echo "✅ Anthropic API key detected"
else
    echo "⚠️  Warning: Anthropic API key not found in .env"
fi

echo ""
echo "🖥️  Starting development server..."
echo "📍 Main interface will be available at: http://localhost:3000"
echo "📍 Product Creation Hub: http://localhost:3000"
echo "📍 Terminal Interface: http://localhost:3000/terminal-interface.html"
echo ""
echo "Press Ctrl+C to stop the server"
echo "================================================"
echo ""

# Start the development server
npm run dev