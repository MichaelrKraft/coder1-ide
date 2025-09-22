# Claude CLI Bridge Implementation Guide

## Executive Summary

### The Problem
When Coder1 IDE is deployed on Render (or any cloud service), users encounter "claude: command not found" errors when trying to use Claude commands in the web terminal. This happens because:
- The terminal runs on the remote server, not the user's local machine
- Claude CLI is installed on the user's computer, not the server
- Running Claude CLI on the server would require expensive API keys ($200-500/month)

### The Solution
We implemented a **Claude CLI Bridge** - a WebSocket-based connection system that routes commands from the web terminal to the user's local Claude CLI installation, enabling:
- **Cost-effective usage**: Leverage $20/month Claude Code subscription instead of expensive API calls
- **Seamless experience**: Type `claude` in web terminal, execution happens locally
- **Secure connection**: 6-digit pairing codes and JWT authentication
- **Real-time streaming**: Live output from local CLI to browser

### Key Benefit
**💰 Cost Savings**: $20/month (Claude Code subscription) vs $200-500/month (API usage)

---

## Architecture Overview

### System Architecture Diagram
```
┌──────────────────────────────────────────────────────────────────────┐
│                          WEB BROWSER (User Interface)                 │
├──────────────────────────────────────────────────────────────────────┤
│  • Coder1 IDE Interface                                              │
│  • Terminal Component (displays output)                              │
│  • WelcomeScreen (setup instructions)                                │
│  • Status Bar (Connect Bridge button)                                │
└────────────────────┬─────────────────────────────────────────────────┘
                     │ WebSocket (wss://)
                     ↓
┌──────────────────────────────────────────────────────────────────────┐
│                     RENDER SERVER (coder1-ide.onrender.com)          │
├──────────────────────────────────────────────────────────────────────┤
│  • server.js (terminal interception, WebSocket server)               │
│  • BridgeManager (connection orchestration)                          │
│  • JWT Authentication                                                │
│  • 6-digit Pairing Code Generator                                    │
│  • Command Queue Management                                          │
└────────────────────┬─────────────────────────────────────────────────┘
                     │ WebSocket Bridge (/bridge namespace)
                     ↓
┌──────────────────────────────────────────────────────────────────────┐
│                     USER'S LOCAL COMPUTER                            │
├──────────────────────────────────────────────────────────────────────┤
│  • coder1-bridge CLI (Node.js application)                          │
│  • Claude CLI (installed via claude.ai)                              │
│  • Command Executor (spawns claude processes)                        │
│  • Output Parser (streams responses back)                            │
└──────────────────────────────────────────────────────────────────────┘
```

### Data Flow
1. **User types** `claude` command in web terminal
2. **Server intercepts** command before bash execution
3. **BridgeManager checks** for active bridge connection
4. **If connected**: Routes command to user's local bridge
5. **Local bridge**: Executes claude CLI with command
6. **Output streams** back through WebSocket to browser
7. **Terminal displays** output as if executed locally

---

## Implementation Details

### Core Components

#### 1. Server-Side Terminal Interception (`/server.js`)
```javascript
// Lines 566-620: Terminal command interception
socket.on('terminal:input', ({ id, data }) => {
  // Parse command to check if it's a claude command
  const command = data.trim().split(' ')[0];
  
  if (command === 'claude' || command.startsWith('claude')) {
    // Intercept and handle via bridge
    handleClaudeCommand(socket, id, data);
    return; // Don't pass to bash
  }
  
  // Regular commands go to PTY
  ptyProcess.write(data);
});
```

#### 2. Bridge Manager Service (`/services/bridge-manager.js`)
Key responsibilities:
- **Pairing code generation**: 6-digit codes valid for 5 minutes
- **Connection management**: Track active bridges per user
- **Command routing**: Queue and route commands to appropriate bridge
- **Heartbeat monitoring**: Auto-disconnect dead connections
- **Load balancing**: Distribute commands across multiple bridges

```javascript
class BridgeManager extends EventEmitter {
  // Key configuration
  PAIRING_CODE_LENGTH = 6;
  PAIRING_CODE_EXPIRY = 5 * 60 * 1000; // 5 minutes
  HEARTBEAT_INTERVAL = 30 * 1000;      // 30 seconds
  MAX_COMMANDS_PER_BRIDGE = 5;         // Concurrent command limit
}
```

#### 3. Welcome Screen (`/components/editor/WelcomeScreen.tsx`)
Displays clear setup instructions in the editor area when no files are open:
- Step-by-step local setup guide
- Visual architecture diagram
- Prerequisites and troubleshooting
- Emphasizes running commands LOCALLY, not in web terminal

#### 4. Bridge CLI Package (`/bridge-cli/`)
Optimized to ~10MB, includes:
- **bridge-client.js**: WebSocket connection to server
- **claude-executor.js**: Spawns local claude processes
- **cli-output-parser.js**: Parses and streams output
- **Dependencies**: socket.io-client, winston, p-queue, yargs

### Security Measures

1. **JWT Authentication**
   - Consistent JWT_SECRET between API and WebSocket
   - Token validation on bridge connection
   - Session-based user identification

2. **Pairing Codes**
   - 6-digit random codes
   - 5-minute expiration
   - One-time use only
   - User-specific validation

3. **Connection Limits**
   - Maximum 5 concurrent commands per bridge
   - Automatic timeout after 60 seconds
   - Heartbeat monitoring every 30 seconds
   - Auto-cleanup of dead connections

---

## User Experience Journey

### The Problem Evolution

1. **Initial Issue**: Users see "claude: command not found" in web terminal
2. **First Confusion**: Users try typing "coder1-bridge start" IN the web terminal
3. **Misunderstanding**: Users don't realize terminal runs on server, not locally

### Solution Iterations

1. **Iteration 1**: Added help message when claude command detected
   - **Result**: Users still confused about WHERE to run commands

2. **Iteration 2**: Made warnings more explicit ("DO NOT TYPE HERE!")
   - **Result**: Better, but terminal too cluttered with text

3. **Iteration 3**: Created WelcomeScreen in editor area
   - **Result**: Clean, clear instructions in prominent location
   - **Success**: Users understand the architecture and setup process

### Final UX Flow

1. User opens IDE at `https://coder1-ide.onrender.com`
2. Sees WelcomeScreen with setup instructions (editor area)
3. Opens LOCAL terminal on their computer
4. Installs bridge: `curl -sL .../install-bridge.sh | bash`
5. Starts bridge: `coder1-bridge start`
6. Clicks "Connect Bridge" button in IDE status bar
7. Enters 6-digit pairing code
8. Can now use `claude` commands in web terminal

---

## Technical Components Reference

### Critical Files

#### `/server.js` (Lines 566-620, 1087-1140)
- Terminal command interception logic
- Bridge WebSocket event handlers
- Claude command routing decision tree

#### `/services/bridge-manager.js`
- Complete bridge orchestration system
- Pairing code generation and validation
- Connection lifecycle management
- Command queueing and routing

#### `/components/editor/WelcomeScreen.tsx`
- User-facing setup instructions
- Visual architecture explanation
- Prerequisites and troubleshooting guide

#### `/components/editor/MonacoEditor.tsx` (Lines 168-170)
- Logic to show WelcomeScreen when no file open
- Fixed to use `undefined` instead of default string

#### `/app/ide/page.tsx` (Lines 104-110)
- Passes correct props to MonacoEditor
- Ensures WelcomeScreen displays properly

#### `/bridge-cli/` directory
- Complete local bridge implementation
- Installation script and package.json
- WebSocket client and command executor

### Environment Variables

```env
# Required on Render deployment
JWT_SECRET=coder1-bridge-secret-2025-change-in-production
BRIDGE_SERVER_URL=https://coder1-ide.onrender.com
BRIDGE_PAIRING_TIMEOUT=300000
ENABLE_BRIDGE=true

# Optional
MAX_SESSIONS=100
BRIDGE_HEARTBEAT_INTERVAL=30000
```

---

## Setup and Deployment

### For Render Deployment

1. **Add environment variables** (see above)
2. **Deploy with build command**:
   ```bash
   npm install && npm run build
   ```
3. **Start command**: `npm run start`
4. **Bridge endpoint** automatically available at `/bridge`

### For Local Development

1. **Start the IDE**:
   ```bash
   cd coder1-ide-next
   npm install
   npm run dev
   ```

2. **Test bridge locally**:
   ```bash
   cd bridge-cli
   npm install
   node index.js start --server http://localhost:3001
   ```

---

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue: "claude: command not found" still appearing
**Causes & Solutions**:
1. Bridge not connected - Check status bar for connection status
2. Bridge crashed - Restart with `coder1-bridge start`
3. Server not intercepting - Check server logs for interception messages

#### Issue: Pairing code not working
**Causes & Solutions**:
1. Code expired (5 min timeout) - Generate new code
2. Wrong server URL - Verify BRIDGE_SERVER_URL in environment
3. JWT mismatch - Ensure JWT_SECRET matches between client and server

#### Issue: Commands hang or timeout
**Causes & Solutions**:
1. Claude CLI not installed locally - Install from claude.ai
2. Bridge lost connection - Check network and restart bridge
3. Command queue full - Wait for current commands to complete

#### Issue: WelcomeScreen not showing
**Causes & Solutions**:
1. File is open in editor - Close all files
2. Wrong prop passed to MonacoEditor - Should be `undefined` not empty string
3. Component not imported - Check imports in MonacoEditor.tsx

### Debug Commands

```bash
# Check bridge connection status (in browser console)
socket.emit('bridge:status', {}, (response) => console.log(response));

# View bridge logs (on local machine)
tail -f ~/.coder1-bridge/logs/bridge.log

# Test Claude CLI directly (local)
claude --version

# Check server logs (on Render)
# View via Render dashboard → Logs
```

### Testing Procedures

1. **Basic Connection Test**:
   ```bash
   # Start bridge locally
   coder1-bridge start
   # Should show "Connected to server" and 6-digit code
   ```

2. **Command Execution Test**:
   ```javascript
   // In web terminal after bridge connected
   claude hello
   // Should respond with Claude greeting
   ```

3. **Load Test**:
   ```javascript
   // Test concurrent commands
   claude help &
   claude version &
   claude list &
   // All should complete successfully
   ```

---

## For Future Agents

### Critical Understanding Points

1. **The Fundamental Concept**: The bridge connects LOCAL Claude CLI to REMOTE web terminal. Users must understand they're running commands on THEIR computer, not the server.

2. **Why This Matters**: Saves hundreds of dollars per month by using Claude Code subscription instead of API tokens.

3. **Common Confusion**: Users will try to run bridge commands IN the web terminal. This WILL NOT WORK. Bridge must be installed and run LOCALLY.

4. **UX is Critical**: Clear instructions in a prominent location (editor area) are essential. Terminal is too cluttered for instructions.

### Common Pitfalls to Avoid

1. **Don't modify terminal interception** without understanding the command parsing logic
2. **Don't change JWT_SECRET** without updating all references
3. **Don't remove the WelcomeScreen** - it's critical for user understanding
4. **Don't assume users understand** client-server architecture

### Areas for Improvement

1. **Auto-reconnection**: Bridge could automatically reconnect on disconnect
2. **Multiple bridge support**: Allow multiple users to share one deployment
3. **Bridge status indicator**: Real-time connection status in UI
4. **Command history**: Store and replay previous commands
5. **Error recovery**: Better handling of Claude CLI failures
6. **Performance metrics**: Track latency and success rates

### Key Design Decisions

1. **WebSocket over HTTP**: Real-time streaming of command output
2. **6-digit codes over complex auth**: Simple UX for non-technical users
3. **Editor instructions over terminal**: Clean, uncluttered presentation
4. **Client-side bridge over server CLI**: Massive cost savings
5. **Queue management**: Prevents overwhelming local Claude CLI

---

## Implementation Timeline

- **Initial Problem Report**: User reports "claude: command not found" on Render
- **First Attempt**: Terminal message interception and help text
- **User Feedback**: "Getting closer" but confused about where to run commands
- **Second Attempt**: Clearer warnings and instructions in terminal
- **User Request**: "Put this in the editor area since it's clean"
- **Final Solution**: WelcomeScreen component with visual guide
- **Bug Fix**: WelcomeScreen not showing (prop issue)
- **Text Revision**: Clearer instruction text per user feedback
- **Documentation**: This comprehensive guide for future agents

---

## Conclusion

The Claude CLI Bridge successfully solves the core problem of using Claude commands in a cloud-deployed IDE while maintaining cost-effectiveness. The solution required not just technical implementation but careful attention to user experience and clear communication about the architecture.

The bridge system enables users to leverage their existing Claude Code subscription ($20/month) instead of expensive API calls ($200-500/month), making AI-assisted development accessible to more developers.

Future agents should focus on maintaining the clarity of user instructions while improving the technical robustness of the bridge connection system.

---

*Document Created: January 2025*  
*Last Updated: January 2025*  
*Primary Author: Claude (AI Agent)*  
*Implementation Session: "Claude CLI Bridge for Render Deployment"*