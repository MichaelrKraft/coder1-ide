# Agent Hub Phase 3 — Runs Panel + Live Streaming + Git Diff + Approvals

## Todo

- [x] Step 1: Expand `lib/agent-hub/runs.ts` — add `listRuns`, `RunLogChunk`, `getRunLogChunks`
- [x] Step 2: Create `lib/agent-hub/git-tracker.ts` — uses child_process (no simple-git)
- [x] Step 3: Create `lib/agent-hub/zombie-detector.ts`
- [x] Step 4: Create `lib/agent-hub/telegram-notifications.ts`
- [x] Step 5a: Create `app/api/agent-hub/runs/route.ts` (GET list)
- [x] Step 5b: Create `app/api/agent-hub/runs/[id]/route.ts` (GET detail + log chunks)
- [x] Step 5c: Create `app/api/agent-hub/runs/[id]/approve/route.ts` (POST approve)
- [x] Step 5d: Create `app/api/agent-hub/runs/[id]/reject/route.ts` (POST reject)
- [x] Step 5e: Create `app/api/cron/zombie-runs/route.ts` (GET cron)
- [x] Step 6: Update `server.js` — add run:join/leave, Telegram notification after agent:complete
- [x] Step 7a: Create `components/agent-hub/runs/RunStatusChip.tsx`
- [x] Step 7b: Create `components/agent-hub/runs/RunList.tsx`
- [x] Step 7c: Create `components/agent-hub/runs/RunViewer.tsx`
- [x] Step 7d: Create `components/agent-hub/runs/RunApproval.tsx`
- [x] Step 8a: Update `app/ide/agent-hub/runs/page.tsx`
- [x] Step 8b: Update `app/ide/agent-hub/runs/[id]/page.tsx`

## Key Decisions
- No simple-git in package.json → use child_process.execSync
- @xterm/xterm ^5.5.0 available
- @monaco-editor/react ^4.7.0 available
- getSocket() is async (returns Promise<Socket>)
