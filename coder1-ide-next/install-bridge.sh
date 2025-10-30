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

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run with sudo${NC}"
    echo -e "${YELLOW}Please run: sudo bash install-bridge.sh${NC}"
    exit 1
fi

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

echo -e "${BLUE}📦 Downloading Coder1 Bridge (13KB)...${NC}"

# Download bridge-cli package directly from coder1.ai
BRIDGE_URL="${BRIDGE_URL:-https://coder1.ai/bridge-cli.tar.gz}"
curl -sL "$BRIDGE_URL" -o "$TEMP_DIR/bridge-cli.tar.gz"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Download failed${NC}"
    echo -e "${YELLOW}Please check your internet connection and try again${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo -e "${BLUE}📂 Extracting...${NC}"

# Extract tarball
cd "$TEMP_DIR"
tar -xzf bridge-cli.tar.gz

# npm pack creates a "package" directory
cd package

echo -e "${BLUE}🔧 Installing dependencies...${NC}"

# Install dependencies
npm install --production --silent

echo -e "${BLUE}🔗 Installing globally...${NC}"

# Install globally to /usr/local (guaranteed to be in PATH on all systems)
npm install -g . --prefix=/usr/local --unsafe-perm

# Verify installation
if command -v coder1-bridge &> /dev/null; then
    echo -e "${GREEN}✅ Coder1 Bridge installed successfully!${NC}"
    echo
    echo -e "${CYAN}🚀 Quick Start:${NC}"
    echo -e "  1. Visit: ${BLUE}https://coder1-ide.onrender.com/ide${NC}"
    echo -e "  2. Click: ${YELLOW}Connect Bridge${NC} button"
    echo -e "  3. Run: ${GREEN}coder1-bridge start${NC}"
    echo -e "  4. Enter the 6-digit pairing code"
    echo
    echo -e "${CYAN}📝 Commands:${NC}"
    echo -e "  ${GREEN}coder1-bridge start${NC}    - Connect to IDE"
    echo -e "  ${GREEN}coder1-bridge test${NC}     - Test Claude CLI"
    echo -e "  ${GREEN}coder1-bridge status${NC}   - Check connection"
    echo -e "  ${GREEN}coder1-bridge --help${NC}   - Show all commands"
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