#!/bin/bash
# performance-check.sh - Monitor performance and detect issues

# Load utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/context.sh"
source "${SCRIPT_DIR}/../lib/delegate.sh"
source "${SCRIPT_DIR}/../lib/validate.sh"
source "${SCRIPT_DIR}/../lib/logger.sh"

# Start logging
log_start "performance-check"

# Get operation context
OPERATION=$(echo "$HOOK_CONTEXT" | jq -r '.operation // "unknown"' 2>/dev/null)
TARGET_FILE=$(echo "$HOOK_CONTEXT" | jq -r '.file // ""' 2>/dev/null)

log_info "Performance check for operation: $OPERATION"

# Quick performance metrics collection
METRICS_COLLECTED="false"
PERFORMANCE_ISSUES=0

# Check file size for large files
if [[ -n "$TARGET_FILE" ]] && [[ -f "$TARGET_FILE" ]]; then
    FILE_SIZE=$(stat -f%z "$TARGET_FILE" 2>/dev/null || stat -c%s "$TARGET_FILE" 2>/dev/null || echo "0")
    LINE_COUNT=$(wc -l < "$TARGET_FILE" 2>/dev/null | tr -d ' ')
    
    # Check for performance issues
    if [[ $FILE_SIZE -gt 1048576 ]]; then  # > 1MB
        PERFORMANCE_ISSUES=$((PERFORMANCE_ISSUES + 1))
        log_warn "Large file detected: $(($FILE_SIZE / 1024))KB"
    fi
    
    if [[ $LINE_COUNT -gt 500 ]]; then
        PERFORMANCE_ISSUES=$((PERFORMANCE_ISSUES + 1))
        log_warn "Long file detected: $LINE_COUNT lines"
    fi
    
    METRICS_COLLECTED="true"
fi

# Check for common performance anti-patterns in JavaScript/TypeScript
if [[ -n "$TARGET_FILE" ]] && echo "$TARGET_FILE" | grep -E "\.(js|jsx|ts|tsx)$" > /dev/null; then
    
    # Quick pattern checks
    ANTI_PATTERNS=(
        "console\.(log|debug|info)"  # Console logging in production
        "for.*in\s"                  # for..in loops (slower)
        "JSON\.parse.*JSON\.stringify" # Deep cloning anti-pattern
        "document\.querySelector.*forEach" # DOM queries in loops
        "await.*for\s*\("            # Await in loops
    )
    
    for pattern in "${ANTI_PATTERNS[@]}"; do
        if grep -E "$pattern" "$TARGET_FILE" > /dev/null 2>&1; then
            PERFORMANCE_ISSUES=$((PERFORMANCE_ISSUES + 1))
            log_warn "Performance anti-pattern detected: $pattern"
        fi
    done
fi

# Check build/bundle metrics if available
if [[ -f "package.json" ]]; then
    # Check node_modules size
    if [[ -d "node_modules" ]]; then
        MODULE_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
        if [[ $MODULE_COUNT -gt 500 ]]; then
            PERFORMANCE_ISSUES=$((PERFORMANCE_ISSUES + 1))
            log_warn "Large dependency count: $MODULE_COUNT modules"
        fi
    fi
    
    # Check for build output size
    if [[ -d "dist" ]] || [[ -d "build" ]]; then
        BUILD_DIR=$(test -d "dist" && echo "dist" || echo "build")
        BUILD_SIZE=$(du -sk "$BUILD_DIR" 2>/dev/null | cut -f1)
        
        if [[ $BUILD_SIZE -gt 10240 ]]; then  # > 10MB
            PERFORMANCE_ISSUES=$((PERFORMANCE_ISSUES + 1))
            log_warn "Large build size: ${BUILD_SIZE}KB"
        fi
    fi
fi

log_performance "issues_found" "$PERFORMANCE_ISSUES" "count"

# Decision: Delegate to AI for performance analysis if issues found
if [[ $PERFORMANCE_ISSUES -gt 2 ]]; then
    
    log_delegation "@performance-optimizer" "Multiple performance issues detected"
    
    # Gather performance context
    PERF_CONTEXT=$(cat <<EOF
{
    "operation": "$OPERATION",
    "targetFile": "$TARGET_FILE",
    "metrics": {
        "fileSize": ${FILE_SIZE:-0},
        "lineCount": ${LINE_COUNT:-0},
        "moduleCount": ${MODULE_COUNT:-0},
        "buildSize": ${BUILD_SIZE:-0}
    },
    "issuesFound": $PERFORMANCE_ISSUES,
    "projectType": "$(test -f package.json && echo 'node' || echo 'unknown')"
}
EOF
)
    
    # Delegate to performance AI agent
    delegate_to_ai "@performance-optimizer" \
        --context "$PERF_CONTEXT" \
        --task "performance-check"
    
else
    # No significant performance issues
    if [[ $PERFORMANCE_ISSUES -gt 0 ]]; then
        log_info "Minor performance considerations detected ($PERFORMANCE_ISSUES issues)"
        echo "Performance check: $PERFORMANCE_ISSUES minor issues found"
    else
        log_info "Performance check passed - no issues detected"
        echo "Performance check: OK"
    fi
fi

# Log completion
log_end "performance-check" "success"
exit 0