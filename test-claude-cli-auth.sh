#!/bin/bash

echo "Testing Claude CLI authentication methods..."
echo

# Test 1: Direct CLI call with --print flag
echo "Test 1: Direct CLI call with --print"
echo "Say hello" | claude --print 2>&1 | head -5
echo

# Test 2: With OAuth token in environment
echo "Test 2: With CLAUDE_CODE_OAUTH_TOKEN"
export CLAUDE_CODE_OAUTH_TOKEN="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"
echo "Say hello" | claude --print 2>&1 | head -5
echo

# Test 3: Check if there's a config we can use
echo "Test 3: Check Claude config"
claude config list --global 2>&1 | head -10
echo

# Test 4: Try with dangerously-skip-permissions flag (for testing)
echo "Test 4: With skip-permissions flag"
echo "Say hello" | claude --print --dangerously-skip-permissions 2>&1 | head -5