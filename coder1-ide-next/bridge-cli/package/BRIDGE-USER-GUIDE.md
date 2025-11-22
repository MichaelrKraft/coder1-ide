# 🌉 Coder1 Bridge User Guide

## What is Coder1 Bridge?

Coder1 Bridge connects your browser-based IDE to your local Claude Code installation, enabling you to:
- Use Claude AI assistance directly in your browser
- Save hundreds of dollars monthly (Claude Code: $20/month vs API: $200-500/month)
- Execute commands locally with full file system access
- Work seamlessly between web IDE and local development

## Installation (2 minutes)

### Quick Install (Recommended)
```bash
curl -sL https://coder1-ide.onrender.com/install-bridge.sh | bash
```

This will:
1. Check for Node.js 18+
2. Download the bridge CLI
3. Install it globally
4. Verify Claude Code is installed

### Manual Install
```bash
git clone https://github.com/MichaelrKraft/coder1-ide.git
cd coder1-ide/bridge-cli
npm install
npm link
```

## First Connection

1. **Open Coder1 IDE**
   - Visit: https://coder1-ide.onrender.com/ide
   - You'll see the IDE interface with terminal and editor

2. **Start Connection**
   - Click the "Connect Bridge" button (top right)
   - A 6-digit code will appear (e.g., `823456`)

3. **Connect Your Bridge**
   ```bash
   coder1-bridge start
   ```
   - Enter the 6-digit code when prompted
   - You'll see: "✅ Bridge connected successfully!"

4. **Start Coding!**
   - Use Claude commands in the IDE terminal
   - Example: `claude "Create a React component for a todo list"`

## Common Commands

### In the IDE Terminal (After Connected)
```bash
# Ask Claude for help
claude "How do I implement authentication in Next.js?"

# Generate code
claude "Write a Python script to process CSV files"

# Debug issues
claude "Why is this React component re-rendering?"

# Refactor code
claude "Refactor this function to be more efficient"
```

### In Your Local Terminal
```bash
# Connect to IDE
coder1-bridge start

# Test Claude installation
coder1-bridge test

# Check connection status
coder1-bridge status
```

## Tips for Alpha Users

### 1. Keep Bridge Running
The bridge needs to stay running for the IDE to work. Keep the terminal open where you ran `coder1-bridge start`.

### 2. Reconnection is Automatic
If your internet drops, the bridge will automatically reconnect. No need to restart.

### 3. Multiple Projects
You can change directories in the IDE terminal:
```bash
cd /path/to/your/project
claude "Analyze this codebase"
```

### 4. File Access
The IDE can access your local files through the bridge:
- Edit files in the IDE
- Run commands that read/write files
- Full file system access

### 5. Performance Tips
- One command at a time (queued automatically)
- Long-running commands supported (up to 5 minutes)
- Output streams in real-time

## Troubleshooting

### "Claude CLI not found"
1. Install Claude Code: https://claude.ai/download
2. Restart your terminal
3. Run: `coder1-bridge test`

### "Invalid pairing code"
- Codes expire after 5 minutes
- Get a new code from the IDE
- Enter exactly 6 digits

### "Connection failed"
1. Check internet connection
2. Verify IDE is accessible
3. Try development mode: `coder1-bridge start --dev`

### Bridge Crashes
Check logs:
```bash
cat ~/.coder1/logs/error.log
tail -f ~/.coder1/logs/bridge.log
```

## FAQ

**Q: Is my code secure?**
A: Yes! All commands run locally on your machine. The bridge only relays input/output.

**Q: Can I use this with my existing Claude Code subscription?**
A: Yes! That's the whole point - use your $20/month subscription instead of expensive APIs.

**Q: Does it work offline?**
A: No, you need internet to connect to the IDE, but commands execute locally.

**Q: Can multiple people use the same IDE?**
A: Each user needs their own bridge connection with a unique pairing code.

**Q: What about rate limits?**
A: The bridge queues commands to respect Claude's rate limits automatically.

## Support

- **Quick Help**: Run `coder1-bridge --help`
- **Report Issues**: https://github.com/MichaelrKraft/coder1-ide/issues
- **Alpha Feedback**: Use the feedback button in the IDE

## What's Next?

As an alpha user, you're helping shape Coder1! Coming soon:
- Persistent sessions
- Team collaboration
- VS Code extension
- Mobile support
- Custom AI models

Thank you for being an early adopter! 🚀