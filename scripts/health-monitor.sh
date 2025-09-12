#!/bin/bash

# 🏥 Coder1 Health Monitor System
# Continuous monitoring for port conflicts and terminal session health

set -e

# Configuration
EXPRESS_PORT=3000
NEXTJS_PORT=3001
CHECK_INTERVAL=30  # seconds
ALERT_THRESHOLD=3  # consecutive failures before alert
LOG_FILE="logs/health-monitor.log"
STATUS_FILE="logs/health-status.json"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Create logs directory
mkdir -p logs

# Initialize counters
EXPRESS_FAILURES=0
NEXTJS_FAILURES=0
TERMINAL_FAILURES=0
TOTAL_CHECKS=0

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Function to check if a service is healthy
check_service_health() {
    local port=$1
    local service_name=$2
    local endpoint=$3
    
    # Check if port is occupied
    if ! lsof -i:$port >/dev/null 2>&1; then
        log "ERROR" "$service_name not running on port $port"
        return 1
    fi
    
    # Check if endpoint responds (if provided)
    if [ -n "$endpoint" ]; then
        if curl -s -f "$endpoint" >/dev/null 2>&1; then
            log "INFO" "$service_name healthy on port $port"
            return 0
        else
            log "ERROR" "$service_name running but not responding on $endpoint"
            return 1
        fi
    else
        log "INFO" "$service_name running on port $port"
        return 0
    fi
}

# Function to check terminal session health
check_terminal_health() {
    local session_count=0
    
    # Check if terminal WebSocket is responding
    if curl -s http://localhost:3000/api/terminal/sessions >/dev/null 2>&1; then
        session_count=$(curl -s http://localhost:3000/api/terminal/sessions | jq '. | length' 2>/dev/null || echo "0")
        log "INFO" "Terminal API responding, $session_count active sessions"
        return 0
    else
        log "ERROR" "Terminal API not responding"
        return 1
    fi
}

# Function to detect port conflicts
detect_port_conflicts() {
    local conflicts=0
    
    # Check for wrong services on wrong ports
    if lsof -i:3000 >/dev/null 2>&1; then
        local cmd_3000=$(ps -p $(lsof -ti:3000 | head -1) -o command= 2>/dev/null)
        if echo "$cmd_3000" | grep -q "next"; then
            log "ERROR" "PORT CONFLICT: Next.js running on port 3000 (Express port)"
            conflicts=$((conflicts + 1))
        fi
    fi
    
    if lsof -i:3001 >/dev/null 2>&1; then
        local cmd_3001=$(ps -p $(lsof -ti:3001 | head -1) -o command= 2>/dev/null)
        if echo "$cmd_3001" | grep -q "app.js\|express"; then
            log "ERROR" "PORT CONFLICT: Express running on port 3001 (Next.js port)"
            conflicts=$((conflicts + 1))
        fi
    fi
    
    return $conflicts
}

# Function to create status report
create_status_report() {
    local express_status="unknown"
    local nextjs_status="unknown"
    local terminal_status="unknown"
    local port_conflicts=0
    
    # Check Express backend
    if check_service_health 3000 "Express Backend" "http://localhost:3000/health"; then
        express_status="healthy"
    else
        express_status="unhealthy"
        EXPRESS_FAILURES=$((EXPRESS_FAILURES + 1))
    fi
    
    # Check Next.js frontend
    if check_service_health 3001 "Next.js Frontend" "http://localhost:3001"; then
        nextjs_status="healthy"
    else
        nextjs_status="unhealthy"
        NEXTJS_FAILURES=$((NEXTJS_FAILURES + 1))
    fi
    
    # Check terminal health
    if check_terminal_health; then
        terminal_status="healthy"
    else
        terminal_status="unhealthy"
        TERMINAL_FAILURES=$((TERMINAL_FAILURES + 1))
    fi
    
    # Check for port conflicts
    if ! detect_port_conflicts; then
        port_conflicts=$?
    fi
    
    # Create JSON status report
    cat > "$STATUS_FILE" << EOF
{
  "timestamp": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "overall_health": "$([ "$express_status" = "healthy" ] && [ "$nextjs_status" = "healthy" ] && [ "$terminal_status" = "healthy" ] && [ $port_conflicts -eq 0 ] && echo "healthy" || echo "unhealthy")",
  "services": {
    "express_backend": {
      "status": "$express_status",
      "port": $EXPRESS_PORT,
      "consecutive_failures": $EXPRESS_FAILURES
    },
    "nextjs_frontend": {
      "status": "$nextjs_status", 
      "port": $NEXTJS_PORT,
      "consecutive_failures": $NEXTJS_FAILURES
    },
    "terminal_sessions": {
      "status": "$terminal_status",
      "consecutive_failures": $TERMINAL_FAILURES
    }
  },
  "port_conflicts": $port_conflicts,
  "total_checks": $TOTAL_CHECKS,
  "check_interval": $CHECK_INTERVAL
}
EOF
    
    return $([ $port_conflicts -gt 0 ] && echo 1 || echo 0)
}

# Function to handle alerts
send_alert() {
    local alert_type=$1
    local message=$2
    
    log "ALERT" "$alert_type: $message"
    
    # Could integrate with Slack, email, etc. here
    echo -e "${RED}🚨 ALERT: $alert_type${NC}" >&2
    echo -e "${RED}   $message${NC}" >&2
    
    # Write alert to dedicated alert log
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $alert_type: $message" >> logs/alerts.log
}

# Function to attempt auto-recovery
auto_recovery() {
    log "INFO" "Attempting auto-recovery..."
    
    if [ -f "./scripts/port-recovery.sh" ]; then
        log "INFO" "Running port recovery script..."
        ./scripts/port-recovery.sh recover
        return $?
    else
        log "ERROR" "Port recovery script not found"
        return 1
    fi
}

# Main monitoring loop
monitor() {
    log "INFO" "Starting health monitoring (interval: ${CHECK_INTERVAL}s)"
    
    while true; do
        TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
        
        log "INFO" "Health check #$TOTAL_CHECKS"
        
        # Create status report and check for issues
        if create_status_report; then
            # No port conflicts, reset failure counters on success
            if [ "$express_status" = "healthy" ]; then
                EXPRESS_FAILURES=0
            fi
            if [ "$nextjs_status" = "healthy" ]; then
                NEXTJS_FAILURES=0  
            fi
            if [ "$terminal_status" = "healthy" ]; then
                TERMINAL_FAILURES=0
            fi
        else
            # Port conflicts detected
            send_alert "PORT_CONFLICT" "Port conflicts detected - terminal sessions at risk"
            
            if [ $EXPRESS_FAILURES -ge $ALERT_THRESHOLD ] || [ $NEXTJS_FAILURES -ge $ALERT_THRESHOLD ] || [ $TERMINAL_FAILURES -ge $ALERT_THRESHOLD ]; then
                send_alert "RECOVERY_NEEDED" "Multiple consecutive failures detected, attempting recovery"
                
                if auto_recovery; then
                    log "INFO" "Auto-recovery successful"
                    EXPRESS_FAILURES=0
                    NEXTJS_FAILURES=0
                    TERMINAL_FAILURES=0
                else
                    send_alert "RECOVERY_FAILED" "Auto-recovery failed, manual intervention required"
                fi
            fi
        fi
        
        sleep $CHECK_INTERVAL
    done
}

# Function to show current status
show_status() {
    if [ -f "$STATUS_FILE" ]; then
        echo -e "${BLUE}📊 Current Health Status${NC}"
        echo "========================"
        jq . "$STATUS_FILE" 2>/dev/null || cat "$STATUS_FILE"
    else
        echo -e "${YELLOW}⚠️  No status file found${NC}"
        echo "Run './scripts/health-monitor.sh check' first"
    fi
}

# Function to run single health check
single_check() {
    log "INFO" "Running single health check..."
    create_status_report
    show_status
}

# Handle command line arguments
case "${1:-monitor}" in
    "monitor")
        monitor
        ;;
    "check")
        single_check
        ;;
    "status")
        show_status
        ;;
    "alerts")
        if [ -f "logs/alerts.log" ]; then
            echo -e "${RED}🚨 Recent Alerts${NC}"
            echo "================"
            tail -20 logs/alerts.log
        else
            echo "No alerts logged yet"
        fi
        ;;
    "recovery")
        auto_recovery
        ;;
    *)
        echo "Usage: $0 {monitor|check|status|alerts|recovery}"
        echo ""
        echo "Commands:"
        echo "  monitor  - Start continuous monitoring (default)"
        echo "  check    - Run single health check"
        echo "  status   - Show current status"
        echo "  alerts   - Show recent alerts"
        echo "  recovery - Attempt auto-recovery"
        exit 1
        ;;
esac