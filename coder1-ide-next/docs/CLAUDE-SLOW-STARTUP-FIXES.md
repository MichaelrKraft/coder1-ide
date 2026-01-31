# Claude Code Slow Startup Fixes

**Date**: January 27, 2026
**Issue**: Claude Code taking 45-60+ seconds to start in Coder1 IDE terminal

## Root Causes Identified

1. **Bloated eternal memory** - `~/.claude/history.jsonl` was 5.2MB with 7,656 entries
2. **Large project session files** - `~/.claude/projects/` had 3.5GB+ of old session transcripts
3. **Too many MCP servers** - 13 servers, many with placeholder credentials causing timeouts
4. **Debug file accumulation** - `~/.claude/debug/` had 1.1GB of old logs
5. **Session archives bloat** - `~/.claude/session-archives/` can grow to 1.5GB+ with old archived sessions

## Fixes Applied

### 1. Clear Eternal Memory History
```bash
# Backup first
cp ~/.claude/history.jsonl ~/.claude/history.jsonl.backup.$(date +%Y%m%d)

# Clear the bloated history
echo '[]' > ~/.claude/history.jsonl
```

### 2. Clean Project Session Files
```bash
# Remove large session files (>5MB)
find ~/.claude/projects -name "*.jsonl" -size +5M -delete

# Remove medium files (>2MB)
find ~/.claude/projects -name "*.jsonl" -size +2M -delete

# Remove old files (>3 days)
find ~/.claude/projects -name "*.jsonl" -mtime +3 -delete

# Target for main user directory: <100MB
du -sh ~/.claude/projects/-Users-*
```

### 3. Clean Debug Files
```bash
# Remove debug files older than 3 days
find ~/.claude/debug -mtime +3 -delete
```

### 4. Clean Session Archives (CRITICAL - can be 1.5GB+)
```bash
# Remove large archived transcripts (>1MB each)
find ~/.claude/session-archives -name "*.jsonl" -size +1M -delete

# Check size after cleanup
du -sh ~/.claude/session-archives/
```

### 4. Reduce MCP Servers
Edit `~/.mcp.json` to keep only essential, fast servers:

**REMOVE servers with:**
- Placeholder credentials (YOUR_API_KEY, YOUR_URL)
- npx downloads (sequential-thinking, playwright-mcp)
- Python/uv initialization (git, reddit)
- External service dependencies (supabase, n8n, context7)

**KEEP only:**
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": ["/Users/michaelkraft/mcp-servers/src/filesystem/dist/index.js"]
    },
    "coder1-intelligence": {
      "command": "node",
      "args": ["/path/to/coder1-intelligence/dist/index.js"]
    }
  }
}
```

### 5. Fix Settings.json Format Errors
Claude Code settings files must NOT have an outer `"hooks"` wrapper:

**WRONG:**
```json
{
  "hooks": {
    "Stop": [...]
  }
}
```

**CORRECT:**
```json
{
  "Stop": [
    {
      "matcher": "*",
      "hooks": [{"type": "command", "command": "echo done"}]
    }
  ]
}
```

Check these locations:
- `~/.claude/settings.json`
- `<project>/.claude/settings.json`

## Verification

After fixes, Claude should start in **under 10 seconds** with:
- No "X MCP servers failed" warnings
- No settings errors
- Single welcome box (no duplicates)

## Prevention

Add periodic cleanup to user's crontab:
```bash
# Weekly cleanup of old Claude session files
0 3 * * 0 find ~/.claude/projects -name "*.jsonl" -mtime +7 -delete
0 3 * * 0 find ~/.claude/debug -mtime +7 -delete
0 3 * * 0 find ~/.claude/session-archives -name "*.jsonl" -size +1M -delete
```

## Related Files
- `~/.mcp.json` - Global MCP server configuration
- `~/.claude/history.jsonl` - Eternal memory history
- `~/.claude/projects/` - Project session transcripts
- `~/.claude/debug/` - Debug logs
- `<project>/.claude/settings.json` - Project-specific hooks
