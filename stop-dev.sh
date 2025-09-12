#!/bin/bash

# 🛑 Coder1 Development Stop Script
# Companion to start-dev.sh for clean shutdown

echo "🛑 Stopping Coder1 Development Environment"
echo "========================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to kill process by PID if it exists
kill_pid() {
    local pid=$1
    local service=$2
    
    if [ -n "$pid" ] && kill -0 $pid 2>/dev/null; then
        echo "🛑 Stopping $service (PID: $pid)..."
        kill -TERM $pid 2>/dev/null
        
        # Wait for graceful shutdown
        local attempts=0
        while kill -0 $pid 2>/dev/null && [ $attempts -lt 10 ]; do
            sleep 1
            attempts=$((attempts + 1))
        done
        
        # Force kill if still running
        if kill -0 $pid 2>/dev/null; then
            echo "⚡ Force stopping $service..."
            kill -9 $pid 2>/dev/null
        fi
        
        echo "✅ $service stopped"
    else
        echo "ℹ️  $service was not running"
    fi
}

# Stop services using saved PIDs
if [ -f .pids/backend.pid ]; then
    BACKEND_PID=$(cat .pids/backend.pid 2>/dev/null)
    kill_pid "$BACKEND_PID" "Express Backend"
    rm -f .pids/backend.pid
fi

if [ -f .pids/frontend.pid ]; then
    FRONTEND_PID=$(cat .pids/frontend.pid 2>/dev/null)  
    kill_pid "$FRONTEND_PID" "Next.js Frontend"
    rm -f .pids/frontend.pid
fi

# Clean up any remaining processes on the ports
echo ""
echo "🧹 Cleaning up ports..."

# Kill any remaining processes on port 3000
if lsof -ti:3000 >/dev/null 2>&1; then
    echo "🧹 Clearing remaining processes on port 3000..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fi

# Kill any remaining processes on port 3001
if lsof -ti:3001 >/dev/null 2>&1; then
    echo "🧹 Clearing remaining processes on port 3001..."
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
fi

# Clean up PID directory
rmdir .pids 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ All services stopped successfully${NC}"
echo ""
echo "📋 Log files preserved:"
echo "   • logs/express-backend.log"
echo "   • logs/nextjs-frontend.log" 
echo ""
echo "🚀 To restart: ./start-dev.sh"