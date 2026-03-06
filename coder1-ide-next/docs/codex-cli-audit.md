# Codex CLI Interface Audit — Phase 3 Preparation

## Overview

OpenAI Codex CLI is a coding agent that runs locally. Built in Rust, open source, installable via `npm i -g @openai/codex` or `brew install --cask codex`.

## Commands

| Mode | Command | Purpose |
|---|---|---|
| Interactive | `codex` | Full-screen TUI |
| Non-interactive | `codex exec "prompt"` (alias: `codex e`) | Headless, for scripts/CI/orchestration |
| Resume | `codex resume --last` | Continue previous session |
| MCP Server | `codex mcp-server` | Run Codex as MCP server over stdio |

## Key Flags for Integration

```bash
codex exec --json --full-auto --ephemeral --model gpt-5-codex "prompt"
```

| Flag | Purpose | Coder1 Usage |
|---|---|---|
| `--json` | JSONL streaming output | Parse events for response text |
| `--full-auto` | No approval prompts | Required for headless operation |
| `--ephemeral` | Don't persist session file | Coder1 manages its own sessions |
| `--model, -m` | Model override | Map from useModelStore |
| `--path` | Set working directory | Pass project path |
| `--sandbox` | `read-only\|workspace-write\|danger-full-access` | Use workspace-write |
| `-o <path>` | Write final message to file | Alternative to JSONL parsing |

## JSONL Streaming Format

When `--json` is enabled, stdout emits newline-delimited JSON events:

```jsonl
{"type":"thread.started","thread_id":"0199a213-81c0-7800-8aa1-bbab2a035a53"}
{"type":"turn.started"}
{"type":"item.started","item":{"id":"item_1","type":"command_execution","command":"bash -lc ls","status":"in_progress"}}
{"type":"item.completed","item":{"id":"item_3","type":"agent_message","text":"Response text here."}}
{"type":"turn.completed","usage":{"input_tokens":24763,"cached_input_tokens":24448,"output_tokens":122}}
```

### Event Types

| Event | When | Key Fields |
|---|---|---|
| `thread.started` | Session begins | `thread_id` |
| `turn.started` | Reasoning cycle begins | — |
| `turn.completed` | Cycle ends | `usage.input_tokens`, `usage.output_tokens` |
| `turn.failed` | Error during cycle | error details |
| `item.started` | Action begins | `item.id`, `item.type`, `item.command` |
| `item.completed` | Action ends | `item.id`, `item.type`, `item.text` |

### Item Types

- `agent_message` — The AI's text response (extract `item.text`)
- `command_execution` — Shell command run
- `file_change` — File modification
- `reasoning` — Internal reasoning step
- `mcp_tool_call` — MCP tool invocation
- `web_search` — Web search action
- `plan_update` — Plan modification

**To get the response text**: Filter for `item.completed` events where `item.type === "agent_message"` and read `item.text`.

## Authentication

| Method | Details |
|---|---|
| `CODEX_API_KEY` env var | Preferred for `codex exec`. Set as CI secret. |
| `OPENAI_API_KEY` env var | Works but has known issues with interactive mode |
| `codex login` | Interactive OAuth / device auth / API key via stdin |
| Config file | `~/.codex/config.toml` with `env_key` for custom providers |

## Comparison with Claude Code CLI

| Feature | Claude Code | Codex CLI |
|---|---|---|
| Command | `claude --print` | `codex exec` |
| Streaming flag | `--output-format stream-json` | `--json` |
| Event format | Claude-specific JSON objects | JSONL with `thread.*`, `turn.*`, `item.*` |
| Response extraction | Parse Claude stream events | Filter `item.completed` with `type: "agent_message"` |
| Auth env var | `ANTHROPIC_API_KEY` | `CODEX_API_KEY` |
| Config location | `~/.claude/` | `~/.codex/config.toml` |
| Commands path | `~/.claude/commands/` | None (no equivalent concept) |
| Skills path | `~/.claude/skills/` | None |
| MCP support | Consumer only | Both server and consumer |
| Auto mode | N/A (always autonomous in --print) | `--full-auto` |
| Session resume | `claude --resume` | `codex resume --last` |

## CodexCliService Implementation Plan

### Detection
```typescript
// Check if codex is installed
const result = execSync('which codex 2>/dev/null || echo ""');
const installed = result.toString().trim().length > 0;

// Check version
const version = execSync('codex --version').toString().trim();

// Check auth
const hasAuth = !!process.env.CODEX_API_KEY || !!process.env.OPENAI_API_KEY;
```

### Send Message
```typescript
// Non-interactive execution with JSONL output
const command = `codex exec --json --full-auto --ephemeral --path "${projectPath}" "${escapedPrompt}"`;

// Parse JSONL output to extract response
const lines = stdout.split('\n').filter(Boolean);
const agentMessages = lines
  .map(line => JSON.parse(line))
  .filter(event => event.type === 'item.completed' && event.item?.type === 'agent_message');

const response = agentMessages.map(e => e.item.text).join('\n');
```

### Token Usage
```typescript
// Extract from turn.completed event
const turnCompleted = events.find(e => e.type === 'turn.completed');
const tokens = turnCompleted?.usage || { input_tokens: 0, output_tokens: 0 };
```

### Provider Config
```typescript
{
  name: 'Codex CLI',
  command: 'codex',
  execCommand: 'codex exec',
  authEnvVar: 'CODEX_API_KEY',
  fallbackAuthEnvVar: 'OPENAI_API_KEY',
  configPath: '~/.codex/config.toml',
  commandsPath: null,  // Codex has no commands concept
  skillsPath: null,    // Codex has no skills concept
}
```

## Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| JSONL format changes | LOW | Codex is versioned, format is stable |
| Auth complexity | LOW | Simple env var check |
| No commands/skills | MEDIUM | Discover Panel hides these for Codex users |
| `codex exec` blocking | LOW | Use child_process.spawn with timeout |
| GitHub issue #4219 (orchestration) | LOW | `codex exec --json` already provides what we need |

## Conclusion

The Codex CLI interface is well-documented, stable, and significantly different from Claude Code — but the differences are all manageable. The JSONL streaming format is cleaner than Claude's proprietary stream-json. Authentication is straightforward via env vars. The main gap is that Codex has no commands/skills concept, so the Discover Panel will need to hide those sections for Codex users (already handled with `providerTag` in Phase 2B).

**Verdict: Phase 3 can proceed. No blocking issues found.**
