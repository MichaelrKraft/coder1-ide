# Code Review Guidelines — Coder1 IDE

Used by Claude Code PR Review to understand what matters, what to skip, and how to give useful feedback for this specific codebase.

## Always Check

### Bridge Authentication
- Flag any use of `authToken || 'anonymous'` or empty-string auth token fallbacks — alpha-only pattern, must be removed before production
- Confirm bridge permission scoping: `['terminal', 'files']` for standard, `['terminal', 'files', 'claude-cli', 'bridge']` for elevated. Elevated must require explicit user action
- WebSocket tickets must validate `bridgeAuth` server-side — never trust client-provided permission claims

### API Input Validation
- Every new API route must validate required fields at the top before doing any work — return 400 with a clear message if missing
- Check for missing `try/catch` around PTY spawn, WebSocket operations, or any external process execution
- Environment variable access: `process.env.ANTHROPIC_API_KEY` must never be logged, returned in API responses, or included in error messages

### PTY / Terminal Safety
- Any code passing user input to `node-pty` must never interpolate raw strings into shell command arguments
- PTY session cleanup: confirm `ptyProcess.kill()` is called in all error/disconnect paths, not just the happy path
- New terminal routes must validate session ownership before executing commands

### WebSocket / Socket.IO
- New Socket.IO event handlers must check authentication before processing
- Event names must follow existing pattern: `noun:verb` (e.g., `terminal:input`, `bridge:connect`)
- Timeout for long-running operations must be >= 120000ms (2 minutes) — Claude Code sessions frequently exceed 60s

### Async Operations
- Checkpoint saves and session summary operations must be async/background — never block the request/event loop
- Long-running AI calls must use streaming where possible; blocking responses will trigger client timeouts

## Style Preferences

- TypeScript: strict mode, no `any` — use `unknown` if type is genuinely unknown
- File size: keep files under 300 lines; suggest splitting if a PR pushes past this
- Imports: group external → internal → relative; remove unused imports
- Error responses: `{ error: string, code?: string }` format — consistent across all API routes
- Socket.IO event acknowledgments: always include `{ success: boolean, error?: string }` shape

## What to Skip / Don't Flag

- `exports/` directory — auto-generated session exports, ignore entirely
- `summaries/` directory — auto-generated session summaries, ignore entirely
- `node_modules/`, `.next/`, `dist/` — never review generated/built files
- `package-lock.json` — flag only if `package.json` changed without a corresponding lock update
- In-memory auth Maps (`bridgeConnections`, `bridgeAuth`) — known alpha limitation, documented. Only flag if a PR moves these toward production use without persistence
- SHA-256 userId derivation from sessionId — known alpha placeholder, flagged in code with TODO. Only raise if a PR removes the TODO without adding real auth

## Architecture Reminders

- Bridge pattern: Web IDE → Socket.IO → Bridge CLI → PTY → Claude Code CLI. Changes that bypass the bridge (e.g., direct CLI execution from the server) break local-first security — always flag
- The server is a unified process (Next.js + Socket.IO + PTY). New background services must use the existing try/catch optional-load pattern to avoid crashing the server on import failures
- Memory optimizer is configured for 1500MB production / 2048MB dev. New services with heavy in-memory state should document their memory profile
