#!/bin/bash
# logger.sh - Logging utilities for hybrid hooks

# Log levels
LOG_LEVEL_DEBUG=0
LOG_LEVEL_INFO=1
LOG_LEVEL_WARN=2
LOG_LEVEL_ERROR=3

# Current log level (can be overridden by environment variable)
CURRENT_LOG_LEVEL=${HOOK_LOG_LEVEL:-$LOG_LEVEL_INFO}

# Log file location
LOG_FILE=${HOOK_LOG_FILE:-"/tmp/hybrid-hooks.log"}

# Colors for terminal output
if [[ -t 1 ]]; then
    COLOR_RESET='\033[0m'
    COLOR_DEBUG='\033[36m'  # Cyan
    COLOR_INFO='\033[32m'   # Green
    COLOR_WARN='\033[33m'   # Yellow
    COLOR_ERROR='\033[31m'  # Red
else
    COLOR_RESET=''
    COLOR_DEBUG=''
    COLOR_INFO=''
    COLOR_WARN=''
    COLOR_ERROR=''
fi

# Log message with timestamp
log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local hook_name="${HOOK_NAME:-unknown}"
    
    # Format log entry
    local log_entry="[$timestamp] [$level] [$hook_name] $message"
    
    # Write to log file
    echo "$log_entry" >> "$LOG_FILE"
    
    # Return formatted message for console output
    echo "$log_entry"
}

# Debug logging
log_debug() {
    local message="$1"
    
    if [[ $CURRENT_LOG_LEVEL -le $LOG_LEVEL_DEBUG ]]; then
        local log_entry=$(log_message "DEBUG" "$message")
        echo -e "${COLOR_DEBUG}$log_entry${COLOR_RESET}" >&2
    fi
}

# Info logging
log_info() {
    local message="$1"
    
    if [[ $CURRENT_LOG_LEVEL -le $LOG_LEVEL_INFO ]]; then
        local log_entry=$(log_message "INFO" "$message")
        echo -e "${COLOR_INFO}$log_entry${COLOR_RESET}" >&2
    fi
}

# Warning logging
log_warn() {
    local message="$1"
    
    if [[ $CURRENT_LOG_LEVEL -le $LOG_LEVEL_WARN ]]; then
        local log_entry=$(log_message "WARN" "$message")
        echo -e "${COLOR_WARN}$log_entry${COLOR_RESET}" >&2
    fi
}

# Error logging
log_error() {
    local message="$1"
    
    if [[ $CURRENT_LOG_LEVEL -le $LOG_LEVEL_ERROR ]]; then
        local log_entry=$(log_message "ERROR" "$message")
        echo -e "${COLOR_ERROR}$log_entry${COLOR_RESET}" >&2
    fi
}

# Log execution start
log_start() {
    local hook_name="${1:-$HOOK_NAME}"
    log_info "Starting hook execution: $hook_name"
    
    # Record start time for performance tracking
    export HOOK_START_TIME=$(date +%s)
}

# Log execution end
log_end() {
    local hook_name="${1:-$HOOK_NAME}"
    local status="${2:-success}"
    
    # Calculate execution time if start time is available
    if [[ -n "$HOOK_START_TIME" ]]; then
        local end_time=$(date +%s)
        local duration=$((end_time - HOOK_START_TIME))
        log_info "Hook execution completed: $hook_name (status: $status, duration: ${duration}s)"
    else
        log_info "Hook execution completed: $hook_name (status: $status)"
    fi
}

# Log performance metrics
log_performance() {
    local metric_name="$1"
    local value="$2"
    local unit="${3:-ms}"
    
    log_debug "Performance metric: $metric_name = $value $unit"
}

# Log delegation decision
log_delegation() {
    local agent="$1"
    local reason="$2"
    
    log_info "Delegating to AI agent: $agent (reason: $reason)"
}

# Log validation result
log_validation() {
    local check="$1"
    local result="$2"
    local details="${3:-}"
    
    if [[ "$result" == "pass" ]]; then
        log_debug "Validation passed: $check"
    else
        log_warn "Validation failed: $check - $details"
    fi
}

# Log context information
log_context() {
    local context_type="$1"
    local context_data="$2"
    
    log_debug "Context ($context_type): $context_data"
}

# Rotate log file if it gets too large
rotate_log_if_needed() {
    local max_size="${1:-10485760}"  # Default 10MB
    
    if [[ -f "$LOG_FILE" ]]; then
        local file_size=$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo "0")
        
        if [[ $file_size -gt $max_size ]]; then
            local timestamp=$(date +"%Y%m%d_%H%M%S")
            local backup_file="${LOG_FILE}.${timestamp}"
            
            mv "$LOG_FILE" "$backup_file"
            gzip "$backup_file" 2>/dev/null || true
            
            log_info "Log file rotated: $backup_file.gz"
        fi
    fi
}

# Set log level
set_log_level() {
    local level="$1"
    
    case "$level" in
        debug|DEBUG)
            CURRENT_LOG_LEVEL=$LOG_LEVEL_DEBUG
            ;;
        info|INFO)
            CURRENT_LOG_LEVEL=$LOG_LEVEL_INFO
            ;;
        warn|WARN)
            CURRENT_LOG_LEVEL=$LOG_LEVEL_WARN
            ;;
        error|ERROR)
            CURRENT_LOG_LEVEL=$LOG_LEVEL_ERROR
            ;;
        *)
            log_warn "Invalid log level: $level"
            ;;
    esac
}

# Export functions
export -f log_message
export -f log_debug
export -f log_info
export -f log_warn
export -f log_error
export -f log_start
export -f log_end
export -f log_performance
export -f log_delegation
export -f log_validation
export -f log_context
export -f rotate_log_if_needed
export -f set_log_level

# Export variables
export LOG_LEVEL_DEBUG LOG_LEVEL_INFO LOG_LEVEL_WARN LOG_LEVEL_ERROR
export CURRENT_LOG_LEVEL LOG_FILE