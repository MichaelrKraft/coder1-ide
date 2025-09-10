# ⚠️ ARCHIVED - Legacy Express Server

**Date Archived**: January 10, 2025  
**Status**: DEPRECATED - DO NOT USE  
**Replacement**: Unified Next.js server in `/coder1-ide-next/`  

---

## Why This Was Archived

This Express server (`src/app.js`) was the original architecture before migration to Next.js. It is:
- Missing required agent definition files (`.coder1/agents/`)
- Incompatible with current architecture
- No longer maintained or functional
- Causes confusion for new developers

## Current Architecture

The Coder1 IDE now runs on a **unified Next.js custom server**:
- Location: `/coder1-ide-next/server.js`
- Port: 3001
- Start command: `cd coder1-ide-next && npm run dev`

## DO NOT:
- Try to fix or run this Express server
- Reference it in documentation
- Use any code from here without careful review

## Historical Reference Only

This code is preserved for historical reference and potential code recovery if needed. All active development should happen in the Next.js codebase.