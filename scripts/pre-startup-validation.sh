#!/bin/bash

# 🚨 PM2 Pre-Startup Validation Script
# Prevents terminal session loss by validating port configuration before startup

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 PM2 Pre-Startup Validation"
echo "============================="

# Check if PORT environment variable is correctly set
if [ -z "$PORT" ]; then
    echo -e "${RED}❌ CRITICAL: PORT environment variable not set${NC}"
    exit 1
fi

if [ "$PORT" != "3000" ]; then
    echo -e "${RED}❌ CRITICAL: PORT must be 3000 for Express backend (found: $PORT)${NC}"
    echo ""
    echo "🚨 This is the #1 cause of terminal session loss!"
    echo ""
    echo "✅ Fix: Set PORT=3000 in PM2 ecosystem.config.js"
    echo "❌ Never use PORT=3001 (that's for Next.js frontend)"
    exit 1
fi

# Check if port 3000 is already occupied by wrong service
if lsof -i:3000 >/dev/null 2>&1; then
    PORT_INFO=$(lsof -i:3000 -P -n | grep LISTEN | head -1)
    PID=$(echo "$PORT_INFO" | awk '{print $2}')
    CMD=$(ps -p $PID -o command= 2>/dev/null | head -c 100)
    
    echo -e "${YELLOW}⚠️  Port 3000 is occupied by PID $PID${NC}"
    echo "   Command: $CMD"
    
    # Check if it's Next.js (wrong service on this port)
    if echo "$CMD" | grep -q "next"; then
        echo -e "${RED}❌ CRITICAL: Next.js is running on port 3000!${NC}"
        echo "   Next.js should run on port 3001, not 3000"
        echo "   This will cause terminal session conflicts"
        echo ""
        echo "🔧 Auto-fixing: Killing conflicting Next.js process..."
        kill -TERM $PID 2>/dev/null || kill -9 $PID 2>/dev/null
        sleep 3
        
        # Verify it's gone
        if lsof -i:3000 >/dev/null 2>&1; then
            echo -e "${RED}❌ Failed to clear port 3000${NC}"
            exit 1
        fi
        echo -e "${GREEN}✅ Port 3000 cleared${NC}"
    else
        # It might be a previous Express instance - that's okay to replace
        echo -e "${YELLOW}⚠️  Replacing existing process on port 3000${NC}"
    fi
fi

# Validate required directories
if [ ! -d "src" ]; then
    echo -e "${RED}❌ CRITICAL: src/ directory not found${NC}"
    echo "   Make sure you're running from the autonomous_vibe_interface directory"
    exit 1
fi

if [ ! -f "src/app.js" ]; then
    echo -e "${RED}❌ CRITICAL: src/app.js not found${NC}"
    exit 1
fi

# Create logs directory
mkdir -p logs

# Check if recovery script exists
if [ ! -f "scripts/port-recovery.sh" ]; then
    echo -e "${YELLOW}⚠️  Port recovery script not found${NC}"
    echo "   Auto-recovery features may not work"
fi

# Validate environment
echo "✅ PORT=$PORT (correct for Express backend)"
echo "✅ Working directory: $(pwd)"
echo "✅ Express app: src/app.js exists"
echo "✅ Logs directory: logs/ ready"

echo ""
echo -e "${GREEN}🚀 Pre-startup validation passed!${NC}"
echo "   Express backend cleared to start on port 3000"
echo ""

exit 0