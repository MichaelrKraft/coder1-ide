#!/bin/bash

# Coder1 Bridge Installation Script
# One-line install: curl -sL https://coder1-ide.onrender.com/install-bridge.sh | bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║    Coder1 Bridge CLI Installer                       ║"
echo "║    Version 1.0.0                                      ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check Node.js installation
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo "Please install Node.js 18 or higher from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18 or higher is required!${NC}"
    echo "Current version: $(node -v)"
    echo "Please upgrade Node.js from https://nodejs.org"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# Check npm installation
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm $(npm -v) detected${NC}"

# Check Claude CLI installation
echo -e "${YELLOW}Checking for Claude CLI...${NC}"

if command -v claude &> /dev/null; then
    CLAUDE_VERSION=$(claude --version 2>&1 || echo "Unknown version")
    echo -e "${GREEN}✅ Claude CLI detected: $CLAUDE_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  Claude CLI not found${NC}"
    echo "You'll need to install Claude Code from: https://claude.ai/download"
    echo "The bridge can still be installed, but won't work until Claude is installed."
    
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install method selection
echo
echo -e "${BLUE}Select installation method:${NC}"
echo "1) Global install with npm (recommended)"
echo "2) Download and run locally"
echo "3) Clone from GitHub"

read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo -e "${YELLOW}Installing coder1-bridge globally...${NC}"
        
        # Try to install from npm
        if npm install -g coder1-bridge@latest 2>/dev/null; then
            echo -e "${GREEN}✅ Successfully installed from npm!${NC}"
        else
            # Fallback to GitHub if npm package not published yet
            echo -e "${YELLOW}Installing from GitHub...${NC}"
            npm install -g git+https://github.com/MichaelrKraft/coder1-ide.git#master:coder1-ide-next/bridge-cli
        fi
        
        echo -e "${GREEN}✅ Installation complete!${NC}"
        echo
        echo "To start the bridge, run:"
        echo -e "${BLUE}coder1-bridge start${NC}"
        ;;
        
    2)
        echo -e "${YELLOW}Downloading bridge locally...${NC}"
        
        # Create directory
        mkdir -p ~/coder1-bridge
        cd ~/coder1-bridge
        
        # Download package.json and source files
        curl -sL https://raw.githubusercontent.com/MichaelrKraft/coder1-ide/master/coder1-ide-next/bridge-cli/package.json -o package.json
        mkdir -p src
        curl -sL https://raw.githubusercontent.com/MichaelrKraft/coder1-ide/master/coder1-ide-next/bridge-cli/src/index.js -o src/index.js
        curl -sL https://raw.githubusercontent.com/MichaelrKraft/coder1-ide/master/coder1-ide-next/bridge-cli/src/bridge-client.js -o src/bridge-client.js
        curl -sL https://raw.githubusercontent.com/MichaelrKraft/coder1-ide/master/coder1-ide-next/bridge-cli/src/claude-executor.js -o src/claude-executor.js
        curl -sL https://raw.githubusercontent.com/MichaelrKraft/coder1-ide/master/coder1-ide-next/bridge-cli/src/file-handler.js -o src/file-handler.js
        
        # Install dependencies
        echo -e "${YELLOW}Installing dependencies...${NC}"
        npm install
        
        # Make executable
        chmod +x src/index.js
        
        echo -e "${GREEN}✅ Download complete!${NC}"
        echo
        echo "Bridge installed to: ~/coder1-bridge"
        echo "To start the bridge, run:"
        echo -e "${BLUE}cd ~/coder1-bridge && npm start${NC}"
        ;;
        
    3)
        echo -e "${YELLOW}Cloning from GitHub...${NC}"
        
        if ! command -v git &> /dev/null; then
            echo -e "${RED}❌ Git is not installed!${NC}"
            exit 1
        fi
        
        git clone https://github.com/MichaelrKraft/coder1-ide.git ~/coder1-ide
        cd ~/coder1-ide/coder1-ide-next/bridge-cli
        
        echo -e "${YELLOW}Installing dependencies...${NC}"
        npm install
        
        # Optional: link globally
        read -p "Link globally for 'coder1-bridge' command? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npm link
            echo -e "${GREEN}✅ Linked globally!${NC}"
            echo "To start the bridge, run:"
            echo -e "${BLUE}coder1-bridge start${NC}"
        else
            echo -e "${GREEN}✅ Installation complete!${NC}"
            echo "To start the bridge, run:"
            echo -e "${BLUE}cd ~/coder1-ide/coder1-ide-next/bridge-cli && npm start${NC}"
        fi
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Installation successful!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo
echo "Next steps:"
echo "1. Open Coder1 IDE in your browser: https://coder1-ide.onrender.com"
echo "2. Click 'Connect Bridge' to get a pairing code"
echo "3. Start the bridge and enter the code"
echo
echo -e "${YELLOW}Need help?${NC}"
echo "• Documentation: https://github.com/MichaelrKraft/coder1-ide/tree/master/coder1-ide-next/bridge-cli"
echo "• Issues: https://github.com/MichaelrKraft/coder1-ide/issues"
echo
echo -e "${BLUE}Happy coding with Coder1! 🚀${NC}"