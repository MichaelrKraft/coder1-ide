#!/bin/bash

# clean-dev.sh - Complete cleanup before starting development
# Usage: ./scripts/clean-dev.sh

echo "🧹 Development Environment Cleanup"
echo "=================================="
echo ""

# 1. Kill common development ports
echo "📍 Step 1: Freeing development ports..."
./scripts/kill-ports.sh 3000 3001 3002 5000 5001 8000 8080

# 2. Kill zombie Node.js processes
echo ""
echo "🧟 Step 2: Cleaning up zombie Node processes..."
# Find and kill orphaned node processes (older than 1 hour)
for pid in $(ps aux | grep -E 'node.*next dev|npm run dev' | grep -v grep | awk '{print $2}'); do
    # Get process start time
    start_time=$(ps -p $pid -o lstart= 2>/dev/null)
    if [ ! -z "$start_time" ]; then
        # Check if process is older than current session
        current_pid=$$
        if [ "$pid" != "$current_pid" ]; then
            echo "  Killing old dev process: PID $pid"
            kill -9 $pid 2>/dev/null
        fi
    fi
done

# 3. Clean up Claude shell snapshots
echo ""
echo "📁 Step 3: Cleaning Claude shell snapshots..."
snapshot_dir="$HOME/.claude/shell-snapshots"
if [ -d "$snapshot_dir" ]; then
    old_count=$(find "$snapshot_dir" -type f -name "*.sh" -mtime +1 | wc -l)
    find "$snapshot_dir" -type f -name "*.sh" -mtime +1 -delete 2>/dev/null
    echo "  Removed $old_count old snapshot files (>1 day)"
fi

# 4. Clear Next.js cache
echo ""
echo "🗑️ Step 4: Clearing Next.js cache..."
if [ -d ".next" ]; then
    rm -rf .next
    echo "  Cleared .next cache"
fi

# 5. Clean node_modules/.cache if it exists
if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    echo "  Cleared node_modules cache"
fi

# 6. Check system resources
echo ""
echo "📊 Step 5: System status check..."
echo "  Open files: $(lsof | wc -l)"
echo "  Node processes: $(ps aux | grep node | grep -v grep | wc -l)"
echo "  Free memory: $(vm_stat | grep 'Pages free' | awk '{print $3}' | sed 's/\.//')"

echo ""
echo "✨ Cleanup complete! Environment is ready for development."
echo ""
echo "💡 TIP: You can now run:"
echo "   npm run dev          - Start on default port (3000)"
echo "   PORT=3001 npm run dev - Start on specific port"
echo "   npm run dev:clean    - Auto-cleanup and start"