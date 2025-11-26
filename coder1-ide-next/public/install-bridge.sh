#!/bin/bash

# 🌉 Coder1 Bridge Installation Script
# Installs the Coder1 Bridge CLI for connecting to the web IDE
# Version: 1.1.0 (with --auto-start support)

set -e

# Parse command line arguments
AUTO_START=false
for arg in "$@"; do
    if [ "$arg" = "--auto-start" ]; then
        AUTO_START=true
    fi
done

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

# Determine installation mode
if [ "$EUID" -eq 0 ]; then
    echo -e "${GREEN}✅ Running with sudo - will install globally${NC}"
    INSTALL_MODE="global"
    INSTALL_PREFIX="/usr/local"
else
    echo -e "${YELLOW}⚠️  Running without sudo - will install to user directory${NC}"
    INSTALL_MODE="user"
    INSTALL_PREFIX="$HOME/.coder1"
    
    # Create user directory if it doesn't exist
    mkdir -p "$INSTALL_PREFIX/bin"
    
    # Add to PATH if not already there
    SHELL_RC="$HOME/.bashrc"
    if [ -n "$ZSH_VERSION" ]; then
        SHELL_RC="$HOME/.zshrc"
    elif [ -f "$HOME/.zshrc" ]; then
        SHELL_RC="$HOME/.zshrc"
    fi
    
    if ! grep -q "export PATH=\"\$HOME/.coder1/bin:\$PATH\"" "$SHELL_RC" 2>/dev/null; then
        echo "" >> "$SHELL_RC"
        echo "# Coder1 Bridge CLI" >> "$SHELL_RC"
        echo "export PATH=\"\$HOME/.coder1/bin:\$PATH\"" >> "$SHELL_RC"
        echo -e "${CYAN}📝 Added Coder1 to PATH in $SHELL_RC${NC}"
    fi
fi

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

# Install dependencies (critical for node-fetch and other packages)
npm install --production --silent

# Verify critical dependencies
if [ ! -d "node_modules/node-fetch" ]; then
    echo -e "${RED}❌ Critical dependency 'node-fetch' failed to install!${NC}"
    echo -e "${YELLOW}Retrying installation...${NC}"
    npm install --production
    
    if [ ! -d "node_modules/node-fetch" ]; then
        echo -e "${RED}❌ Installation failed. Dependencies are missing.${NC}"
        echo -e "${YELLOW}Please report this issue: https://github.com/MichaelrKraft/coder1-ide/issues${NC}"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Dependencies verified (node-fetch, socket.io-client, etc.)${NC}"

echo -e "${BLUE}🔗 Installing to $INSTALL_PREFIX...${NC}"

# Install based on mode
if [ "$INSTALL_MODE" = "global" ]; then
    npm install -g . --prefix=/usr/local --unsafe-perm
else
    npm install -g . --prefix="$INSTALL_PREFIX" --unsafe-perm
fi

# Verify installation
if command -v coder1-bridge &> /dev/null; then
    echo -e "${GREEN}✅ Coder1 Bridge installed successfully!${NC}"
    echo
    
    # Handle auto-start mode
    if [ "$AUTO_START" = true ]; then
        echo -e "${CYAN}🚀 Starting bridge automatically...${NC}"
        echo
        exec coder1-bridge start
    fi
    
    # Normal mode - show instructions
    # If user-mode, remind to reload shell
    if [ "$INSTALL_MODE" = "user" ]; then
        echo -e "${YELLOW}⚠️  IMPORTANT: Restart your terminal or run:${NC}"
        echo -e "   ${GREEN}source $SHELL_RC${NC}"
        echo
    fi
    
    echo -e "${CYAN}🚀 Quick Start:${NC}"
    echo -e "  1. Visit: ${BLUE}https://coder1.ai/ide${NC}"
    echo -e "  2. Click the ${YELLOW}Bridge${NC} button to get your pairing code"
    echo -e "  3. Run: ${GREEN}coder1-bridge start${NC}"
    echo -e "  4. Enter the 6-digit pairing code"
    echo
    echo -e "${CYAN}✨ Useful Commands:${NC}"
    echo -e "  ${GREEN}coder1-bridge start${NC}    - Connect to IDE"
    echo -e "  ${GREEN}coder1-bridge status${NC}   - Check connection"
    echo -e "  ${GREEN}coder1-bridge test${NC}     - Test Claude CLI"
    echo -e "  ${GREEN}coder1-bridge --help${NC}   - Show all commands"
    echo
    echo -e "${CYAN}🔧 Development Mode:${NC}"
    echo -e "  ${GREEN}coder1-bridge start --dev${NC} - Connect to localhost:3001"
    echo
    echo -e "${YELLOW}💡 Pro Tip:${NC} Keep the bridge running in the background while coding!"
    echo -e "   You can minimize this terminal—the bridge will stay connected."
    echo -e "   Return to ${BLUE}https://coder1.ai/ide${NC} anytime!"
    echo
else
    # Installation completed but command not available yet
    if [ "$AUTO_START" = true ]; then
        # Auto-start mode - try to source and start anyway
        echo -e "${YELLOW}⚠️  Activating bridge...${NC}"
        
        if [ "$INSTALL_MODE" = "user" ]; then
            # Use direct path to bridge binary instead of sourcing RC file
            # This avoids shell-specific compatibility issues (e.g., zmodload errors)
            BRIDGE_BIN="$INSTALL_PREFIX/bin/coder1-bridge"
            
            if [ -x "$BRIDGE_BIN" ]; then
                echo -e "${GREEN}✅ Bridge activated!${NC}"
                echo
                exec "$BRIDGE_BIN" start
            else
                echo -e "${RED}❌ Could not find bridge binary at $BRIDGE_BIN${NC}"
                echo -e "${YELLOW}Please restart terminal and run: ${GREEN}coder1-bridge start${NC}"
            fi
        else
            echo -e "${RED}❌ Installation failed${NC}"
            echo -e "${YELLOW}Try: ${GREEN}sudo npm install -g https://coder1.ai/bridge-cli.tar.gz${NC}"
        fi
    else
        # Normal mode - show helpful instructions
        echo -e "${YELLOW}⚠️  Installation completed, but command not found in current shell${NC}"
        echo
        
        if [ "$INSTALL_MODE" = "user" ]; then
            echo -e "${CYAN}🔧 To activate the bridge, choose ONE option:${NC}"
            echo
            echo -e "${YELLOW}Option 1 (Reload shell):${NC}"
            echo -e "  ${GREEN}source $SHELL_RC${NC}"
            echo -e "  ${GREEN}coder1-bridge start${NC}"
            echo
            echo -e "${YELLOW}Option 2 (Restart terminal):${NC}"
            echo -e "  Close this terminal and open a new one"
            echo -e "  Then run: ${GREEN}coder1-bridge start${NC}"
            echo
            echo -e "${YELLOW}Option 3 (Global install - recommended):${NC}"
            echo -e "  ${GREEN}sudo npm install -g https://coder1.ai/bridge-cli.tar.gz${NC}"
            echo -e "  ${GREEN}coder1-bridge start${NC}"
            echo
            echo -e "${BLUE}💡 Why this happened:${NC} PATH changes require a shell reload or new terminal."
            echo -e "${BLUE}   Global install (Option 3) works immediately without reload.${NC}"
        else
            echo -e "${RED}❌ Installation failed!${NC}"
            echo -e "${YELLOW}Try running with sudo:${NC}"
            echo -e "  ${GREEN}sudo npm install -g https://coder1.ai/bridge-cli.tar.gz${NC}"
        fi
        echo
        echo -e "${CYAN}📞 Need help? https://github.com/MichaelrKraft/coder1-ide/issues${NC}"
    fi
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo -e "${CYAN}📚 Need help? Check: https://github.com/MichaelrKraft/coder1-ide${NC}"
echo -e "${GREEN}Happy coding with Coder1! 🎉${NC}"