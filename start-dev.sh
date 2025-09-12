#!/bin/bash

# 🚀 Coder1 Development Startup Script
# This script prevents terminal session loss by enforcing correct port configuration

set -e  # Exit on any error

echo "🚀 Coder1 Development Environment Startup"
echo "========================================"
echo ""

# Color codes for better visibility
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -ti:$port >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill processes on a port
kill_port() {
    local port=$1
    echo "🧹 Clearing port $port..."
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 2
}

# Function to wait for port to be available
wait_for_port() {
    local port=$1
    local service=$2
    local max_attempts=30
    local attempt=0
    
    echo "⏳ Waiting for $service to start on port $port..."
    while [ $attempt -lt $max_attempts ]; do
        if check_port $port; then
            echo "✅ $service is running on port $port"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service failed to start on port $port after ${max_attempts}s"
    return 1
}

# Check for required directories
if [ ! -d "coder1-ide-next" ]; then
    echo -e "${RED}❌ Error: coder1-ide-next directory not found${NC}"
    echo "   Make sure you're running this from the autonomous_vibe_interface directory"
    exit 1
fi

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
kill_port 3000  # Express backend
kill_port 3001  # Next.js frontend

echo ""
echo "📚 Port Configuration:"
echo "   • Express Backend: http://localhost:3000 (APIs, WebSocket, Terminal)"
echo "   • Next.js Frontend: http://localhost:3001 (IDE Interface)"
echo ""

# Check if PM2 is available and user prefers it
if command -v pm2 &> /dev/null; then
    echo -e "${BLUE}💡 PM2 detected. Use PM2 for production deployment.${NC}"
    echo "   For now, starting with direct node processes for development..."
    echo ""
fi

# Start Express backend
echo "🖥️  Starting Express Backend (Port 3000)..."
echo "   Command: PORT=3000 npm start"
export PORT=3000
npm start > logs/express-backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to start
if ! wait_for_port 3000 "Express Backend"; then
    echo -e "${RED}❌ Failed to start Express backend${NC}"
    echo "Check logs/express-backend.log for details"
    exit 1
fi

# Start Next.js frontend
echo ""
echo "⚛️  Starting Next.js Frontend (Port 3001)..."
echo "   Command: cd coder1-ide-next && npm run dev"
cd coder1-ide-next
npm run dev > ../logs/nextjs-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
cd ..

# Wait for frontend to start  
if ! wait_for_port 3001 "Next.js Frontend"; then
    echo -e "${RED}❌ Failed to start Next.js frontend${NC}"
    echo "Check logs/nextjs-frontend.log for details"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Both services started successfully!${NC}"
echo ""
echo "🌐 Access URLs:"
echo "   • Main Interface: http://localhost:3000"
echo "   • IDE Interface:  http://localhost:3001"  
echo "   • Health Check:   http://localhost:3000/health"
echo ""
echo "📊 Process Information:"
echo "   • Backend PID:  $BACKEND_PID (logs/express-backend.log)"
echo "   • Frontend PID: $FRONTEND_PID (logs/nextjs-frontend.log)"
echo ""
echo "🛑 To stop services:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "   Or use: ./stop-dev.sh"
echo ""
echo "📋 Monitoring:"
echo "   • Backend logs:  tail -f logs/express-backend.log"
echo "   • Frontend logs: tail -f logs/nextjs-frontend.log"
echo "   • All logs:      tail -f logs/*.log"
echo ""

# Save PIDs for stop script
mkdir -p .pids
echo $BACKEND_PID > .pids/backend.pid
echo $FRONTEND_PID > .pids/frontend.pid

echo -e "${GREEN}🎉 Coder1 development environment is ready!${NC}"
echo ""
echo "💡 Pro tips:"
echo "   • Terminal sessions will now persist correctly"
echo "   • No more 'session not found' errors"
echo "   • Use Ctrl+C to see shutdown options"
echo ""

# Set up signal handlers for clean shutdown
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    rm -f .pids/*.pid
    echo "✅ Services stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Keep the script running and show logs
echo "👀 Showing combined logs (Ctrl+C to stop):"
echo "----------------------------------------"
tail -f logs/*.log 2>/dev/null || {
    echo "📝 Logs will appear here as services generate them..."
    while true; do
        if [ -f logs/express-backend.log ] || [ -f logs/nextjs-frontend.log ]; then
            tail -f logs/*.log 2>/dev/null
            break
        fi
        sleep 1
    done
}