# Johnny5 Living Files — Preamble + MEMORY.md Cleanup

## Tasks
- [x] 1. Add structured preamble to system prompt in route.ts (line 321)
- [x] 2. Deduplicate corrupted MEMORY.md (106KB → 6.4KB)
- [x] 3. TypeScript compile check — passes (only pre-existing test-helpers.ts errors)
- [x] 4. Review section

## Review

### What changed (Feb 12, 2026)

**Problem**: Johnny5 was hallucinating non-existent files ("rules.md", "proactivegoals.md", "projectcontext.md") and telling users that files needed to be created, APIs needed to be built, and a heartbeat scheduler needed to be set up — all of which already existed. Root cause: the system prompt dumped living file content as raw `## FILENAME` blocks with no framing or instructions.

**Files modified (2):**

1. `app/api/johnny5/chat/route.ts` (line 321) — Added a structured preamble before living file content injection. Includes:
   - Table listing all 9 files with their mode (readonly/auto-updated/writable/auto-generated) and purpose
   - Explanation of how file updates work (platform handles writes, not Johnny5)
   - Explicit list of what infrastructure is already running (heartbeat, memory search, file persistence)
   - 5 rules preventing hallucination of non-existent files and ensuring active use of USER.md facts

2. `~/.coder1/living-files/MEMORY.md` — Deduplicated corrupted file:
   - Before: 106KB, 1062 lines, only 56 unique (same 2 lines repeated ~500x each)
   - After: 6.4KB, 166 lines — 3 unique knowledge entries + 39 conversation summaries preserved
   - All legitimate dated entries (`### 2026-02-12 / User asked: ...`) kept in order

**Net effect:**
- Johnny5 now knows it has 9 files, what each one does, and how updates work
- Johnny5 will not ask users to create files/APIs/schedulers that already exist
- Johnny5 will actively reference USER.md facts in conversation
- MEMORY.md is clean and under the 6000-char truncation limit
- No behavior changes to existing chat flow — preamble is additive context only
