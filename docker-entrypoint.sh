#!/bin/bash
set -e

echo "╔════════════════════════════════════════╗"
echo "║         CODER1 IDE STARTING            ║"
echo "║     Claude Code for Everyone           ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Set up local domain resolution (inside container)
echo "127.0.0.1 coder1.local" >> /etc/hosts

# Check for license key or trial mode
if [ -z "$LICENSE_KEY" ]; then
    echo "🎁 Starting in trial mode (7 days)"
    export TRIAL_MODE=true
    export TRIAL_START=$(date +%s)
else
    echo "✅ License key detected"
    export TRIAL_MODE=false
fi

# Ensure data directories exist with correct permissions
mkdir -p /data/projects /data/cache /data/config /workspace
chmod 755 /data/projects /data/cache /data/config /workspace

# Copy default configuration if not exists
if [ ! -f /data/config/settings.json ]; then
    echo "📝 Creating default configuration..."
    cat > /data/config/settings.json << EOF
{
    "appName": "Coder1 IDE",
    "version": "1.0.0",
    "theme": "tokyo-night",
    "telemetry": true,
    "firstRun": true
}
EOF
fi

# Link workspace to expected location
if [ ! -L /app/workspace ]; then
    ln -s /workspace /app/workspace 2>/dev/null || true
fi

# Check if MCP servers need to be started
if [ "$ENABLE_MCP_SERVERS" != "false" ]; then
    echo "🚀 Starting MCP servers..."
    
    # Start filesystem MCP server if built
    if [ -f "/app/mcp-servers/src/filesystem/dist/index.js" ]; then
        node /app/mcp-servers/src/filesystem/dist/index.js &
        echo "  ✓ Filesystem MCP server started"
    fi
    
    # Start repository intelligence if built
    if [ -f "/app/mcp-servers/src/coder1-intelligence/dist/index.js" ]; then
        node /app/mcp-servers/src/coder1-intelligence/dist/index.js &
        echo "  ✓ Repository Intelligence started"
    fi
fi

# Display access information
echo ""
echo "╔════════════════════════════════════════╗"
echo "║        CODER1 IDE IS READY!            ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "🌐 Access Coder1 at:"
echo "   • http://localhost:3000"
echo "   • http://coder1.local (if configured)"
echo ""
echo "📁 Your projects are in: /workspace"
echo "⚙️  Configuration in: /data/config"
echo ""

# Execute the main command
exec "$@"