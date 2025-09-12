#!/bin/bash
# validate.sh - Input validation utilities for hybrid hooks

# Validate file path
validate_file_path() {
    local file_path="$1"
    
    # Check if path is provided
    if [[ -z "$file_path" ]]; then
        echo "Error: File path is required" >&2
        return 1
    fi
    
    # Check if file exists
    if [[ ! -f "$file_path" ]]; then
        echo "Error: File not found: $file_path" >&2
        return 1
    fi
    
    # Check if file is readable
    if [[ ! -r "$file_path" ]]; then
        echo "Error: File is not readable: $file_path" >&2
        return 1
    fi
    
    return 0
}

# Validate directory path
validate_directory() {
    local dir_path="$1"
    
    # Check if path is provided
    if [[ -z "$dir_path" ]]; then
        echo "Error: Directory path is required" >&2
        return 1
    fi
    
    # Check if directory exists
    if [[ ! -d "$dir_path" ]]; then
        echo "Error: Directory not found: $dir_path" >&2
        return 1
    fi
    
    # Check if directory is accessible
    if [[ ! -x "$dir_path" ]]; then
        echo "Error: Directory is not accessible: $dir_path" >&2
        return 1
    fi
    
    return 0
}

# Validate git repository
validate_git_repo() {
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo "Error: Not in a git repository" >&2
        return 1
    fi
    
    return 0
}

# Validate JSON string
validate_json() {
    local json_string="$1"
    
    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        echo "Warning: jq not available for JSON validation" >&2
        return 0  # Don't fail if jq is not available
    fi
    
    # Validate JSON
    if ! echo "$json_string" | jq empty 2>/dev/null; then
        echo "Error: Invalid JSON format" >&2
        return 1
    fi
    
    return 0
}

# Validate file extension
validate_file_extension() {
    local file_path="$1"
    shift
    local valid_extensions=("$@")
    
    # Get file extension
    local extension="${file_path##*.}"
    
    # Check if extension is in valid list
    for valid_ext in "${valid_extensions[@]}"; do
        if [[ "$extension" == "$valid_ext" ]]; then
            return 0
        fi
    done
    
    echo "Error: Invalid file extension: .$extension (expected: ${valid_extensions[*]})" >&2
    return 1
}

# Validate numeric value
validate_number() {
    local value="$1"
    local min="${2:-}"
    local max="${3:-}"
    
    # Check if value is a number
    if ! [[ "$value" =~ ^[0-9]+$ ]]; then
        echo "Error: Value is not a number: $value" >&2
        return 1
    fi
    
    # Check minimum
    if [[ -n "$min" ]] && [[ $value -lt $min ]]; then
        echo "Error: Value $value is less than minimum $min" >&2
        return 1
    fi
    
    # Check maximum
    if [[ -n "$max" ]] && [[ $value -gt $max ]]; then
        echo "Error: Value $value is greater than maximum $max" >&2
        return 1
    fi
    
    return 0
}

# Validate command exists
validate_command() {
    local command="$1"
    
    if ! command -v "$command" &> /dev/null; then
        echo "Error: Command not found: $command" >&2
        return 1
    fi
    
    return 0
}

# Validate environment variable
validate_env_var() {
    local var_name="$1"
    local required="${2:-false}"
    
    # Check if variable is set
    if [[ -z "${!var_name}" ]]; then
        if [[ "$required" == "true" ]]; then
            echo "Error: Required environment variable not set: $var_name" >&2
            return 1
        else
            echo "Warning: Environment variable not set: $var_name" >&2
        fi
    fi
    
    return 0
}

# Validate file size
validate_file_size() {
    local file_path="$1"
    local max_size="${2:-10485760}"  # Default 10MB
    
    if ! validate_file_path "$file_path"; then
        return 1
    fi
    
    # Get file size
    local file_size=$(stat -f%z "$file_path" 2>/dev/null || stat -c%s "$file_path" 2>/dev/null || echo "0")
    
    if [[ $file_size -gt $max_size ]]; then
        echo "Error: File size ($file_size bytes) exceeds maximum ($max_size bytes)" >&2
        return 1
    fi
    
    return 0
}

# Validate security patterns
validate_no_secrets() {
    local content="$1"
    
    # Check for common secret patterns
    local secret_patterns=(
        "password[:=]"
        "api[_-]?key[:=]"
        "secret[:=]"
        "token[:=]"
        "AWS[_-]?SECRET"
        "PRIVATE[_-]?KEY"
        "ssh-rsa"
        "-----BEGIN"
    )
    
    for pattern in "${secret_patterns[@]}"; do
        if echo "$content" | grep -iE "$pattern" > /dev/null 2>&1; then
            echo "Warning: Potential secret detected (pattern: $pattern)" >&2
            return 1
        fi
    done
    
    return 0
}

# Export functions
export -f validate_file_path
export -f validate_directory
export -f validate_git_repo
export -f validate_json
export -f validate_file_extension
export -f validate_number
export -f validate_command
export -f validate_env_var
export -f validate_file_size
export -f validate_no_secrets