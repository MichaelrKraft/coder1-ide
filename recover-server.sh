#!/bin/bash

# CoderOne Server Recovery Script
# Use this for emergency recovery when PM2 isn't working

echo "🔧 CoderOne Server Recovery Tool"
echo "================================="
echo ""

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 is installed"
    
    # Check PM2 status
    echo "📊 Checking PM2 status..."
    pm2_status=$(pm2 list --silent | grep coderone)
    
    if [[ -n "$pm2_status" ]]; then
        echo "🔄 PM2 process found. Attempting graceful reload..."
        pm2 reload coderone
        
        if [ $? -eq 0 ]; then
            echo "✅ Server reloaded successfully with PM2"
            pm2 status coderone
            exit 0
        else
            echo "⚠️  PM2 reload failed, trying restart..."
            pm2 restart coderone
            
            if [ $? -eq 0 ]; then
                echo "✅ Server restarted successfully with PM2"
                pm2 status coderone
                exit 0
            fi
        fi
    fi
    
    echo "🚀 Starting fresh PM2 instance..."
    pm2 start ecosystem.config.js
    
    if [ $? -eq 0 ]; then
        echo "✅ Server started with PM2"
        pm2 status coderone
        exit 0
    fi
fi

echo "⚠️  PM2 not working, falling back to direct node..."
echo ""

# Kill any existing processes on port 3000
echo "🧹 Clearing port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Kill any running app.js processes
pkill -f "node.*src/app.js" 2>/dev/null

# Clear stale session files
echo "🧹 Clearing stale sessions..."
rm -rf sessions/* 2>/dev/null

# Wait a moment for ports to clear
sleep 2

# Start with environment variables for protection
echo "🚀 Starting server with session protection..."
export TERMINAL_SESSION_PROTECTION=true
export TERMINAL_PERSIST_ON_RESTART=true

# Start server directly with increased memory
node --max-old-space-size=1024 src/app.js > server.log 2>&1 &

# Get the PID
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 3

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Server started successfully (PID: $SERVER_PID)"
    echo ""
    echo "📍 Access the server at: http://localhost:3000"
    echo "📍 IDE interface at: http://localhost:3000/ide"
    echo ""
    echo "To stop: kill $SERVER_PID"
else
    echo "❌ Server failed to start. Check server.log for details"
    tail -20 server.log
    exit 1
fi

# Check health endpoint
echo "🏥 Checking server health..."
health_check=$(curl -s http://localhost:3000/health 2>/dev/null)

if [[ -n "$health_check" ]]; then
    echo "✅ Server is healthy and responding"
    echo "$health_check" | head -1
else
    echo "⚠️  Server started but health check failed"
    echo "Check server.log for issues"
fi

echo ""
echo "================================="
echo "Recovery complete!"
echo ""
echo "💡 Tips:"
echo "  - For better stability, fix PM2: npm install -g pm2"
echo "  - Monitor logs: tail -f server.log"
echo "  - Protected sessions will survive restarts"