#!/bin/bash

# 🌉 Coder1 Bridge Installation Script
# Installs the Coder1 Bridge CLI for connecting to the web IDE

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║    ██████╗  ██████╗ ██████╗ ███████╗██████╗  ██╗    ║"
echo "║   ██╔════╝ ██╔═══██╗██╔══██╗██╔════╝██╔══██╗███║    ║"
echo "║   ██║      ██║   ██║██║  ██║█████╗  ██████╔╝╚██║    ║"
echo "║   ██║      ██║   ██║██║  ██║██╔══╝  ██╔══██╗ ██║    ║"
echo "║   ╚██████╗ ╚██████╔╝██████╔╝███████╗██║  ██║ ██║    ║"
echo "║    ╚═════╝  ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═╝    ║"
echo "║                                                       ║"
echo "║              Bridge CLI Installer                     ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}🔧 Installing Coder1 Bridge CLI...${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo -e "${YELLOW}Please install Node.js 18+ from: https://nodejs.org${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version $NODE_VERSION is too old!${NC}"
    echo -e "${YELLOW}Please upgrade to Node.js 18+ from: https://nodejs.org${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed!${NC}"
    echo -e "${YELLOW}Please install npm with Node.js${NC}"
    exit 1
fi

# Create temporary directory
TEMP_DIR="/tmp/coder1-bridge-install-$$"
mkdir -p "$TEMP_DIR"

echo -e "${BLUE}📦 Downloading Coder1 Bridge...${NC}"

# Clone the repository
if command -v git &> /dev/null; then
    git clone https://github.com/MichaelrKraft/coder1-ide.git "$TEMP_DIR" &> /dev/null
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}⚠️ Git clone failed, trying direct download...${NC}"
        # Fallback to curl if git fails
        curl -sL "https://github.com/MichaelrKraft/coder1-ide/archive/refs/heads/master.zip" -o "$TEMP_DIR/coder1.zip"
        cd "$TEMP_DIR" && unzip -q coder1.zip && mv coder1-ide-master coder1-ide
    fi
else
    echo -e "${YELLOW}⚠️ Git not found, using direct download...${NC}"
    curl -sL "https://github.com/MichaelrKraft/coder1-ide/archive/refs/heads/master.zip" -o "$TEMP_DIR/coder1.zip"
    cd "$TEMP_DIR" && unzip -q coder1.zip && mv coder1-ide-master coder1-ide
fi

# Navigate to bridge directory - check multiple possible locations
if [ -d "$TEMP_DIR/coder1-ide/coder1-ide-next/bridge-cli" ]; then
    cd "$TEMP_DIR/coder1-ide/coder1-ide-next/bridge-cli"
elif [ -d "$TEMP_DIR/coder1-ide-next/bridge-cli" ]; then
    cd "$TEMP_DIR/coder1-ide-next/bridge-cli"
elif [ -d "$TEMP_DIR/bridge-cli" ]; then
    cd "$TEMP_DIR/bridge-cli"
else
    echo -e "${RED}❌ Bridge CLI directory not found in repository${NC}"
    echo -e "${YELLOW}Searched locations:${NC}"
    echo -e "  - $TEMP_DIR/coder1-ide/coder1-ide-next/bridge-cli"
    echo -e "  - $TEMP_DIR/coder1-ide-next/bridge-cli"
    echo -e "  - $TEMP_DIR/bridge-cli"
    echo -e "${YELLOW}Please check the repository structure or install manually${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo -e "${BLUE}🔧 Installing dependencies...${NC}"

# Install dependencies
npm install --production --silent

echo -e "${BLUE}🔗 Installing globally...${NC}"

# Install globally
npm link --silent

# Verify installation
if command -v coder1-bridge &> /dev/null; then
    echo -e "${GREEN}✅ Coder1 Bridge installed successfully!${NC}"
    echo
    echo -e "${CYAN}🚀 Quick Start:${NC}"
    echo -e "  1. Visit: ${BLUE}https://coder1-ide.onrender.com/ide${NC}"
    echo -e "  2. Click the ${YELLOW}Bridge${NC} button to get your pairing code"
    echo -e "  3. Run: ${GREEN}coder1-bridge start${NC}"
    echo -e "  4. Enter the 6-digit pairing code"
    echo
    echo -e "${CYAN}✨ For Seamless Experience:${NC}"
    echo -e "  ${GREEN}coder1-bridge start &${NC}     - Run in background (stays connected)"
    echo -e "  ${GREEN}coder1-bridge status${NC}      - Check if bridge is connected"
    echo
    echo -e "${CYAN}🔧 Advanced Options:${NC}"
    echo -e "  ${GREEN}coder1-bridge start --dev${NC} - Connect to local development (localhost:3001)"
    echo -e "  ${GREEN}coder1-bridge test${NC}        - Test your Claude CLI installation"
    echo -e "  ${GREEN}coder1-bridge --help${NC}      - Show all available commands"
    echo
    echo -e "${YELLOW}💡 Pro Tip:${NC} Keep the bridge running in background for instant access!"
    echo -e "   Once connected, you can close this terminal and the bridge stays active."
    echo -e "   Return to ${BLUE}https://coder1-ide.onrender.com/ide${NC} anytime!"
    echo
else
    echo -e "${RED}❌ Installation failed!${NC}"
    echo -e "${YELLOW}You may need to restart your terminal or add npm global bin to PATH${NC}"
    echo -e "${YELLOW}Try: export PATH=\"\$(npm config get prefix)/bin:\$PATH\"${NC}"
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo -e "${CYAN}📚 Need help? Check: https://github.com/MichaelrKraft/coder1-ide${NC}"
echo -e "${GREEN}Happy coding with Coder1! 🎉${NC}"