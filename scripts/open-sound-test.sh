#!/bin/bash

# Open Sound Alert Test Tool
# This script opens the sound alert test tool in your default browser

echo "🔊 Opening Sound Alert Test Tool..."

# Get the absolute path to the test file
TEST_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/test-sound-alerts.html"

# Check if file exists
if [ ! -f "$TEST_FILE" ]; then
    echo "❌ Test file not found: $TEST_FILE"
    exit 1
fi

# Open in default browser (macOS)
if command -v open >/dev/null 2>&1; then
    open "$TEST_FILE"
    echo "✅ Opened in default browser"
# Open in default browser (Linux)
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$TEST_FILE"
    echo "✅ Opened in default browser"
# Open in default browser (Windows/WSL)
elif command -v cmd.exe >/dev/null 2>&1; then
    cmd.exe /c start "$TEST_FILE"
    echo "✅ Opened in default browser"
else
    echo "📋 Please manually open this file in your browser:"
    echo "   file://$TEST_FILE"
fi

echo ""
echo "🔧 Testing Instructions:"
echo "1. Check the System Status to ensure Web Audio API is supported"
echo "2. Click 'Enable Sounds' if sounds are disabled"
echo "3. Test different sound presets to find your preference"
echo "4. Watch the Live Console Log for debugging information"
echo "5. If sounds don't play, check browser permissions for audio"

echo ""
echo "💡 Troubleshooting Tips:"
echo "- Some browsers require user interaction before playing audio"
echo "- Check browser dev tools console for additional error messages"
echo "- Ensure browser volume is not muted"
echo "- Try refreshing the page if audio context fails to initialize"