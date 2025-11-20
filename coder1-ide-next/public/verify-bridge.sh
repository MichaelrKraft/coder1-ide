#!/bin/bash

# 🔍 Coder1 Bridge Verification Script
# Diagnoses installation issues and verifies setup

set +e  # Don't exit on errors - we want to show all issues

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Counters
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║             🔍 Bridge Verification Tool               ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Function to check a requirement
check() {
    local name="$1"
    local command="$2"
    local expected="$3"
    
    echo -ne "Checking $name... "
    
    if eval "$command" &>/dev/null; then
        echo -e "${GREEN}✅ PASS${NC}"
        if [ -n "$expected" ]; then
            local result=$(eval "$command" 2>&1)
            echo -e "  ${BLUE}→${NC} $result"
        fi
        ((PASS_COUNT++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((FAIL_COUNT++))
        return 1
    fi
}

check_warn() {
    local name="$1"
    local command="$2"
    
    echo -ne "Checking $name... "
    
    if eval "$command" &>/dev/null; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASS_COUNT++))
        return 0
    else
        echo -e "${YELLOW}⚠️  WARN${NC}"
        ((WARN_COUNT++))
        return 1
    fi
}

echo -e "${BLUE}═══ System Requirements ═══${NC}"
echo ""

# Node.js
if check "Node.js installed" "command -v node" "show"; then
    NODE_VERSION=$(node -v)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_MAJOR" -ge 18 ]; then
        echo -e "  ${GREEN}✓${NC} Version: $NODE_VERSION (sufficient)"
    else
        echo -e "  ${RED}✗${NC} Version: $NODE_VERSION (need 18+)"
        echo -e "  ${YELLOW}→${NC} Please upgrade Node.js from https://nodejs.org"
    fi
fi

# npm
check "npm installed" "command -v npm" "show"
if [ $? -eq 0 ]; then
    NPM_VERSION=$(npm -v)
    echo -e "  ${GREEN}✓${NC} Version: $NPM_VERSION"
fi

# Claude CLI
if check "Claude CLI installed" "command -v claude" "show"; then
    CLAUDE_VERSION=$(claude --version 2>&1 | head -1)
    echo -e "  ${GREEN}✓${NC} Version: $CLAUDE_VERSION"
else
    echo -e "  ${YELLOW}→${NC} Install from https://claude.ai/download"
fi

echo ""
echo -e "${BLUE}═══ Bridge Installation ═══${NC}"
echo ""

# Bridge command
if check "coder1-bridge command" "command -v coder1-bridge" "show"; then
    BRIDGE_PATH=$(which coder1-bridge)
    echo -e "  ${GREEN}✓${NC} Location: $BRIDGE_PATH"
    
    # Check if it's a symlink
    if [ -L "$BRIDGE_PATH" ]; then
        REAL_PATH=$(readlink -f "$BRIDGE_PATH" 2>/dev/null || readlink "$BRIDGE_PATH")
        echo -e "  ${GREEN}✓${NC} Points to: $REAL_PATH"
    fi
else
    echo -e "  ${RED}✗${NC} Bridge not found in PATH"
    echo -e "  ${YELLOW}→${NC} Try: ${GREEN}source ~/.zshrc${NC} or ${GREEN}source ~/.bashrc${NC}"
    echo -e "  ${YELLOW}→${NC} Or install: ${GREEN}curl -sL https://coder1.ai/install-bridge.sh | bash${NC}"
fi

# Global npm packages
NPM_PREFIX=$(npm config get prefix 2>/dev/null)
if [ -n "$NPM_PREFIX" ]; then
    echo -e "npm global prefix: ${BLUE}$NPM_PREFIX${NC}"
    
    if [ -d "$NPM_PREFIX/lib/node_modules/coder1-bridge" ]; then
        echo -e "  ${GREEN}✓${NC} Bridge package found in global node_modules"
        
        # Check for node-fetch
        if [ -d "$NPM_PREFIX/lib/node_modules/coder1-bridge/node_modules/node-fetch" ]; then
            echo -e "  ${GREEN}✓${NC} node-fetch dependency found"
            FETCH_VERSION=$(cat "$NPM_PREFIX/lib/node_modules/coder1-bridge/node_modules/node-fetch/package.json" 2>/dev/null | grep '"version"' | head -1 | cut -d'"' -f4)
            echo -e "  ${BLUE}→${NC} node-fetch version: $FETCH_VERSION"
        else
            echo -e "  ${RED}✗${NC} node-fetch dependency MISSING"
            echo -e "  ${YELLOW}→${NC} This will cause connection errors!"
            echo -e "  ${YELLOW}→${NC} Fix: ${GREEN}sudo npm install -g https://coder1.ai/bridge-cli.tar.gz${NC}"
        fi
        
        # Check for other dependencies
        if [ -d "$NPM_PREFIX/lib/node_modules/coder1-bridge/node_modules/socket.io-client" ]; then
            echo -e "  ${GREEN}✓${NC} socket.io-client dependency found"
        fi
        
    fi
fi

echo ""
echo -e "${BLUE}═══ Network Connectivity ═══${NC}"
echo ""

# Server reachability
check_warn "Coder1 server reachable" "curl -s --max-time 5 https://coder1.ai/health"

# Bridge API endpoint
if curl -s --max-time 5 https://coder1.ai/api/bridge/status &>/dev/null; then
    echo -e "Bridge API endpoint... ${GREEN}✅ PASS${NC}"
    ((PASS_COUNT++))
else
    echo -e "Bridge API endpoint... ${YELLOW}⚠️  WARN${NC}"
    echo -e "  ${YELLOW}→${NC} Server may be down or unreachable"
    ((WARN_COUNT++))
fi

# Download tarball
if curl -sL --max-time 10 https://coder1.ai/bridge-cli.tar.gz -o /tmp/bridge-test-$$.tar.gz 2>/dev/null; then
    TARBALL_SIZE=$(du -h /tmp/bridge-test-$$.tar.gz | cut -f1)
    echo -e "Bridge tarball download... ${GREEN}✅ PASS${NC}"
    echo -e "  ${BLUE}→${NC} Size: $TARBALL_SIZE"
    rm -f /tmp/bridge-test-$$.tar.gz
    ((PASS_COUNT++))
else
    echo -e "Bridge tarball download... ${RED}❌ FAIL${NC}"
    echo -e "  ${YELLOW}→${NC} Cannot download from https://coder1.ai/bridge-cli.tar.gz"
    ((FAIL_COUNT++))
fi

echo ""
echo -e "${BLUE}═══ Summary ═══${NC}"
echo ""

TOTAL=$((PASS_COUNT + FAIL_COUNT + WARN_COUNT))

echo -e "  ${GREEN}✅ Passed:${NC} $PASS_COUNT"
echo -e "  ${YELLOW}⚠️  Warnings:${NC} $WARN_COUNT"
echo -e "  ${RED}❌ Failed:${NC} $FAIL_COUNT"
echo ""

# Final verdict
if [ $FAIL_COUNT -eq 0 ]; then
    if [ $WARN_COUNT -eq 0 ]; then
        echo -e "${GREEN}🎉 Everything looks good! Your bridge should work.${NC}"
        echo ""
        echo -e "${CYAN}Next steps:${NC}"
        echo -e "  1. Run: ${GREEN}coder1-bridge start${NC}"
        echo -e "  2. Get pairing code from ${BLUE}https://coder1.ai/ide${NC}"
        echo -e "  3. Enter the 6-digit code when prompted"
    else
        echo -e "${YELLOW}⚠️  Some warnings detected, but bridge should still work.${NC}"
        echo -e "${YELLOW}If you encounter issues, review the warnings above.${NC}"
    fi
else
    echo -e "${RED}❌ Critical issues detected. Bridge will not work.${NC}"
    echo ""
    echo -e "${CYAN}Common fixes:${NC}"
    echo -e "  • Node.js 18+: ${BLUE}https://nodejs.org${NC}"
    echo -e "  • Claude CLI: ${BLUE}https://claude.ai/download${NC}"
    echo -e "  • Reinstall bridge: ${GREEN}curl -sL https://coder1.ai/install-bridge.sh | bash${NC}"
    echo ""
    echo -e "${CYAN}Need help?${NC}"
    echo -e "  • GitHub Issues: ${BLUE}https://github.com/MichaelrKraft/coder1-ide/issues${NC}"
    echo -e "  • Include output of this script when reporting issues"
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo ""

exit $FAIL_COUNT
