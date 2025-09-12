#!/bin/bash
# smart-test-runner.sh - Intelligent test selection based on changes

# Load utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/context.sh"
source "${SCRIPT_DIR}/../lib/delegate.sh"
source "${SCRIPT_DIR}/../lib/validate.sh"
source "${SCRIPT_DIR}/../lib/logger.sh"

# Start logging
log_start "smart-test-runner"

# Get changed files from git or hook context
CHANGED_FILES=$(echo "$HOOK_CONTEXT" | jq -r '.changedFiles[]? // ""' 2>/dev/null)

if [[ -z "$CHANGED_FILES" ]]; then
    # Fallback to git diff
    CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null || git diff --cached --name-only 2>/dev/null)
fi

if [[ -z "$CHANGED_FILES" ]]; then
    log_info "No changed files detected - skipping test selection"
    log_end "smart-test-runner" "skipped"
    exit 0
fi

log_info "Analyzing changed files for test selection"

# Categorize changed files
SOURCE_FILES=""
TEST_FILES=""
CONFIG_FILES=""
FILE_COUNT=0

while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    FILE_COUNT=$((FILE_COUNT + 1))
    
    if echo "$file" | grep -E "\.(test|spec)\.(js|jsx|ts|tsx)$" > /dev/null; then
        TEST_FILES="${TEST_FILES}${file},"
    elif echo "$file" | grep -E "^(package\.json|tsconfig|jest\.config|webpack\.config)" > /dev/null; then
        CONFIG_FILES="${CONFIG_FILES}${file},"
    elif echo "$file" | grep -E "\.(js|jsx|ts|tsx)$" > /dev/null; then
        SOURCE_FILES="${SOURCE_FILES}${file},"
    fi
done <<< "$CHANGED_FILES"

log_info "Changed files: $FILE_COUNT (source: $(echo "$SOURCE_FILES" | tr ',' '\n' | wc -l), test: $(echo "$TEST_FILES" | tr ',' '\n' | wc -l))"

# Calculate test complexity
TEST_COMPLEXITY="low"
if [[ -n "$CONFIG_FILES" ]]; then
    TEST_COMPLEXITY="high"  # Config changes affect everything
elif [[ $FILE_COUNT -gt 10 ]]; then
    TEST_COMPLEXITY="high"  # Many files changed
elif echo "$SOURCE_FILES" | grep -E "(api|service|database|auth)" > /dev/null; then
    TEST_COMPLEXITY="medium"  # Critical components
fi

log_performance "test_complexity" "$TEST_COMPLEXITY" "level"

# Decision: Delegate to AI for complex test selection
if [[ "$TEST_COMPLEXITY" == "high" ]] || [[ $FILE_COUNT -gt 5 ]]; then
    
    log_delegation "@test-engineer" "Complex test selection required"
    
    # Gather test context
    PROJECT_CONTEXT=$(gather_project_context)
    
    TEST_CONTEXT=$(cat <<EOF
{
    "changedFiles": {
        "source": "$SOURCE_FILES",
        "test": "$TEST_FILES",
        "config": "$CONFIG_FILES",
        "count": $FILE_COUNT
    },
    "complexity": "$TEST_COMPLEXITY",
    "project": $PROJECT_CONTEXT,
    "testFramework": "$(test -f jest.config.js && echo 'jest' || echo 'unknown')"
}
EOF
)
    
    # Delegate to test AI agent
    delegate_to_ai "@test-engineer" \
        --context "$TEST_CONTEXT" \
        --task "smart-test-runner"
    
else
    # Simple test selection
    log_info "Simple test selection - running related tests"
    
    # Generate test command
    TEST_COMMAND=""
    
    if [[ -n "$TEST_FILES" ]]; then
        # Run changed test files
        TEST_COMMAND="npm test -- $(echo "$TEST_FILES" | sed 's/,/ /g')"
    elif [[ -n "$SOURCE_FILES" ]]; then
        # Find and run related tests
        FIRST_SOURCE=$(echo "$SOURCE_FILES" | cut -d',' -f1)
        TEST_PATTERN=$(echo "$FIRST_SOURCE" | sed 's/\.[^.]*$//' | sed 's/src/test/')
        
        if [[ -f "package.json" ]] && grep -q "jest" package.json; then
            TEST_COMMAND="npm test -- --findRelatedTests $FIRST_SOURCE"
        else
            TEST_COMMAND="npm test -- $TEST_PATTERN"
        fi
    else
        # Run all tests
        TEST_COMMAND="npm test"
    fi
    
    echo "Suggested test command: $TEST_COMMAND"
fi

# Log completion
log_end "smart-test-runner" "success"
exit 0