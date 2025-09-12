#!/bin/bash
# context.sh - Context gathering utilities for hybrid hooks

# Get git context for current repository
gather_git_context() {
    local context="{}"
    
    # Check if in git repository
    if git rev-parse --git-dir > /dev/null 2>&1; then
        local branch=$(git branch --show-current 2>/dev/null || echo "unknown")
        local files_changed=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
        local lines_changed=$(git diff --cached --numstat 2>/dev/null | awk '{s+=$1+$2} END {print s}' || echo "0")
        local unstaged_files=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
        
        context=$(cat <<EOF
{
    "branch": "$branch",
    "filesChanged": $files_changed,
    "linesChanged": ${lines_changed:-0},
    "unstagedFiles": $unstaged_files,
    "lastCommit": "$(git log -1 --pretty=%B 2>/dev/null | head -1 || echo "")"
}
EOF
)
    fi
    
    echo "$context"
}

# Get file context for a specific file
gather_file_context() {
    local file_path="$1"
    local context="{}"
    
    if [[ -f "$file_path" ]]; then
        local file_size=$(stat -f%z "$file_path" 2>/dev/null || stat -c%s "$file_path" 2>/dev/null || echo "0")
        local line_count=$(wc -l < "$file_path" | tr -d ' ')
        local extension="${file_path##*.}"
        local mime_type=$(file -b --mime-type "$file_path" 2>/dev/null || echo "unknown")
        
        context=$(cat <<EOF
{
    "path": "$file_path",
    "size": $file_size,
    "lines": $line_count,
    "extension": "$extension",
    "mimeType": "$mime_type"
}
EOF
)
    fi
    
    echo "$context"
}

# Get project context
gather_project_context() {
    local context="{}"
    
    # Check for common project files
    local project_type="unknown"
    local dependencies="[]"
    
    if [[ -f "package.json" ]]; then
        project_type="node"
        dependencies=$(jq -r '.dependencies // {} | keys | @json' package.json 2>/dev/null || echo "[]")
    elif [[ -f "requirements.txt" ]]; then
        project_type="python"
    elif [[ -f "Cargo.toml" ]]; then
        project_type="rust"
    elif [[ -f "go.mod" ]]; then
        project_type="go"
    fi
    
    context=$(cat <<EOF
{
    "type": "$project_type",
    "dependencies": $dependencies,
    "hasTests": $(test -d "test" -o -d "tests" -o -d "__tests__" && echo "true" || echo "false"),
    "hasCI": $(test -f ".github/workflows" -o -f ".gitlab-ci.yml" && echo "true" || echo "false")
}
EOF
)
    
    echo "$context"
}

# Get error context from recent command output
gather_error_context() {
    local error_output="$1"
    local context="{}"
    
    # Extract error type and message
    local error_type="unknown"
    local error_message="$error_output"
    
    # Common error pattern matching
    if echo "$error_output" | grep -q "SyntaxError"; then
        error_type="syntax"
    elif echo "$error_output" | grep -q "TypeError"; then
        error_type="type"
    elif echo "$error_output" | grep -q "ReferenceError"; then
        error_type="reference"
    elif echo "$error_output" | grep -q "npm ERR"; then
        error_type="npm"
    elif echo "$error_output" | grep -q "ESLint"; then
        error_type="lint"
    fi
    
    context=$(cat <<EOF
{
    "type": "$error_type",
    "message": $(echo "$error_message" | jq -Rs .),
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)
    
    echo "$context"
}

# Get performance context
gather_performance_context() {
    local command="$1"
    local start_time="$2"
    local end_time="$3"
    
    local duration=$((end_time - start_time))
    
    context=$(cat <<EOF
{
    "command": "$command",
    "duration": $duration,
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)
    
    echo "$context"
}

# Export functions for use in other scripts
export -f gather_git_context
export -f gather_file_context
export -f gather_project_context
export -f gather_error_context
export -f gather_performance_context