# Browser Terminal for Coder1 IDE

This guide explains how to use the real terminal feature in your Coder1 IDE through your web browser.

## Overview

Since Electron had display issues on macOS, we've implemented a browser-based solution that provides full terminal access, including the ability to run Claude CLI commands.

## Architecture

```
Your Browser (localhost:3000)     Terminal Server (localhost:3001)
┌─────────────────────┐          ┌──────────────────────────┐
│  Coder1 IDE         │          │  Node.js + node-pty      │
│  ┌──────────────┐   │          │  ┌────────────────────┐  │
│  │ Terminal UI  │   │ WebSocket│  │ Spawns real bash   │  │
│  │ (xterm.js)   │◄──┼──────────┼──┤ with your user     │  │
│  └──────────────┘   │          │  │ permissions        │  │
└─────────────────────┘          │  └────────────────────┘  │
                                 │  ✓ Can run claude       │
                                 │  ✓ Full file access     │
                                 │  ✓ All system commands  │
                                 └──────────────────────────┘
```

## Setup Instructions

### 1. Install Dependencies (One Time Only)

```bash
cd /Users/michaelkraft/autonomous_vibe_interface
npm install
```

This installs:
- `node-pty` - For creating real terminal sessions
- `socket.io` - For WebSocket communication
- Other required dependencies

### 2. Start the Terminal Server

In a terminal window, run:

```bash
npm run terminal-server
```

You should see:
```
✅ Terminal server running on http://localhost:3001
Ready to accept WebSocket connections for terminal access
```

**Keep this terminal window open** while using the IDE.

### 3. Start the IDE Server

In another terminal window, run:

```bash
npm start
```

This starts the main IDE server on port 3000.

### 4. Open the IDE

Open your browser and go to:
```
http://localhost:3000
```

## Using the Browser Terminal

### Finding the Terminal Button

1. Look at the bottom of the IDE where the terminal/console area is
2. You should see a blue button labeled "🌐 Browser Terminal"
3. If you don't see it immediately, wait a few seconds for it to load

### Connecting to Terminal

1. Click the "🌐 Browser Terminal" button
2. You'll see "Connecting to terminal server..."
3. Once connected, you'll have a real terminal!

### Running Commands

You can now run any command, including:

```bash
# Check Claude CLI
claude --version

# Start a Claude session
claude

# Navigate directories
cd ~/projects
ls -la

# Any other system command
git status
npm install
python script.py
```

### Switching Back to Chat

Click the "💬 Chat Mode" button to return to the normal IDE terminal.

## Features

✅ **Full System Access** - Run any command you normally could
✅ **Claude CLI** - Full access to Claude Code functionality
✅ **File System** - Navigate and edit files
✅ **Persistence** - Commands run in your actual system
✅ **Your Permissions** - Runs as your user with your API keys

## Troubleshooting

### "Could not connect to terminal server"

1. Make sure the terminal server is running:
   ```bash
   npm run terminal-server
   ```

2. Check that it's running on port 3001:
   ```bash
   lsof -i :3001
   ```

### Terminal not responding

1. Refresh the browser page
2. Click "Browser Terminal" again to reconnect
3. Restart the terminal server if needed

### Claude command not found

1. Make sure Claude CLI is installed:
   ```bash
   npm install -g @anthropic-ai/claude-cli
   ```

2. The terminal server includes `/opt/homebrew/bin` in PATH for macOS

### Browser Terminal button not appearing

1. Wait 5-10 seconds after page load
2. Check browser console for errors (F12)
3. Make sure you're on the IDE page with a terminal area

## Security Notes

- The terminal server **only** accepts connections from localhost
- It runs with your user permissions (same as Terminal.app)
- Your Claude API key is used from your local configuration
- No external access is possible

## Quick Start Summary

```bash
# Terminal 1
cd /Users/michaelkraft/autonomous_vibe_interface
npm run terminal-server

# Terminal 2
npm start

# Browser
open http://localhost:3000
# Click "🌐 Browser Terminal" button
```

## Technical Details

- **Terminal Server**: Runs on port 3001, spawns PTY processes
- **WebSocket**: Real-time bidirectional communication
- **node-pty**: Creates pseudo-terminals with full TTY support
- **Socket.IO**: Handles connection management and events
- **Browser Integration**: Injects terminal button into existing IDE

## Why This Approach?

1. **Electron Issues**: Electron windows weren't displaying properly on macOS
2. **Browser Security**: Browsers can't spawn terminals directly
3. **Local Server**: Provides the bridge between browser and system
4. **Full Functionality**: Gives you everything a desktop app would

This is similar to how VS Code's web version and other cloud IDEs handle terminal access - through a local server component.