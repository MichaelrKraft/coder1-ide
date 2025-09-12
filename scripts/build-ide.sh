#!/bin/bash

# ============================================
# Unified IDE Build & Deploy Script
# ============================================
# This script handles the complete build and deployment process for the CoderOne IDE
# No more manual steps, no more confusion!

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
IDE_SOURCE="$PROJECT_ROOT/coder1-ide/coder1-ide-source"
BUILD_DIR="$IDE_SOURCE/build"
DEPLOY_DIR="$PROJECT_ROOT/public/ide"
BACKUP_DIR="$PROJECT_ROOT/public/ide-backup-$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   CoderOne IDE Build & Deploy Script  ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Check if source directory exists
if [ ! -d "$IDE_SOURCE" ]; then
    echo -e "${RED}❌ Error: IDE source directory not found at $IDE_SOURCE${NC}"
    exit 1
fi

# Step 2: Navigate to source directory
echo -e "${YELLOW}📁 Navigating to IDE source directory...${NC}"
cd "$IDE_SOURCE"

# Step 3: Install dependencies (if needed)
if [ ! -d "node_modules" ] || [ ! -z "$FORCE_INSTALL" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

# Step 4: Build the React app
echo -e "${YELLOW}🔨 Building React application...${NC}"
npm run build

# Check if build was successful
if [ ! -d "$BUILD_DIR" ]; then
    echo -e "${RED}❌ Build failed: build directory not created${NC}"
    exit 1
fi

# Check for asset-manifest.json
if [ ! -f "$BUILD_DIR/asset-manifest.json" ]; then
    echo -e "${RED}❌ Build incomplete: asset-manifest.json not found${NC}"
    exit 1
fi

# Step 5: Backup existing deployment (if exists)
if [ -d "$DEPLOY_DIR" ]; then
    echo -e "${YELLOW}💾 Backing up existing deployment...${NC}"
    mv "$DEPLOY_DIR" "$BACKUP_DIR"
    echo -e "${GREEN}✓ Backup created at: $BACKUP_DIR${NC}"
fi

# Step 6: Deploy build to public directory
echo -e "${YELLOW}🚀 Deploying build to public directory...${NC}"
mkdir -p "$DEPLOY_DIR"
cp -r "$BUILD_DIR"/* "$DEPLOY_DIR/"

# Verify deployment
if [ -f "$DEPLOY_DIR/asset-manifest.json" ]; then
    echo -e "${GREEN}✓ Deployment successful!${NC}"
    
    # Extract and display the deployed file hashes
    MAIN_CSS=$(grep -o '"main.css":"[^"]*"' "$DEPLOY_DIR/asset-manifest.json" | cut -d'"' -f4 | xargs basename)
    MAIN_JS=$(grep -o '"main.js":"[^"]*"' "$DEPLOY_DIR/asset-manifest.json" | cut -d'"' -f4 | xargs basename)
    
    echo ""
    echo -e "${GREEN}📊 Deployed Files:${NC}"
    echo -e "   CSS: ${BLUE}$MAIN_CSS${NC}"
    echo -e "   JS:  ${BLUE}$MAIN_JS${NC}"
else
    echo -e "${RED}❌ Deployment verification failed${NC}"
    exit 1
fi

# Step 7: Clean up old backups (keep last 3)
echo -e "${YELLOW}🧹 Cleaning up old backups...${NC}"
cd "$PROJECT_ROOT/public"
ls -dt ide-backup-* 2>/dev/null | tail -n +4 | xargs -r rm -rf
echo -e "${GREEN}✓ Old backups cleaned${NC}"

# Step 8: Server restart reminder
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Build and deployment complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}⚠️  Note: The server uses dynamic hash detection${NC}"
echo -e "${YELLOW}    No manual updates needed in app.js!${NC}"
echo ""
echo -e "${BLUE}To restart the server:${NC}"
echo -e "   ${GREEN}npm run dev${NC}  (development with nodemon)"
echo -e "   ${GREEN}npm start${NC}    (production)"
echo ""
echo -e "${BLUE}Access the IDE at:${NC}"
echo -e "   ${GREEN}http://localhost:3000/ide${NC}"
echo ""