#!/bin/bash
# smart-commit.sh - Intelligent commit message generation with AI delegation

# Load utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/context.sh"
source "${SCRIPT_DIR}/../lib/delegate.sh"
source "${SCRIPT_DIR}/../lib/validate.sh"
source "${SCRIPT_DIR}/../lib/logger.sh"

# Start logging
log_start "smart-commit"

# Validate git repository
if ! validate_git_repo; then
    log_error "Not in a git repository"
    log_end "smart-commit" "failed"
    exit 1
fi

# Gather git context
GIT_CONTEXT=$(gather_git_context)
log_context "git" "$GIT_CONTEXT"

# Extract metrics
FILES_CHANGED=$(echo "$GIT_CONTEXT" | jq -r '.filesChanged // 0')
LINES_CHANGED=$(echo "$GIT_CONTEXT" | jq -r '.linesChanged // 0')

log_info "Analyzing commit: $FILES_CHANGED files, $LINES_CHANGED lines changed"

# Calculate complexity
COMPLEXITY=$(calculate_complexity "$FILES_CHANGED" "$LINES_CHANGED")
log_performance "complexity_score" "$COMPLEXITY" "score"

# Decision: Delegate to AI for complex commits
if should_delegate "files" "$FILES_CHANGED" "5" || \
   should_delegate "lines" "$LINES_CHANGED" "100" || \
   should_delegate "complexity" "$COMPLEXITY" "0.7"; then
    
    log_delegation "@commit-specialist" "Complex commit detected"
    
    # Gather additional context for AI
    DIFF_CONTEXT=$(git diff --cached --stat 2>/dev/null | head -20)
    FILE_TYPES=$(git diff --cached --name-only | sed 's/.*\.//' | sort -u | tr '\n' ',' | sed 's/,$//')
    
    # Build enhanced context
    ENHANCED_CONTEXT=$(cat <<EOF
{
    "git": $GIT_CONTEXT,
    "diffSummary": $(echo "$DIFF_CONTEXT" | jq -Rs .),
    "fileTypes": "$FILE_TYPES",
    "commitGuidelines": "Use conventional commit format (type: subject)"
}
EOF
)
    
    # Delegate to AI
    delegate_to_ai "@commit-specialist" \
        --context "$ENHANCED_CONTEXT" \
        --task "smart-commit"
    
else
    # Simple commit - generate basic message
    log_info "Simple commit - using conventional format"
    
    # Get first changed file for context
    FIRST_FILE=$(git diff --cached --name-only | head -1)
    FILE_DIR=$(dirname "$FIRST_FILE" 2>/dev/null | sed 's|^./||')
    
    # Determine commit type based on file changes
    COMMIT_TYPE="chore"
    if echo "$FIRST_FILE" | grep -q "test"; then
        COMMIT_TYPE="test"
    elif echo "$FIRST_FILE" | grep -q "doc"; then
        COMMIT_TYPE="docs"
    elif [[ "$FILES_CHANGED" -eq 1 ]] && [[ "$LINES_CHANGED" -lt 10 ]]; then
        COMMIT_TYPE="fix"
    elif [[ "$LINES_CHANGED" -gt 50 ]]; then
        COMMIT_TYPE="feat"
    fi
    
    # Generate simple commit message
    if [[ -n "$FILE_DIR" ]] && [[ "$FILE_DIR" != "." ]]; then
        echo "$COMMIT_TYPE: update $FILE_DIR"
    else
        echo "$COMMIT_TYPE: update $FILES_CHANGED file(s)"
    fi
fi

# Log completion
log_end "smart-commit" "success"
exit 0