#!/bin/bash

# kill-ports.sh - Kill processes using specified ports
# Usage: ./scripts/kill-ports.sh [port1] [port2] ...
# Example: ./scripts/kill-ports.sh 3000 3001

echo "🔧 Port Cleanup Utility"
echo "======================="

# Default ports if none specified
if [ $# -eq 0 ]; then
    PORTS=(3000 3001 3002 5000 5001 8000 8080)
    echo "No ports specified. Checking default ports: ${PORTS[@]}"
else
    PORTS=("$@")
    echo "Checking specified ports: ${PORTS[@]}"
fi

echo ""

# Function to kill process on a port
kill_port() {
    local port=$1
    echo -n "Port $port: "
    
    # Find PIDs using the port
    local pids=$(lsof -ti :$port 2>/dev/null)
    
    if [ -z "$pids" ]; then
        echo "✅ Free"
    else
        echo -n "Found process(es) $pids - killing... "
        kill -9 $pids 2>/dev/null
        sleep 0.5
        
        # Verify it's killed
        if lsof -ti :$port >/dev/null 2>&1; then
            echo "❌ Failed to kill"
        else
            echo "✅ Killed successfully"
        fi
    fi
}

# Process each port
for port in "${PORTS[@]}"; do
    kill_port $port
done

echo ""
echo "✨ Port cleanup complete!"