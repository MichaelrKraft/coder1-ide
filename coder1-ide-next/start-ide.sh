#!/bin/bash

# Coder1 IDE Startup Script
# This script starts both the custom server and CSS monitor

echo "🚀 Starting Coder1 IDE..."
echo "================================"

# Check if processes are already running
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 3001 is already in use. Killing existing process..."
    lsof -ti :3001 | xargs kill -9
    sleep 2
fi

# Start CSS monitor in background
echo "📊 Starting CSS Monitor..."
node scripts/css-monitor.js &
CSS_MONITOR_PID=$!
echo "   ✓ CSS Monitor started (PID: $CSS_MONITOR_PID)"

# Start custom server
echo "🔧 Starting Custom Server..."
PORT=3001 node server.js &
SERVER_PID=$!
echo "   ✓ Server started (PID: $SERVER_PID)"

echo ""
echo "================================"
echo "✅ Coder1 IDE is running!"
echo ""
echo "🌐 IDE URL: http://localhost:3001/ide"
echo "📊 CSS Monitor PID: $CSS_MONITOR_PID"
echo "🔧 Server PID: $SERVER_PID"
echo ""
echo "To stop: Press Ctrl+C or run 'kill $SERVER_PID $CSS_MONITOR_PID'"
echo "================================"

# Function to handle shutdown
cleanup() {
    echo ""
    echo "🛑 Shutting down Coder1 IDE..."
    kill $SERVER_PID 2>/dev/null
    kill $CSS_MONITOR_PID 2>/dev/null
    echo "✅ Shutdown complete"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Wait for processes
wait $SERVER_PID