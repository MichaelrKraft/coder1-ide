# 🛡️ EMERGENCY ROLLBACK COMMANDS

## Instant Revert to Working State

If the responsive height changes cause issues, use these commands to instantly revert:

### 1. Restore Terminal.tsx
```bash
git checkout HEAD~1 -- components/terminal/Terminal.tsx
```

### 2. Restart Unified Server
```bash
# Kill any existing process
lsof -ti :3001 | xargs kill -9

# Start unified server with memory flags
node --expose-gc --max-old-space-size=1024 server.js
```

### 3. Verify Rollback
- Navigate to: http://localhost:3001/ide
- Check: Terminal shows with manual panel resizing capability
- Confirm: No viewport overflow (height constraint active)

## Working State Details (Commit ad69b8bca)
- ✅ Unified Next.js server with Socket.IO + PTY
- ✅ Terminal.css import enabled with xterm fixes
- ✅ Height constraint: `maxHeight: calc(100vh - 620px)`
- ✅ Manual panel resizing reveals full terminal content

## Current Server Command
```bash
node --expose-gc --max-old-space-size=1024 server.js
```

**Generated**: 2025-09-16 by Terminal Optimization Session