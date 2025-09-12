#!/bin/bash

# Coder1 IDE Stop Script
# Gracefully stops all services

echo "🛑 Coder1 IDE Stop"
echo "=================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to kill process by PID
kill_pid() {
    local pid=$1
    local name=$2
    
    if [ -n "$pid" ] && ps -p $pid > /dev/null 2>&1; then
        echo -e "${BLUE}🔪 Stopping $name (PID: $pid)${NC}"
        kill -TERM $pid 2>/dev/null
        
        # Wait up to 10 seconds for graceful shutdown
        for i in {1..10}; do
            if ! ps -p $pid > /dev/null 2>&1; then
                echo -e "${GREEN}✅ $name stopped gracefully${NC}"
                return 0
            fi
            sleep 1
        done
        
        # Force kill if still running
        echo -e "${YELLOW}⚠️ Force killing $name${NC}"
        kill -KILL $pid 2>/dev/null
        sleep 1
        
        if ! ps -p $pid > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $name force stopped${NC}"
        else
            echo -e "${RED}❌ Failed to stop $name${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️ $name not running (PID: $pid)${NC}"
    fi
    return 0
}

# Function to kill processes by port
kill_port() {
    local port=$1
    local name=$2
    
    if lsof -i :$port >/dev/null 2>&1; then
        echo -e "${BLUE}🔪 Killing processes on port $port ($name)${NC}"
        lsof -ti :$port | xargs kill -TERM 2>/dev/null
        sleep 2
        
        if lsof -i :$port >/dev/null 2>&1; then
            echo -e "${YELLOW}⚠️ Force killing processes on port $port${NC}"
            lsof -ti :$port | xargs kill -KILL 2>/dev/null
            sleep 1
        fi
        
        if ! lsof -i :$port >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Port $port cleared${NC}"
        else
            echo -e "${RED}❌ Failed to clear port $port${NC}"
        fi
    else
        echo -e "${GREEN}✅ Port $port already clear${NC}"
    fi
}

# Stop services using saved PIDs
echo -e "\n${BLUE}🔍 Checking saved PIDs${NC}"

if [ -f ".coder1/express.pid" ]; then
    EXPRESS_PID=$(cat .coder1/express.pid 2>/dev/null)
    kill_pid "$EXPRESS_PID" "Express Backend"
    rm -f .coder1/express.pid
fi

if [ -f ".coder1/nextjs.pid" ]; then
    NEXTJS_PID=$(cat .coder1/nextjs.pid 2>/dev/null)
    kill_pid "$NEXTJS_PID" "Next.js Frontend"
    rm -f .coder1/nextjs.pid
fi

# Fallback: kill by port
echo -e "\n${BLUE}🧹 Cleaning up ports${NC}"
kill_port 3000 "Express Backend"
kill_port 3001 "Next.js Frontend"

# Clean up any remaining Node.js processes for this project
echo -e "\n${BLUE}🔍 Cleaning up project processes${NC}"
PROJECT_DIR=$(pwd)
pkill -f "$PROJECT_DIR" 2>/dev/null || true

# Clean up agent locks
echo -e "\n${BLUE}🔓 Cleaning up agent locks${NC}"
if [ -f "scripts/lock-system.js" ]; then
    node scripts/lock-system.js clear
else
    echo -e "${YELLOW}⚠️ Lock system not found - manual cleanup may be needed${NC}"
fi

# Final verification
echo -e "\n${BLUE}🔍 Verifying shutdown${NC}"
if lsof -i :3000 >/dev/null 2>&1 || lsof -i :3001 >/dev/null 2>&1; then
    echo -e "${RED}❌ Some processes may still be running${NC}"
    echo -e "${YELLOW}💡 Try: lsof -i :3000 and lsof -i :3001${NC}"
    exit 1
else
    echo -e "${GREEN}✅ All services stopped successfully${NC}"
    echo -e "${GREEN}🎉 Coder1 IDE shutdown complete${NC}"
    exit 0
fi