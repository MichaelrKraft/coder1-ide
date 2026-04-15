# Coder1 Power Pack — Design Spec

**Date**: 2026-04-07  
**Status**: Approved for implementation

---

## Context

New Coder1 customers arrive with a blank Claude Code setup and immediately run into common AI coding problems: context blowout after 30 minutes, runaway builds, repeated retry loops, and Claude forgetting earlier decisions. Mike (the founder) has a heavily curated personal Claude Code setup that prevents all of these — context-mode MCP, a CLAUDE.md with guardrails, smart hooks, git-mcp, and coding rules. This feature packages that expertise and delivers it to every Coder1 customer.

---

## What We're Building

A **"Coder1 Power Pack"** — a featured bundle in the existing Templates Hub that installs a curated Claude Code configuration onto the customer's local machine via the bridge.

---

## Bundle Contents (Default Pack)

| Item | What it does | Install target |
|------|-------------|----------------|
| **context-mode MCP** | Reduces tool output 99%, extends sessions 6× | `~/.mcp.json` |
| **Coder1 CLAUDE.md** | Loop prevention, build safety, response style defaults | `~/.claude/CLAUDE.md` (appended) |
| **Smart hooks** | Session tracking, runaway build prevention | `~/.claude/settings.json` |
| **git-mcp** | Native git ops for Claude without shell spawning | `~/.mcp.json` |
| **Coding rules** | TypeScript, git workflow, security, testing standards | `~/.claude/rules/` |

---

## Delivery Flow

```
Customer pairs bridge (first time)
    → Toast notification in IDE: "Set up your Claude Code environment → Templates Hub"
    → Customer clicks → Templates Hub opens
    → Featured "Coder1 Power Pack" card at top
    → Customer sees checklist of what will be installed
    → Clicks "Install" → bridge executes `coder1-bridge setup --power-pack`
    → Bridge checks for conflicts, installs only what's missing
    → Success notification in IDE
```

---

## Conflict Rules (Non-Destructive Install)

1. **MCP servers**: Check `~/.mcp.json` before writing. If a server with the same name already exists, **skip it** — never overwrite.
2. **CLAUDE.md**: If `~/.claude/CLAUDE.md` already exists, **append** a clearly marked `# Coder1 Power Pack` section to the bottom. Never replace.
3. **Hooks**: Merge new hooks into existing `~/.claude/settings.json` hooks arrays. Never overwrite existing hooks.
4. **Rules files**: Only write files that don't already exist in `~/.claude/rules/`.

---

## Templates Hub Integration

The Power Pack is added to the existing `public/templates-hub.html` as a **featured card** at the top of the template grid:

- Category: "Power Packs" (new category, appears first)
- Install command: `coderone install power-pack`
- UI: Uses the existing template card pattern, with an expanded checklist view on click
- The checklist matches the design we prototyped: inline title + description, cyan checkboxes, amber row for skipped items

---

## First-Run Nudge

When the bridge pairs successfully for the first time (detected server-side via `bridgeConnections` map — first-time pairing has no prior session):

- Show a **toast notification** in the IDE: "Welcome to Coder1! Set up your Claude Code environment in the Templates Hub."
- Toast includes a "Go to Templates Hub" button linking to `/templates-hub.html#power-pack`
- Shows once only — dismissed or acted on, never shown again

---

## Bridge CLI Changes

Add a new command: `coder1-bridge setup --power-pack`

This command:
1. Reads the Power Pack manifest from the Coder1 server (so the bundle can be updated server-side)
2. Runs conflict detection for each item
3. Installs non-conflicting items
4. Returns a JSON result: `{ installed: [...], skipped: [...], errors: [...] }`
5. The IDE displays the result in a success/partial panel

---

## Coder1 CLAUDE.md Template Contents

The appended section will include:

```markdown
# Coder1 Power Pack

## Loop Prevention
- If the same action fails 3+ times, stop and report — do not retry
- Never retry a failing build more than 2 times — report instead

## Build Safety
- Check for running builds before starting: pgrep -f "next build"
- Never run concurrent build processes
- Prefer npm run dev over npm run build for development

## Response Style
- No trailing summaries after completing work
- Lead with the answer, not the reasoning
- Keep responses short and direct

## Context-Mode Routing
- Use ctx_execute for bash commands producing >20 lines of output
- Use ctx_execute_file for file analysis (not editing)
- Use ctx_fetch_and_index for web content
```

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `public/templates-hub.html` | Add Power Pack card + "Power Packs" category |
| `bridge-cli/src/index.js` | Add `setup --power-pack` command |
| `bridge-cli/src/power-pack-installer.js` | New file: conflict detection + file writing logic |
| `server.js` | Detect first-time bridge pairing, emit `first-bridge-connect` event |
| `components/` (TBD) | First-run toast notification component |
| `public/power-pack/` | New dir: CLAUDE.md template, rules files, hooks config |

---

## Out of Scope (Phase 2)

- Full marketplace with browsable extras beyond the Power Pack
- Memory system scaffold (optional, can be a separate template)
- Per-tier gating (all customers get the Power Pack)
- Automated update mechanism for installed configs

---

## Verification

1. Fresh bridge pairing → first-run toast appears in IDE
2. Click toast → Templates Hub opens, Power Pack card is featured at top
3. Click Install → checklist shows all 5 items pre-checked
4. Install completes → `~/.mcp.json` has context-mode and git-mcp entries
5. Install on machine with existing context-mode → that item shows as skipped (amber row)
6. `~/.claude/CLAUDE.md` has `# Coder1 Power Pack` section appended (original content preserved)
7. `~/.claude/rules/` contains the 4 rules files
