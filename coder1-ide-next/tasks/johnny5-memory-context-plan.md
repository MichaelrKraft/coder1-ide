# Johnny5 Memory & Context Improvement Plan

**Created:** 2026-02-18
**Goal:** Make Johnny5's memory feel genuinely useful in daily conversations
**Priority order:** Capture → Ranking → Morning Brief → Decay

---

## Architecture Reality Check (Read First)

Before implementing anything, here is what actually exists:

### Memory System (Two Parallel Paths)

**Path 1 — Living Files** (`lib/living-files.ts`, enabled by `JOHNNY5_LIVING_FILES=true`)
9 markdown files on disk that form Johnny5's persistent identity:
- `USER.md` (append) — everything about Mike
- `MEMORY.md` (append) — persistent facts & knowledge
- `SOUL.md` (readonly) — personality
- etc.

`appendToLivingFile()` already exists. This is the write mechanism for Second Brain.

**Path 2 — SQLite Fact Extraction** (`services/memory/fact-extraction-service.ts`)
AI-powered (Gemini Flash) extraction that runs after every conversation.
Stored in `extracted_facts` table: `user_id | session_id | fact_type | fact_key | fact_value | confidence | created_at`

> **Note:** `memory-context-builder.ts` is `@deprecated` — living files supersede it when the flag is on.

### Telegram Bot (`services/johnny5/telegram-bot.ts`)
- Full Telegraf implementation exists and is wired up
- Text messages are debounced and forwarded to the Johnny5 chat API
- **Gap:** No Second Brain capture mode — all messages go to chat, none to memory directly

### Chat Route (`app/api/johnny5/chat/route.ts`)
- Imports `saveFacts`, `extractFactsFromConversation` from `services/memory`
- Fact extraction runs non-blocking after each response
- Memory injection already works via `enableMemoryInjection: true` flag

---

## Step 0: Verify Memory Works End-to-End

**Before any new code, confirm the system works:**

```bash
# 1. Check if living files are enabled
grep JOHNNY5_LIVING_FILES /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/.env* 2>/dev/null

# 2. Check if facts DB has any data
sqlite3 ~/.coder1/johnny5.db "SELECT fact_type, fact_key, fact_value, created_at FROM extracted_facts ORDER BY created_at DESC LIMIT 10;"

# 3. Check if MEMORY.md exists and has content
cat ~/.coder1/living-files/MEMORY.md 2>/dev/null || echo "File not found"
cat ~/.coder1/living-files/USER.md 2>/dev/null || echo "File not found"
```

**Manual verification test:**
1. Open Johnny5 chat, say: "My favorite programming language is Elixir and I use a standing desk"
2. Start a new session
3. Ask: "What's my favorite programming language?"
4. If Johnny5 doesn't know → memory read path is broken, debug before proceeding

**Todo items:**
- [ ] Run Step 0 verification commands
- [ ] Confirm facts are being saved to SQLite after chat
- [ ] Confirm living files exist (or initialize them)
- [ ] Document which memory path is active (living files vs fact extraction)

---

## Step 1: Telegram Second Brain Capture (Priority #1)

**Why this first:** It gives the Second Brain an input stream and makes memory useful within 24 hours. Everything else (morning brief, decay) depends on having real data in memory.

### What Needs to Change

**File:** `services/johnny5/telegram-bot.ts`

**Current behavior:** Every text message → `queueMessage()` → `processMessage()` → Johnny5 chat API

**New behavior:**
- `/remember [text]` command → save to memory directly, skip chat
- Messages prefixed with `#idea`, `#book`, `#link`, `#task`, `#note` → save to memory + confirm
- All other messages → existing chat behavior (unchanged)

### Category Map
```
#idea  → MEMORY.md section "Ideas", fact_type: "goal"
#book  → MEMORY.md section "Books & Learning", fact_type: "preference"
#link  → MEMORY.md section "Links & Resources", fact_type: "technical"
#task  → MEMORY.md section "Tasks & TODOs", fact_type: "goal"
#note  → MEMORY.md section "Notes", fact_type: "personal"
/remember → MEMORY.md section "Memories", fact_type: "personal"
```

### Implementation

**New handler to add in `setupHandlers()` before the text handler:**

```typescript
// Second Brain: /remember command
this.bot.command('remember', async (ctx) => {
  const text = ctx.message.text.replace('/remember', '').trim();
  if (!text) {
    await ctx.reply('Usage: /remember [what to remember]');
    return;
  }
  await this.saveToSecondBrain(ctx.chat.id.toString(), 'note', text, ctx);
});
```

**New prefix detection at the TOP of the text `on('text')` handler:**

```typescript
this.bot.on('text', async (ctx) => {
  const message = ctx.message.text;

  // Second Brain prefix detection
  const PREFIX_MAP: Record<string, string> = {
    '#idea': 'idea',
    '#book': 'book',
    '#link': 'link',
    '#task': 'task',
    '#note': 'note',
  };

  const prefix = Object.keys(PREFIX_MAP).find(p => message.toLowerCase().startsWith(p));
  if (prefix) {
    const content = message.slice(prefix.length).trim();
    const category = PREFIX_MAP[prefix];
    const chatId = ctx.chat.id.toString();
    await this.saveToSecondBrain(chatId, category, content, ctx);
    return; // Don't forward to chat
  }

  // Existing chat handling (unchanged below)
  const chatId = ctx.chat.id.toString();
  // ...
});
```

**New `saveToSecondBrain()` private method:**

```typescript
private async saveToSecondBrain(
  chatId: string,
  category: string,
  content: string,
  ctx: any
): Promise<void> {
  try {
    // 1. Append to MEMORY.md living file
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const sectionMap: Record<string, string> = {
      idea: 'Ideas',
      book: 'Books & Learning',
      link: 'Links & Resources',
      task: 'Tasks & TODOs',
      note: 'Notes',
    };
    const section = sectionMap[category] || 'Notes';
    const entry = `\n## ${section} — ${timestamp}\n- ${content}\n`;

    // appendToLivingFile is from lib/living-files.ts
    const { appendToLivingFile, isLivingFilesEnabled } = await import('@/lib/living-files');
    if (isLivingFilesEnabled()) {
      appendToLivingFile('MEMORY.md', entry);
    }

    // 2. Save as ExtractedFact to SQLite
    const factTypeMap: Record<string, string> = {
      idea: 'goal',
      book: 'preference',
      link: 'technical',
      task: 'goal',
      note: 'personal',
    };
    const { saveFacts } = await import('@/services/memory/fact-extraction-service');
    const config = getJohnny5Config();
    const userId = config.userId || 'default';
    await saveFacts('telegram-second-brain', [{
      type: factTypeMap[category] as any,
      key: `second_brain_${category}_${Date.now()}`,
      value: content,
      confidence: 0.95, // Explicitly stated by user
    }], undefined, userId);

    // 3. Confirm to user
    const emoji: Record<string, string> = {
      idea: '💡', book: '📚', link: '🔗', task: '✅', note: '📝'
    };
    await ctx.reply(
      `${emoji[category] || '💾'} *Saved to Second Brain*\n\n*Category:* ${section}\n*Content:* ${content}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('[Johnny5/Telegram] Second Brain save failed:', error);
    await ctx.reply('Sorry, I had trouble saving that. Try again.');
  }
}
```

**New `/brain` command — browse recent Second Brain entries:**

```typescript
this.bot.command('brain', async (ctx) => {
  const { isLivingFilesEnabled } = await import('@/lib/living-files');
  if (isLivingFilesEnabled()) {
    const { readFileSync } = await import('fs');
    const { LIVING_FILES_DIR } = await import('@/lib/data-paths');
    const { join } = await import('path');
    try {
      const content = readFileSync(join(LIVING_FILES_DIR, 'MEMORY.md'), 'utf-8');
      // Last ~2000 chars of MEMORY.md = recent entries
      const recent = content.slice(-2000);
      await ctx.reply(`*Recent Second Brain Entries:*\n\n${recent}`, { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply('No Second Brain entries yet. Send #idea, #book, #link, #task, or #note to save something.');
    }
  } else {
    await ctx.reply('Second Brain (Living Files) is not enabled. Set JOHNNY5_LIVING_FILES=true in environment.');
  }
});
```

**Add `/brain` and `/remember` to the help command output.**

### Todo Items
- [ ] Add `/remember` command handler to `setupHandlers()`
- [ ] Add prefix detection (`#idea`, `#book`, `#link`, `#task`, `#note`) at top of text handler
- [ ] Add `saveToSecondBrain()` private method
- [ ] Add `/brain` command to browse recent entries
- [ ] Update `/help` handler to list new commands
- [ ] Test: send `#idea Build a podcast summarizer` via Telegram, verify MEMORY.md is updated

---

## Step 2: Memory Injection Ranking (Recency + Relevance)

**File:** `services/memory/fact-extraction-service.ts`

**Current `getRelevantFacts()` behavior:** Retrieves facts ordered by confidence DESC, takes top N. No recency weighting, no keyword relevance to current message.

**Target:** Facts ranked by a composite score = `confidence × recencyWeight × relevanceWeight`

### Recency Weight Formula
```
Days old    | Weight
0–7         | 1.5   (very recent)
8–30        | 1.2   (recent)
31–90       | 1.0   (normal)
91–180      | 0.7   (aging)
180+        | 0.4   (stale)
```

### Relevance Weight Formula
Simple keyword overlap between `userMessage` and `fact_value`:
```
overlap = intersection(words(userMessage), words(fact_value)).size
weight = 1.0 + min(overlap * 0.2, 1.0)  // max 2.0x boost
```

### Implementation

**In `fact-extraction-service.ts`, modify or add `getRelevantFactsRanked()`:**

```typescript
export async function getRelevantFactsRanked(
  userId: string,
  userMessage: string = '',
  limit: number = 10
): Promise<ExtractedFact[]> {
  const db = getDb();

  // Get all facts for user (take up to 50 candidates before scoring)
  const rows = db.prepare(`
    SELECT fact_type as type, fact_key as key, fact_value as value,
           confidence, created_at
    FROM extracted_facts
    WHERE user_id = ?
    ORDER BY confidence DESC
    LIMIT 50
  `).all(userId) as any[];

  const now = Date.now();
  const messageWords = new Set(
    userMessage.toLowerCase().split(/\W+/).filter(w => w.length > 3)
  );

  const scored = rows.map(row => {
    // Recency weight
    const ageMs = now - new Date(row.created_at).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    let recencyWeight: number;
    if (ageDays <= 7)        recencyWeight = 1.5;
    else if (ageDays <= 30)  recencyWeight = 1.2;
    else if (ageDays <= 90)  recencyWeight = 1.0;
    else if (ageDays <= 180) recencyWeight = 0.7;
    else                     recencyWeight = 0.4;

    // Relevance weight (keyword overlap)
    const factWords = new Set(
      row.value.toLowerCase().split(/\W+/).filter((w: string) => w.length > 3)
    );
    const overlap = [...messageWords].filter(w => factWords.has(w)).length;
    const relevanceWeight = 1.0 + Math.min(overlap * 0.2, 1.0);

    const score = row.confidence * recencyWeight * relevanceWeight;
    return { ...row, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, created_at, ...fact }) => fact); // strip score from return type
}
```

**Wire it into the chat route:**
In `app/api/johnny5/chat/route.ts`, replace `getExistingFacts()` calls with `getRelevantFactsRanked(userId, userMessage, 10)`.

### Todo Items
- [ ] Read current `getRelevantFacts()` implementation to understand exact signature
- [ ] Add `getRelevantFactsRanked()` to `fact-extraction-service.ts`
- [ ] Wire into chat route's memory injection section
- [ ] Test: verify that a conversation about "Python" surfaces Python-related facts higher than unrelated ones

---

## Step 3: Morning Brief Without Trend Monitor

**Goal:** 8 AM daily briefing delivered via Telegram, using only real components (no Trend Monitor dependency).

**New file:** `services/johnny5/morning-brief-service.ts`

### Content Structure
```
🌅 Good morning, Mike! Here's your brief for [date]:

📰 TOP AI/TECH STORIES
[3 stories from Gemini web search]

💡 CONTENT IDEAS
[3 ideas based on trending stories]

📋 TODAY'S TASKS
[fetched from tasks table]

🤖 JOHNNY5 SUGGESTIONS
[2-3 proactive task ideas]
```

### Implementation

```typescript
// services/johnny5/morning-brief-service.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDb } from '@/lib/johnny5-db';
import { telegramBot } from './telegram-bot';
import { getJohnny5Config } from '@/lib/johnny5-config';
import { logger } from '@/lib/logger';

const RESEARCH_PROMPT = `You are a research assistant. Find the 3 most interesting AI and tech stories from the past 48 hours.
For each story provide:
- Title (1 line)
- Why it matters for developers and content creators (1-2 sentences)
- One content idea it inspires

Also suggest 3 YouTube/content ideas for a developer who covers AI tools, Claude Code, and building SaaS products.

Format as clean markdown. Be specific, not generic. Current date: ${new Date().toDateString()}`;

export async function sendMorningBrief(): Promise<void> {
  const config = getJohnny5Config();
  const chatId = config.integrations?.telegram?.chatId;

  if (!chatId) {
    logger.warn('[MorningBrief] No Telegram chatId configured, skipping');
    return;
  }

  logger.info('[MorningBrief] Building morning brief...');

  try {
    // 1. Research via Gemini (has web access)
    let researchContent = 'Unable to fetch news today.';
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const genai = new GoogleGenerativeAI(apiKey);
      const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      const result = await model.generateContent(RESEARCH_PROMPT);
      researchContent = result.response.text();
    }

    // 2. Fetch today's tasks from DB
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const tasks = db.prepare(`
      SELECT title, status, priority FROM tasks
      WHERE status != 'done'
      ORDER BY priority ASC, created_at DESC
      LIMIT 5
    `).all() as any[];

    const taskList = tasks.length > 0
      ? tasks.map(t => `• [${t.status}] ${t.title}`).join('\n')
      : 'No active tasks. Add some in the IDE.';

    // 3. Compose brief
    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const brief = [
      `🌅 *Good morning, Mike!*`,
      `*${date}*`,
      ``,
      researchContent,
      ``,
      `📋 *YOUR ACTIVE TASKS*`,
      taskList,
      ``,
      `_Reply with /tasks to manage tasks or just chat with me._`,
    ].join('\n');

    await telegramBot.sendMessage(chatId, brief, 'Markdown');
    logger.info('[MorningBrief] Brief sent successfully');

  } catch (error) {
    logger.error('[MorningBrief] Failed to send brief:', error);
    await telegramBot.sendMessage(chatId, '⚠️ Morning brief failed to generate. Check logs.', 'Markdown');
  }
}

/**
 * Schedule the morning brief at 8 AM local time.
 * Call this once from server.js after Telegram bot starts.
 */
export function scheduleMorningBrief(): NodeJS.Timeout {
  function msUntil8AM(): number {
    const now = new Date();
    const target = new Date(now);
    target.setHours(8, 0, 0, 0);
    if (now >= target) {
      target.setDate(target.getDate() + 1); // Tomorrow's 8 AM
    }
    return target.getTime() - now.getTime();
  }

  const msToFirst = msUntil8AM();
  logger.info(`[MorningBrief] First brief in ${Math.round(msToFirst / 60000)} minutes`);

  // One-shot timer to 8 AM, then daily interval
  const initial = setTimeout(() => {
    sendMorningBrief();
    // Then run daily
    setInterval(sendMorningBrief, 24 * 60 * 60 * 1000);
  }, msToFirst);

  return initial;
}
```

**Wire into `server.js`** (after Telegram bot starts):
```javascript
// In server.js, after telegramBot.start():
const { scheduleMorningBrief } = require('./services/johnny5/morning-brief-service');
if (process.env.JOHNNY5_MORNING_BRIEF !== 'false') {
  scheduleMorningBrief();
}
```

**Environment variable:** `JOHNNY5_MORNING_BRIEF=true` to opt in (off by default until tested)

### Todo Items
- [ ] Create `services/johnny5/morning-brief-service.ts` with `sendMorningBrief()` and `scheduleMorningBrief()`
- [ ] Wire `scheduleMorningBrief()` into `server.js` after Telegram bot starts
- [ ] Add `JOHNNY5_MORNING_BRIEF` env var to `.env.example`
- [ ] Test manually: add `/brief` command to Telegram bot that triggers `sendMorningBrief()` immediately (don't wait for 8 AM)
- [ ] Verify Gemini web research returns real news (not hallucinated)

---

## Step 4: Memory Decay / Stale Fact Flagging

**Goal:** Facts older than 90 days are flagged as potentially stale, not silently injected as gospel truth.

### Database Migration

The `extracted_facts` table currently has: `user_id, session_id, fact_type, fact_key, fact_value, confidence, created_at`

Need to add: `last_confirmed_at TEXT` (nullable — NULL means never confirmed, just extracted)

**SQLite migration** (add to `initializeDb()` in `lib/johnny5-db.ts` as an idempotent ALTER TABLE):

```typescript
// In initializeDb(), after table creation:
try {
  db.exec(`ALTER TABLE extracted_facts ADD COLUMN last_confirmed_at TEXT`);
} catch {
  // Column already exists, ignore
}
```

### Injection Change

In `getRelevantFactsRanked()` (Step 2), add stale flag to returned facts:

```typescript
const STALE_THRESHOLD_DAYS = 90;

// In the scoring loop:
const ageDays = ageMs / (1000 * 60 * 60 * 24);
const isStale = ageDays > STALE_THRESHOLD_DAYS && !row.last_confirmed_at;
return { ...row, score, isStale };
```

In the context builder, separate stale from current facts:

```typescript
const currentFacts = rankedFacts.filter(f => !f.isStale);
const staleFacts = rankedFacts.filter(f => f.isStale);

let contextParts = [];
if (currentFacts.length > 0) {
  contextParts.push(`## What I know about you:\n${currentFacts.map(f => `- ${f.key}: ${f.value}`).join('\n')}`);
}
if (staleFacts.length > 0) {
  contextParts.push(`\n## Older facts (may be outdated — confirm if still true):\n${staleFacts.map(f => `- ${f.key}: ${f.value} [last recorded: ${f.created_at.split('T')[0]}]`).join('\n')}`);
}
```

**Confirmation endpoint** — when user says "yes that's still true" in chat, update `last_confirmed_at`:

In `fact-extraction-service.ts`:
```typescript
export function confirmFact(factKey: string, userId: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE extracted_facts
    SET last_confirmed_at = ?
    WHERE fact_key = ? AND user_id = ?
  `).run(new Date().toISOString(), factKey, userId);
}
```

The chat route can detect confirmation language ("yes that's right", "still true", "correct") and call `confirmFact()` for any stale facts that were injected in the current session.

### Todo Items
- [ ] Add `last_confirmed_at` migration to `initializeDb()` in `lib/johnny5-db.ts`
- [ ] Add `isStale` flag calculation to `getRelevantFactsRanked()`
- [ ] Separate stale/current facts in context injection string
- [ ] Add `confirmFact()` function to `fact-extraction-service.ts`
- [ ] Optional: wire confirmation detection in chat route

---

## Implementation Order

Execute in this exact sequence (each step depends on the previous):

```
Step 0: Verify → confirm the system works at all
Step 1: Telegram Capture → gives Second Brain its input stream
Step 2: Ranking → makes existing facts more useful
Step 3: Morning Brief → automated daily value
Step 4: Decay → housekeeping, prevents stale data confusion
```

## Files Touched

| Step | File | Change |
|------|------|--------|
| 0 | — | Read-only verification |
| 1 | `services/johnny5/telegram-bot.ts` | Add 4 handlers + `saveToSecondBrain()` |
| 2 | `services/memory/fact-extraction-service.ts` | Add `getRelevantFactsRanked()` |
| 2 | `app/api/johnny5/chat/route.ts` | Wire new ranking function |
| 3 | `services/johnny5/morning-brief-service.ts` | New file (~80 lines) |
| 3 | `server.js` | 2-line wire-up |
| 4 | `lib/johnny5-db.ts` | 3-line migration |
| 4 | `services/memory/fact-extraction-service.ts` | Add `confirmFact()` |

**Total estimated lines changed: ~200 across 6 files**

---

## Environment Variables Required

```bash
JOHNNY5_LIVING_FILES=true        # Enable living files (USER.md, MEMORY.md, etc.)
GEMINI_API_KEY=<key>             # Required for fact extraction + morning brief research
JOHNNY5_MORNING_BRIEF=true       # Opt-in to 8 AM briefing (default off)
```

Check `.env` or Render environment for these before any implementation work.

---

## Review Section

**Completed:** 2026-02-18

### What was implemented

**Step 0 — Verification**
- Confirmed `JOHNNY5_LIVING_FILES=true` ✅
- Found `GEMINI_API_KEY` is empty — documented as blocker for AI fact quality and morning brief
- 71 facts already in `extracted_facts`, 9 living files exist, Telegram is connected

**Step 1 — Second Brain Telegram Capture**
- Added `/remember`, `/brain`, `/brief` commands to `telegram-bot.ts`
- Added Second Brain prefix detection (`#idea`, `#book`, `#link`, `#task`, `#note`)
- `saveToSecondBrain()` writes to `MEMORY.md` + saves to `extracted_facts` with `confidence: 0.95`
- `handleBrain()` reads last 1800 chars of `MEMORY.md` as a quick recall view
- Updated `/help` text with all new commands

**Step 2 — Ranked Memory Injection**
- Added `getRelevantFactsRanked()` to `fact-extraction-service.ts` — composite scoring: `confidence × recencyWeight × relevanceWeight`
- Added `confirmFact()` for updating `last_referenced` + incrementing `reference_count`
- Exported both from `services/memory/index.ts`
- Wired into `app/api/johnny5/chat/route.ts` in the living files path — supplements living files with top 8 ranked facts from DB, with stale facts (>90 days) clearly labeled

**Step 3 — Morning Brief (Gemini Flash, no Trend Monitor)**
- Created `services/johnny5/morning-brief-service.ts` from scratch
- `buildBrief()` = Gemini research + active DB tasks, formatted as Telegram markdown
- `scheduleMorningBrief()` = idempotent `setTimeout → setInterval` at 8 AM daily
- Wired into `server.js` — fires after Telegram bot connects, guarded by `JOHNNY5_MORNING_BRIEF=true`
- `/brief` command in Telegram triggers it on demand

**Step 4 — Memory Decay Migration**
- Added `ALTER TABLE extracted_facts ADD COLUMN last_confirmed_at TEXT` to migration steps in `lib/johnny5-db.ts` (idempotent, runs on next server start)
- Added `JOHNNY5_MORNING_BRIEF=false` to `.env.local`

### Files changed
| File | Change |
|------|--------|
| `services/johnny5/telegram-bot.ts` | Added /remember, /brain, /brief, Second Brain prefix handling |
| `services/memory/fact-extraction-service.ts` | Added getRelevantFactsRanked(), confirmFact() |
| `services/memory/index.ts` | Exported new functions |
| `services/johnny5/morning-brief-service.ts` | Created (new file) |
| `lib/johnny5-db.ts` | Added last_confirmed_at migration |
| `server.js` | Wired scheduleMorningBrief() after Telegram bot connects |
| `app/api/johnny5/chat/route.ts` | Added ranked facts injection in living files path |
| `.env.local` | Added JOHNNY5_MORNING_BRIEF=false |

### Remaining action required
- **Add `GEMINI_API_KEY`** to `.env.local` — without it, fact extraction falls back to regex and morning brief research will fail
- **Set `JOHNNY5_MORNING_BRIEF=true`** in `.env.local` when ready to receive daily briefs
- **Test** via Telegram: `/brief` (on-demand brief), `#idea my new idea` (Second Brain), `/brain` (recall recent captures), `/remember something` (manual save)
