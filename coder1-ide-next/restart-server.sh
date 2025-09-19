#!/bin/bash

# Automated Server Restart Script for Coder1 IDE
# This script handles the recurring server crash issue

echo "🔄 Coder1 IDE Server Restart Script"
echo "=================================="

# Function to kill all processes on port 3001
cleanup_port() {
    echo "🧹 Cleaning up port 3001..."
    
    # Kill any processes using port 3001
    lsof -ti :3001 | xargs kill -9 2>/dev/null || echo "No processes found on port 3001"
    
    # Kill any node server processes
    pkill -f "node.*server.js" 2>/dev/null || echo "No node server processes found"
    
    # Wait for cleanup
    sleep 2
    
    # Verify port is free
    if lsof -i :3001 >/dev/null 2>&1; then
        echo "⚠️ Port 3001 still in use, trying aggressive cleanup..."
        sudo lsof -ti :3001 | xargs sudo kill -9 2>/dev/null || echo "Cleanup complete"
        sleep 3
    fi
    
    echo "✅ Port 3001 cleanup complete"
}

# Function to start server with proper settings
start_server() {
    echo "🚀 Starting Coder1 IDE server..."
    
    cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
    
    # Export memory settings
    export NODE_OPTIONS="--max_old_space_size=4096 --expose-gc"
    
    # Start server in background with logging
    nohup npm run dev > server.log 2>&1 &
    SERVER_PID=$!
    
    echo "📍 Server started with PID: $SERVER_PID"
    echo "📄 Logs available in: server.log"
    
    # Wait for server to initialize
    echo "⏳ Waiting for server initialization..."
    sleep 15
    
    # Check if server is running
    if ps -p $SERVER_PID > /dev/null; then
        echo "✅ Server is running (PID: $SERVER_PID)"
        
        # Test server response
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ide | grep -q "200"; then
            echo "✅ IDE endpoint responding correctly"
            echo "🎉 Server restart successful!"
            echo ""
            echo "Access your IDE at: http://localhost:3001/ide"
            echo "Health monitoring: http://localhost:3001/api/health"
            echo ""
            return 0
        else
            echo "❌ IDE endpoint not responding"
            return 1
        fi
    else
        echo "❌ Server failed to start"
        return 1
    fi
}

# Function to show server status
show_status() {
    echo "📊 Current Server Status:"
    echo "========================"
    
    # Check if port 3001 is in use
    if lsof -i :3001 >/dev/null 2>&1; then
        echo "🟢 Port 3001: IN USE"
        lsof -i :3001
    else
        echo "🔴 Port 3001: FREE"
    fi
    
    echo ""
    
    # Check for Node.js processes
    if pgrep -f "node.*server.js" >/dev/null 2>&1; then
        echo "🟢 Node.js server processes:"
        pgrep -f "node.*server.js" | while read pid; do
            echo "  PID: $pid"
        done
    else
        echo "🔴 No Node.js server processes found"
    fi
    
    echo ""
}

# Main script logic
case "${1:-restart}" in
    "status")
        show_status
        ;;
    "cleanup")
        cleanup_port
        ;;
    "start")
        start_server
        ;;
    "restart"|"")
        echo "🔄 Performing full restart..."
        cleanup_port
        start_server
        
        if [ $? -eq 0 ]; then
            echo "✅ Restart completed successfully"
        else
            echo "❌ Restart failed - check server.log for details"
            echo "📄 Recent log entries:"
            tail -20 server.log 2>/dev/null || echo "No log file found"
        fi
        ;;
    "monitor")
        echo "👁️ Starting server monitoring..."
        while true; do
            if ! curl -s -o /dev/null http://localhost:3001/ide; then
                echo "⚠️ Server down - attempting restart..."
                cleanup_port
                start_server
            else
                echo "✅ Server healthy - $(date)"
            fi
            sleep 30
        done
        ;;
    *)
        echo "Usage: $0 [restart|start|cleanup|status|monitor]"
        echo ""
        echo "Commands:"
        echo "  restart  - Full cleanup and restart (default)"
        echo "  start    - Start server without cleanup"
        echo "  cleanup  - Clean up port and processes only"
        echo "  status   - Show current server status"
        echo "  monitor  - Monitor and auto-restart if needed"
        ;;
esac