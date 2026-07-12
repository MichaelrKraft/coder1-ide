# Phase 4 — Bridge argv redesign (eliminate the shell-string parser)

**Goal:** stop sending an executable shell *string* from server → bridge and running it via `spawn('/bin/sh', ['-c', str])`. Instead carry a structured **argv array** (`['--print', '--session-id', id, prompt]`) and spawn `claude` directly with `shell:false`. This removes the entire class of quoting/injection bugs (the two the automated reviews found in the C3 guard, plus the server-side `"${prompt}"` interpolation bugs) at the root, rather than defending a string parser.

**Why this is the durable fix:** every current bug is a *string* problem — the server interpolates user data into a shell string, and the bridge re-parses it. With argv, no string is ever parsed as shell: user prompts become inert array elements. The C3 allowlist guard becomes a cheap belt (assert `argv[0]` context) instead of the sole defense.

---

## What the investigation found (grounding)

- **The argv pattern already exists in this codebase.** `services/claude-code-bridge.ts:821-831` already calls `tmuxService.executeInSandbox('claude', ['--print', '--output-format','json', '--session-id', agentSessionId, '--dangerously-skip-permissions', prompt])`. The string version right above it (`:816`) is **dead code** (`if (false && ...)`).
- **The bridge interactive path already spawns argv-style, no shell.** `bridge-cli/src/claude-executor.js:344` — `pty.spawn(this.claudePath, args, ...)`. Only the **non-interactive** path (`:610`, `spawn('/bin/sh', ['-c', shellCommand])`) uses a shell. That single line is the target.
- **`parseCommand()` (executor `:833`) is a naive re-tokenizer** — the Feb 2026 comment (`:557-562`) says it broke on multi-line prompts, which is *why* they switched non-interactive to raw `sh -c`. So "re-tokenize better" is not the fix; "never build a string" is.
- **Protocol carries one field:** `CommandRequest.command: string` (`services/bridge-manager.ts:39`), emitted at `:432-438` as `claude:execute { sessionId, commandId, command, context, stdinData }`. Documented in `bridge-protocol/README.md:107-111`.
- **~10 server-side string builders** interpolate user data into `claude ...` strings: `agent-runtime-service.ts:193`, `claude-code-bridge.ts:816,1903`, `claude-file-bridge.ts:353`, `claude-session-bridge.ts:253`, `johnny5-bridge-service.ts:580`, `johnny5/background-executor.ts:321`, `prd-prompt-injector.ts:164`, `server.js:1010,5521`. These are the sites that must emit argv.

---

## Design: additive, backward-compatible protocol

Add an OPTIONAL `argv: string[]` to the `claude:execute` payload. Bridge prefers `argv` when present; falls back to the legacy `command` string (through the existing C3 guard + `sh -c`) when absent. This lets us migrate call sites incrementally and roll back per-caller without a flag-day.

```
claude:execute {
  sessionId, commandId,
  command?: string,      // legacy — still guarded by isAllowedBridgeCommand
  argv?: string[],       // NEW — preferred; argv[0] is the first flag AFTER `claude`
  context, stdinData
}
```

Contract for `argv`: it is the argument list **after** the `claude` executable (matches the existing `executeInSandbox` shape and `executeInteractive`'s `args = parts.slice(1)`). The prompt is a single element — never concatenated, never quoted.

---

## Task list

### 1. Protocol + types (small, no behavior change)
- [ ] `services/bridge-manager.ts:36` — add `argv?: string[]` to `CommandRequest`; include it in the `:432` emit (`...(request.argv && { argv: request.argv })`).
- [ ] `bridge-protocol/README.md:107` — document `argv` and the "prefer argv, fall back to command" rule.

### 2. Bridge non-interactive path (the core fix)
- [ ] `bridge-cli/src/bridge-client.js` `handleClaudeCommand` (`:1220`) — if `data.argv` is present, validate it (array of strings, non-empty) and pass it through; skip the string allowlist for the argv path (argv can't shell-inject). Keep `isAllowedBridgeCommand(command)` for the legacy string path only.
- [ ] `bridge-cli/src/claude-executor.js:553` `executeNonInteractive` — accept an optional `argv`. When present, `spawn(this.claudePath, argv, { shell:false, cwd:'/tmp', env, stdio })` — mirror the existing interactive `pty.spawn(this.claudePath, args)` at `:344`. Keep the `--model` / `--add-dir` injection but do it on the **array** (push elements), not string replace.
- [ ] Interactive path (`:309`) — extend the same way: prefer `argv` over `parseCommand(command)`.
- [ ] `needsInteractiveMode` (`:178`) — teach it to read argv (e.g. interactive when argv is empty / lacks `--print`), so detection doesn't depend on the string.

### 3. Migrate server call sites to emit argv (incremental — one per PR ideally)
Start with the highest-risk / most-used, each replacing string interpolation with an array:
- [ ] `services/claude-code-bridge.ts` — the agent execution path (the live one; the argv shape already exists at `:824-830`, just thread it to the bridge request instead of the string).
- [ ] `services/johnny5-bridge-service.ts:580`, `johnny5/background-executor.ts:321`.
- [ ] `services/claude-file-bridge.ts:353`, `claude-session-bridge.ts:253` (these interpolate `"${message}"`/`"${prompt}"` — highest injection value).
- [ ] `server.js:1010,5521`.
- [ ] Leave `agent-runtime-service.ts:193` etc. on the legacy path until verified; the fallback keeps them working.

### 4. Tighten once migration is done
- [ ] Once all live callers send argv, flip the bridge to **reject** the legacy `command` string path (return `claude:error`) so no shell path remains. Until then the C3 guard stays as the boundary for stragglers.
- [ ] Remove the dead string builder at `claude-code-bridge.ts:816` and the now-unused `parseCommand` if nothing calls it.

### 5. Tests
- [ ] Bridge: argv path spawns with `shell:false` and passes a prompt containing `$(…)`, `;`, backticks, newlines **verbatim** to a stubbed spawn (assert the arg array equals input, no shell interpretation).
- [ ] Server: each migrated builder produces the expected argv array for a prompt with shell metacharacters and quotes.
- [ ] Keep the existing C3 allowlist test for the legacy path until it's removed.

---

## Risks / watch-items
- **`--model` / `--add-dir` injection** currently mutates the string (`claude-executor.js:574-595`); must be reimplemented as array splicing or it'll silently stop working.
- **`stdinData` path** (large prompts piped via stdin) already bypasses shell arg escaping — make sure argv migration doesn't double-send the prompt (as an arg *and* on stdin). Check `useStdin` logic at `:607`.
- **The bridge ships as a `pkg` binary** — no new npm deps (that's why we hand-roll rather than add `shell-quote`). argv needs zero deps, which is a point in its favor.
- **Backward compat during rollout:** old bridge binaries in the wild won't understand `argv`. The server must keep sending `command` (string) too, OR gate argv-emit on a bridge-version handshake. Recommend: send BOTH `command` and `argv` during migration; new bridges prefer argv, old bridges use command. Verify the bridge reports a version the server can read.

## Estimated size
Steps 1-2 (protocol + bridge core): ~half day, self-contained, shippable alone with the fallback. Step 3 (call-site migration): incremental, ~1-2 hrs per cluster. Step 4 (remove shell path): small, gated on step 3 completion + live verification.
