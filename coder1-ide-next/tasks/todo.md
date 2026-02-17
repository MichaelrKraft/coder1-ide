# Fix: MCP Tool Queries Routing to Gemini Instead of Bridge

## Tasks

- [x] Identify root cause: query classifier defaults `general` queries to `shouldUseBridge: false`
- [x] Fix routing in `app/api/johnny5/chat/route.ts` — flip default for non-memory queries when MCP enabled
- [x] Verify TypeScript compiles (no errors in chat/route.ts)
- [x] Discover config mismatch: `getAvailableMcpTools()` read `~/.mcp.json` (Claude Desktop) not `~/.claude.json` (Claude CLI)
- [x] Fix `getAvailableMcpTools()` to read from `~/.claude.json` (primary) with `~/.mcp.json` fallback
- [x] User action: add youtube, transcript-api, etc. to Claude Code CLI via `claude mcp add`
- [ ] Test end-to-end: "Transcribe this YouTube video" → Bridge → Claude CLI → MCP tool works

## Review

### Files Modified
1. **`app/api/johnny5/chat/route.ts`** (3 lines replace 1 line, ~line 1229)
   - Added `mcpEnabled` check from `JOHNNY5_BRIDGE_MCP_ENABLED` env var
   - Added `isGeminiOnlyQuery` guard for memory-critical categories (personal, hybrid, session_recall, deployment)
   - Updated `shouldUseBridgeForThisQuery` to route non-memory queries to Bridge when MCP is enabled

2. **`services/johnny5-bridge-service.ts`** (`getAvailableMcpTools()` rewritten)
   - Primary: reads from `~/.claude.json` mcpServers (what Claude CLI actually uses)
   - Fallback: reads from `~/.mcp.json` (Claude Desktop config)
   - Prevents telling Johnny5 about tools it can't actually use

### Root Cause Chain
1. Query "transcribe this YouTube video" → classifier returns `general` → `shouldUseBridge: false` → Gemini (no tools) **[FIXED: routing override]**
2. `getAvailableMcpTools()` read `~/.mcp.json` (8 servers) but Claude CLI reads `~/.claude.json` (1 server: gemini-cli) — Johnny5 was told about tools it couldn't use **[FIXED: reads correct config]**
3. YouTube, transcript-api etc. not in Claude CLI config → user needs to add via `claude mcp add` **[USER ACTION NEEDED]**
