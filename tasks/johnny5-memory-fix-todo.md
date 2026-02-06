# Johnny5 Memory Fix - Personal Queries Not Working

## Root Cause Analysis (FINAL)

### The Real Problem
Personal queries like "what's my favorite color?" are routed to Gemini mode (by design in `query-classifier.ts`). Gemini mode injects memory via `buildMemoryContext()` which reads from:

1. `extracted_facts` table → **0 records** (extraction disabled)
2. `user_profile.preferences` → **`{}`** (empty on production)
3. ManusLive USER.md/MEMORY.md → **Not installed on production**

**Result: Zero personal data is available to ANY mode on production.**

### Why `extracted_facts` is Empty
`fact-extraction-service.ts:106-113` — `getGeminiClient()` checks for `GEMINI_API_KEY`. If missing, returns `null`, and `extractFactsFromConversation()` silently returns `[]`. The error is swallowed by `setImmediate()` async wrapper.

### Why Bridge Logs Showed Personal Data
The bridge logs from Feb 4 showed "Name: Mike" and "Favorite color: Cyan blue" because the bridge was connecting to **localhost:3001** (dev server), where ManusLive IS installed at `~/.manuslive/workspace/USER.md`. On production (Render), ManusLive is not available.

### Previous Fixes (Still Needed but Not the Issue)
- Shell escaping fix in `claude-executor.js` — Needed for coding queries through bridge
- Mode polling in `ChatTab.tsx` — Needed for Limited Mode banner

## Plan

- [x] **Fix 1: Add regex-based fact extraction fallback** — Critical — DONE
  - In `fact-extraction-service.ts`, added `extractFactsWithRegex()` function (105 lines)
  - When Gemini API is unavailable, extracts facts via 15 regex patterns
  - Catches: name, favorite color, role, location, goals, projects, tech stack, likes, etc.
  - Returns `ExtractedFact[]` with appropriate confidence scores (0.7-0.95)
  - Modified `extractFactsFromConversation()` to call regex fallback instead of returning `[]`

- [x] **Fix 2: Deploy bridge CLI fix locally** — DONE
  - Copied fixed `claude-executor.js` to `~/.coder1/lib/node_modules/coder1-bridge/src/`

### Build Verification
- [x] `npx next build` compiles successfully (exit code 0)
- [x] All pages generate correctly

## Files to Modify

| File | Change |
|------|--------|
| `services/memory/fact-extraction-service.ts` | Add regex fallback for fact extraction |
| `~/.coder1/lib/node_modules/coder1-bridge/src/claude-executor.js` | Copy fixed version |

## Review

### Changes Made

**`services/memory/fact-extraction-service.ts` — added `extractFactsWithRegex()` (new function, ~105 lines)**

Before: When `GEMINI_API_KEY` was missing, `extractFactsFromConversation()` logged a warning and returned `[]`. Every conversation's personal facts were silently discarded.

After: When Gemini is unavailable, the regex fallback scans USER messages for 15 patterns:
- Name: "my name is X", "call me X", "I'm X,"
- Favorite color: "my favorite color is X"
- Dynamic favorites: "my favorite X is Y" (generates `favorite_food`, `favorite_movie`, etc.)
- Role: "I'm a developer", "I work as a..."
- Location: "I'm from X", "I live in X"
- Goals: "my goal is X", "I'm trying to X"
- Projects: "I'm working on X", "my company is X"
- Preferences: "I like X", "I prefer X"
- Technical: "I use X", "I code in X"

Each pattern has a confidence score (0.7-0.95). The function deduplicates against existing facts and previously seen keys.

**`~/.coder1/lib/node_modules/coder1-bridge/src/claude-executor.js` — file copy**

Copied the fixed version (with `/bin/sh -c` approach) from the git repo to the local bridge installation. This fixes the shell escaping bug for coding queries that go through the bridge.

### How It Works End-to-End

1. User sends "my favorite color is cyan blue" to Johnny5
2. Query classified as personal → routed to Gemini/fallback
3. Response generated (via Gemini, Claude CLI, or Anthropic API fallback)
4. After response, `setImmediate()` triggers fact extraction
5. `extractFactsFromConversation()` called → Gemini unavailable → regex fallback
6. Regex matches "my favorite color is cyan blue" → `{type: 'preference', key: 'favorite_color', value: 'cyan blue', confidence: 0.95}`
7. `saveFacts()` writes to `extracted_facts` table
8. Next time user asks "what's my favorite color?":
   - `buildMemoryContext()` → `getRelevantFacts('favorite color')` → finds the stored fact
   - Injects "## What I Know About You\n**Preferences:**\n- favorite_color: cyan blue" into prompt
   - Johnny5 responds with the remembered fact

### Important Note
This fix works going FORWARD. For previously told facts (before this fix), the user will need to re-tell Johnny5 once. The first message after deployment will trigger extraction, and subsequent queries will find the stored fact.
