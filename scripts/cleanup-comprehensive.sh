#!/bin/bash

# ============================================
# Comprehensive Cleanup Script for CoderOne
# ============================================
# This script safely cleans up obsolete directories and files
# while preserving all essential components of the system

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
CLEANUP_LOG="$PROJECT_ROOT/cleanup-$(date +%Y%m%d-%H%M%S).log"
SAFETY_BACKUP="$PROJECT_ROOT/backups/safety-$(date +%Y%m%d-%H%M%S)"

# Parse arguments
DRY_RUN=false
SKIP_BACKUP=false
FORCE=false
VERBOSE=false

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Usage: ./scripts/cleanup-comprehensive.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dry-run       Show what would be deleted without actually deleting"
            echo "  --skip-backup   Skip creating safety backup (not recommended)"
            echo "  --force         Skip confirmation prompts"
            echo "  --verbose       Show detailed output"
            echo "  --help          Show this help message"
            echo ""
            echo "This script will clean up:"
            echo "  • ARCHIVE directory (5.8GB)"
            echo "  • CANONICAL directory (3.9MB)"
            echo "  • public/ide-old-backup (227MB)"
            echo "  • Old and conflicting files"
            echo "  • Stale build artifacts"
            echo ""
            exit 0
            ;;
    esac
done

# Logging function
log() {
    echo "$1" | tee -a "$CLEANUP_LOG"
}

echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   CoderOne Comprehensive Cleanup Script      ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}🔍 DRY RUN MODE - No files will be deleted${NC}"
    echo ""
fi

# Step 1: Initial disk space check
echo -e "${BLUE}[1/10] Checking initial disk space...${NC}"
INITIAL_SPACE=$(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
log "Initial available space: $INITIAL_SPACE"

# Calculate space to be freed
SPACE_TO_FREE=0
if [ -d "$PROJECT_ROOT/ARCHIVE" ]; then
    ARCHIVE_SIZE=$(du -sh "$PROJECT_ROOT/ARCHIVE" 2>/dev/null | cut -f1)
    log "  ARCHIVE directory: $ARCHIVE_SIZE"
    SPACE_TO_FREE=$((SPACE_TO_FREE + $(du -sk "$PROJECT_ROOT/ARCHIVE" 2>/dev/null | cut -f1)))
fi

if [ -d "$PROJECT_ROOT/public/ide-old-backup" ]; then
    IDE_BACKUP_SIZE=$(du -sh "$PROJECT_ROOT/public/ide-old-backup" 2>/dev/null | cut -f1)
    log "  ide-old-backup: $IDE_BACKUP_SIZE"
    SPACE_TO_FREE=$((SPACE_TO_FREE + $(du -sk "$PROJECT_ROOT/public/ide-old-backup" 2>/dev/null | cut -f1)))
fi

if [ -d "$PROJECT_ROOT/CANONICAL" ]; then
    CANONICAL_SIZE=$(du -sh "$PROJECT_ROOT/CANONICAL" 2>/dev/null | cut -f1)
    log "  CANONICAL directory: $CANONICAL_SIZE"
    SPACE_TO_FREE=$((SPACE_TO_FREE + $(du -sk "$PROJECT_ROOT/CANONICAL" 2>/dev/null | cut -f1)))
fi

SPACE_TO_FREE_MB=$((SPACE_TO_FREE / 1024))
SPACE_TO_FREE_GB=$(echo "scale=2; $SPACE_TO_FREE_MB / 1024" | bc)

echo -e "${GREEN}  Total space to be freed: ~${SPACE_TO_FREE_GB}GB${NC}"
echo ""

# Step 2: Verify new system is working
echo -e "${BLUE}[2/10] Verifying new build system...${NC}"
if [ -f "$PROJECT_ROOT/public/ide/asset-manifest.json" ]; then
    echo -e "${GREEN}  ✓ IDE deployment found with asset manifest${NC}"
    
    # Check if server can serve IDE
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}  ✓ Server is responding${NC}"
    else
        echo -e "${YELLOW}  ⚠️  Server not running (not critical for cleanup)${NC}"
    fi
else
    echo -e "${RED}  ✗ IDE deployment not found!${NC}"
    echo -e "${RED}     Run 'npm run build:ide' before cleanup${NC}"
    if [ "$FORCE" = false ]; then
        exit 1
    fi
fi

# Step 3: Create safety backup (unless skipped)
if [ "$SKIP_BACKUP" = false ]; then
    echo -e "${BLUE}[3/10] Creating safety backup...${NC}"
    
    if [ "$DRY_RUN" = false ]; then
        mkdir -p "$SAFETY_BACKUP"
        
        # Backup critical configuration files
        if [ -f "$PROJECT_ROOT/.env" ]; then
            cp "$PROJECT_ROOT/.env" "$SAFETY_BACKUP/"
        fi
        if [ -f "$PROJECT_ROOT/.env.local" ]; then
            cp "$PROJECT_ROOT/.env.local" "$SAFETY_BACKUP/"
        fi
        
        # Create manifest of what will be deleted
        cat > "$SAFETY_BACKUP/deletion-manifest.txt" << EOF
Cleanup performed on: $(date)
=================================

Directories to be removed:
- ARCHIVE/ ($ARCHIVE_SIZE)
- public/ide-old-backup/ ($IDE_BACKUP_SIZE)
- CANONICAL/ ($CANONICAL_SIZE)

Files to be removed:
$(ls -la "$PROJECT_ROOT/public/"*.old* 2>/dev/null || echo "  No .old files found")

Total space to free: ~${SPACE_TO_FREE_GB}GB
EOF
        
        echo -e "${GREEN}  ✓ Safety backup created at: $SAFETY_BACKUP${NC}"
    else
        echo -e "${YELLOW}  [DRY RUN] Would create backup at: $SAFETY_BACKUP${NC}"
    fi
else
    echo -e "${YELLOW}[3/10] Skipping safety backup (--skip-backup flag)${NC}"
fi

# Step 4: Confirmation prompt (unless forced)
if [ "$FORCE" = false ] && [ "$DRY_RUN" = false ]; then
    echo ""
    echo -e "${YELLOW}⚠️  This will permanently delete ~${SPACE_TO_FREE_GB}GB of data${NC}"
    echo -e "${YELLOW}    Directories: ARCHIVE, CANONICAL, public/ide-old-backup${NC}"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Cleanup cancelled by user${NC}"
        exit 0
    fi
fi

# Step 5: Remove ARCHIVE directory
echo -e "${BLUE}[4/10] Removing ARCHIVE directory...${NC}"
if [ -d "$PROJECT_ROOT/ARCHIVE" ]; then
    if [ "$DRY_RUN" = false ]; then
        rm -rf "$PROJECT_ROOT/ARCHIVE"
        echo -e "${GREEN}  ✓ ARCHIVE directory removed (freed ~5.8GB)${NC}"
    else
        echo -e "${YELLOW}  [DRY RUN] Would remove ARCHIVE directory${NC}"
    fi
else
    echo -e "${YELLOW}  ⚠️  ARCHIVE directory not found${NC}"
fi

# Step 6: Remove public/ide-old-backup
echo -e "${BLUE}[5/10] Removing ide-old-backup directory...${NC}"
if [ -d "$PROJECT_ROOT/public/ide-old-backup" ]; then
    if [ "$DRY_RUN" = false ]; then
        rm -rf "$PROJECT_ROOT/public/ide-old-backup"
        echo -e "${GREEN}  ✓ ide-old-backup removed (freed ~227MB)${NC}"
    else
        echo -e "${YELLOW}  [DRY RUN] Would remove ide-old-backup directory${NC}"
    fi
else
    echo -e "${YELLOW}  ⚠️  ide-old-backup directory not found${NC}"
fi

# Step 7: Remove CANONICAL directory
echo -e "${BLUE}[6/10] Removing CANONICAL directory...${NC}"
if [ -d "$PROJECT_ROOT/CANONICAL" ]; then
    if [ "$DRY_RUN" = false ]; then
        rm -rf "$PROJECT_ROOT/CANONICAL"
        echo -e "${GREEN}  ✓ CANONICAL directory removed (freed ~3.9MB)${NC}"
    else
        echo -e "${YELLOW}  [DRY RUN] Would remove CANONICAL directory${NC}"
    fi
else
    echo -e "${YELLOW}  ⚠️  CANONICAL directory not found${NC}"
fi

# Step 8: Clean up old and conflicting files
echo -e "${BLUE}[7/10] Cleaning up old and conflicting files...${NC}"
OLD_FILES_COUNT=0

for pattern in "*.old" "*.old-conflicting" "*-backup.html" "ide-dev-backup.html"; do
    for file in $PROJECT_ROOT/public/$pattern; do
        if [ -f "$file" ]; then
            if [ "$DRY_RUN" = false ]; then
                rm "$file"
                ((OLD_FILES_COUNT++))
                [ "$VERBOSE" = true ] && echo "    Removed: $(basename $file)"
            else
                [ "$VERBOSE" = true ] && echo "    [DRY RUN] Would remove: $(basename $file)"
                ((OLD_FILES_COUNT++))
            fi
        fi
    done
done

echo -e "${GREEN}  ✓ Removed $OLD_FILES_COUNT old/conflicting files${NC}"

# Step 9: Clean old build artifacts
echo -e "${BLUE}[8/10] Cleaning old build artifacts...${NC}"
ARTIFACTS_COUNT=0

if [ -d "$PROJECT_ROOT/public/ide/static" ]; then
    # Remove source maps older than 7 days
    if [ "$DRY_RUN" = false ]; then
        find "$PROJECT_ROOT/public/ide/static" -name "*.map" -mtime +7 -delete 2>/dev/null || true
    fi
    
    # Count old JS/CSS files (but keep current ones referenced in asset-manifest)
    OLD_ARTIFACTS=$(find "$PROJECT_ROOT/public/ide/static" -name "main.*.js" -o -name "main.*.css" -mtime +7 2>/dev/null | wc -l)
    
    if [ "$OLD_ARTIFACTS" -gt 0 ]; then
        if [ "$DRY_RUN" = false ]; then
            find "$PROJECT_ROOT/public/ide/static" \( -name "main.*.js" -o -name "main.*.css" \) -mtime +7 -delete 2>/dev/null || true
        fi
        echo -e "${GREEN}  ✓ Removed $OLD_ARTIFACTS old build artifacts${NC}"
    else
        echo -e "${YELLOW}  ⚠️  No old build artifacts found${NC}"
    fi
fi

# Step 10: Fix nested directory structure
echo -e "${BLUE}[9/10] Checking for nested directory issues...${NC}"
NESTED_DIR="$PROJECT_ROOT/coder1-ide/coder1-ide-source/coder1-ide"

if [ -d "$NESTED_DIR" ]; then
    NESTED_SIZE=$(du -sh "$NESTED_DIR" 2>/dev/null | cut -f1)
    echo -e "${YELLOW}  ⚠️  Found nested directory: $NESTED_DIR ($NESTED_SIZE)${NC}"
    
    if [ "$DRY_RUN" = false ]; then
        rm -rf "$NESTED_DIR"
        echo -e "${GREEN}  ✓ Removed nested directory structure${NC}"
    else
        echo -e "${YELLOW}  [DRY RUN] Would remove nested directory${NC}"
    fi
else
    echo -e "${GREEN}  ✓ No nested directory issues found${NC}"
fi

# Step 11: Clean empty directories
echo -e "${BLUE}[10/10] Cleaning empty directories...${NC}"
if [ "$DRY_RUN" = false ]; then
    find "$PROJECT_ROOT" -type d -empty -delete 2>/dev/null || true
    echo -e "${GREEN}  ✓ Empty directories removed${NC}"
else
    EMPTY_DIRS=$(find "$PROJECT_ROOT" -type d -empty 2>/dev/null | wc -l)
    echo -e "${YELLOW}  [DRY RUN] Would remove $EMPTY_DIRS empty directories${NC}"
fi

# Final disk space check
echo ""
echo -e "${BLUE}Final Results:${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

if [ "$DRY_RUN" = false ]; then
    FINAL_SPACE=$(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    echo -e "${GREEN}  Initial space: $INITIAL_SPACE${NC}"
    echo -e "${GREEN}  Final space:   $FINAL_SPACE${NC}"
    echo -e "${GREEN}  Space freed:   ~${SPACE_TO_FREE_GB}GB${NC}"
    
    # Log summary
    cat >> "$CLEANUP_LOG" << EOF

Cleanup Summary
===============
Initial space: $INITIAL_SPACE
Final space: $FINAL_SPACE
Space freed: ~${SPACE_TO_FREE_GB}GB

Removed:
- ARCHIVE directory
- public/ide-old-backup directory
- CANONICAL directory
- $OLD_FILES_COUNT old/conflicting files
- $OLD_ARTIFACTS old build artifacts

Cleanup completed successfully at $(date)
EOF
    
    echo ""
    echo -e "${GREEN}✅ Cleanup completed successfully!${NC}"
    echo -e "${CYAN}   Log saved to: $CLEANUP_LOG${NC}"
    
else
    echo -e "${YELLOW}  DRY RUN SUMMARY:${NC}"
    echo -e "${YELLOW}  Would free: ~${SPACE_TO_FREE_GB}GB${NC}"
    echo -e "${YELLOW}  Would remove:${NC}"
    echo -e "${YELLOW}    • ARCHIVE directory${NC}"
    echo -e "${YELLOW}    • public/ide-old-backup${NC}"
    echo -e "${YELLOW}    • CANONICAL directory${NC}"
    echo -e "${YELLOW}    • $OLD_FILES_COUNT old files${NC}"
    echo ""
    echo -e "${CYAN}  Run without --dry-run to perform actual cleanup${NC}"
fi

echo ""
echo -e "${MAGENTA}Next steps:${NC}"
echo -e "  1. Test the application: ${CYAN}npm run dev${NC}"
echo -e "  2. Update .gitignore to prevent future clutter"
echo -e "  3. Commit the cleaned state to Git"
echo ""