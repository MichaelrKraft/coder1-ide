#!/bin/bash

#######################################
# CoderOne IDE Build & Deploy Script
# 
# This script automates the entire build and deployment process for the CoderOne IDE.
# It handles building the React app, updating server references, cleaning old builds,
# and restarting the server with proper verification.
#
# Usage: ./build-and-deploy.sh [options]
#   Options:
#     --skip-build     Skip the npm build step (use existing build)
#     --keep-backups   Keep all old build files (skip cleanup)
#     --dry-run        Show what would be done without making changes
#######################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/Users/michaelkraft/autonomous_vibe_interface"
IDE_SOURCE="${PROJECT_ROOT}/coder1-ide/coder1-ide-source"
PUBLIC_IDE="${PROJECT_ROOT}/public/ide"
SERVER_FILE="${PROJECT_ROOT}/src/app.js"
BUILD_LOG="${PROJECT_ROOT}/build.log"
KEEP_BUILDS=3  # Number of recent builds to keep

# Parse command line arguments
SKIP_BUILD=false
KEEP_BACKUPS=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build) SKIP_BUILD=true; shift ;;
        --keep-backups) KEEP_BACKUPS=true; shift ;;
        --dry-run) DRY_RUN=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$BUILD_LOG"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$BUILD_LOG"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$BUILD_LOG"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" | tee -a "$BUILD_LOG"; }

# Start build process
echo "========================================" | tee "$BUILD_LOG"
echo "CoderOne IDE Build & Deploy" | tee -a "$BUILD_LOG"
echo "Started at: $(date)" | tee -a "$BUILD_LOG"
echo "========================================" | tee -a "$BUILD_LOG"

# Step 1: Build React App
if [ "$SKIP_BUILD" = false ]; then
    log_info "Building React IDE app..."
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would run: cd $IDE_SOURCE && npm run build"
    else
        cd "$IDE_SOURCE"
        if npm run build >> "$BUILD_LOG" 2>&1; then
            log_success "React build completed successfully"
        else
            log_error "React build failed. Check $BUILD_LOG for details"
            exit 1
        fi
    fi
else
    log_info "Skipping build step (--skip-build flag)"
fi

# Step 2: Extract new hash values
log_info "Extracting build hash values..."
cd "$IDE_SOURCE"

# Find the main JS file
JS_FILE=$(find build/static/js -name "main.*.js" -type f 2>/dev/null | head -1)
if [ -z "$JS_FILE" ]; then
    log_error "Could not find built JavaScript file"
    exit 1
fi
JS_HASH=$(basename "$JS_FILE" | sed 's/main\.\(.*\)\.js/\1/')

# Find the main CSS file
CSS_FILE=$(find build/static/css -name "main.*.css" -type f 2>/dev/null | head -1)
if [ -z "$CSS_FILE" ]; then
    log_error "Could not find built CSS file"
    exit 1
fi
CSS_HASH=$(basename "$CSS_FILE" | sed 's/main\.\(.*\)\.css/\1/')

log_success "Found hashes - JS: $JS_HASH, CSS: $CSS_HASH"

# Step 3: Backup current server file
if [ "$DRY_RUN" = false ]; then
    cp "$SERVER_FILE" "${SERVER_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    log_info "Created backup of server file"
fi

# Step 4: Update server with new hashes
log_info "Updating server with new build hashes..."
if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would update $SERVER_FILE with new hashes"
    log_info "  JS:  main.$JS_HASH.js"
    log_info "  CSS: main.$CSS_HASH.css"
else
    # Create temporary file with updates
    TEMP_FILE="${SERVER_FILE}.tmp"
    
    # Update the hardcoded HTML section (around line 553)
    sed -E "s|src=\"/ide/static/js/main\.[a-f0-9]+\.js|src=\"/ide/static/js/main.${JS_HASH}.js|g" "$SERVER_FILE" | \
    sed -E "s|href=\"/ide/static/css/main\.[a-f0-9]+\.css|href=\"/ide/static/css/main.${CSS_HASH}.css|g" > "$TEMP_FILE"
    
    # Also update the console.warn message to reflect the new build
    sed -i '' -E "s|main\.[a-f0-9]+\.js with main\.[a-f0-9]+\.css|main.${JS_HASH}.js with main.${CSS_HASH}.css|g" "$TEMP_FILE"
    
    mv "$TEMP_FILE" "$SERVER_FILE"
    log_success "Server file updated with new hashes"
fi

# Step 5: Deploy build files
log_info "Deploying build files to public directory..."
if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would copy build files to $PUBLIC_IDE"
else
    # Create backup of current public/ide if it exists
    if [ -d "$PUBLIC_IDE/static" ]; then
        BACKUP_DIR="${PUBLIC_IDE}_backup_$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        cp -r "$PUBLIC_IDE/static" "$BACKUP_DIR/"
        log_info "Created backup of current deployment"
    fi
    
    # Copy new build files
    cp -r "${IDE_SOURCE}/build/"* "$PUBLIC_IDE/"
    log_success "Build files deployed to public directory"
fi

# Step 6: Clean up old builds
if [ "$KEEP_BACKUPS" = false ]; then
    log_info "Cleaning up old build files (keeping last $KEEP_BUILDS)..."
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would clean old builds from:"
        log_info "  - $PUBLIC_IDE/static/js/"
        log_info "  - $PUBLIC_IDE/static/css/"
    else
        # Clean old JS files
        cd "$PUBLIC_IDE/static/js"
        ls -t main.*.js 2>/dev/null | tail -n +$((KEEP_BUILDS + 1)) | xargs -r rm -f
        
        # Clean old CSS files
        cd "$PUBLIC_IDE/static/css"
        ls -t main.*.css 2>/dev/null | tail -n +$((KEEP_BUILDS + 1)) | xargs -r rm -f
        
        # Count remaining files
        JS_COUNT=$(ls main.*.js 2>/dev/null | wc -l)
        CSS_COUNT=$(ls main.*.css 2>/dev/null | wc -l)
        
        log_success "Cleanup complete. Remaining: $JS_COUNT JS files, $CSS_COUNT CSS files"
    fi
else
    log_info "Skipping cleanup (--keep-backups flag)"
fi

# Step 7: Restart server
log_info "Restarting server..."
if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would restart server"
else
    # Kill existing server
    pkill -f "node.*src/app.js" 2>/dev/null || true
    sleep 2
    
    # Start new server
    cd "$PROJECT_ROOT"
    npm start > server.log 2>&1 &
    SERVER_PID=$!
    
    log_info "Server starting with PID: $SERVER_PID"
    
    # Wait for server to be ready
    log_info "Waiting for server to initialize..."
    for i in {1..30}; do
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health | grep -q "200"; then
            log_success "Server is healthy and responding"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "Server failed to start within 30 seconds"
            exit 1
        fi
        sleep 1
        echo -n "."
    done
    echo
fi

# Step 8: Verify deployment
log_info "Verifying deployment..."
if [ "$DRY_RUN" = false ]; then
    # Check if the IDE loads with correct files
    RESPONSE=$(curl -s http://localhost:3000/ide | head -100)
    
    if echo "$RESPONSE" | grep -q "main.${JS_HASH}.js"; then
        log_success "✓ JavaScript file correctly referenced"
    else
        log_warning "⚠ JavaScript file reference may be incorrect"
    fi
    
    if echo "$RESPONSE" | grep -q "main.${CSS_HASH}.css"; then
        log_success "✓ CSS file correctly referenced"
    else
        log_warning "⚠ CSS file reference may be incorrect"
    fi
fi

# Final summary
echo "========================================" | tee -a "$BUILD_LOG"
log_success "Build and deployment completed successfully!" | tee -a "$BUILD_LOG"
echo "Build Details:" | tee -a "$BUILD_LOG"
echo "  - JS Hash:  $JS_HASH" | tee -a "$BUILD_LOG"
echo "  - CSS Hash: $CSS_HASH" | tee -a "$BUILD_LOG"
echo "  - IDE URL:  http://localhost:3000/ide" | tee -a "$BUILD_LOG"
echo "========================================" | tee -a "$BUILD_LOG"

# Create version file for tracking
if [ "$DRY_RUN" = false ]; then
    cat > "${PROJECT_ROOT}/.last-build" <<EOF
BUILD_DATE=$(date)
JS_HASH=$JS_HASH
CSS_HASH=$CSS_HASH
SERVER_PID=$SERVER_PID
EOF
fi

exit 0