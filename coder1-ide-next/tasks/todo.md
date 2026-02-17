# Fix Johnny5 System Prompt — Skills Awareness + Proactive Capabilities

## Problem 1: Johnny5 Doesn't Know Its Skills

Johnny5 (in the Coder1 IDE chat panel) doesn't know about its configured skills. When asked "what skills do you have?", Johnny5 says it doesn't have a pre-populated list. The 51 loaded skills aren't reaching the model.

### Root Cause

Two issues in `app/api/johnny5/chat/route.ts`:

**Issue 1A: Skills are last in context, first to be truncated.** The `contextParts` array is: facts → memory → terminal → crew → **skills (last)**. Then truncated to 8000 chars from the end. Skills get cut.

**Issue 1B: Skills are in the user message, not the system prompt.** The system prompt (`generateJohnny5SystemPrompt()`) describes personality, living files, and capabilities — but never mentions skills. So even if skills survived truncation, Johnny5 doesn't understand them as a core capability.

## Problem 2: Johnny5 Denies Its Proactive Capabilities

When asked "what proactive things will you do tonight?", Johnny5 says: "I'm in a synchronous chat... I cannot perform actions tonight." But the server IS running proactive infrastructure:

- Heartbeat Service: 30s pulse + 5min deep checks (running)
- Cron Service: "Daily Morning Brief" at 9am, "Trend Monitor Check" 5x/day (running)
- Background Executor: 30s polling, 2 concurrent tasks (running)
- Opportunity Engine: proactivity level=high (running)
- Telegram Bot: connected as @Johnny5001_bot (running)

### Root Cause

Lines 484-495 of the system prompt explicitly say:
```
IMPORTANT: You are in a synchronous chat. After your response, the conversation pauses until the user messages again. You CANNOT proactively follow up, check back, or report back later.
```

This instruction doesn't account for the server-level proactive services.

## Fix Plan

All changes in one file: `app/api/johnny5/chat/route.ts`

### Todo

- [x] 1. **Add skills list to `generateJohnny5SystemPrompt()`** — Added `skillsList?: string` parameter. When provided, adds a "Your Skills" section between capabilities and closing sections.
- [x] 2. **Remove Tier 1 list from `contextParts`** — The `## Available Skills` push removed from contextParts. Tier 1 now lives in system prompt only.
- [x] 3. **Move Tier 2/3 skill injection before memory in `contextParts`** — Skills loading and Tier 2/3 injection now happens FIRST in contextParts (before facts, memory, terminal, crew). Matched skill details survive the 8000 char truncation.
- [x] 4. **Update Gemini capabilities section** — Added "Use your skills library for specialized knowledge" to the CAN do list.
- [x] 5. **Make "Response Integrity" section mode-aware** — Replaced blanket "you cannot proactively follow up" with dynamic text that detects running services (`JOHNNY5_LIVING_FILES` → heartbeat, cron always runs, `TELEGRAM_BOT_TOKEN` → telegram). When proactive services are running, Johnny5 is told it CAN promise overnight work and morning briefs.
- [x] 6. **Test** — Both issues verified fixed.
- [x] 7. **Add review section** — Below.

## Review

### Changes Made (single file: `app/api/johnny5/chat/route.ts`)

**1. Function signature update (line 302)**
- `generateJohnny5SystemPrompt(mode, userId)` → `generateJohnny5SystemPrompt(mode, userId, skillsList?)`

**2. New "Your Skills" section (lines 469-483)**
- Added between `capabilitiesSection` and `closingSection`
- Only renders when `skillsList` is provided (non-empty)
- Tells Johnny5: "The Skills panel in the IDE shows these same skills"
- Tier 1 skills list is now in the system prompt (persistent, not truncated)

**3. Gemini capabilities (line 452)**
- Added: "Use your skills library for specialized knowledge (see 'Your Skills' section below)"

**4. Response Integrity rewrite (lines 506-519)**
- Before: "You are in a synchronous chat. You CANNOT proactively follow up."
- After: Dynamic based on `hasHeartbeat`, `hasCron`, `hasTelegram` env detection
- When services are running: "You CAN promise proactive overnight work and morning briefs — because the server handles it."
- Fallback for no services: Original synchronous chat text

**5. contextParts reordering (lines 1069-1153)**
- Skills loading moved BEFORE memory/terminal/crew context
- Tier 1 list stored in `skillsListForPrompt` (passed to system prompt)
- Tier 2/3 details still pushed to `contextParts` (first items, survive truncation)
- Memory, terminal, crew context follow after

**6. System prompt call updated (line 1251)**
- `generateJohnny5SystemPrompt(johnny5Mode, userId)` → `generateJohnny5SystemPrompt(johnny5Mode, userId, skillsListForPrompt)`

### Verification

**Skills test**: "What skills do you have?" → Johnny5 lists all 51 skills by name and description.
- Server log: `[Johnny5/Skills] 51 skills available, 4 matched, 4848 tokens injected (Tier 1 in system prompt)`

**Proactivity test**: "What proactive things will you do tonight?" → Johnny5 confidently describes: Heartbeat deep checks every 5 minutes, morning brief at 9am, trend monitors, Telegram notifications. No more "I'm in a synchronous chat" denial.

### What Was NOT Changed

- Skill matching logic (`matchSkillsToQuery`) — untouched
- Tier 2/3 loading logic — untouched, just reordered in contextParts
- 8000 char truncation limit — unchanged
- `ENABLE_SKILLS_SYSTEM` feature flag — still gates everything
- J5 path skills injection (lines 722-736) — unchanged (J5 currently disabled)
- No new dependencies, no new files
