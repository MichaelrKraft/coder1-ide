#!/bin/bash

# ============================================
# Directory Consolidation Script
# ============================================
# This script safely consolidates the CANONICAL directory into public
# and cleans up duplicate directories while preserving important files

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
CANONICAL_DIR="$PROJECT_ROOT/CANONICAL"
PUBLIC_DIR="$PROJECT_ROOT/public"
BACKUP_ROOT="$PROJECT_ROOT/backups/consolidation-$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Directory Consolidation Script      ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Create backup directory
echo -e "${YELLOW}📁 Creating backup directory...${NC}"
mkdir -p "$BACKUP_ROOT"

# Step 2: Analyze CANONICAL directory
if [ -d "$CANONICAL_DIR" ]; then
    echo -e "${YELLOW}📊 Analyzing CANONICAL directory...${NC}"
    CANONICAL_FILES=$(find "$CANONICAL_DIR" -type f | wc -l)
    echo -e "   Found ${BLUE}$CANONICAL_FILES${NC} files in CANONICAL"
    
    # List important files
    echo -e "${YELLOW}   Important files found:${NC}"
    for file in homepage.html hooks-v3.html vibe-dashboard.html workflow-dashboard.html templates-hub.html; do
        if [ -f "$CANONICAL_DIR/$file" ]; then
            echo -e "     ${GREEN}✓${NC} $file"
        fi
    done
else
    echo -e "${YELLOW}⚠️  CANONICAL directory not found, skipping consolidation${NC}"
fi

# Step 3: Backup CANONICAL if it exists
if [ -d "$CANONICAL_DIR" ]; then
    echo -e "${YELLOW}💾 Backing up CANONICAL directory...${NC}"
    cp -r "$CANONICAL_DIR" "$BACKUP_ROOT/CANONICAL-backup"
    echo -e "${GREEN}✓ CANONICAL backed up${NC}"
fi

# Step 4: Identify files to merge
if [ -d "$CANONICAL_DIR" ]; then
    echo -e "${YELLOW}🔍 Identifying files to merge...${NC}"
    
    # Files that should be merged (newer versions from CANONICAL)
    MERGE_FILES=(
        "homepage.html"
        "hooks-v3.html"
        "vibe-dashboard.html"
        "workflow-dashboard.html"
        "templates-hub.html"
        "agent-dashboard.html"
        "beta-access.html"
        "coder1-landing.html"
        "component-studio.html"
        "documentation.html"
        "prd-generator-v2.js"
        "prd-generator-v2.css"
        "product-creation-hub.js"
        "product-creation-hub.css"
        "utils.js"
        "styles.css"
    )
    
    # Merge files from CANONICAL to public
    echo -e "${YELLOW}📋 Merging files from CANONICAL to public...${NC}"
    for file in "${MERGE_FILES[@]}"; do
        if [ -f "$CANONICAL_DIR/$file" ]; then
            # Backup existing file if it exists
            if [ -f "$PUBLIC_DIR/$file" ]; then
                mkdir -p "$BACKUP_ROOT/public-originals"
                cp "$PUBLIC_DIR/$file" "$BACKUP_ROOT/public-originals/$file"
                echo -e "   ${YELLOW}↻${NC} Replacing $file (original backed up)"
            else
                echo -e "   ${GREEN}+${NC} Adding $file"
            fi
            cp "$CANONICAL_DIR/$file" "$PUBLIC_DIR/$file"
        fi
    done
    
    # Copy subdirectories
    if [ -d "$CANONICAL_DIR/js" ]; then
        echo -e "${YELLOW}📂 Copying js directory...${NC}"
        cp -r "$CANONICAL_DIR/js" "$PUBLIC_DIR/"
    fi
    
    if [ -d "$CANONICAL_DIR/ide-build" ]; then
        echo -e "${YELLOW}📂 Handling ide-build directory...${NC}"
        if [ ! -d "$PUBLIC_DIR/ide" ]; then
            cp -r "$CANONICAL_DIR/ide-build" "$PUBLIC_DIR/ide"
            echo -e "${GREEN}✓ ide-build copied to public/ide${NC}"
        else
            echo -e "${YELLOW}⚠️  public/ide already exists, skipping${NC}"
        fi
    fi
fi

# Step 5: Update server configuration
echo -e "${YELLOW}🔧 Updating server configuration...${NC}"

# Create a server config update script
cat > "$PROJECT_ROOT/scripts/update-server-config.js" << 'EOF'
const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../src/app.js');
let appContent = fs.readFileSync(appPath, 'utf8');

// Update static file serving from CANONICAL to public
if (appContent.includes("path.join(__dirname, '../CANONICAL')")) {
    appContent = appContent.replace(
        /path\.join\(__dirname, '\.\.\/CANONICAL'\)/g,
        "path.join(__dirname, '../public')"
    );
    
    // Update comments
    appContent = appContent.replace(
        /\/\/ Serve static files from CANONICAL directory[^\n]*/g,
        "// Serve static files from public directory"
    );
    
    fs.writeFileSync(appPath, appContent);
    console.log('✓ Updated app.js to serve from public instead of CANONICAL');
} else {
    console.log('✓ app.js already configured correctly');
}
EOF

node "$PROJECT_ROOT/scripts/update-server-config.js"

# Step 6: Clean up duplicate directories (optional, with confirmation)
echo ""
echo -e "${MAGENTA}========================================${NC}"
echo -e "${MAGENTA}   Cleanup Options                     ${NC}"
echo -e "${MAGENTA}========================================${NC}"
echo ""
echo -e "${YELLOW}The following directories can be safely removed:${NC}"
echo -e "  • ${RED}CANONICAL/${NC} (now merged into public)"
echo -e "  • ${RED}public/ide-old-backup/${NC} (replaced by dynamic system)"
echo ""
echo -e "${YELLOW}To remove these directories, run:${NC}"
echo -e "  ${BLUE}rm -rf $CANONICAL_DIR${NC}"
echo -e "  ${BLUE}rm -rf $PUBLIC_DIR/ide-old-backup${NC}"
echo ""
echo -e "${YELLOW}⚠️  These directories are backed up at:${NC}"
echo -e "  ${GREEN}$BACKUP_ROOT${NC}"

# Step 7: Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Consolidation Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}What was done:${NC}"
echo -e "  1. Backed up all directories to: $BACKUP_ROOT"
echo -e "  2. Merged CANONICAL files into public directory"
echo -e "  3. Updated server configuration"
echo -e "  4. Prepared cleanup commands (not executed)"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Restart the server: ${BLUE}npm run dev${NC}"
echo -e "  2. Test the application thoroughly"
echo -e "  3. If everything works, remove old directories (see above)"
echo ""