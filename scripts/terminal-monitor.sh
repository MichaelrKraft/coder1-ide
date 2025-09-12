#!/bin/bash

# Terminal Session Monitor and Recovery Script
# Monitors for runaway terminal sessions and provides recovery mechanisms

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check for duplicate terminal sessions
check_duplicate_sessions() {
    print_info "Checking for duplicate terminal sessions..."
    
    # Look for patterns that indicate infinite session creation
    local duplicate_count=$(ps aux | grep -E "session_.*_[a-z0-9]{10}" | grep -v grep | awk '{print $NF}' | sort | uniq -c | awk '$1 > 5 {count++} END {print count+0}')
    
    if [ "$duplicate_count" -gt 0 ]; then
        print_warning "Found $duplicate_count session patterns with >5 instances"
        print_info "Listing suspicious sessions:"
        ps aux | grep -E "session_.*_[a-z0-9]{10}" | grep -v grep | awk '{print $NF}' | sort | uniq -c | awk '$1 > 5 {print "  " $2 " (" $1 " instances)"}'
        return 1
    else
        print_success "No duplicate session patterns detected"
        return 0
    fi
}

# Function to check file descriptor usage
check_file_descriptors() {
    print_info "Checking file descriptor usage..."
    
    local fd_count=$(lsof 2>/dev/null | wc -l | xargs)
    local fd_limit=$(ulimit -n)
    
    print_info "File descriptors in use: $fd_count"
    print_info "File descriptor limit: $fd_limit"
    
    # Warn if usage is high (>10,000 is suspicious for a development environment)
    if [ "$fd_count" -gt 10000 ]; then
        print_warning "High file descriptor usage detected: $fd_count"
        return 1
    else
        print_success "File descriptor usage is normal: $fd_count"
        return 0
    fi
}

# Function to check for zombie Node.js processes
check_zombie_processes() {
    print_info "Checking for zombie Node.js processes..."
    
    local zombie_count=$(ps aux | grep "[Zz]ombie.*node" | grep -v grep | wc -l | xargs)
    local node_count=$(ps aux | grep "node.*terminal" | grep -v grep | wc -l | xargs)
    
    print_info "Active Node.js terminal processes: $node_count"
    print_info "Zombie processes: $zombie_count"
    
    if [ "$zombie_count" -gt 0 ]; then
        print_warning "Zombie processes detected: $zombie_count"
        ps aux | grep "[Zz]ombie.*node" | grep -v grep
        return 1
    else
        print_success "No zombie processes detected"
        return 0
    fi
}

# Function to perform emergency cleanup
emergency_cleanup() {
    print_warning "Performing emergency cleanup..."
    
    # Kill duplicate terminal sessions
    print_info "Killing duplicate terminal sessions..."
    ps aux | grep -E "session_.*_[a-z0-9]{10}" | grep -v grep | awk '$1 == "'$(whoami)'" {print $2}' | while read pid; do
        if [ -n "$pid" ]; then
            print_info "Killing process $pid"
            kill -TERM "$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
        fi
    done
    
    # Kill runaway Next.js processes
    print_info "Killing runaway Next.js processes..."
    pkill -f "next dev" 2>/dev/null || true
    
    # Clean up any orphaned terminal processes
    print_info "Cleaning up orphaned terminal processes..."
    pkill -f "node.*terminal" 2>/dev/null || true
    
    # Wait a moment for processes to clean up
    sleep 2
    
    print_success "Emergency cleanup completed"
}

# Function to restart services
restart_services() {
    print_info "Restarting Next.js development server..."
    
    cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
    npm run dev > /dev/null 2>&1 &
    local next_pid=$!
    
    # Wait for Next.js to start
    sleep 3
    
    if ps -p $next_pid > /dev/null; then
        print_success "Next.js restarted successfully (PID: $next_pid)"
    else
        print_error "Failed to restart Next.js"
        return 1
    fi
}

# Function to generate health report
generate_health_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="/Users/michaelkraft/autonomous_vibe_interface/logs/terminal-health-$(date +%Y%m%d_%H%M%S).log"
    
    # Create logs directory if it doesn't exist
    mkdir -p /Users/michaelkraft/autonomous_vibe_interface/logs
    
    print_info "Generating health report: $report_file"
    
    {
        echo "=== Terminal Health Report ==="
        echo "Timestamp: $timestamp"
        echo ""
        
        echo "=== Process Status ==="
        echo "Node.js processes:"
        ps aux | grep "node" | grep -v grep || echo "No Node.js processes found"
        echo ""
        
        echo "=== File Descriptor Usage ==="
        echo "Count: $(lsof 2>/dev/null | wc -l | xargs)"
        echo "Limit: $(ulimit -n)"
        echo ""
        
        echo "=== Terminal Sessions ==="
        echo "Active sessions:"
        ps aux | grep -E "(terminal|session_)" | grep -v grep || echo "No terminal sessions found"
        echo ""
        
        echo "=== System Resources ==="
        echo "Memory usage:"
        ps aux | awk 'NR>1 {sum+=$6} END {print "Total memory: " sum/1024 " MB"}'
        echo ""
        echo "Load average:"
        uptime
        
    } > "$report_file"
    
    print_success "Health report saved: $report_file"
}

# Main function
main() {
    echo "🔍 Terminal Session Monitor"
    echo "=========================="
    
    case "${1:-check}" in
        "check")
            print_info "Running comprehensive health check..."
            
            local issues=0
            check_duplicate_sessions || issues=$((issues + 1))
            check_file_descriptors || issues=$((issues + 1))
            check_zombie_processes || issues=$((issues + 1))
            
            if [ "$issues" -eq 0 ]; then
                print_success "All checks passed! Terminal system is healthy."
            else
                print_warning "Found $issues issue(s). Consider running 'terminal-monitor.sh recovery'"
            fi
            ;;
            
        "recovery")
            print_warning "Starting emergency recovery procedure..."
            emergency_cleanup
            sleep 2
            restart_services
            print_success "Recovery completed. Run 'terminal-monitor.sh check' to verify."
            ;;
            
        "report")
            generate_health_report
            ;;
            
        "monitor")
            print_info "Starting continuous monitoring (Ctrl+C to stop)..."
            while true; do
                clear
                echo "🔍 Terminal Monitor - $(date)"
                echo "=============================="
                
                local issues=0
                check_duplicate_sessions || issues=$((issues + 1))
                check_file_descriptors || issues=$((issues + 1))
                
                if [ "$issues" -gt 0 ]; then
                    print_warning "Issues detected! Consider manual intervention."
                fi
                
                sleep 10
            done
            ;;
            
        *)
            echo "Usage: $0 [check|recovery|report|monitor]"
            echo ""
            echo "Commands:"
            echo "  check     - Run health checks (default)"
            echo "  recovery  - Perform emergency cleanup and restart"
            echo "  report    - Generate detailed health report"
            echo "  monitor   - Continuous monitoring mode"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"