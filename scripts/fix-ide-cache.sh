#!/bin/bash

# ============================================
# Fix IDE Cache Issues
# ============================================
# Use this when the IDE shows an old version

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Fixing IDE Cache Issues             ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Rebuild IDE
echo -e "${YELLOW}1. Rebuilding IDE...${NC}"
npm run build:ide

# Step 2: Kill existing server
echo -e "${YELLOW}2. Stopping existing server...${NC}"
pkill -f "node.*app.js" 2>/dev/null || true
sleep 2

# Step 3: Clear any Node.js cache
echo -e "${YELLOW}3. Clearing Node.js module cache...${NC}"
npm cache clean --force 2>/dev/null || true

# Step 4: Restart server
echo -e "${YELLOW}4. Starting fresh server...${NC}"
npm run dev > /dev/null 2>&1 &
sleep 3

# Step 5: Test server
echo -e "${YELLOW}5. Testing server...${NC}"
if curl -s http://localhost:3000/health | grep -q "healthy"; then
    echo -e "${GREEN}✓ Server is healthy${NC}"
else
    echo -e "${RED}✗ Server health check failed${NC}"
fi

# Get the current build hash
CURRENT_JS=$(grep -o '"main.js":"[^"]*"' /Users/michaelkraft/autonomous_vibe_interface/public/ide/asset-manifest.json | cut -d'"' -f4 | xargs basename)

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ IDE Cache Fix Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Current build: ${CURRENT_JS}${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Clear your browser cache:${NC}"
echo -e "  • Chrome/Edge: ${CYAN}Cmd+Shift+R${NC} (Mac) or ${CYAN}Ctrl+Shift+R${NC} (Windows)"
echo -e "  • Firefox: ${CYAN}Cmd+Shift+R${NC} (Mac) or ${CYAN}Ctrl+Shift+R${NC} (Windows)"
echo -e "  • Safari: ${CYAN}Cmd+Option+R${NC}"
echo ""
echo -e "${YELLOW}Or open in Incognito/Private mode to bypass cache${NC}"
echo ""
echo -e "${GREEN}Access IDE at: http://localhost:3000/ide${NC}"
echo ""