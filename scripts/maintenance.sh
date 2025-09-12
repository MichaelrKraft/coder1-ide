#!/bin/bash

# ============================================
# Regular Maintenance Script for CoderOne
# ============================================
# Run this weekly or monthly to keep the project clean
# Safe to run anytime - won't delete important files

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
MAINTENANCE_LOG="$PROJECT_ROOT/maintenance-$(date +%Y%m%d).log"

# Configuration
DAYS_TO_KEEP_BUILDS=7        # Keep build artifacts for 7 days
DAYS_TO_KEEP_LOGS=30         # Keep logs for 30 days
MAX_BACKUPS_TO_KEEP=3        # Keep only last 3 backups
MAX_SESSION_AGE_DAYS=7       # Clear sessions older than 7 days

echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║    CoderOne Maintenance Script          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Starting maintenance at $(date)${NC}"
echo ""

# Track what was cleaned
CLEANED_FILES=0
CLEANED_DIRS=0
SPACE_FREED=0

# Function to safely remove files/dirs and track stats
safe_remove() {
    local path="$1"
    local type="$2"  # "file" or "dir"
    
    if [ -e "$path" ]; then
        local size=$(du -sk "$path" 2>/dev/null | cut -f1 || echo 0)
        rm -rf "$path"
        
        if [ "$type" = "file" ]; then
            ((CLEANED_FILES++))
        else
            ((CLEANED_DIRS++))
        fi
        
        SPACE_FREED=$((SPACE_FREED + size))
        return 0
    fi
    return 1
}

# 1. Clean old IDE builds (keep current + recent)
echo -e "${BLUE}[1/8] Cleaning old IDE builds...${NC}"
if [ -d "$PROJECT_ROOT/public/ide/static" ]; then
    # Clean old JavaScript files
    find "$PROJECT_ROOT/public/ide/static/js" -name "main.*.js" -mtime +$DAYS_TO_KEEP_BUILDS 2>/dev/null | while read file; do
        safe_remove "$file" "file"
    done
    
    # Clean old CSS files
    find "$PROJECT_ROOT/public/ide/static/css" -name "main.*.css" -mtime +$DAYS_TO_KEEP_BUILDS 2>/dev/null | while read file; do
        safe_remove "$file" "file"
    done
    
    # Clean all source maps older than threshold
    find "$PROJECT_ROOT/public/ide/static" -name "*.map" -mtime +$DAYS_TO_KEEP_BUILDS 2>/dev/null | while read file; do
        safe_remove "$file" "file"
    done
    
    echo -e "${GREEN}  ✓ Cleaned old build artifacts${NC}"
else
    echo -e "${YELLOW}  ⚠️  No IDE build directory found${NC}"
fi

# 2. Clean old backup directories
echo -e "${BLUE}[2/8] Managing backup directories...${NC}"
if [ -d "$PROJECT_ROOT/backups" ]; then
    # Keep only the most recent backups
    ls -dt "$PROJECT_ROOT/backups"/* 2>/dev/null | tail -n +$((MAX_BACKUPS_TO_KEEP + 1)) | while read dir; do
        safe_remove "$dir" "dir"
        echo -e "  Removed old backup: $(basename $dir)"
    done
    echo -e "${GREEN}  ✓ Backup directories managed${NC}"
else
    echo -e "${YELLOW}  ⚠️  No backups directory found${NC}"
fi

# 3. Clean IDE backup directories in public
echo -e "${BLUE}[3/8] Cleaning IDE backup directories...${NC}"
find "$PROJECT_ROOT/public" -type d -name "ide-backup-*" 2>/dev/null | while read dir; do
    safe_remove "$dir" "dir"
    echo -e "  Removed: $(basename $dir)"
done
echo -e "${GREEN}  ✓ IDE backup directories cleaned${NC}"

# 4. Clean session files
echo -e "${BLUE}[4/8] Cleaning old session files...${NC}"
if [ -d "$PROJECT_ROOT/sessions" ]; then
    find "$PROJECT_ROOT/sessions" -type f -mtime +$MAX_SESSION_AGE_DAYS 2>/dev/null | while read file; do
        safe_remove "$file" "file"
    done
    echo -e "${GREEN}  ✓ Old sessions cleaned${NC}"
else
    echo -e "${YELLOW}  ⚠️  No sessions directory found${NC}"
fi

# 5. Clean log files
echo -e "${BLUE}[5/8] Managing log files...${NC}"
# Clean old log files but keep recent ones
find "$PROJECT_ROOT" -maxdepth 2 -name "*.log" -mtime +$DAYS_TO_KEEP_LOGS 2>/dev/null | while read file; do
    safe_remove "$file" "file"
    echo -e "  Removed old log: $(basename $file)"
done

# Truncate large active logs (keep last 1000 lines)
for logfile in "$PROJECT_ROOT"/*.log; do
    if [ -f "$logfile" ] && [ $(wc -l < "$logfile") -gt 10000 ]; then
        tail -n 1000 "$logfile" > "$logfile.tmp"
        mv "$logfile.tmp" "$logfile"
        echo -e "  Truncated large log: $(basename $logfile)"
    fi
done
echo -e "${GREEN}  ✓ Log files managed${NC}"

# 6. Clean temporary and test files
echo -e "${BLUE}[6/8] Cleaning temporary files...${NC}"
# Remove .tmp and .temp files
find "$PROJECT_ROOT" -type f \( -name "*.tmp" -o -name "*.temp" \) 2>/dev/null | while read file; do
    safe_remove "$file" "file"
done

# Remove .old and .backup files older than 7 days
find "$PROJECT_ROOT" -type f \( -name "*.old" -o -name "*.backup" \) -mtime +7 2>/dev/null | while read file; do
    safe_remove "$file" "file"
done
echo -e "${GREEN}  ✓ Temporary files cleaned${NC}"

# 7. Clean empty directories
echo -e "${BLUE}[7/8] Removing empty directories...${NC}"
# Find and remove empty directories (bottom-up)
EMPTY_COUNT=0
while IFS= read -r -d '' dir; do
    if rmdir "$dir" 2>/dev/null; then
        ((EMPTY_COUNT++))
    fi
done < <(find "$PROJECT_ROOT" -type d -empty -print0 2>/dev/null)
echo -e "${GREEN}  ✓ Removed $EMPTY_COUNT empty directories${NC}"

# 8. Optimize Git repository (if it's a git repo)
echo -e "${BLUE}[8/8] Optimizing Git repository...${NC}"
if [ -d "$PROJECT_ROOT/.git" ]; then
    cd "$PROJECT_ROOT"
    
    # Clean untracked files that match .gitignore
    git clean -fXd --dry-run 2>/dev/null | wc -l | read UNTRACKED_COUNT
    
    if [ "$UNTRACKED_COUNT" -gt 0 ]; then
        echo -e "  Found $UNTRACKED_COUNT untracked files matching .gitignore"
        echo -e "${YELLOW}  Run 'git clean -fXd' to remove them${NC}"
    fi
    
    # Optimize git repository
    git gc --auto 2>/dev/null || true
    echo -e "${GREEN}  ✓ Git repository optimized${NC}"
else
    echo -e "${YELLOW}  ⚠️  Not a Git repository${NC}"
fi

# Calculate space freed
SPACE_FREED_MB=$((SPACE_FREED / 1024))
if [ $SPACE_FREED_MB -gt 0 ]; then
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
    echo -e "${GREEN}Maintenance Summary:${NC}"
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
    echo -e "  Files removed: ${CLEANED_FILES}"
    echo -e "  Directories removed: ${CLEANED_DIRS}"
    echo -e "  Empty directories removed: ${EMPTY_COUNT}"
    echo -e "  Space freed: ~${SPACE_FREED_MB}MB"
else
    echo ""
    echo -e "${GREEN}✓ Project is already clean!${NC}"
fi

# Log maintenance
cat >> "$MAINTENANCE_LOG" << EOF
Maintenance performed at $(date)
Files removed: $CLEANED_FILES
Directories removed: $CLEANED_DIRS
Empty directories: $EMPTY_COUNT
Space freed: ${SPACE_FREED_MB}MB
EOF

echo ""
echo -e "${CYAN}Maintenance complete!${NC}"
echo -e "Log saved to: ${MAINTENANCE_LOG}"
echo ""

# Provide recommendations
if [ -d "$PROJECT_ROOT/ARCHIVE" ] || [ -d "$PROJECT_ROOT/CANONICAL" ] || [ -d "$PROJECT_ROOT/public/ide-old-backup" ]; then
    echo -e "${YELLOW}⚠️  Major cleanup opportunity detected!${NC}"
    echo -e "  Run ${CYAN}./scripts/cleanup-comprehensive.sh${NC} to free significant space"
    echo ""
fi

echo -e "${BLUE}Recommended maintenance schedule:${NC}"
echo -e "  • Run this script weekly or monthly"
echo -e "  • Add to cron for automation:"
echo -e "    ${CYAN}0 0 * * 0 cd $PROJECT_ROOT && ./scripts/maintenance.sh${NC}"
echo ""