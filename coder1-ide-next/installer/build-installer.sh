#!/bin/bash

# Coder1 Bridge - macOS .pkg Installer Builder
# Creates a downloadable macOS installer package

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🏗️  Building Coder1 Bridge Installer...${NC}"
echo ""

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION="1.0.0"
IDENTIFIER="ai.coder1.bridge"
OUTPUT_DIR="$SCRIPT_DIR/dist"
PAYLOAD_DIR="$SCRIPT_DIR/payload"
SCRIPTS_DIR="$SCRIPT_DIR/scripts"

# Clean previous builds
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Step 1: Download bridge tarball
echo -e "${BLUE}📦 Downloading bridge package...${NC}"
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

curl -sL https://coder1.ai/bridge-cli.tar.gz -o bridge-cli.tar.gz

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to download bridge package${NC}"
    exit 1
fi

# Step 2: Extract and install to payload
echo -e "${BLUE}📂 Extracting package...${NC}"
tar -xzf bridge-cli.tar.gz
cd package

# Install dependencies
npm install --production --silent

# Step 3: Create payload directory structure
echo -e "${BLUE}🎯 Creating installer payload...${NC}"
rm -rf "$PAYLOAD_DIR"
mkdir -p "$PAYLOAD_DIR/usr/local/bin"
mkdir -p "$PAYLOAD_DIR/usr/local/lib/coder1-bridge"

# Copy bridge binary
cp bin/coder1-bridge "$PAYLOAD_DIR/usr/local/bin/"
chmod +x "$PAYLOAD_DIR/usr/local/bin/coder1-bridge"

# Copy source files and dependencies
cp -r src "$PAYLOAD_DIR/usr/local/lib/coder1-bridge/"
cp -r node_modules "$PAYLOAD_DIR/usr/local/lib/coder1-bridge/"
cp package.json "$PAYLOAD_DIR/usr/local/lib/coder1-bridge/"

# Step 4: Build the package
echo -e "${BLUE}🔨 Building .pkg installer...${NC}"

pkgbuild \
    --root "$PAYLOAD_DIR" \
    --identifier "$IDENTIFIER" \
    --version "$VERSION" \
    --scripts "$SCRIPTS_DIR" \
    --install-location / \
    "$OUTPUT_DIR/Coder1Bridge-Component.pkg"

# Step 5: Create distribution package (prettier)
echo -e "${BLUE}📦 Creating distribution package...${NC}"

# Create distribution.xml
cat > "$OUTPUT_DIR/distribution.xml" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<installer-gui-script minSpecVersion="1">
    <title>Coder1 Bridge</title>
    <organization>ai.coder1</organization>
    <domains enable_localSystem="true"/>
    <options customize="never" require-scripts="true" rootVolumeOnly="true" />
    <welcome file="welcome.html" mime-type="text/html" />
    <conclusion file="conclusion.html" mime-type="text/html" />
    <pkg-ref id="$IDENTIFIER"/>
    <choices-outline>
        <line choice="default">
            <line choice="$IDENTIFIER"/>
        </line>
    </choices-outline>
    <choice id="default"/>
    <choice id="$IDENTIFIER" visible="false">
        <pkg-ref id="$IDENTIFIER"/>
    </choice>
    <pkg-ref id="$IDENTIFIER" version="$VERSION" onConclusion="none">Coder1Bridge-Component.pkg</pkg-ref>
</installer-gui-script>
EOF

# Create welcome page
cat > "$OUTPUT_DIR/welcome.html" <<EOF
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; padding: 20px; }
        h1 { color: #007AFF; }
        .banner { text-align: center; margin: 20px 0; }
        .code { background: #f5f5f5; padding: 10px; border-radius: 5px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="banner">
        <h1>🌉 Coder1 Bridge</h1>
        <p><strong>Connect your local Claude CLI to Coder1 IDE</strong></p>
    </div>
    
    <h2>What You'll Get:</h2>
    <ul>
        <li>✅ <code>coder1-bridge</code> command globally available</li>
        <li>✅ Installed to <code>/usr/local/bin</code> (in your PATH)</li>
        <li>✅ Ready to use immediately after installation</li>
    </ul>
    
    <h2>Requirements:</h2>
    <ul>
        <li>macOS 10.15 or later</li>
        <li>Node.js 18+ (for running the bridge)</li>
        <li>Claude CLI installed (get from <a href="https://claude.ai/download">claude.ai/download</a>)</li>
    </ul>
    
    <p><strong>Installation takes about 10 seconds.</strong></p>
</body>
</html>
EOF

# Create conclusion page
cat > "$OUTPUT_DIR/conclusion.html" <<EOF
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; padding: 20px; }
        h1 { color: #28a745; }
        .code { background: #f5f5f5; padding: 10px; border-radius: 5px; font-family: monospace; margin: 10px 0; }
        .step { margin: 15px 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #007AFF; }
    </style>
</head>
<body>
    <h1>🎉 Installation Complete!</h1>
    
    <p>The Coder1 Bridge has been installed successfully.</p>
    
    <h2>🚀 Next Steps:</h2>
    
    <div class="step">
        <strong>Step 1:</strong> Open Terminal
        <div class="code">⌘ + Space, type "Terminal", press Enter</div>
    </div>
    
    <div class="step">
        <strong>Step 2:</strong> Start the bridge
        <div class="code">coder1-bridge start</div>
    </div>
    
    <div class="step">
        <strong>Step 3:</strong> Get your pairing code
        <p>Visit <a href="https://coder1.ai/ide">https://coder1.ai/ide</a> and click the "Bridge" button</p>
    </div>
    
    <div class="step">
        <strong>Step 4:</strong> Enter the 6-digit code when prompted
    </div>
    
    <p><strong>That's it!</strong> Your local Claude CLI is now connected to Coder1 IDE.</p>
    
    <hr>
    
    <h3>💡 Useful Commands:</h3>
    <ul>
        <li><code>coder1-bridge start</code> - Connect to IDE</li>
        <li><code>coder1-bridge status</code> - Check connection</li>
        <li><code>coder1-bridge --help</code> - Show all commands</li>
    </ul>
    
    <p>Need help? Visit <a href="https://github.com/MichaelrKraft/coder1-ide">our documentation</a></p>
</body>
</html>
EOF

# Build final installer
productbuild \
    --distribution "$OUTPUT_DIR/distribution.xml" \
    --package-path "$OUTPUT_DIR" \
    --resources "$OUTPUT_DIR" \
    "$OUTPUT_DIR/Coder1Bridge-Installer.pkg"

# Cleanup intermediate files
rm "$OUTPUT_DIR/Coder1Bridge-Component.pkg"
rm "$OUTPUT_DIR/distribution.xml"
rm "$OUTPUT_DIR/welcome.html"
rm "$OUTPUT_DIR/conclusion.html"

# Cleanup temp directory
rm -rf "$TEMP_DIR"

# Get file size
PKG_SIZE=$(du -h "$OUTPUT_DIR/Coder1Bridge-Installer.pkg" | cut -f1)

echo ""
echo -e "${GREEN}✅ Installer built successfully!${NC}"
echo ""
echo -e "${BLUE}📦 Package Information:${NC}"
echo -e "  Location: ${GREEN}$OUTPUT_DIR/Coder1Bridge-Installer.pkg${NC}"
echo -e "  Size: ${GREEN}$PKG_SIZE${NC}"
echo -e "  Version: ${GREEN}$VERSION${NC}"
echo ""
echo -e "${YELLOW}🧪 Test the installer:${NC}"
echo -e "  ${GREEN}sudo installer -pkg $OUTPUT_DIR/Coder1Bridge-Installer.pkg -target /${NC}"
echo ""
echo -e "${YELLOW}🚀 Deploy the installer:${NC}"
echo -e "  1. Copy to: ${GREEN}coder1-ide-next/public/downloads/${NC}"
echo -e "  2. Update IDE page to link to: ${GREEN}/downloads/Coder1Bridge-Installer.pkg${NC}"
echo ""
