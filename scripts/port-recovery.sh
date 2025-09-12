#!/bin/bash

# 🔧 Port Conflict Detection and Auto-Recovery System
# Detects and resolves port conflicts that cause terminal session loss

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Port configuration
EXPRESS_PORT=3000
NEXTJS_PORT=3001
EXPECTED_SERVICES=("Express Backend:3000" "Next.js Frontend:3001")

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] SUCCESS:${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING:${NC} $1"
}

# Function to get process info for a port
get_port_info() {
    local port=$1
    lsof -i :$port -P -n 2>/dev/null | grep LISTEN || echo ""
}

# Function to detect port conflicts
detect_conflicts() {
    log "Detecting port conflicts..."
    
    local conflicts_found=0
    local port_3000_info=$(get_port_info 3000)
    local port_3001_info=$(get_port_info 3001)
    
    echo ""
    echo "📊 Current Port Status:"
    echo "======================"
    
    # Check port 3000
    if [ -n "$port_3000_info" ]; then
        local pid_3000=$(echo "$port_3000_info" | awk '{print $2}' | head -1)
        local cmd_3000=$(ps -p $pid_3000 -o command= 2>/dev/null | head -c 50)
        echo "Port 3000: ✅ OCCUPIED by PID $pid_3000 ($cmd_3000...)"
        
        # Check if it's the wrong service (Next.js instead of Express)
        if echo "$cmd_3000" | grep -q "next"; then
            error "CONFLICT: Next.js is running on port 3000 (should be Express)"
            conflicts_found=$((conflicts_found + 1))
        fi
    else
        echo "Port 3000: ❌ FREE (Express Backend should be here)"
    fi
    
    # Check port 3001
    if [ -n "$port_3001_info" ]; then
        local pid_3001=$(echo "$port_3001_info" | awk '{print $2}' | head -1)
        local cmd_3001=$(ps -p $pid_3001 -o command= 2>/dev/null | head -c 50)
        echo "Port 3001: ✅ OCCUPIED by PID $pid_3001 ($cmd_3001...)"
        
        # Check if it's the wrong service (Express instead of Next.js)
        if echo "$cmd_3001" | grep -q "app.js\|express"; then
            error "CONFLICT: Express Backend is running on port 3001 (should be Next.js)"
            conflicts_found=$((conflicts_found + 1))
        fi
    else
        echo "Port 3001: ❌ FREE (Next.js Frontend should be here)"
    fi
    
    echo ""
    return $conflicts_found
}

# Function to kill processes on specific ports
kill_port_processes() {
    local port=$1
    local service_name=$2
    
    log "Killing processes on port $port ($service_name)..."
    
    local pids=$(lsof -ti:$port 2>/dev/null || echo "")
    if [ -n "$pids" ]; then
        echo "$pids" | while read pid; do
            if [ -n "$pid" ]; then
                local cmd=$(ps -p $pid -o command= 2>/dev/null || echo "unknown")
                log "  Killing PID $pid: ${cmd:0:60}..."
                kill -TERM $pid 2>/dev/null || kill -9 $pid 2>/dev/null || true
            fi
        done
        
        # Wait for processes to die
        sleep 3
        
        # Force kill if still running
        local remaining=$(lsof -ti:$port 2>/dev/null || echo "")
        if [ -n "$remaining" ]; then
            warning "Force killing remaining processes on port $port..."
            echo "$remaining" | xargs kill -9 2>/dev/null || true
            sleep 2
        fi
        
        success "Port $port cleared"
    else
        log "No processes found on port $port"
    fi
}

# Function to validate service startup
validate_service() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=0
    
    log "Validating $service_name startup on port $port..."
    
    while [ $attempt -lt $max_attempts ]; do
        if lsof -i:$port >/dev/null 2>&1; then
            # Service is running, check if it's responding
            if [ "$port" = "3000" ]; then
                # Test Express backend health endpoint
                if curl -s http://localhost:3000/health >/dev/null 2>&1; then
                    success "$service_name is healthy on port $port"
                    return 0
                fi
            elif [ "$port" = "3001" ]; then
                # Test Next.js frontend
                if curl -s http://localhost:3001 >/dev/null 2>&1; then
                    success "$service_name is healthy on port $port"
                    return 0
                fi
            fi
        fi
        
        sleep 1
        attempt=$((attempt + 1))
        
        # Show progress every 10 attempts
        if [ $((attempt % 10)) -eq 0 ]; then
            log "  Still waiting for $service_name... (${attempt}s)"
        fi
    done
    
    error "$service_name failed to start properly on port $port"
    return 1
}

# Function to auto-recover by restarting services
auto_recover() {
    log "Starting auto-recovery process..."
    
    # Kill all processes on both ports
    kill_port_processes 3000 "Express Backend"
    kill_port_processes 3001 "Next.js Frontend"
    
    # Wait a moment for ports to fully clear
    sleep 3
    
    # Start services in correct order using our startup script
    log "Restarting services with correct port configuration..."
    
    if [ -f "./start-dev.sh" ]; then
        success "Using unified startup script for recovery"
        exec ./start-dev.sh
    else
        warning "Unified startup script not found, attempting manual recovery..."
        
        # Manual recovery fallback
        log "Starting Express Backend on port 3000..."
        export PORT=3000
        nohup npm run dev > logs/recovery-express.log 2>&1 &
        local backend_pid=$!
        
        # Wait for backend
        if validate_service 3000 "Express Backend"; then
            log "Starting Next.js Frontend on port 3001..."
            cd coder1-ide-next
            nohup npm run dev > ../logs/recovery-nextjs.log 2>&1 &
            local frontend_pid=$!
            cd ..
            
            if validate_service 3001 "Next.js Frontend"; then
                success "Auto-recovery completed successfully!"
                echo "Backend PID: $backend_pid"
                echo "Frontend PID: $frontend_pid"
                return 0
            else
                error "Failed to start Next.js Frontend during recovery"
                kill $backend_pid 2>/dev/null || true
                return 1
            fi
        else
            error "Failed to start Express Backend during recovery"
            return 1
        fi
    fi
}

# Function to create recovery report
create_report() {
    local report_file="logs/port-recovery-$(date +%Y%m%d-%H%M%S).log"
    mkdir -p logs
    
    {
        echo "🔧 Port Recovery Report - $(date)"
        echo "=================================="
        echo ""
        echo "System Information:"
        echo "OS: $(uname -s)"
        echo "User: $(whoami)"
        echo "Directory: $(pwd)"
        echo ""
        echo "Port Status:"
        get_port_info 3000 | head -1
        get_port_info 3001 | head -1
        echo ""
        echo "Running Processes:"
        ps aux | grep -E "(node|npm)" | grep -v grep
        echo ""
        echo "Recent Logs:"
        echo "------------"
        if [ -f logs/express-backend.log ]; then
            echo "Express Backend (last 10 lines):"
            tail -10 logs/express-backend.log
            echo ""
        fi
        if [ -f logs/nextjs-frontend.log ]; then
            echo "Next.js Frontend (last 10 lines):"
            tail -10 logs/nextjs-frontend.log
            echo ""
        fi
    } > "$report_file"
    
    log "Recovery report saved to: $report_file"
}

# Main execution
main() {
    echo ""
    echo -e "${PURPLE}🔧 Coder1 Port Recovery System${NC}"
    echo "=============================="
    echo ""
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Detect conflicts
    if detect_conflicts; then
        success "No port conflicts detected!"
        
        # Check if services are running correctly
        local running_services=0
        
        if get_port_info 3000 >/dev/null 2>&1; then
            running_services=$((running_services + 1))
        fi
        
        if get_port_info 3001 >/dev/null 2>&1; then
            running_services=$((running_services + 1))
        fi
        
        if [ $running_services -eq 2 ]; then
            success "Both services are running correctly!"
        elif [ $running_services -eq 0 ]; then
            log "No services are running. Starting them now..."
            auto_recover
        else
            warning "Only one service is running. Starting the missing service..."
            auto_recover
        fi
    else
        error "Port conflicts detected! Starting auto-recovery..."
        create_report
        auto_recover
    fi
}

# Handle command line arguments
case "${1:-detect}" in
    "detect")
        detect_conflicts
        ;;
    "recover")
        auto_recover
        ;;
    "kill")
        kill_port_processes 3000 "Express Backend"
        kill_port_processes 3001 "Next.js Frontend"
        ;;
    "report")
        create_report
        ;;
    *)
        main
        ;;
esac