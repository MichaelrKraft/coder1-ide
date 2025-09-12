#!/bin/bash
# on-error-debug.sh - Intelligent error analysis and debugging assistance

# Load utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/context.sh"
source "${SCRIPT_DIR}/../lib/delegate.sh"
source "${SCRIPT_DIR}/../lib/validate.sh"
source "${SCRIPT_DIR}/../lib/logger.sh"

# Start logging
log_start "on-error-debug"

# Get error context from hook
ERROR_MESSAGE=$(echo "$HOOK_CONTEXT" | jq -r '.error // ""' 2>/dev/null)
ERROR_FILE=$(echo "$HOOK_CONTEXT" | jq -r '.file // ""' 2>/dev/null)
ERROR_LINE=$(echo "$HOOK_CONTEXT" | jq -r '.line // ""' 2>/dev/null)
ERROR_COMMAND=$(echo "$HOOK_CONTEXT" | jq -r '.command // ""' 2>/dev/null)

if [[ -z "$ERROR_MESSAGE" ]]; then
    log_warn "No error message provided"
    log_end "on-error-debug" "skipped"
    exit 0
fi

log_info "Analyzing error: ${ERROR_MESSAGE:0:100}..."

# Categorize error type
ERROR_TYPE="unknown"
ERROR_SEVERITY="medium"
QUICK_FIX=""

# JavaScript/TypeScript errors
if echo "$ERROR_MESSAGE" | grep -E "(SyntaxError|ReferenceError|TypeError)" > /dev/null; then
    ERROR_TYPE="javascript"
    
    if echo "$ERROR_MESSAGE" | grep -q "SyntaxError"; then
        ERROR_SEVERITY="high"
        QUICK_FIX="Check for missing brackets, quotes, or semicolons"
    elif echo "$ERROR_MESSAGE" | grep -q "ReferenceError.*is not defined"; then
        ERROR_SEVERITY="high"
        QUICK_FIX="Check imports and variable declarations"
    elif echo "$ERROR_MESSAGE" | grep -q "TypeError.*undefined"; then
        ERROR_SEVERITY="medium"
        QUICK_FIX="Add null/undefined checks"
    fi
    
# Build/compilation errors
elif echo "$ERROR_MESSAGE" | grep -E "(npm ERR|ERROR in|Module not found)" > /dev/null; then
    ERROR_TYPE="build"
    
    if echo "$ERROR_MESSAGE" | grep -q "Module not found"; then
        ERROR_SEVERITY="high"
        QUICK_FIX="Run 'npm install' or check import paths"
    elif echo "$ERROR_MESSAGE" | grep -q "npm ERR.*ENOENT"; then
        ERROR_SEVERITY="high"
        QUICK_FIX="Check if file exists or run 'npm install'"
    fi
    
# TypeScript errors
elif echo "$ERROR_MESSAGE" | grep -E "(TS[0-9]+:|Type.*does not|Property.*does not exist)" > /dev/null; then
    ERROR_TYPE="typescript"
    ERROR_SEVERITY="medium"
    
    if echo "$ERROR_MESSAGE" | grep -q "Property.*does not exist"; then
        QUICK_FIX="Check type definitions or add type assertions"
    elif echo "$ERROR_MESSAGE" | grep -q "Type.*is not assignable"; then
        QUICK_FIX="Review type compatibility"
    fi
    
# Test failures
elif echo "$ERROR_MESSAGE" | grep -E "(FAIL|Expected.*Received|test.*failed)" > /dev/null; then
    ERROR_TYPE="test"
    ERROR_SEVERITY="low"
    QUICK_FIX="Review test expectations and implementation"
    
# Git errors
elif echo "$ERROR_MESSAGE" | grep -E "(fatal:|error:.*git)" > /dev/null; then
    ERROR_TYPE="git"
    ERROR_SEVERITY="medium"
    QUICK_FIX="Check git status and repository state"
fi

log_info "Error type: $ERROR_TYPE, Severity: $ERROR_SEVERITY"

# Count similar errors in recent history (if available)
ERROR_FREQUENCY=1
if [[ -f "/tmp/hybrid-hooks.log" ]]; then
    SIMILAR_ERRORS=$(grep -c "${ERROR_TYPE}.*error" /tmp/hybrid-hooks.log 2>/dev/null || echo "1")
    if [[ $SIMILAR_ERRORS -gt 3 ]]; then
        ERROR_FREQUENCY=$SIMILAR_ERRORS
        log_warn "Recurring error pattern detected ($SIMILAR_ERRORS occurrences)"
    fi
fi

# Decision: Delegate to AI for complex or recurring errors
if [[ "$ERROR_SEVERITY" == "high" ]] || [[ $ERROR_FREQUENCY -gt 3 ]] || [[ "$ERROR_TYPE" == "unknown" ]]; then
    
    log_delegation "@debugger" "Complex or recurring error requiring deep analysis"
    
    # Gather comprehensive error context
    FILE_CONTEXT=""
    if [[ -n "$ERROR_FILE" ]] && [[ -f "$ERROR_FILE" ]]; then
        # Get surrounding code context
        if [[ -n "$ERROR_LINE" ]]; then
            START_LINE=$((ERROR_LINE - 5))
            END_LINE=$((ERROR_LINE + 5))
            FILE_CONTEXT=$(sed -n "${START_LINE},${END_LINE}p" "$ERROR_FILE" 2>/dev/null | head -20)
        fi
    fi
    
    DEBUG_CONTEXT=$(cat <<EOF
{
    "error": {
        "message": $(echo "$ERROR_MESSAGE" | jq -Rs .),
        "type": "$ERROR_TYPE",
        "severity": "$ERROR_SEVERITY",
        "file": "$ERROR_FILE",
        "line": "$ERROR_LINE",
        "command": "$ERROR_COMMAND"
    },
    "context": {
        "codeSnippet": $(echo "$FILE_CONTEXT" | jq -Rs .),
        "project": $(gather_project_context),
        "frequency": $ERROR_FREQUENCY
    },
    "quickFix": "$QUICK_FIX"
}
EOF
)
    
    # Delegate to debugger AI agent
    delegate_to_ai "@debugger" \
        --context "$DEBUG_CONTEXT" \
        --task "on-error-debug"
    
else
    # Simple error with known fix
    log_info "Simple error with known solution"
    
    echo "Error Analysis:"
    echo "  Type: $ERROR_TYPE"
    echo "  Severity: $ERROR_SEVERITY"
    echo "  Quick Fix: $QUICK_FIX"
    
    # Provide specific suggestions based on error type
    case "$ERROR_TYPE" in
        javascript)
            echo "  Suggestions:"
            echo "    - Check syntax near line $ERROR_LINE"
            echo "    - Verify all variables are declared"
            echo "    - Review recent changes in $ERROR_FILE"
            ;;
        build)
            echo "  Suggestions:"
            echo "    - Run: npm install"
            echo "    - Clear cache: npm cache clean --force"
            echo "    - Check package.json dependencies"
            ;;
        typescript)
            echo "  Suggestions:"
            echo "    - Run: npx tsc --noEmit"
            echo "    - Check type definitions"
            echo "    - Consider using 'any' temporarily"
            ;;
        test)
            echo "  Suggestions:"
            echo "    - Run tests in watch mode: npm test -- --watch"
            echo "    - Check test data and mocks"
            echo "    - Review recent implementation changes"
            ;;
    esac
fi

# Log completion
log_end "on-error-debug" "success"
exit 0