#!/bin/bash
# Session Start Context Hook
# Shows git status, recent commits, and project info on first prompt
# Only runs once per Claude session

# Create unique marker for this session (using parent PID)
MARKER="/tmp/.claude-context-shown-${PPID:-$$}"

# Skip if already shown this session
[ -f "$MARKER" ] && exit 0

# Mark as shown
touch "$MARKER"

# Output project context
echo ""
echo "=== Project Context ==="

# Show current branch
BRANCH=$(git branch --show-current 2>/dev/null)
if [ -n "$BRANCH" ]; then
    echo "Branch: $BRANCH"

    # Show git status (abbreviated)
    STATUS=$(git status -s 2>/dev/null | head -5)
    if [ -n "$STATUS" ]; then
        echo ""
        echo "Uncommitted changes:"
        echo "$STATUS"
        TOTAL=$(git status -s 2>/dev/null | wc -l | tr -d ' ')
        [ "$TOTAL" -gt 5 ] && echo "  ... and $((TOTAL - 5)) more"
    fi

    # Show recent commits
    echo ""
    echo "Recent commits:"
    git log --oneline -5 2>/dev/null | sed 's/^/  /'
fi

# Show available npm scripts if package.json exists
if [ -f "package.json" ]; then
    echo ""
    echo "Available scripts: $(cat package.json | grep -o '"[^"]*":' | head -5 | tr -d '":' | tr '\n' ' ' 2>/dev/null)"
fi

echo ""
echo "======================"
echo ""

exit 0
