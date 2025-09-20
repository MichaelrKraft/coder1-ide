# 🎯 SIMPLE SETUP GUIDE - Connect Claude to Web IDE

## ⚠️ IMPORTANT CONCEPT TO UNDERSTAND

**The Web Terminal ≠ Your Computer**
- The terminal in the browser runs on Render's server
- Claude CLI must run on YOUR computer
- The bridge connects YOUR Claude CLI to the web IDE

## 📍 WHERE TO RUN COMMANDS

### ❌ NOT HERE (Web Terminal)
```
coder1:coder1-ide-next$ coder1-bridge start  # WRONG! This is the web server!
```

### ✅ HERE (Your Local Computer)
- **Mac**: Spotlight → Terminal app
- **Windows**: Start → Command Prompt or PowerShell  
- **Linux**: Ctrl+Alt+T

## 🚀 STEP-BY-STEP SETUP

### Step 1: Click Connect Bridge Button
In the web IDE (https://coder1-ide.onrender.com/ide):
- Look at the bottom status bar
- Click the blue "🌉 Connect Bridge" button
- A popup will show a 6-digit code (like `823456`)
- **KEEP THIS WINDOW OPEN**

### Step 2: Open YOUR Terminal
**On YOUR computer** (not the web browser):
1. Mac: Press `Cmd+Space`, type "Terminal", press Enter
2. Windows: Press `Win+R`, type "cmd", press Enter
3. Linux: Press `Ctrl+Alt+T`

### Step 3: Install Bridge (One Time Only)
**In YOUR terminal** (the one you just opened on your computer):
```bash
curl -sL https://coder1-ide.onrender.com/install-bridge.sh | bash
```

If curl isn't available (Windows), download and run:
- https://github.com/MichaelrKraft/coder1-ide
- Navigate to `coder1-ide-next/bridge-cli`
- Run `npm install` then `npm link`

### Step 4: Connect Bridge
**Still in YOUR terminal** (on your computer):
```bash
coder1-bridge start
```

It will ask for the 6-digit code. Type the code from Step 1.

### Step 5: Success!
- You'll see: "✅ Bridge connected successfully!"
- The popup in the browser will show a checkmark
- Now you can type `claude` in the WEB terminal and it works!

## 🎨 Visual Guide

```
YOUR COMPUTER                    INTERNET                    RENDER SERVER
┌─────────────┐                                           ┌──────────────┐
│             │                                           │              │
│  Terminal   │                                           │  Web IDE     │
│             │                                           │              │
│ $ coder1-   │  ←──── Bridge Connection (WebSocket) ────→│  Terminal    │
│   bridge    │                                           │  $ claude    │
│   start     │                                           │  [works!]    │
│             │                                           │              │
│ Claude CLI  │  ←──── Commands sent to your CLI ────────│              │
│ Installed   │                                           │              │
│ Here        │  ────── Output sent back to browser ─────→│              │
│             │                                           │              │
└─────────────┘                                           └──────────────┘
```

## 💡 Understanding the Architecture

1. **Web IDE Terminal**: Runs on Render's server (Linux)
2. **Your Claude CLI**: Runs on your computer (Mac/Windows/Linux)
3. **Bridge**: Connects them together via WebSocket
4. **Result**: Claude commands in web terminal execute on YOUR computer

## 🆘 Troubleshooting

### "coder1-bridge: command not found"
- You're typing in the wrong terminal!
- This command runs on YOUR computer, not in the web browser
- Open Terminal/Command Prompt on YOUR computer

### "Claude CLI not found"
- Install Claude Code from: https://claude.ai/download
- Make sure it works locally first: `claude --version`

### "Invalid pairing code"
- Codes expire after 5 minutes
- Click "Connect Bridge" again for a new code

### Still Confused?
The web terminal is like a remote desktop - you're controlling a computer in the cloud. But Claude CLI needs to run on YOUR computer because:
1. It needs your Claude Code subscription
2. It needs access to your local files
3. Anthropic doesn't allow CLI on servers

The bridge is the "telephone line" between your local Claude CLI and the web IDE.

## 🎯 Quick Test

After connecting the bridge, in the **WEB terminal** type:
```bash
claude "Hello, are you connected?"
```

If it works, you'll see Claude respond! If not, make sure:
1. Bridge is running on YOUR computer (not web terminal)
2. You entered the correct 6-digit code
3. Claude CLI is installed on YOUR computer

---

**Remember**: The bridge runs on YOUR computer, not in the web terminal! 🖥️ ≠ 🌐