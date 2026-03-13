# Coder1 IDE - Development Guide

## Critical Information

**Platform Name**: "Coder1" (with number 1), NOT "CoderOne"

**Repository**:
- **Path**: `/Users/michaelkraft/autonomous_vibe_interface/`
- **GitHub**: `git@github.com:MichaelrKraft/coder1-ide.git`
- **Branch**: `master`

**Next.js IDE Location**: `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/`

## Safety Rules

Always ask before killing processes, restarting servers, or terminating running services. Never assume it's safe to stop something without user confirmation.

## Communication Style

When I ask questions or give a numbered list of tasks, answer them directly and in order. Do not skip ahead to writing code or creating fix plans unless explicitly asked.

## Project Structure

This project uses TypeScript primarily. The main deployment target is Render. Key config files live in the `web/` directory, not the repo root — always check `web/` first for build configs, install scripts, and environment files.

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

Before committing or pushing to GitHub, always run `git status` and `git log --oneline -3` to check if changes were already committed by another agent or process.

```bash
cd /Users/michaelkraft/autonomous_vibe_interface
git status
git log --oneline -3
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

## Debugging

When debugging, confirm which environment (local dev vs production/Render) the issue is in before searching for files or making changes. Ask if unclear.

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

## Security & Architecture Rules

Rules grounded in Coder1's actual security model. These apply to all new code and must be followed before committing.

### Never Do These

1. **No anonymous auth in non-alpha code.** The pattern `authToken || 'anonymous'` in bridge connect is an alpha-only shortcut. Any new auth flow must require a real token or return 401.
2. **Never log API key values.** Log existence only: `console.log('ANTHROPIC_API_KEY:', !!process.env.ANTHROPIC_API_KEY)`. Never log the value, even partially.
3. **Never trust client-provided permission claims.** Bridge permission levels (`claude-cli`, `bridge` capabilities) must be determined server-side. Never read permission level from request body.
4. **No raw user input in PTY args.** Any string passed to `node-pty` spawn args must be validated/sanitized first — no direct interpolation of user-supplied strings.
5. **No blocking operations in Socket.IO event handlers.** Checkpoint saves, session summaries, AI calls — must be async/background. Blocking the event loop stalls all connected clients.

### Architecture Constraints

- **Bridge is the security boundary.** Web server never executes local commands directly — all local execution goes through the bridge. Don't add server-side PTY spawning that bypasses bridge auth.
- **In-memory auth Maps are alpha only.** `bridgeConnections` and `bridgeAuth` have no persistence — they reset on restart. Do not build features that assume these survive across deploys.
- **Socket.IO timeout = 120000ms minimum.** Claude Code sessions regularly run longer than 60 seconds. Do not reduce timeouts on Socket.IO or underlying HTTP without explicit testing.
- **Optional service loading pattern.** All services loaded in server.js use `try { require(...) } catch { warn; null }`. Follow this pattern for any new service — server must start even if a service is unavailable.

### Before Adding a New API Route

1. Validate all required fields at the top — return `400 { error: 'fieldName is required' }` early
2. Check auth — does this endpoint need bridge auth, WS ticket, or API key?
3. Wrap external calls (PTY, Socket.IO, file system) in try/catch with structured error logging
4. Never return `process.env` values or internal paths in error responses

## Documentation

For detailed documentation, see:
- `docs/` - Technical documentation
- `tasks/` - Task tracking and planning
- Full backup: `CLAUDE.md.backup-full`
