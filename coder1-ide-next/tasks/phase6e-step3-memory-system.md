# Phase 6e Step 3: Agent Memory System

## Plan

- [x] 1. Add memory, memory_fts, and chat_messages tables to `lib/agent-hub/db.ts` `initializeSchema()`
- [x] 2. Create `lib/agent-hub/memory.ts` with store, recall (FTS5), list, clear, autoSummarize
- [x] 3. Create `app/api/agent-hub/agents/[id]/memory/route.ts` (GET with ?q= search, DELETE)
- [x] 4. Create `app/api/agent-hub/runs/[id]/summarize/route.ts` (POST)

## Notes
- Follow existing pattern: camelCase interface + snake_case Row type + rowToX mapper
- Next.js 14 params: `{ params }: { params: { id: string } }` (not Promise)
- uuid already available via `import { v4 as uuidv4 } from 'uuid'`

## Review
- Added 3 new tables to db.ts schema: agent_hub_memory, agent_hub_memory_fts (FTS5), agent_hub_chat_messages
- Created memory.ts following comments.ts pattern with MemoryRow + rowToMemory mapper
- Created two API routes following existing artifacts/[id] route pattern
- autoSummarize uses Haiku API with fallback to basic text summary
- FTS5 search sanitizes query input to prevent syntax errors
- Memory pruning caps at 100 entries per agent/user pair
