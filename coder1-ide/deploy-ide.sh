#!/bin/bash

# Coder1 IDE Deployment Script
# This script builds the React IDE and deploys it to the correct locations

set -e  # Exit on error

echo "🚀 Starting Coder1 IDE deployment..."

# Navigate to source directory
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide/coder1-ide-source

# Build the React app
echo "📦 Building React application..."
npm run build

# Get the new file hashes
MAIN_JS=$(ls build/static/js/main.*.js | xargs basename)
MAIN_CSS=$(ls build/static/css/main.*.css | xargs basename)
CHUNK_JS=$(ls build/static/js/*.chunk.js 2>/dev/null | xargs basename || echo "")

echo "✅ Build complete!"
echo "   Main JS: $MAIN_JS"
echo "   Main CSS: $MAIN_CSS"
if [ -n "$CHUNK_JS" ]; then
  echo "   Chunk JS: $CHUNK_JS"
fi

# Copy to ide-build directory
echo "📂 Copying to ide-build directory..."
cp -r build/* ../ide-build/

# Create public/ide directory structure if it doesn't exist
echo "📁 Creating public/ide directory structure..."
mkdir -p ../../public/ide/static

# Copy static files to public/ide
echo "📋 Copying static files to public/ide..."
cp -r build/static/* ../../public/ide/static/

# Update public/ide.html with new hashes
echo "📝 Updating public/ide.html..."
cat > ../../public/ide.html << EOF
<!doctype html><html lang="en"><head><meta charset="utf-8"/><link rel="icon" href="/ide/favicon.ico"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="theme-color" content="#000000"/><meta name="description" content="Coder1 IDE - AI-Powered Development Environment"/><link rel="apple-touch-icon" href="/ide/logo192.png"/><link rel="manifest" href="/ide/manifest.json"/><title>Coder1 IDE</title>$([ -n "$CHUNK_JS" ] && echo "<script defer=\"defer\" src=\"/ide/static/js/$CHUNK_JS\"></script>")<script defer="defer" src="/ide/static/js/$MAIN_JS"></script><link href="/ide/static/css/$MAIN_CSS" rel="stylesheet"></head><body><noscript>You need to enable JavaScript to run this app.</noscript><div id="root"></div></body></html>
EOF

# Update server app.js with new hashes
echo "🔧 Updating server app.js..."
APP_JS_PATH="../../src/app.js"

# Create the HTML content for the server
HTML_CONTENT="<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"/><link rel=\"icon\" href=\"/ide/favicon.ico\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/><meta name=\"theme-color\" content=\"#000000\"/><meta name=\"description\" content=\"Coder1 IDE - AI-Powered Development Environment\"/><link rel=\"apple-touch-icon\" href=\"/ide/logo192.png\"/><link rel=\"manifest\" href=\"/ide/manifest.json\"/><title>Coder1 IDE</title>"
[ -n "$CHUNK_JS" ] && HTML_CONTENT="${HTML_CONTENT}<script defer=\"defer\" src=\"/ide/static/js/$CHUNK_JS\"></script>"
HTML_CONTENT="${HTML_CONTENT}<script defer=\"defer\" src=\"/ide/static/js/$MAIN_JS\"></script><link href=\"/ide/static/css/$MAIN_CSS\" rel=\"stylesheet\"></head><body><noscript>You need to enable JavaScript to run this app.</noscript><div id=\"root\"></div></body></html>"

# Use sed to update the HTML content in app.js
# This looks for the line with htmlContent and updates it
sed -i.bak "s|const htmlContent = .*|        const htmlContent = \`$HTML_CONTENT\`;|" "$APP_JS_PATH"

echo "✨ Deployment complete!"
echo ""
echo "📍 Next steps:"
echo "   1. Restart the server: npm run dev (in autonomous_vibe_interface directory)"
echo "   2. Visit http://localhost:3000/ide to test the IDE"
echo ""
echo "File hashes updated:"
echo "   - public/ide.html"
echo "   - src/app.js (Vercel deployment)"
echo "   - coder1-ide/ide-build/"
echo "   - public/ide/static/"