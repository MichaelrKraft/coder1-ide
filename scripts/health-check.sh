#!/bin/bash

# Coder1 IDE Health Check Script
# Validates all critical system components for alpha launch

echo "🏥 Coder1 IDE Health Check"
echo "=========================="

ERRORS=0

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if servers are running
echo -e "\n${BLUE}📡 Checking Server Status${NC}"

# Express Backend (port 3000)
if curl -s http://localhost:3000/health >/dev/null 2>&1; then
    echo -e "✅ Express backend (port 3000): ${GREEN}HEALTHY${NC}"
else
    echo -e "❌ Express backend (port 3000): ${RED}DOWN${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Next.js Frontend (port 3001)
if curl -s http://localhost:3001 >/dev/null 2>&1; then
    echo -e "✅ Next.js frontend (port 3001): ${GREEN}HEALTHY${NC}"
else
    echo -e "❌ Next.js frontend (port 3001): ${RED}DOWN${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check API Proxy Routes
echo -e "\n${BLUE}🔗 Checking API Proxy Routes${NC}"

# Checkpoint API
if curl -s http://localhost:3001/api/checkpoint >/dev/null 2>&1; then
    echo -e "✅ Checkpoint API: ${GREEN}ACCESSIBLE${NC}"
else
    echo -e "❌ Checkpoint API: ${RED}FAILED${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Sessions API
if curl -s http://localhost:3001/api/sessions >/dev/null 2>&1; then
    echo -e "✅ Sessions API: ${GREEN}ACCESSIBLE${NC}"
else
    echo -e "❌ Sessions API: ${RED}FAILED${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Timeline API
if curl -s "http://localhost:3001/api/timeline?sessionId=test" >/dev/null 2>&1; then
    echo -e "✅ Timeline API: ${GREEN}ACCESSIBLE${NC}"
else
    echo -e "❌ Timeline API: ${RED}FAILED${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check WebSocket Connection
echo -e "\n${BLUE}🔌 Checking WebSocket Status${NC}"
if lsof -i :3000 | grep -q LISTEN; then
    echo -e "✅ WebSocket server: ${GREEN}LISTENING${NC}"
else
    echo -e "❌ WebSocket server: ${RED}NOT LISTENING${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check Environment Variables
echo -e "\n${BLUE}🔧 Checking Environment Configuration${NC}"

if [ -f "coder1-ide-next/.env.local" ]; then
    echo -e "✅ .env.local file: ${GREEN}EXISTS${NC}"
    
    if grep -q "EXPRESS_BACKEND_URL=http://localhost:3000" coder1-ide-next/.env.local 2>/dev/null; then
        echo -e "✅ EXPRESS_BACKEND_URL: ${GREEN}CORRECT${NC}"
    else
        echo -e "❌ EXPRESS_BACKEND_URL: ${RED}INCORRECT${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q "NEXT_PUBLIC_EXPRESS_BACKEND_URL=http://localhost:3000" coder1-ide-next/.env.local 2>/dev/null; then
        echo -e "✅ NEXT_PUBLIC_EXPRESS_BACKEND_URL: ${GREEN}CORRECT${NC}"
    else
        echo -e "❌ NEXT_PUBLIC_EXPRESS_BACKEND_URL: ${RED}INCORRECT${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "❌ .env.local file: ${RED}MISSING${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check for .next directory (cleared cache)
echo -e "\n${BLUE}📦 Checking Cache Status${NC}"
if [ ! -d "coder1-ide-next/.next" ]; then
    echo -e "✅ Next.js cache: ${GREEN}CLEARED${NC}"
else
    echo -e "⚠️  Next.js cache: ${YELLOW}EXISTS (may need clearing)${NC}"
fi

# Final Report
echo -e "\n${BLUE}📊 Health Check Summary${NC}"
echo "=============================="

if [ $ERRORS -eq 0 ]; then
    echo -e "🎉 ${GREEN}ALL SYSTEMS HEALTHY${NC}"
    echo -e "✅ System ready for alpha launch"
    exit 0
else
    echo -e "⚠️  ${RED}$ERRORS ISSUES FOUND${NC}"
    echo -e "❌ System needs attention before launch"
    exit 1
fi