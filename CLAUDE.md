# Coder1 IDE - Development Guide

## Critical Information

**Platform Name**: "Coder1" (with number 1), NOT "CoderOne"

**Repository**:
- **Path**: `/Users/michaelkraft/autonomous_vibe_interface/`
- **GitHub**: `git@github.com:MichaelrKraft/coder1-ide.git`
- **Branch**: `master`

**Next.js IDE Location**: `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/`

## Quick Start

```bash
# Development server
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npm run dev  # Runs on port 3001

# Production build
npm run build
```

## Architecture Overview

Coder1 IDE is a web-based development environment that connects to Claude Code CLI via a bridge:

```
Web IDE (Next.js 14)
    ↓ WebSocket
Server (Node.js + Socket.IO)
    ↓ WebSocket
Bridge CLI (on user's machine)
    ↓ PTY
Claude Code CLI
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Next.js App | `coder1-ide-next/` | Web IDE frontend |
| Server | `coder1-ide-next/server.js` | WebSocket server |
| Bridge CLI | `coder1-ide-next/bridge-cli/` | Local machine connector |
| Terminal | `components/terminal/` | xterm.js terminal |
| Monaco Editor | `components/editor/` | Code editor |

### Port Allocation
- **3000**: Main backend server (autonomous_vibe_interface)
- **3001**: Next.js IDE development

## Bridge System

The bridge connects the web IDE to the user's local machine:

1. User runs `coder1-bridge start` in local terminal
2. Enters 6-digit pairing code from IDE
3. WebSocket connection established
4. Commands from IDE execute on user's machine

**Bridge CLI commands**:
```bash
coder1-bridge start           # Start bridge
coder1-bridge status          # Check status
coder1-bridge test            # Test Claude CLI
coder1-bridge diagnose        # Full diagnostic
```

## Key Files

| File | Purpose |
|------|---------|
| `server.js` | Main backend server with Socket.IO |
| `bridge-cli/src/index.js` | Bridge CLI entry point |
| `bridge-cli/src/claude-executor.js` | Claude CLI execution |
| `components/terminal/BetaTerminal.tsx` | Terminal component |
| `components/editor/MonacoEditor.tsx` | Code editor |
| `lib/socket.ts` | Client WebSocket connection |

## Common Tasks

### Start Development
```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npm run dev
```

### Test Bridge Locally
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Start bridge with local server
cd bridge-cli
node src/index.js start --server http://localhost:3001
```

### Git Workflow
```bash
cd /Users/michaelkraft/autonomous_vibe_interface
git add [files]
git commit -m "[message]"
git push origin master
```

## Environment Variables

```env
# Required
ANTHROPIC_API_KEY=your-key
PORT=3001

# Optional
NODE_ENV=development
ENABLE_SUPERVISION=true
```

## Troubleshooting

### Bridge won't connect
1. Check Claude CLI is installed: `which claude`
2. Check Claude CLI works: `claude --version`
3. Run diagnostics: `coder1-bridge diagnose`

### Terminal not responding
1. Check WebSocket connection in browser console
2. Verify server is running on correct port
3. Check for CORS issues if cross-origin

### Claude slow to start
1. Run cleanup: `~/.claude/scripts/auto-cleanup.sh`
2. Check MCP servers: `cat ~/.mcp.json`
3. Verify .claudeignore exists in project

## Documentation

For detailed documentation, see:
- `docs/` - Technical documentation
- `tasks/` - Task tracking and planning
- Full backup: `CLAUDE.md.backup-full`
