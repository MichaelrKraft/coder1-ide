# Hook Development Guide for Claude Code Plugins

## Purpose

Hooks are event-driven automation scripts that execute in response to Claude Code system events. They enable validation, policy enforcement, context loading, and workflow automation throughout the development lifecycle.

## When to Use This Skill

- Creating event-driven automation for Claude Code
- Implementing pre-tool validation or post-tool analysis
- Setting up session start/end handlers
- Building workflow automation triggers
- Configuring webhook-style integrations

---

## Quick Reference

| Hook Type | Best For | Speed |
|-----------|----------|-------|
| Prompt-Based | Complex reasoning, context-aware validation | ~2-4s |
| Command Hooks | Deterministic checks, file operations | ~30-150ms |

---

## Hook Types

### Prompt-Based Hooks (Recommended)

Use LLM-driven decision making for context-aware validation. Works with Stop, SubagentStop, UserPromptSubmit, and PreToolUse events.

**Advantages**:
- Flexible logic without bash scripting
- Natural language reasoning
- Context-aware decisions

### Command Hooks

Execute bash scripts for deterministic checks, file operations, and external tool integrations.

**Best For**:
- Performance-critical validations
- Simple pattern matching
- External tool integration

---

## Available Events

| Event | Trigger | Primary Use |
|-------|---------|-------------|
| `PreToolUse` | Before tool execution | Approve, deny, or modify tool calls |
| `PostToolUse` | After tool completion | Analyze results and provide feedback |
| `Stop` | Agent considers stopping | Validate task completeness |
| `UserPromptSubmit` | User input submission | Add context or block prompts |
| `SessionStart` | Session begins | Load project context and environment |
| `SessionEnd` | Session terminates | Cleanup and state preservation |
| `SubagentStop` | Subagent completion | Ensure subagent task fulfillment |
| `PreCompact` | Before context compression | Preserve critical information |
| `Notification` | User notifications sent | Reactive logging or notifications |

---

## Configuration Formats

### Plugin hooks.json (Wrapper Format)

For plugin-based hooks, use a wrapper object:

```json
{
  "description": "Optional explanation of hooks purpose",
  "hooks": {
    "PreToolUse": [...],
    "Stop": [...]
  }
}
```

### User settings.json (Direct Format)

For user settings, use direct top-level event definitions:

```json
{
  "PreToolUse": [...],
  "Stop": [...]
}
```

**Key Distinction**: Plugin hooks require the `hooks` wrapper field; user settings use direct top-level events.

---

## Output Structure

Hooks return standardized JSON responses:

```json
{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": "Message for Claude to process"
}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success - stdout shown to user |
| 2 | Blocking error - stderr fed back to Claude |

---

## Tool Matching Patterns

| Pattern Type | Example | Matches |
|--------------|---------|---------|
| Exact | `"matcher": "Write"` | Only Write tool |
| Multiple | `"matcher": "Read\|Write\|Edit"` | Any of the three |
| Wildcard | `"matcher": "*"` | All tools |
| Regex | `"matcher": "mcp__.*__delete.*"` | MCP delete operations |

### Example Configuration

```json
{
  "PreToolUse": [
    {
      "matcher": "Write|Edit",
      "command": "${CLAUDE_PLUGIN_ROOT}/scripts/validate-write.sh"
    }
  ]
}
```

---

## Environment Variables

Available in all command hooks:

| Variable | Description |
|----------|-------------|
| `$CLAUDE_PROJECT_DIR` | Project root path |
| `$CLAUDE_PLUGIN_ROOT` | Plugin directory (for portable references) |
| `$CLAUDE_ENV_FILE` | SessionStart only: persist environment variables |

**Critical**: Always use `${CLAUDE_PLUGIN_ROOT}` in hook commands for portability across installations.

---

## Security Essentials

### Required Practices

1. **Validate all inputs**: Never trust incoming data
2. **Check for path traversal**: Prevent `../` attacks
3. **Deny sensitive file access**: Block `.env`, credentials
4. **Quote all bash variables**: Prevent injection

### Example Secure Hook

```bash
#!/bin/bash
INPUT="$1"
if [[ "$INPUT" == *".."* ]]; then
  echo "Path traversal detected" >&2
  exit 2
fi

if [[ -f "$INPUT" ]]; then
  echo "File exists: $INPUT"
fi
```

---

## Hook Lifecycle

### Critical Limitation

Hooks load at session startup. Changes to hook configuration require restarting Claude Code.

Editing hook files mid-session has no effect.

---

## Debugging

### Enable Debug Mode

```bash
claude --debug
```

### Test Command Hooks Directly

```bash
echo '{"tool": "Write", "path": "/test.js"}' | ./scripts/my-hook.sh | jq
```

---

## Common Hook Patterns

### Pre-Write Validation

```json
{
  "PreToolUse": [
    {
      "matcher": "Write",
      "command": "${CLAUDE_PLUGIN_ROOT}/scripts/validate-write.sh"
    }
  ]
}
```

### Session Context Loading

```json
{
  "SessionStart": [
    {
      "command": "${CLAUDE_PLUGIN_ROOT}/scripts/load-context.sh"
    }
  ]
}
```

### Stop Validation

```json
{
  "Stop": [
    {
      "prompt": "Before stopping, verify all tests pass and documentation is updated."
    }
  ]
}
```

---

## Best Practices Summary

1. **Default to prompt-based hooks** for most scenarios
2. **Reserve command hooks** for performance-critical or deterministic validations
3. **Always use portable paths** with `${CLAUDE_PLUGIN_ROOT}`
4. **Quote all bash variables** to prevent injection
5. **Design for parallel execution** - hooks run independently
6. **Test with debug mode** before deploying
7. **Document hook behavior** in plugin README
8. **Restart Claude Code** after hook configuration changes
