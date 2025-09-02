#!/bin/bash

# Coder1 IDE Deployment Automation Script
# Converts manual 4-step process into one-click deployment

set -e  # Exit on any error

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NEXT_APP_DIR="coder1-ide-next"
PUBLIC_DIR="public/ide"
SERVER_PROCESS="coder1-server"

# Function to print colored output
print_step() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if directory exists
check_directory() {
    if [ ! -d "$1" ]; then
        print_error "Directory $1 not found!"
        exit 1
    fi
}

# Function to backup current deployment
backup_current() {
    if [ -d "$PUBLIC_DIR" ]; then
        BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
        print_step "📦 Creating backup: $BACKUP_DIR"
        cp -r "$PUBLIC_DIR" "$BACKUP_DIR"
        echo "$BACKUP_DIR" > .last_backup
        print_success "Backup created"
    fi
}

# Function to rollback on error
rollback() {
    if [ -f ".last_backup" ]; then
        BACKUP_DIR=$(cat .last_backup)
        if [ -d "$BACKUP_DIR" ]; then
            print_warning "Rolling back to previous version..."
            rm -rf "$PUBLIC_DIR"
            mv "$BACKUP_DIR" "$PUBLIC_DIR"
            print_success "Rollback completed"
        fi
    fi
}

# Trap errors and rollback
trap rollback ERR

echo "🚀 Coder1 IDE Deployment Starting..."
echo "======================================"

# Step 1: Verify directories exist
print_step "🔍 Verifying project structure..."
check_directory "$NEXT_APP_DIR"
print_success "Project structure verified"

# Step 2: Create backup
backup_current

# Step 3: Build Next.js app
print_step "📦 Building Next.js application..."
cd "$NEXT_APP_DIR"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_step "📥 Installing dependencies..."
    npm install
fi

# Build the app
npm run build
print_success "Next.js build completed"

# Step 4: Copy files to public directory
cd ..
print_step "📋 Copying build files..."

# Create public/ide directory if it doesn't exist
mkdir -p "$PUBLIC_DIR"

# Copy build files
cp -r "$NEXT_APP_DIR/.next/static" "$PUBLIC_DIR/" 2>/dev/null || true
cp -r "$NEXT_APP_DIR/.next/server" "$PUBLIC_DIR/" 2>/dev/null || true
cp -r "$NEXT_APP_DIR/public"/* "$PUBLIC_DIR/" 2>/dev/null || true

print_success "Files copied successfully"

# Step 5: Check if PM2 is available and restart server
print_step "🔄 Restarting server..."
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "$SERVER_PROCESS"; then
        pm2 restart "$SERVER_PROCESS"
        print_success "PM2 server restarted"
    else
        print_warning "PM2 process '$SERVER_PROCESS' not found, you may need to restart manually"
    fi
else
    print_warning "PM2 not installed. Please restart your server manually with: npm start"
fi

# Step 6: Verify deployment
print_step "🔍 Verifying deployment..."
if [ -d "$PUBLIC_DIR" ]; then
    FILE_COUNT=$(find "$PUBLIC_DIR" -type f | wc -l)
    print_success "Deployment verified: $FILE_COUNT files deployed"
else
    print_error "Deployment verification failed"
    exit 1
fi

# Cleanup old backups (keep last 3)
print_step "🧹 Cleaning up old backups..."
ls -dt backup_* 2>/dev/null | tail -n +4 | xargs rm -rf 2>/dev/null || true

echo ""
echo "======================================"
print_success "🎉 Deployment Complete!"
echo ""
echo "Your Coder1 IDE is now available at:"
echo "🔗 http://localhost:3000/ide"
echo ""
echo "If you need to rollback, the backup is available."
echo "Next deployment will automatically clean up old backups."
echo ""