#!/bin/bash
# Coder1 IDE Installer Script
# One-line install: curl -sSL https://get.coder1.dev | bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        CODER1 IDE INSTALLER            ║${NC}"
echo -e "${BLUE}║     Claude Code for Everyone           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="mac"
    echo -e "${GREEN}✓${NC} Detected macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
    echo -e "${GREEN}✓${NC} Detected Linux"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    OS="windows"
    echo -e "${GREEN}✓${NC} Detected Windows"
else
    echo -e "${RED}✗${NC} Unsupported operating system: $OSTYPE"
    exit 1
fi

# Check for Docker
echo -e "\n${BLUE}Checking requirements...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} Docker is not installed"
    echo ""
    echo "Please install Docker Desktop first:"
    
    if [[ "$OS" == "mac" ]]; then
        echo "  → https://docs.docker.com/desktop/install/mac-install/"
        echo ""
        echo "Or install via Homebrew:"
        echo "  brew install --cask docker"
    elif [[ "$OS" == "linux" ]]; then
        echo "  → https://docs.docker.com/desktop/install/linux-install/"
    elif [[ "$OS" == "windows" ]]; then
        echo "  → https://docs.docker.com/desktop/install/windows-install/"
    fi
    
    echo ""
    echo "After installing Docker, run this script again."
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker is installed"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} Docker is not running"
    echo "Please start Docker Desktop and run this script again."
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker is running"

# Setup coder1.local domain (Mac/Linux only)
if [[ "$OS" != "windows" ]]; then
    echo -e "\n${BLUE}Setting up coder1.local domain...${NC}"
    
    # Check if already configured
    if ! grep -q "coder1.local" /etc/hosts 2>/dev/null; then
        echo "127.0.0.1 coder1.local" | sudo tee -a /etc/hosts > /dev/null
        echo "::1 coder1.local" | sudo tee -a /etc/hosts > /dev/null
        echo -e "${GREEN}✓${NC} Added coder1.local to hosts file"
    else
        echo -e "${GREEN}✓${NC} coder1.local already configured"
    fi
fi

# Create Coder1 workspace directory
echo -e "\n${BLUE}Creating workspace...${NC}"
CODER1_HOME="$HOME/Coder1"
mkdir -p "$CODER1_HOME/projects" "$CODER1_HOME/config" "$CODER1_HOME/cache"
echo -e "${GREEN}✓${NC} Created workspace at $CODER1_HOME"

# Pull Coder1 Docker image
echo -e "\n${BLUE}Downloading Coder1 IDE...${NC}"
echo "This may take a few minutes on first install..."
docker pull coder1/ide:latest 2>/dev/null || {
    # If official image doesn't exist yet, build locally
    echo -e "${YELLOW}⚠${NC} Official image not found, building locally..."
    
    # Clone repository if needed
    if [ ! -d "/tmp/coder1-build" ]; then
        git clone https://github.com/michaelkraft/autonomous_vibe_interface.git /tmp/coder1-build
    fi
    
    # Build Docker image
    cd /tmp/coder1-build
    docker build -t coder1/ide:latest .
    cd -
}

# Stop and remove existing container if it exists
echo -e "\n${BLUE}Preparing container...${NC}"
docker stop coder1 2>/dev/null || true
docker rm coder1 2>/dev/null || true

# Start Coder1 container
echo -e "\n${BLUE}Starting Coder1 IDE...${NC}"
docker run -d \
    --name coder1 \
    --restart unless-stopped \
    -p 3000:3000 \
    -p 80:3000 \
    -v "$CODER1_HOME/projects:/workspace" \
    -v "$CODER1_HOME/config:/data/config" \
    -v "$CODER1_HOME/cache:/data/cache" \
    -e LICENSE_KEY="${LICENSE_KEY:-}" \
    -e ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}" \
    coder1/ide:latest

# Wait for container to start
echo -e "${BLUE}Waiting for Coder1 to start...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Coder1 is running!"
        break
    fi
    sleep 1
done

# Create desktop shortcut for Mac
if [[ "$OS" == "mac" ]]; then
    echo -e "\n${BLUE}Creating desktop shortcut...${NC}"
    cat > "$HOME/Desktop/Coder1.command" << 'EOF'
#!/bin/bash
open http://coder1.local
EOF
    chmod +x "$HOME/Desktop/Coder1.command"
    echo -e "${GREEN}✓${NC} Desktop shortcut created"
fi

# Create desktop shortcut for Linux
if [[ "$OS" == "linux" ]] && [ -d "$HOME/Desktop" ]; then
    echo -e "\n${BLUE}Creating desktop shortcut...${NC}"
    cat > "$HOME/Desktop/coder1.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Coder1 IDE
Comment=Claude Code for Everyone
Exec=xdg-open http://coder1.local
Icon=applications-development
Terminal=false
Categories=Development;IDE;
EOF
    chmod +x "$HOME/Desktop/coder1.desktop"
    echo -e "${GREEN}✓${NC} Desktop shortcut created"
fi

# Display success message
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        ✅ CODER1 INSTALLED!            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}🎯 Access Coder1 at:${NC}"
if [[ "$OS" != "windows" ]]; then
    echo "   • http://coder1.local"
fi
echo "   • http://localhost:3000"
echo ""
echo -e "${BLUE}📁 Your projects:${NC} $CODER1_HOME/projects"
echo -e "${BLUE}⚙️  Configuration:${NC} $CODER1_HOME/config"
echo ""
echo -e "${YELLOW}💡 First time?${NC} Try: claude 'create a React todo app'"
echo ""

# Open in browser
if [[ "$OS" == "mac" ]]; then
    echo -e "${BLUE}Opening Coder1 in your browser...${NC}"
    sleep 2
    open http://coder1.local 2>/dev/null || open http://localhost:3000
elif [[ "$OS" == "linux" ]]; then
    if command -v xdg-open &> /dev/null; then
        echo -e "${BLUE}Opening Coder1 in your browser...${NC}"
        sleep 2
        xdg-open http://coder1.local 2>/dev/null || xdg-open http://localhost:3000
    fi
elif [[ "$OS" == "windows" ]]; then
    echo -e "${BLUE}Opening Coder1 in your browser...${NC}"
    sleep 2
    start http://localhost:3000
fi

echo ""
echo -e "${GREEN}Happy coding with Coder1! 🚀${NC}"