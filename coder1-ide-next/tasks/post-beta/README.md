# Post-Beta Implementation Plans

This directory holds **approved plans that are deliberately parked until after beta**. Each file is a complete, ready-to-execute implementation spec with context, approach, files to modify, and verification steps.

**When to look here:**
- You just shipped beta and are picking the next feature.
- You're doing a quarterly planning session and need to see what's queued.
- A topic comes up in conversation and you think "didn't we already plan this?"

**When NOT to look here:**
- For active beta blockers → see `tasks/beta-readiness-todo.md` and the numerous `*-fix-*.md` files in the parent `tasks/` directory.
- For brainstorming or unresolved ideas → those don't belong here. Every file in this directory is an **approved** plan awaiting execution.

## How to use a plan in this directory

1. Read the full file.
2. Verify the "Files to Reuse" references still exist at the line numbers cited (code may have moved — check and update before executing).
3. Execute top-to-bottom; run the verification steps.
4. Move the file to `tasks/completed/` (or delete) and append a summary to `tasks/todo.md`.

## Parked plans

| Plan | Status | Origin | Estimated scope |
|------|--------|--------|-----------------|
| [event-bus-hooks.md](./event-bus-hooks.md) | 🅿️ Parked 2026-04-09 | Fareed Khan harness engineering article | 5 files (2 new, 3 modified), zero new deps |

---

*Add new parked plans by writing the file here and appending a row to the table above.*
