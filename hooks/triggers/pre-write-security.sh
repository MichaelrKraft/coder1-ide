#!/bin/bash
# pre-write-security.sh - Security check before writing files

# Load utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/context.sh"
source "${SCRIPT_DIR}/../lib/delegate.sh"
source "${SCRIPT_DIR}/../lib/validate.sh"
source "${SCRIPT_DIR}/../lib/logger.sh"

# Start logging
log_start "pre-write-security"

# Get file path from hook context
FILE_PATH=$(echo "$HOOK_CONTEXT" | jq -r '.file_path // ""' 2>/dev/null)

if [[ -z "$FILE_PATH" ]]; then
    log_warn "No file path provided in context"
    log_end "pre-write-security" "skipped"
    exit 0
fi

log_info "Security check for: $FILE_PATH"

# Quick security patterns check
SUSPICIOUS_PATTERNS=(
    "password.*=.*['\"].*['\"]"
    "api[_-]?key.*=.*['\"].*['\"]"
    "secret.*=.*['\"].*['\"]"
    "token.*=.*['\"].*['\"]"
    "private[_-]?key"
    "AWS_SECRET"
    "GITHUB_TOKEN"
    "ssh-rsa"
    "-----BEGIN.*PRIVATE"
)

# Read file content (if it exists)
if [[ -f "$FILE_PATH" ]]; then
    FILE_CONTENT=$(cat "$FILE_PATH" 2>/dev/null || echo "")
else
    # For new files, check the write content from context
    FILE_CONTENT=$(echo "$HOOK_CONTEXT" | jq -r '.content // ""' 2>/dev/null)
fi

# Count suspicious patterns found
SUSPICIOUS_COUNT=0
FOUND_PATTERNS=""

for pattern in "${SUSPICIOUS_PATTERNS[@]}"; do
    if echo "$FILE_CONTENT" | grep -iE "$pattern" > /dev/null 2>&1; then
        SUSPICIOUS_COUNT=$((SUSPICIOUS_COUNT + 1))
        FOUND_PATTERNS="${FOUND_PATTERNS}${pattern},"
        log_warn "Suspicious pattern detected: $pattern"
    fi
done

# Check file extension for sensitive files
SENSITIVE_EXTENSIONS=(".env" ".key" ".pem" ".p12" ".pfx" ".cer" ".crt")
FILE_EXT=".${FILE_PATH##*.}"

IS_SENSITIVE_FILE="false"
for ext in "${SENSITIVE_EXTENSIONS[@]}"; do
    if [[ "$FILE_EXT" == "$ext" ]]; then
        IS_SENSITIVE_FILE="true"
        log_warn "Sensitive file type detected: $ext"
        break
    fi
done

# Decision: Delegate to AI for deeper analysis if suspicious
if [[ $SUSPICIOUS_COUNT -gt 0 ]] || [[ "$IS_SENSITIVE_FILE" == "true" ]]; then
    
    log_delegation "@security-auditor" "Suspicious patterns or sensitive file detected"
    
    # Gather security context
    SECURITY_CONTEXT=$(cat <<EOF
{
    "filePath": "$FILE_PATH",
    "fileExtension": "$FILE_EXT",
    "suspiciousPatterns": "$FOUND_PATTERNS",
    "suspiciousCount": $SUSPICIOUS_COUNT,
    "isSensitiveFile": $IS_SENSITIVE_FILE,
    "contentLength": $(echo "$FILE_CONTENT" | wc -c),
    "action": "pre-write-check"
}
EOF
)
    
    # Delegate to security AI agent
    delegate_to_ai "@security-auditor" \
        --context "$SECURITY_CONTEXT" \
        --task "pre-write-security"
    
    # Note: In production, the AI response would determine whether to block the write
    log_warn "Security review required - delegated to AI"
    
else
    # No security concerns detected
    log_info "Security check passed - no suspicious patterns found"
fi

# Log completion
log_end "pre-write-security" "success"
exit 0