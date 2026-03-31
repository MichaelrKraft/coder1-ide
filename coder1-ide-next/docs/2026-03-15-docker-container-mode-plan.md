# Docker Container Mode for Coder1 IDE
**Date:** 2026-03-15
**Status:** Parked — revisit after beta is complete
**Trigger:** Article "Stop Babysitting Claude Code" by kevinMEH (March 2026)

---

## The Problem This Solves

Claude Code constantly interrupts with "Do you want to proceed?" prompts during complex tasks.
The choice today is: babysit Claude, or risk giving it full permissions on your actual machine.

Docker container mode gives Claude Code **full permissions with zero interruptions**, safely isolated
so that even `rm -rf /` inside the container can't touch your Mac.

---

## What Already Exists in Coder1

Two sandbox systems exist — neither solves this specific problem:

### System 1: SandboxPreviewService (complete)
- Runs parallel dev servers on ports 4001-4010
- Purpose: previewing code outputs, not terminal isolation

### System 2: Enhanced TMUX Sandbox (~85% complete)
- Creates a **copy** of project files in a sandbox directory
- Claude works on the copy, not the original
- "Promote" swaps the sandbox back to the real project (risky — no conflict detection)
- Key files: `services/enhanced-tmux-service.ts`, `lib/enhanced-tmux-server.ts`, `app/api/sandbox/route.ts`
- **Why it doesn't solve this:** Works on copies, not real files. Promote is a blunt file swap.

---

## The Docker Container Mode Approach

### How It Works

```
User toggles "Sandbox Mode ON" in Coder1 IDE
        │
        ▼
ContainerManager creates Docker container
  - Mounts: /your/project → /root/project (read-write)
  - Mounts: ~/.claude → /root/.claude (read-write)
  - Mounts: ~/.ssh → /root/.ssh (read-only, for git)
  - Container name: coder1-{project-name}-{path-hash}
        │
        ▼
Terminal opens (looks identical to today)
  - server.js spawns: docker exec -it {container} /bin/bash
  - Instead of: bash (on host)
        │
        ▼
Claude Code runs with --dangerously-skip-permissions
Zero approval prompts. Full autonomy.
Mac stays completely safe.
```

### What Changes vs Today

| Component | Change |
|---|---|
| `services/container-manager.ts` | **NEW** — docker run/exec/stop lifecycle |
| `server.js` | ~10 lines — PTY spawn conditional |
| `stores/useIDEStore.ts` | Add `sandboxMode` flag |
| `components/MenuBar.tsx` | Add sandbox toggle button |

### What Does NOT Change

- `Terminal.tsx` — zero changes
- `Terminal.css` — zero changes
- `lib/socket.ts` — zero changes
- `SandboxPreviewService` — zero changes
- `enhanced-tmux-service.ts` — zero changes

---

## Key Design Decisions

### PTY stays the same
`node-pty` wraps `docker exec` exactly the same way it wraps `bash`.
The entire terminal pipeline (xterm.js, Socket.IO, session management) is unchanged.
Docker exec IS a PTY.

### Container persistence
Containers are named deterministically: `coder1-{project-name}-{path-hash}`
- First open: `docker run` creates the container
- Subsequent opens: `docker start` resumes it
- State (installed packages, shell history) persists between sessions

### Port forwarding
When Claude runs `npm run dev` inside the container, map ports 4001-4010:
```
docker run -p 4001-4010:4001-4010 ...
```
Preview panel connects to forwarded ports as normal.

---

## Downsides (Be Honest When Pitching This)

1. **Docker Desktop required** — 500MB install dependency. Can't hide this.
2. **File I/O 3-5x slower on Mac** — Docker uses a VM on macOS. Use `cached` mounts + named volumes for node_modules to mitigate.
3. **Port forwarding for dev servers** — requires coordination with SandboxPreviewService ports.
4. **Orphaned containers** — need cleanup logic on crash/restart. ~50MB each.
5. **Mac/Linux only initially** — Windows Docker has extra complexity.
6. **Network access still open** — Claude can still make external API calls, leak keys. Container doesn't prevent network-based issues.

---

## Competitive Angle

> "Run Claude Code fully autonomous with zero approval prompts — safely isolated in Coder1's Sandbox Mode."

Cursor doesn't have this. Windsurf doesn't have this. Directly addresses the #1 productivity complaint from Claude Code power users.

---

## Effort Estimate

| Task | Time |
|---|---|
| ContainerManager service | 1 day |
| Terminal routing (server.js) | 0.5 days |
| UI toggle + status indicator | 0.5 days |
| Error handling, cleanup, edge cases | 1 day |
| **Total** | **~3-4 days** |

---

## Verification Checklist

- [ ] Toggle Sandbox Mode ON → `docker ps` shows new container
- [ ] Terminal opens → prompt shows container shell
- [ ] Run `ls /` inside → no `~/Desktop` or other Mac dirs visible
- [ ] Run `rm -rf /tmp/testfile` inside → file gone from container, Mac untouched
- [ ] Close session → container stops cleanly
- [ ] Reopen same project → container resumes with state preserved
- [ ] Run `npm run dev` inside → preview panel loads via forwarded port
- [ ] Toggle OFF → terminal reverts to normal host PTY

---

## Related Files to Read Before Starting

- `server.js` — PTY spawning logic (the ~10 lines to change)
- `services/enhanced-tmux-service.ts` — reference for sandbox lifecycle patterns
- `stores/useIDEStore.ts` — where to add sandboxMode flag
- `components/MenuBar.tsx` — where to add the toggle
- `components/terminal/Terminal.tsx` — to confirm it needs no changes
