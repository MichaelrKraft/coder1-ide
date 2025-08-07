# Claude Code Button Integration Testing Guide

## Overview
This guide explains how to test the Claude Code button integration in the Coder1 IDE terminal.

## Prerequisites
- Both ports 3000 and 3001 must be available
- Claude CLI must be installed (`claude` command available)
- Node.js and npm installed

## Setup Instructions

### 1. Start the Backend Server (Port 3000)
```bash
cd /Users/michaelkraft/autonomous_vibe_interface
npm run dev
```

You should see:
```
🚀 Autonomous Vibe Interface running on port 3000
📊 Health check: /health
💡 Terminal WebSocket: ws://127.0.0.1:3000/terminal
```

### 2. Start the Coder1 IDE (Port 3001)
In a new terminal:
```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide/coder1-ide-source
PORT=3001 npm start
```

### 3. Open the IDE
Navigate to: http://localhost:3001

## Testing the Claude Buttons

### Visual Check
- Terminal should have 12px left padding (text not touching explorer border)
- Terminal header should show 5 buttons:
  - Sleep Mode
  - Supervision 👁
  - Parallel Agents 🤖
  - Infinite Loop ♾
  - Hivemind 🧠

### Connection Check
- Terminal should show "✅ Connected to terminal server"
- No "session not found" errors

## Button Testing

### 1. Supervision Mode 👁
**What it does**: Runs Claude with verbose output showing all tool usage

**Test steps**:
1. Type a command in terminal: `create a simple Python script`
2. Click "Supervision 👁"
3. Expected output:
```
👁️ Supervision Mode Active
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 Tool: Read - Reading file structure...
🔧 Tool: Write - Creating script.py...
   [Detailed Claude output with tool usage]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Supervision completed
```

### 2. Parallel Agents 🤖
**What it does**: Analyzes task and spawns multiple specialized agents

**Test steps**:
1. Type: `build a React component with tests`
2. Click "Parallel Agents 🤖"
3. Expected output:
```
🤖 Parallel Agents Active (3 agents)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Agent 1 - Frontend] 🔄 Starting...
[Agent 2 - Testing] 🔄 Starting...
[Agent 3 - Documentation] 🔄 Starting...
[Agent 1 - Frontend] Creating Button.tsx...
[Agent 2 - Testing] Writing Button.test.tsx...
[Agent 3 - Documentation] Generating README.md...
[Agent 1 - Frontend] ✅ Completed
[Agent 2 - Testing] ✅ Completed
[Agent 3 - Documentation] ✅ Completed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All agents completed successfully!
```

### 3. Infinite Loop ♾
**What it does**: Iteratively improves output with quality scoring

**Test steps**:
1. Type: `optimize this sorting algorithm`
2. Click "Infinite Loop ♾"
3. Expected output:
```
♾️ Infinite Loop Mode Active
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 Iteration 1/5
   [First attempt at optimization]
📊 Quality score: 70.0%

🔄 Iteration 2/5
   [Improved version]
📊 Quality score: 80.0%

🔄 Iteration 3/5
   [Further refinements]
📊 Quality score: 92.0%
✅ Optimal solution reached after 3 iterations!
```

### 4. Hivemind 🧠
**What it does**: Coordinates specialized agents in phases

**Test steps**:
1. Type: `design a REST API for a blog`
2. Click "Hivemind 🧠"
3. Expected output:
```
🧠 Hivemind Mode Active
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏗️ Phase 1: ARCHITECT
   [High-level API design]

⚙️ Phase 2: IMPLEMENTER
   [Detailed implementation]

🔍 Phase 3: REVIEWER
   [Code review and suggestions]
✅ Hivemind collaboration complete!
```

## Troubleshooting

### "Connection failed" error
1. Check backend is running: `curl http://localhost:3000/health`
2. Check for console errors in browser (F12)
3. Restart both servers

### "Command not found: claude"
1. Ensure Claude CLI is installed
2. Check PATH: `which claude`
3. Install if needed: `npm install -g @anthropic-ai/claude-cli`

### Buttons not responding
1. Check browser console for errors
2. Verify WebSocket connection in Network tab
3. Ensure `authenticatedFetch` is working (check for auth errors)

### No output appearing
1. Check terminal is connected (green indicator)
2. Verify Claude CLI works: `claude --print "test"`
3. Check backend logs for spawn errors

## Implementation Details

### Files Modified
- `src/integrations/claude-code-button-bridge.js` - Core Claude CLI integration
- `src/routes/claude-buttons.js` - REST API endpoints
- `src/components/Terminal.tsx` - Button handlers and UI
- `src/routes/terminal-websocket-safepty.js` - WebSocket integration
- `src/app.js` - Route registration

### How It Works
1. User clicks button → Terminal.tsx sends API request
2. Backend spawns Claude CLI process with appropriate flags
3. Output streams via Socket.IO to terminal
4. Formatted with colors and agent labels

## Next Steps

After successful testing:
1. Adjust prompt detection logic if needed
2. Fine-tune agent task distribution
3. Add error recovery mechanisms
4. Consider implementing the Tauri desktop version

## Notes
- The integration uses the last typed command as the prompt
- Default prompt: "Help me build a modern web application with best practices"
- Each mode has different Claude CLI flags and formatting
- Sessions are tracked and can be stopped mid-execution