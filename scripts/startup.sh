#!/bin/bash

# Coder1 IDE Startup Script
# Ensures clean startup with proper port management

echo "🚀 Coder1 IDE Startup"
echo "===================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local name=$2
    
    echo -e "${BLUE}🔍 Checking port $port ($name)${NC}"
    
    if lsof -i :$port >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ Port $port occupied - cleaning up${NC}"
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
        sleep 2
        
        if lsof -i :$port >/dev/null 2>&1; then
            echo -e "${RED}❌ Failed to free port $port${NC}"
            return 1
        else
            echo -e "${GREEN}✅ Port $port freed${NC}"
        fi
    else
        echo -e "${GREEN}✅ Port $port available${NC}"
    fi
    return 0
}

# Function to wait for service to start
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${BLUE}⏳ Waiting for $name to start...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s $url >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $name is ready${NC}"
            return 0
        fi
        
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo -e "\n${RED}❌ $name failed to start within $max_attempts seconds${NC}"
    return 1
}

# Clean up old processes
echo -e "\n${BLUE}🧹 Cleaning up ports${NC}"
kill_port 3000 "Express Backend"
kill_port 3001 "Next.js Frontend"

# Clean up lock files
echo -e "\n${BLUE}🔓 Cleaning up agent locks${NC}"
if [ -f "scripts/lock-system.js" ]; then
    node scripts/lock-system.js cleanup 0
else
    echo -e "${YELLOW}⚠️ Lock system not found - skipping cleanup${NC}"
fi

# Clear Next.js cache
echo -e "\n${BLUE}🗑️ Clearing Next.js cache${NC}"
if [ -d "coder1-ide-next/.next" ]; then
    rm -rf coder1-ide-next/.next
    echo -e "${GREEN}✅ Cache cleared${NC}"
else
    echo -e "${GREEN}✅ Cache already clean${NC}"
fi

# Validate environment
echo -e "\n${BLUE}🔧 Validating environment${NC}"

if [ ! -f "coder1-ide-next/.env.local" ]; then
    echo -e "${RED}❌ Missing .env.local file${NC}"
    exit 1
fi

if ! grep -q "EXPRESS_BACKEND_URL=http://localhost:3000" coder1-ide-next/.env.local; then
    echo -e "${RED}❌ Incorrect EXPRESS_BACKEND_URL configuration${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment validated${NC}"

# Start Express Backend
echo -e "\n${BLUE}🎯 Starting Express Backend (port 3000)${NC}"
cd "$(dirname "$0")/.."
PORT=3000 npm run dev >/dev/null 2>&1 &
EXPRESS_PID=$!
echo -e "${GREEN}✅ Express Backend started (PID: $EXPRESS_PID)${NC}"

# Wait for Express to be ready
if wait_for_service "http://localhost:3000/health" "Express Backend"; then
    echo -e "${GREEN}✅ Express Backend healthy${NC}"
else
    echo -e "${RED}❌ Express Backend failed to start${NC}"
    kill $EXPRESS_PID 2>/dev/null
    exit 1
fi

# Start Next.js Frontend
echo -e "\n${BLUE}⚡ Starting Next.js Frontend (port 3001)${NC}"
cd coder1-ide-next
PORT=3001 npm run dev >/dev/null 2>&1 &
NEXTJS_PID=$!
cd ..
echo -e "${GREEN}✅ Next.js Frontend started (PID: $NEXTJS_PID)${NC}"

# Wait for Next.js to be ready
if wait_for_service "http://localhost:3001" "Next.js Frontend"; then
    echo -e "${GREEN}✅ Next.js Frontend healthy${NC}"
else
    echo -e "${RED}❌ Next.js Frontend failed to start${NC}"
    kill $EXPRESS_PID 2>/dev/null
    kill $NEXTJS_PID 2>/dev/null
    exit 1
fi

# Run health check
echo -e "\n${BLUE}🏥 Running health check${NC}"
if [ -f "scripts/health-check.sh" ]; then
    ./scripts/health-check.sh
    HEALTH_STATUS=$?
else
    echo -e "${YELLOW}⚠️ Health check script not found${NC}"
    HEALTH_STATUS=0
fi

# Save PIDs for later cleanup
echo "$EXPRESS_PID" > .coder1/express.pid
echo "$NEXTJS_PID" > .coder1/nextjs.pid

# Final report
echo -e "\n${BLUE}📊 Startup Summary${NC}"
echo "======================="

if [ $HEALTH_STATUS -eq 0 ]; then
    echo -e "🎉 ${GREEN}CODER1 IDE STARTED SUCCESSFULLY${NC}"
    echo -e "✅ Express Backend: http://localhost:3000"
    echo -e "✅ Next.js Frontend: http://localhost:3001"
    echo -e "✅ IDE Interface: http://localhost:3001/ide"
    echo ""
    echo -e "📝 PIDs saved:"
    echo -e "   Express: $EXPRESS_PID"
    echo -e "   Next.js: $NEXTJS_PID"
    echo ""
    echo -e "🛑 To stop: ./scripts/stop.sh"
    exit 0
else
    echo -e "⚠️ ${RED}STARTUP COMPLETED WITH WARNINGS${NC}"
    echo -e "🔧 System may need manual attention"
    exit 1
fi