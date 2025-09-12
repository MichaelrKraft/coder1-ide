#!/bin/bash

# ============================================
# Coder1 IDE Startup Script
# Starts both Express and Next.js servers
# ============================================

echo "🚀 Starting Coder1 IDE..."
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Function to kill process on port
kill_port() {
    echo -e "${YELLOW}Stopping existing process on port $1...${NC}"
    lsof -ti:$1 | xargs kill -9 2>/dev/null || true
    sleep 1
}

# Check and handle port 3000 (Express)
if check_port 3000; then
    echo -e "${YELLOW}⚠️  Port 3000 is already in use${NC}"
    read -p "Kill existing process on port 3000? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill_port 3000
    else
        echo -e "${RED}Cannot start Express server. Port 3000 is required.${NC}"
        exit 1
    fi
fi

# Check and handle port 3001 (Next.js)
if check_port 3001; then
    echo -e "${YELLOW}⚠️  Port 3001 is already in use${NC}"
    read -p "Kill existing process on port 3001? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill_port 3001
    else
        echo -e "${RED}Cannot start Next.js server. Port 3001 is required.${NC}"
        exit 1
    fi
fi

# Start Express server in background
echo -e "${BLUE}Starting Express server on port 3000...${NC}"
npm start > express.log 2>&1 &
EXPRESS_PID=$!

# Wait for Express to start
sleep 3

# Check if Express started successfully
if check_port 3000; then
    echo -e "${GREEN}✅ Express server started (PID: $EXPRESS_PID)${NC}"
else
    echo -e "${RED}❌ Failed to start Express server${NC}"
    echo "Check express.log for errors"
    exit 1
fi

# Start Next.js server in background
echo -e "${BLUE}Starting Next.js IDE on port 3001...${NC}"
cd coder1-ide-next
npm run dev > ../nextjs.log 2>&1 &
NEXTJS_PID=$!
cd ..

# Wait for Next.js to start
echo "Waiting for Next.js to start..."
for i in {1..10}; do
    if check_port 3001; then
        break
    fi
    sleep 2
done

# Check if Next.js started successfully
if check_port 3001; then
    echo -e "${GREEN}✅ Next.js IDE started (PID: $NEXTJS_PID)${NC}"
else
    echo -e "${RED}❌ Failed to start Next.js server${NC}"
    echo "Check nextjs.log for errors"
    # Kill Express if Next.js failed
    kill $EXPRESS_PID 2>/dev/null
    exit 1
fi

# Success!
echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}🎉 Coder1 IDE is ready!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "📍 IDE URL: ${BLUE}http://localhost:3001/ide${NC}"
echo -e "📊 Context Stats: ${BLUE}http://localhost:3001/api/context/stats${NC}"
echo -e "🖥️  Express API: ${BLUE}http://localhost:3000/health${NC}"
echo ""
echo -e "${YELLOW}Process IDs:${NC}"
echo "  Express: $EXPRESS_PID"
echo "  Next.js: $NEXTJS_PID"
echo ""
echo -e "${YELLOW}To stop the IDE:${NC}"
echo "  Press Ctrl+C or run: kill $EXPRESS_PID $NEXTJS_PID"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo "  Express: tail -f express.log"
echo "  Next.js: tail -f nextjs.log"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down Coder1 IDE...${NC}"
    kill $EXPRESS_PID 2>/dev/null
    kill $NEXTJS_PID 2>/dev/null
    echo -e "${GREEN}✅ IDE stopped${NC}"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Keep script running and show logs
echo -e "${BLUE}Showing combined logs (Ctrl+C to stop)...${NC}"
echo "================================"
tail -f express.log nextjs.log