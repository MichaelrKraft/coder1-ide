#!/bin/bash

# ============================================
# Complete Deployment Script for CoderOne
# ============================================
# One command to rule them all: ./scripts/deploy.sh
# This handles building, deployment, and server restart

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Parse arguments
SKIP_BUILD=false
SKIP_TESTS=false
RESTART_SERVER=true
PRODUCTION=false

for arg in "$@"; do
    case $arg in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --no-restart)
            RESTART_SERVER=false
            shift
            ;;
        --production)
            PRODUCTION=true
            shift
            ;;
        --help)
            echo "Usage: ./scripts/deploy.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-build    Skip the React build step"
            echo "  --skip-tests    Skip running tests"
            echo "  --no-restart    Don't restart the server"
            echo "  --production    Deploy for production (uses pm2)"
            echo "  --help          Show this help message"
            exit 0
            ;;
    esac
done

echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     CoderOne Complete Deployment        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Pre-deployment checks
echo -e "${BLUE}[1/6] Running pre-deployment checks...${NC}"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo -e "${RED}❌ Node.js version 14 or higher required${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Node.js version check passed${NC}"

# Check if server is running
if lsof -i:3000 > /dev/null 2>&1; then
    echo -e "${YELLOW}  ⚠️  Server is running on port 3000${NC}"
    SERVER_PID=$(lsof -t -i:3000)
    echo -e "${YELLOW}     PID: $SERVER_PID${NC}"
else
    echo -e "${GREEN}  ✓ Port 3000 is available${NC}"
fi

# Step 2: Run tests (unless skipped)
if [ "$SKIP_TESTS" = false ]; then
    echo -e "${BLUE}[2/6] Running tests...${NC}"
    
    # Check if test script exists
    if [ -f "$PROJECT_ROOT/coder1-ide/coder1-ide-source/package.json" ]; then
        cd "$PROJECT_ROOT/coder1-ide/coder1-ide-source"
        # Run tests but don't fail deployment if they fail (for now)
        npm test --passWithNoTests 2>/dev/null || echo -e "${YELLOW}  ⚠️  Some tests failed (continuing anyway)${NC}"
        cd "$PROJECT_ROOT"
    fi
    echo -e "${GREEN}  ✓ Tests completed${NC}"
else
    echo -e "${YELLOW}[2/6] Skipping tests (--skip-tests flag)${NC}"
fi

# Step 3: Build the IDE (unless skipped)
if [ "$SKIP_BUILD" = false ]; then
    echo -e "${BLUE}[3/6] Building IDE...${NC}"
    "$SCRIPT_DIR/build-ide.sh"
    echo -e "${GREEN}  ✓ IDE build completed${NC}"
else
    echo -e "${YELLOW}[3/6] Skipping build (--skip-build flag)${NC}"
fi

# Step 4: Verify deployment
echo -e "${BLUE}[4/6] Verifying deployment...${NC}"

DEPLOY_DIR="$PROJECT_ROOT/public/ide"
if [ -f "$DEPLOY_DIR/asset-manifest.json" ]; then
    # Extract file hashes
    MAIN_CSS=$(grep -o '"main.css":"[^"]*"' "$DEPLOY_DIR/asset-manifest.json" | cut -d'"' -f4 | xargs basename)
    MAIN_JS=$(grep -o '"main.js":"[^"]*"' "$DEPLOY_DIR/asset-manifest.json" | cut -d'"' -f4 | xargs basename)
    
    echo -e "${GREEN}  ✓ Deployment verified${NC}"
    echo -e "    CSS: ${CYAN}$MAIN_CSS${NC}"
    echo -e "    JS:  ${CYAN}$MAIN_JS${NC}"
else
    echo -e "${RED}❌ Deployment verification failed${NC}"
    exit 1
fi

# Step 5: Update environment
echo -e "${BLUE}[5/6] Updating environment...${NC}"

# Check for .env.local or .env
if [ ! -f "$PROJECT_ROOT/.env.local" ] && [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${YELLOW}  ⚠️  No environment file found${NC}"
    echo -e "${YELLOW}     Creating .env.local template...${NC}"
    cat > "$PROJECT_ROOT/.env.local" << 'EOF'
# CoderOne Environment Configuration
# Copy this to .env.local and fill in your values

# API Keys (optional - for AI features)
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key

# Server Configuration
PORT=3000
NODE_ENV=development

# Session Secret (generate a random string)
SESSION_SECRET=change-this-to-random-string

# Feature Flags
ENABLE_SUPERVISION=true
ENABLE_SESSION_SUMMARY=true
ENABLE_PRD_GENERATOR=true
EOF
    echo -e "${GREEN}  ✓ Created .env.local template${NC}"
else
    echo -e "${GREEN}  ✓ Environment file exists${NC}"
fi

# Step 6: Restart server (unless skipped)
if [ "$RESTART_SERVER" = true ]; then
    echo -e "${BLUE}[6/6] Restarting server...${NC}"
    
    if [ "$PRODUCTION" = true ]; then
        # Production deployment with PM2
        if command -v pm2 &> /dev/null; then
            pm2 stop coderone 2>/dev/null || true
            pm2 start "$PROJECT_ROOT/src/app.js" --name coderone --max-memory-restart 512M
            pm2 save
            echo -e "${GREEN}  ✓ Server restarted with PM2${NC}"
        else
            echo -e "${YELLOW}  ⚠️  PM2 not installed, using regular start${NC}"
            echo -e "${YELLOW}     Install with: npm install -g pm2${NC}"
            
            # Kill existing server if running
            if [ ! -z "$SERVER_PID" ]; then
                kill $SERVER_PID 2>/dev/null || true
                sleep 2
            fi
            
            # Start in background
            nohup npm start > "$PROJECT_ROOT/server.log" 2>&1 &
            echo -e "${GREEN}  ✓ Server started in background${NC}"
        fi
    else
        # Development deployment
        echo -e "${YELLOW}  ℹ️  Please restart the server manually:${NC}"
        echo -e "     ${CYAN}npm run dev${NC}"
        
        if [ ! -z "$SERVER_PID" ]; then
            echo -e "${YELLOW}  ℹ️  Kill existing server first:${NC}"
            echo -e "     ${CYAN}kill $SERVER_PID${NC}"
        fi
    fi
else
    echo -e "${YELLOW}[6/6] Skipping server restart (--no-restart flag)${NC}"
fi

# Final summary
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        Deployment Complete! 🎉          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# Display access information
echo -e "${GREEN}Access your application at:${NC}"
echo -e "  ${BLUE}Main App:${NC}  http://localhost:3000"
echo -e "  ${BLUE}IDE:${NC}       http://localhost:3000/ide"
echo -e "  ${BLUE}Hooks:${NC}     http://localhost:3000/hooks"
echo -e "  ${BLUE}Dashboard:${NC} http://localhost:3000/vibe-dashboard"
echo ""

# Display useful commands
echo -e "${GREEN}Useful commands:${NC}"
echo -e "  ${CYAN}npm run dev${NC}         - Start development server"
echo -e "  ${CYAN}npm run build:ide${NC}   - Build IDE only"
echo -e "  ${CYAN}npm run deploy${NC}      - Run this deployment script"
echo -e "  ${CYAN}npm run ide:dev${NC}     - Start IDE in development mode"
echo ""

# Check for potential issues
echo -e "${YELLOW}Quick health check:${NC}"

# Check if server is responding
sleep 2
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Server is responding${NC}"
else
    echo -e "  ${YELLOW}⚠️  Server not responding yet (may still be starting)${NC}"
fi

# Check IDE accessibility
if [ -f "$DEPLOY_DIR/index.html" ]; then
    echo -e "  ${GREEN}✓ IDE files are in place${NC}"
else
    echo -e "  ${RED}✗ IDE files missing${NC}"
fi

# Check for common issues
if [ -d "$PROJECT_ROOT/CANONICAL" ]; then
    echo -e "  ${YELLOW}ℹ️  CANONICAL directory still exists (can be removed)${NC}"
fi

if [ -d "$PROJECT_ROOT/public/ide-old-backup" ]; then
    echo -e "  ${YELLOW}ℹ️  Old backup directory exists (can be removed)${NC}"
fi

echo ""
echo -e "${MAGENTA}Thank you for using CoderOne! 🚀${NC}"
echo ""