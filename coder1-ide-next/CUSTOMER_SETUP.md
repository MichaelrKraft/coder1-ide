# 🚀 Coder1 IDE - Seamless Setup Guide

Welcome to Coder1 IDE! This guide will help you connect your Claude Code subscription to our web-based IDE for a seamless coding experience.

## Prerequisites
✅ **Claude Code** installed on your computer (with Pro or Max subscription)
✅ **Terminal** access on your computer
✅ **5 minutes** for one-time setup

## One-Time Setup (Takes 2 Minutes)

### 1. Install the Bridge Tool
Open your terminal and run:
```bash
curl -sL https://coder1-ide.onrender.com/install-bridge.sh | bash
```

This installs a small tool that connects your local Claude Code to our web IDE.

### 2. Start the Bridge (Background Mode)
```bash
coder1-bridge start &
```

The `&` runs it in the background - you can close the terminal and it keeps running!

### 3. Connect to the IDE
1. Visit: https://coder1-ide.onrender.com/ide
2. Click the **Bridge** button
3. Enter the 6-digit code shown
4. ✅ Connected!

## The Seamless Experience

Once connected, the bridge stays active in the background:

- **No repeated logins** - Connect once, use anytime
- **Instant access** - Just open the IDE URL
- **Persistent connection** - Survives browser refreshes
- **Background operation** - Close terminal, bridge keeps running

## Daily Usage (After Setup)

Just visit https://coder1-ide.onrender.com/ide and start coding!
- Your bridge is already connected
- Claude Code is ready to help
- No pairing codes needed

## Useful Commands

Check if bridge is connected:
```bash
coder1-bridge status
```

Stop the bridge (if needed):
```bash
# Find the process
ps aux | grep coder1-bridge

# Stop it
kill [process-id]
```

Restart bridge (after computer restart):
```bash
coder1-bridge start &
```

## Pro Tips

### Auto-Start on Computer Boot (Optional)

**Mac/Linux**: Add to your shell profile (~/.zshrc or ~/.bashrc):
```bash
# Auto-start Coder1 Bridge
(coder1-bridge status 2>/dev/null || coder1-bridge start &) &
```

**Windows**: Create a startup batch file:
```batch
@echo off
start /min coder1-bridge start
```

### Keep Bridge Running 24/7

The bridge uses minimal resources (<50MB RAM, <1% CPU) and can run indefinitely:
- Automatically reconnects on network changes
- Handles Claude Code updates gracefully
- No impact on system performance

## Troubleshooting

**Bridge won't connect?**
- Ensure Claude Code is installed: `claude --version`
- Check bridge status: `coder1-bridge status`
- Restart bridge: `killall coder1-bridge && coder1-bridge start &`

**Lost connection after computer restart?**
- Simply run: `coder1-bridge start &`
- Consider setting up auto-start (see above)

**Need to update bridge?**
```bash
# Reinstall latest version
curl -sL https://coder1-ide.onrender.com/install-bridge.sh | bash
```

## Why This Approach?

- **Zero API costs** - Uses your existing Claude Code subscription
- **No rate limits** - Unlike API calls
- **Full Claude capabilities** - All Pro/Max features available
- **Privacy-first** - Your code stays on your machine
- **True seamless experience** - Connect once, code anywhere

## Support

Need help? Visit our documentation or reach out:
- Documentation: https://coder1-ide.onrender.com/docs
- Issues: https://github.com/MichaelrKraft/coder1-ide/issues

---

**Enjoy your seamless AI-powered development experience with Coder1 IDE!** 🎉