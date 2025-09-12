#!/bin/bash

# PM2 Management Script for CoderOne
# This script provides easy commands for managing the server with PM2

case "$1" in
    start)
        echo "🚀 Starting CoderOne with PM2..."
        pm2 start ecosystem.config.js
        pm2 status coderone
        ;;
    
    stop)
        echo "🛑 Stopping CoderOne..."
        pm2 stop coderone
        ;;
    
    restart)
        echo "🔄 Restarting CoderOne (full restart)..."
        pm2 restart coderone
        pm2 status coderone
        ;;
    
    reload)
        echo "♻️  Reloading CoderOne (graceful reload, preserves protected sessions)..."
        pm2 reload coderone
        pm2 status coderone
        ;;
    
    status)
        echo "📊 CoderOne Status:"
        pm2 status coderone
        ;;
    
    logs)
        echo "📋 Showing recent logs (Ctrl+C to exit)..."
        pm2 logs coderone --lines 20
        ;;
    
    monitor)
        echo "📈 Opening PM2 monitor..."
        pm2 monit
        ;;
    
    save)
        echo "💾 Saving PM2 process list..."
        pm2 save
        echo "✅ Process list saved for auto-restart on reboot"
        ;;
    
    startup)
        echo "🚦 Setting up auto-start on system boot..."
        pm2 startup
        echo "Follow the instructions above to enable auto-start"
        ;;
    
    *)
        echo "CoderOne PM2 Manager"
        echo "===================="
        echo "Usage: $0 {start|stop|restart|reload|status|logs|monitor|save|startup}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the server with PM2"
        echo "  stop    - Stop the server"
        echo "  restart - Full restart (kills all sessions)"
        echo "  reload  - Graceful reload (preserves protected sessions)"
        echo "  status  - Show server status"
        echo "  logs    - Show recent logs"
        echo "  monitor - Open PM2 monitoring interface"
        echo "  save    - Save process list for auto-restart"
        echo "  startup - Configure auto-start on system boot"
        echo ""
        echo "💡 Tip: Use 'reload' instead of 'restart' to preserve Claude Code sessions"
        exit 1
        ;;
esac