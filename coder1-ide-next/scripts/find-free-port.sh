#!/bin/bash

# find-free-port.sh - Find next available port starting from a base port
# Usage: ./scripts/find-free-port.sh [base_port]

BASE_PORT=${1:-3000}
MAX_ATTEMPTS=10

echo "🔍 Finding free port starting from $BASE_PORT..."

for i in $(seq 0 $MAX_ATTEMPTS); do
    PORT=$((BASE_PORT + i))
    
    # Check if port is in use
    if ! lsof -i :$PORT >/dev/null 2>&1; then
        echo "✅ Port $PORT is available"
        echo $PORT
        exit 0
    else
        echo "   Port $PORT is in use, checking next..."
    fi
done

echo "❌ No free ports found in range $BASE_PORT-$((BASE_PORT + MAX_ATTEMPTS))"
exit 1