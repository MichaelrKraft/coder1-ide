#!/bin/bash

# Coder1 IDE Monitored Startup Script
# This script starts the IDE server with monitoring and auto-restart capability

set -e

# Configuration
IDE_DIR="/Users/michaelkraft/autonomous_vibe_interface/coder1-ide"
PORT=3001
MAX_RESTARTS=5
RESTART_COUNT=0
HEALTH_CHECK_URL="http://localhost:$PORT/health"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Function to check if server is healthy
check_health() {
    if curl -sf "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to kill existing server
kill_existing_server() {
    log "Checking for existing server on port $PORT..."
    local pid=$(lsof -ti :$PORT 2>/dev/null || echo "")
    if [ -n "$pid" ]; then
        log_warning "Found existing server (PID: $pid), terminating..."
        kill -TERM "$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null
        sleep 2
    fi
}

# Function to start the server
start_server() {
    log "Starting Coder1 IDE server on port $PORT..."
    cd "$IDE_DIR"
    
    # Start server in background
    PORT=$PORT npm start > /tmp/coder1-ide.log 2>&1 &
    local server_pid=$!
    
    # Wait for server to start
    local attempts=0
    local max_attempts=30
    
    while [ $attempts -lt $max_attempts ]; do
        if check_health; then
            log_success "Coder1 IDE server started successfully (PID: $server_pid)"
            echo "$server_pid" > /tmp/coder1-ide.pid
            return 0
        fi
        sleep 1
        attempts=$((attempts + 1))
        log "Waiting for server to start... ($attempts/$max_attempts)"
    done
    
    log_error "Server failed to start within $max_attempts seconds"
    return 1
}

# Function to monitor server
monitor_server() {
    log "Starting health monitoring (checking every 30 seconds)..."
    
    while true; do
        sleep 30
        
        if ! check_health; then
            log_error "Health check failed! Server appears to be down."
            
            if [ $RESTART_COUNT -lt $MAX_RESTARTS ]; then
                RESTART_COUNT=$((RESTART_COUNT + 1))
                log_warning "Attempting restart ($RESTART_COUNT/$MAX_RESTARTS)..."
                
                # Kill existing server
                kill_existing_server
                
                # Start server again
                if start_server; then
                    log_success "Server restarted successfully"
                    continue
                else
                    log_error "Failed to restart server"
                fi
            else
                log_error "Maximum restart attempts reached ($MAX_RESTARTS). Giving up."
                exit 1
            fi
        else
            # Reset restart count on successful health check
            if [ $RESTART_COUNT -gt 0 ]; then
                log_success "Server is healthy. Resetting restart count."
                RESTART_COUNT=0
            fi
        fi
    done
}

# Cleanup function
cleanup() {
    log "Received shutdown signal, cleaning up..."
    if [ -f /tmp/coder1-ide.pid ]; then
        local pid=$(cat /tmp/coder1-ide.pid)
        if [ -n "$pid" ]; then
            log "Stopping server (PID: $pid)..."
            kill -TERM "$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null
        fi
        rm -f /tmp/coder1-ide.pid
    fi
    rm -f /tmp/coder1-ide.log
    log "Cleanup complete"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Main execution
main() {
    log "🚀 Coder1 IDE Monitored Startup"
    log "================================"
    log "Port: $PORT"
    log "Directory: $IDE_DIR"
    log "Max Restarts: $MAX_RESTARTS"
    log "Health Check: $HEALTH_CHECK_URL"
    echo
    
    # Kill any existing server
    kill_existing_server
    
    # Start the server
    if start_server; then
        log_success "Initial startup complete"
        echo
        log "🌟 Coder1 IDE is now running!"
        log "📱 IDE Interface: http://localhost:$PORT/ide"
        log "📊 Health Check: $HEALTH_CHECK_URL"
        log "📝 Logs: /tmp/coder1-ide.log"
        echo
        
        # Start monitoring
        monitor_server
    else
        log_error "Failed to start server"
        exit 1
    fi
}

# Check if running as main script
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi