#!/bin/bash

# ============================================
# IDE Version Diagnostic Tool
# ============================================
# Use this to diagnose version mismatch issues

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   IDE Version Diagnostic Tool         ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Check what the server is serving
echo -e "${YELLOW}1. Checking what server is serving...${NC}"
SERVED_JS=$(curl -s http://localhost:3000/ide/ | grep -o 'main\.[^"]*\.js' | head -1)
SERVED_CSS=$(curl -s http://localhost:3000/ide/ | grep -o 'main\.[^"]*\.css' | head -1)
echo -e "   Served JS:  ${BLUE}$SERVED_JS${NC}"
echo -e "   Served CSS: ${BLUE}$SERVED_CSS${NC}"
echo ""

# Step 2: Check what's in the build directory
echo -e "${YELLOW}2. Checking build directory...${NC}"
if [ -f "/Users/michaelkraft/autonomous_vibe_interface/coder1-ide/coder1-ide-source/build/asset-manifest.json" ]; then
    BUILD_JS=$(grep -o '"main.js":"[^"]*"' /Users/michaelkraft/autonomous_vibe_interface/coder1-ide/coder1-ide-source/build/asset-manifest.json | cut -d'/' -f4 | tr -d '"')
    BUILD_CSS=$(grep -o '"main.css":"[^"]*"' /Users/michaelkraft/autonomous_vibe_interface/coder1-ide/coder1-ide-source/build/asset-manifest.json | cut -d'/' -f4 | tr -d '"')
    echo -e "   Build JS:   ${BLUE}$BUILD_JS${NC}"
    echo -e "   Build CSS:  ${BLUE}$BUILD_CSS${NC}"
else
    echo -e "   ${RED}Build directory not found!${NC}"
fi
echo ""

# Step 3: Check what's deployed
echo -e "${YELLOW}3. Checking deployed files...${NC}"
if [ -f "/Users/michaelkraft/autonomous_vibe_interface/public/ide/asset-manifest.json" ]; then
    DEPLOYED_JS=$(grep -o '"main.js":"[^"]*"' /Users/michaelkraft/autonomous_vibe_interface/public/ide/asset-manifest.json | cut -d'/' -f4 | tr -d '"')
    DEPLOYED_CSS=$(grep -o '"main.css":"[^"]*"' /Users/michaelkraft/autonomous_vibe_interface/public/ide/asset-manifest.json | cut -d'/' -f4 | tr -d '"')
    echo -e "   Deployed JS:  ${BLUE}$DEPLOYED_JS${NC}"
    echo -e "   Deployed CSS: ${BLUE}$DEPLOYED_CSS${NC}"
else
    echo -e "   ${RED}Deployed files not found!${NC}"
fi
echo ""

# Step 4: Check App.tsx timestamp
echo -e "${YELLOW}4. Checking React app timestamp...${NC}"
TIMESTAMP=$(grep -o 'timestamp: [0-9]*' /Users/michaelkraft/autonomous_vibe_interface/coder1-ide/coder1-ide-source/src/App.tsx | cut -d' ' -f2)
echo -e "   Timestamp: ${BLUE}$TIMESTAMP${NC}"
echo ""

# Step 5: Diagnosis
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Diagnosis                           ${NC}"
echo -e "${BLUE}========================================${NC}"

if [ "$SERVED_JS" == "$DEPLOYED_JS" ] && [ "$DEPLOYED_JS" == "$BUILD_JS" ]; then
    echo -e "${GREEN}✅ All versions match!${NC}"
    echo -e "${YELLOW}If you're still seeing old content:${NC}"
    echo -e "   1. Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)"
    echo -e "   2. Try incognito/private mode"
    echo -e "   3. Check for service workers in DevTools"
else
    echo -e "${RED}❌ Version mismatch detected!${NC}"
    
    if [ "$SERVED_JS" != "$DEPLOYED_JS" ]; then
        echo -e "${RED}   • Server is serving different files than deployed${NC}"
        echo -e "   → Run: npm run dev (restart server)"
    fi
    
    if [ "$DEPLOYED_JS" != "$BUILD_JS" ]; then
        echo -e "${RED}   • Deployed files don't match build${NC}"
        echo -e "   → Run: npm run build:ide"
    fi
fi

echo ""
echo -e "${YELLOW}Quick fix commands:${NC}"
echo -e "   ${GREEN}npm run build:ide${NC}     - Rebuild and deploy"
echo -e "   ${GREEN}npm run dev${NC}           - Restart server"
echo -e "   ${GREEN}./scripts/fix-ide-cache.sh${NC} - Full cache fix"
echo ""