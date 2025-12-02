#!/bin/bash

# On-Error Hook
# Runs when Claude Code encounters an error during execution
# Place in: .claude/hooks/on-error.sh

set -e

# Receive error details from stdin
read -r error_type
read -r error_message
read -r error_file
read -r error_line

echo "🚨 Error detected!"
echo "Type: $error_type"
echo "Message: $error_message"
echo "Location: $error_file:$error_line"

# 1. Log error to file
error_log=".claude/errors.log"
timestamp=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$timestamp] $error_type: $error_message ($error_file:$error_line)" >> "$error_log"

# 2. Check if error is a common pattern and suggest fix
case "$error_type" in
  "TypeError")
    echo ""
    echo "💡 Suggestions for TypeError:"
    echo "  - Check if variable is defined before use"
    echo "  - Add null/undefined checks"
    echo "  - Verify object properties exist"
    echo "  - Check function return types"
    ;;
  "ReferenceError")
    echo ""
    echo "💡 Suggestions for ReferenceError:"
    echo "  - Check variable spelling"
    echo "  - Ensure variable is declared before use"
    echo "  - Check import statements"
    echo "  - Verify scope of variable"
    ;;
  "SyntaxError")
    echo ""
    echo "💡 Suggestions for SyntaxError:"
    echo "  - Check for missing brackets or parentheses"
    echo "  - Verify proper quote usage"
    echo "  - Check for trailing commas in objects"
    echo "  - Run prettier to auto-format code"
    ;;
  "NetworkError"|"FetchError")
    echo ""
    echo "💡 Suggestions for Network Errors:"
    echo "  - Check internet connection"
    echo "  - Verify API endpoint URL"
    echo "  - Check API key configuration"
    echo "  - Inspect network tab in DevTools"
    ;;
esac

# 3. Search for similar errors in project
echo ""
echo "🔍 Searching for similar errors in codebase..."
if [ -n "$error_message" ]; then
  # Extract key part of error message
  search_term=$(echo "$error_message" | cut -d' ' -f1-3)
  matches=$(grep -r "$search_term" . --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null | head -5)
  
  if [ -n "$matches" ]; then
    echo "Found similar code:"
    echo "$matches"
  fi
fi

# 4. Check if error file has recent changes
if [ -n "$error_file" ] && [ -f "$error_file" ]; then
  echo ""
  echo "📝 Recent changes to $error_file:"
  git log --oneline -n 3 -- "$error_file" 2>/dev/null || echo "No git history available"
fi

# 5. Suggest running debugger
echo ""
echo "🐛 Debugging suggestions:"
echo "  1. Add breakpoint at $error_file:$error_line"
echo "  2. Run with debugger: node --inspect-brk"
echo "  3. Add console.log before line $error_line"
echo "  4. Check error stack trace for more context"

# 6. Check if tests exist for error file
if [ -n "$error_file" ]; then
  test_file="${error_file%.tsx}.test.tsx"
  test_file="${test_file%.ts}.test.ts"
  
  if [ ! -f "$test_file" ]; then
    echo ""
    echo "⚠️  No test file found for $error_file"
    echo "Consider creating: $test_file"
  fi
fi

# 7. Auto-create issue file for tracking
issue_file=".claude/issues/error-$(date +%s).md"
mkdir -p .claude/issues
cat > "$issue_file" << EOF
# Error Report

**Date**: $(date '+%Y-%m-%d %H:%M:%S')
**Type**: $error_type
**File**: $error_file:$error_line

## Error Message
\`\`\`
$error_message
\`\`\`

## Context
- [ ] Error reproduced
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Tests added
- [ ] Verified in production

## Notes
<!-- Add investigation notes here -->
EOF

echo ""
echo "📄 Error report created: $issue_file"

# 8. Offer to rollback if in git repo
if git rev-parse --git-dir > /dev/null 2>&1; then
  echo ""
  echo "🔄 Recent commits (in case rollback needed):"
  git log --oneline -n 3
fi

exit 0
