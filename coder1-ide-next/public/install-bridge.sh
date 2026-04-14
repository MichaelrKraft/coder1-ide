#!/bin/bash

# 🌉 Coder1 Bridge Installation Script
# Installs the Coder1 Bridge CLI for connecting to the web IDE
# Version: 1.1.0 (with --auto-start support)

set -e

# Parse command line arguments
AUTO_START=false
BRIDGE_ARGS=""

for arg in "$@"; do
    case $arg in
        --auto-start)
            AUTO_START=true
            ;;
        --dev)
            BRIDGE_ARGS="$BRIDGE_ARGS --dev"
            ;;
    esac
done

if [[ "$BRIDGE_ARGS" == *"--dev"* ]] && [ -z "$BRIDGE_URL" ]; then
    BRIDGE_URL="http://localhost:3001/bridge-cli.tar.gz"
    echo -e "${YELLOW}⚠️  Running in DEV mode - fetching from localhost${NC}"
fi

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

# Warn about Node 23+ compatibility issues with node-pty
if [ "$NODE_VERSION" -ge 23 ]; then
    echo -e "${YELLOW}⚠️  Node.js $(node -v) detected - may have compatibility issues${NC}"
    echo -e "${YELLOW}   node-pty (required for interactive Claude) works best with Node 18-22${NC}"
    echo -e "${YELLOW}   If you encounter issues, use Node 20 LTS:${NC}"
    echo -e "${CYAN}   nvm install 20 && nvm use 20${NC}"
    echo
else
    echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed!${NC}"
    echo -e "${YELLOW}Please install npm with Node.js${NC}"
    exit 1
fi

# Check for build tools (needed for node-pty native compilation)
echo -e "${BLUE}🔧 Checking build tools for native modules...${NC}"
BUILD_TOOLS_OK=true

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - check for Xcode Command Line Tools
    if ! xcode-select -p &> /dev/null; then
        echo -e "${YELLOW}⚠️  Xcode Command Line Tools not found${NC}"
        echo -e "${YELLOW}   Installing... (this may take a few minutes)${NC}"
        xcode-select --install 2>/dev/null || true
        echo -e "${YELLOW}   If a dialog appeared, please complete the installation and re-run this script${NC}"
        BUILD_TOOLS_OK=false
    else
        echo -e "${GREEN}✅ Xcode Command Line Tools found${NC}"
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux - check for build-essential
    if ! command -v make &> /dev/null || ! command -v g++ &> /dev/null; then
        echo -e "${YELLOW}⚠️  Build tools (make, g++) not found${NC}"
        echo -e "${YELLOW}   Install with: sudo apt-get install build-essential${NC}"
        BUILD_TOOLS_OK=false
    else
        echo -e "${GREEN}✅ Build tools found${NC}"
    fi
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


# Install directly from tarball to ensure copy (not symlink)
echo -e "${BLUE}🔗 Installing to $INSTALL_PREFIX...${NC}"

if [ "$INSTALL_MODE" = "global" ]; then
    npm install -g "$TEMP_DIR/bridge-cli.tar.gz" --prefix=/usr/local --unsafe-perm --build-from-source --force
else
    npm install -g "$TEMP_DIR/bridge-cli.tar.gz" --prefix="$INSTALL_PREFIX" --unsafe-perm --build-from-source --force
fi

# Verify installation
if command -v coder1-bridge &> /dev/null; then
    echo -e "${GREEN}✅ Coder1 Bridge installed successfully!${NC}"

    # Check if node-pty compiled correctly
    echo -e "${BLUE}🔍 Verifying interactive mode support...${NC}"
    if node -e "require('node-pty')" 2>/dev/null; then
        echo -e "${GREEN}✅ Interactive mode enabled (node-pty compiled)${NC}"
    else
        echo -e "${YELLOW}⚠️  Interactive mode disabled (node-pty failed to compile)${NC}"
        echo -e "${YELLOW}   You can still use non-interactive commands like: claude \"your prompt\"${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo -e "${YELLOW}   To fix: Install Xcode Command Line Tools: xcode-select --install${NC}"
        else
            echo -e "${YELLOW}   To fix: Install build tools: sudo apt-get install build-essential${NC}"
        fi
    fi
    echo
    
    # Handle auto-start mode
    if [ "$AUTO_START" = true ]; then
        echo -e "${CYAN}🚀 Starting bridge automatically...${NC}"
        echo
        # Clean up BEFORE exec (since exec replaces the process)
        rm -rf "$TEMP_DIR"
        exec coder1-bridge start $BRIDGE_ARGS < /dev/tty
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
                # Clean up BEFORE exec
                rm -rf "$TEMP_DIR"
                exec "$BRIDGE_BIN" start $BRIDGE_ARGS < /dev/tty
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