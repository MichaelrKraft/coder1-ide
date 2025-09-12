#!/bin/bash
# delegate.sh - AI delegation utilities for hybrid hooks

# Delegate task to AI agent
delegate_to_ai() {
    local agent="$1"
    shift
    
    local context=""
    local task=""
    local threshold_check="false"
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --context)
                context="$2"
                shift 2
                ;;
            --task)
                task="$2"
                shift 2
                ;;
            --threshold-check)
                threshold_check="true"
                shift
                ;;
            *)
                shift
                ;;
        esac
    done
    
    # Build delegation payload
    local delegation_payload=$(cat <<EOF
{
    "agent": "$agent",
    "context": $context,
    "task": "$task"
}
EOF
)
    
    # Output delegation marker for HybridHookManager
    echo "DELEGATE_TO_AI:$delegation_payload"
    
    return 0
}

# Check if delegation is needed based on thresholds
should_delegate() {
    local metric="$1"
    local value="$2"
    local threshold="$3"
    
    # Compare value against threshold
    if [[ "$metric" == "files" ]] || [[ "$metric" == "lines" ]] || [[ "$metric" == "errors" ]]; then
        # Numeric comparison
        if [[ $value -gt $threshold ]]; then
            return 0  # Should delegate
        fi
    elif [[ "$metric" == "complexity" ]]; then
        # Float comparison (using bc if available)
        if command -v bc &> /dev/null; then
            if [[ $(echo "$value > $threshold" | bc -l) -eq 1 ]]; then
                return 0  # Should delegate
            fi
        else
            # Fallback to integer comparison
            value_int=${value%.*}
            threshold_int=${threshold%.*}
            if [[ $value_int -gt $threshold_int ]]; then
                return 0  # Should delegate
            fi
        fi
    fi
    
    return 1  # Should not delegate
}

# Calculate complexity score for code changes
calculate_complexity() {
    local files_changed="$1"
    local lines_changed="$2"
    
    # Simple complexity formula
    # Normalize files (0-1 scale, assuming 20 files is very complex)
    local file_score=$(echo "scale=2; $files_changed / 20" | bc 2>/dev/null || echo "0.5")
    
    # Normalize lines (0-1 scale, assuming 500 lines is very complex)
    local line_score=$(echo "scale=2; $lines_changed / 500" | bc 2>/dev/null || echo "0.5")
    
    # Average the scores
    local complexity=$(echo "scale=2; ($file_score + $line_score) / 2" | bc 2>/dev/null || echo "0.5")
    
    # Ensure value is between 0 and 1
    if (( $(echo "$complexity > 1" | bc -l 2>/dev/null || echo "0") )); then
        complexity="1.0"
    fi
    
    echo "$complexity"
}

# Get delegation configuration for a hook
get_delegation_config() {
    local hook_name="$1"
    local config_file="${AI_DELEGATES_DIR:-hooks/ai-delegates}/${hook_name}.json"
    
    if [[ -f "$config_file" ]]; then
        cat "$config_file"
    else
        # Return default configuration
        cat <<EOF
{
    "agents": ["@implementer"],
    "thresholds": {
        "files": 5,
        "lines": 100,
        "complexity": 0.7
    }
}
EOF
    fi
}

# Select appropriate AI agent based on context
select_ai_agent() {
    local task_type="$1"
    local context="$2"
    
    # Map task types to specialized agents
    case "$task_type" in
        commit|git)
            echo "@commit-specialist"
            ;;
        security|auth|crypto)
            echo "@security-auditor"
            ;;
        test|testing|spec)
            echo "@test-engineer"
            ;;
        performance|optimize|speed)
            echo "@performance-optimizer"
            ;;
        debug|error|fix)
            echo "@debugger"
            ;;
        frontend|ui|react|css)
            echo "@frontend-specialist"
            ;;
        backend|api|database|server)
            echo "@backend-specialist"
            ;;
        architecture|design|pattern)
            echo "@architect"
            ;;
        *)
            echo "@implementer"
            ;;
    esac
}

# Format delegation response for output
format_delegation_response() {
    local response="$1"
    local format="${2:-text}"
    
    case "$format" in
        json)
            echo "$response"
            ;;
        text)
            echo "$response" | jq -r '.recommendations // .result // "No recommendations available"' 2>/dev/null || echo "$response"
            ;;
        markdown)
            echo "## AI Delegation Response"
            echo "$response" | jq -r '.recommendations // .result // "No recommendations available"' 2>/dev/null || echo "$response"
            ;;
        *)
            echo "$response"
            ;;
    esac
}

# Export functions
export -f delegate_to_ai
export -f should_delegate
export -f calculate_complexity
export -f get_delegation_config
export -f select_ai_agent
export -f format_delegation_response