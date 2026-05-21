#!/bin/bash

# Switch between Original and Godin-optimized README versions
# Usage: ./switch-readme.sh [original|godin|compare]

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

show_current() {
    echo -e "\n${BLUE}Current README:${NC}"
    if [ -f "README.md" ]; then
        # Check first line to determine version
        first_line=$(head -n 1 README.md)
        if [[ "$first_line" == *"Stop Paying Twice"* ]]; then
            echo -e "${GREEN}✓ Godin-optimized version${NC}"
        else
            echo -e "${YELLOW}✓ Original version${NC}"
        fi
    else
        echo -e "${RED}✗ No README.md found${NC}"
    fi
}

backup_current() {
    if [ -f "README.md" ]; then
        timestamp=$(date +%Y%m%d_%H%M%S)
        backup_name="README.backup.$timestamp.md"
        cp README.md "$backup_name"
        echo -e "${GREEN}✓ Backed up current README to $backup_name${NC}"
    fi
}

switch_to_godin() {
    echo -e "\n${BLUE}Switching to Godin-optimized version...${NC}"

    if [ ! -f "README.godin.md" ]; then
        echo -e "${RED}✗ README.godin.md not found${NC}"
        exit 1
    fi

    backup_current
    cp README.godin.md README.md
    echo -e "${GREEN}✓ Switched to Godin-optimized README${NC}"
    echo -e "${YELLOW}→ Original backed up, Godin version is now active${NC}"
}

switch_to_original() {
    echo -e "\n${BLUE}Switching to original version...${NC}"

    # Check if we have a backup
    if [ -f "README.original.md" ]; then
        backup_current
        cp README.original.md README.md
        echo -e "${GREEN}✓ Switched to original README${NC}"
        echo -e "${YELLOW}→ Restored from README.original.md${NC}"
    else
        echo -e "${RED}✗ README.original.md not found${NC}"
        echo -e "${YELLOW}Looking for most recent backup...${NC}"

        latest_backup=$(ls -t README.backup.*.md 2>/dev/null | head -n 1)
        if [ -n "$latest_backup" ]; then
            echo -e "${YELLOW}Found: $latest_backup${NC}"
            read -p "Restore from this backup? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                cp "$latest_backup" README.md
                echo -e "${GREEN}✓ Restored from $latest_backup${NC}"
            else
                echo -e "${RED}✗ Cancelled${NC}"
                exit 1
            fi
        else
            echo -e "${RED}✗ No backups found${NC}"
            exit 1
        fi
    fi
}

show_comparison() {
    echo -e "\n${BLUE}README Version Comparison:${NC}\n"

    if [ -f "README-COMPARISON.md" ]; then
        cat README-COMPARISON.md
    else
        echo -e "${RED}✗ README-COMPARISON.md not found${NC}"
        exit 1
    fi
}

show_diff() {
    echo -e "\n${BLUE}Showing differences between versions:${NC}\n"

    if [ -f "README.godin.md" ] && [ -f "README.original.md" ]; then
        diff -u README.original.md README.godin.md || true
    elif [ -f "README.godin.md" ] && [ -f "README.md" ]; then
        echo -e "${YELLOW}Comparing README.md with README.godin.md:${NC}\n"
        diff -u README.md README.godin.md || true
    else
        echo -e "${RED}✗ Need both versions to compare${NC}"
        exit 1
    fi
}

show_stats() {
    echo -e "\n${BLUE}README Statistics:${NC}\n"

    for file in README.md README.godin.md README.original.md; do
        if [ -f "$file" ]; then
            lines=$(wc -l < "$file")
            words=$(wc -w < "$file")
            chars=$(wc -m < "$file")
            echo -e "${GREEN}$file:${NC}"
            echo "  Lines: $lines"
            echo "  Words: $words"
            echo "  Characters: $chars"
            echo
        fi
    done
}

show_help() {
    cat << EOF
${BLUE}README Version Switcher${NC}

Switch between original and Godin-optimized README versions.

${GREEN}Usage:${NC}
  ./switch-readme.sh [command]

${GREEN}Commands:${NC}
  godin       Switch to Godin-optimized version
  original    Switch to original version
  compare     Show detailed comparison document
  diff        Show line-by-line differences
  stats       Show statistics for each version
  current     Show which version is currently active
  help        Show this help message

${GREEN}Examples:${NC}
  ./switch-readme.sh godin      # Switch to Godin version
  ./switch-readme.sh original   # Switch back to original
  ./switch-readme.sh compare    # Read the comparison guide
  ./switch-readme.sh diff       # See exact changes

${YELLOW}Notes:${NC}
  - Original README is always backed up before switching
  - Backups are named README.backup.TIMESTAMP.md
  - You can safely switch back and forth
  - See README-COMPARISON.md for detailed analysis

EOF
}

# Main command routing
case "${1:-help}" in
    godin)
        switch_to_godin
        show_current
        ;;
    original)
        switch_to_original
        show_current
        ;;
    compare)
        show_comparison
        ;;
    diff)
        show_diff
        ;;
    stats)
        show_stats
        ;;
    current)
        show_current
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}✗ Unknown command: $1${NC}"
        echo -e "${YELLOW}Run ./switch-readme.sh help for usage${NC}"
        exit 1
        ;;
esac
