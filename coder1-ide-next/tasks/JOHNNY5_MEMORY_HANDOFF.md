# 🚨 JOHNNY5 MEMORY SYSTEM HANDOFF

**Date**: 2026-02-03
**Status**: ❌ NOT WORKING - Memory search returns 0 results
**Priority**: HIGH - Core feature broken

---

## THE PROBLEM IN ONE SENTENCE

Johnny5 does not remember anything - when asked "what is my favorite color?", he says he has no memory, even though "User's favorite color is blue" IS in the database and FTS5 search works when tested directly.

---

## WHAT THE USER WANTS

"When we had it dialed in, it just worked" - The memory system should automatically:
1. Search indexed memories when user sends a message
2. Find relevant context (like "favorite color is blue")
3. Inject that context into the prompt
4. Johnny5 responds with that knowledge

---

## CURRENT STATE

### What Works ✅
- Database has 16 chunks indexed (ManusLive MEMORY.md, USER.md, sessions)
- FTS5 search works via SQLite CLI: `SELECT * FROM memory_fts WHERE memory_fts MATCH 'favorite OR color'` returns 5 results
- Gemini fallback is active (J5_ENABLED=false)
- Chat route `/api/johnny5/chat` receives messages successfully
- Gemini responds (just without memory context)

### What Doesn't Work ❌
- Memory search in the application returns 0 results
- Server logs show: `[Johnny5] Memory search completed: 0 results`
- The FTS5 query logged was: `Hello do you remember my favorite color` (no OR, implicit AND)
- This means `sanitizeFTS5Query()` fix may not have been applied correctly

---

## FILES MODIFIED THIS SESSION

### 1. `/lib/johnny5-db.ts` - FTS5 Query Sanitization

**Location**: Around line 1427

**The Fix That Should Be There**:
```typescript
function sanitizeFTS5Query(query: string): string {
  let sanitized = query
    .replace(/[*"()\-+?:^~]/g, ' ')
    .replace(/\b(AND|OR|NOT|NEAR)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!sanitized) {
    sanitized = query.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
  }

  // Filter stop words
  const stopWords = new Set(['i', 'me', 'my', 'we', 'you', 'your', 'the', 'a', 'an', 'is', 'are', 'was', 'be', 'do', 'does', 'did', 'have', 'has', 'had', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'it', 'its', 'this', 'that', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'hello', 'hi', 'hey', 'please', 'thanks', 'thank', 'remember']);
  const words = sanitized.split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w.toLowerCase()));

  if (words.length === 0) {
    const allWords = sanitized.split(/\s+/).filter(w => w.length > 1);
    if (allWords.length === 0) return '';
    return allWords.join(' OR ');
  }

  if (words.length === 1) return words[0];

  // CRITICAL: FTS5 uses implicit AND, we need explicit OR
  return words.join(' OR ');
}
```

### 2. `/app/api/johnny5/j5/chat/route.ts` - J5 Bypass

**Location**: Line 49 (inside POST handler)

```typescript
// Added at the start of POST handler:
const j5Enabled = process.env.J5_ENABLED !== 'false';
if (!j5Enabled) {
  console.log('[J5 Chat] J5 disabled via J5_ENABLED=false');
  return NextResponse.json({
    success: false,
    error: 'J5 is disabled. Please use /api/johnny5/chat instead.',
    code: 'J5_DISABLED',
    timestamp: new Date(),
  }, { status: 503 });
}
```

### 3. `/components/johnny5/chat/ChatTab.tsx` - Fallback Retry

**Location**: Around line 234

```typescript
// Changed const to let:
let response = await fetch(apiEndpoint, {...});
let data = await response.json();

// Added retry logic:
if (data.code === 'J5_DISABLED' && useJ5) {
  console.log('[ChatTab] J5 disabled, retrying with main chat endpoint');
  response = await fetch('/api/johnny5/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: userMessage.content,
      history: messages.slice(-10),
    }),
  });
  data = await response.json();
}
```

---

## THE DEBUGGING PATH

### Server Logs to Watch For

When user sends a message, you should see:

```
[Johnny5 DB] FTS5 query: favorite OR color    ← Should have OR
[Johnny5] Memory search completed: 5 results  ← Should have results
[Johnny5] Using Gemini API mode
```

### Current Bad Logs

```
[Johnny5 DB] FTS5 query: Hello do you remember my favorite color  ← NO OR!
[Johnny5] Memory search completed: 0 results                       ← No results
[Johnny5] No memories found for query
```

---

## STEP BY STEP DEBUGGING

### Step 1: Verify the Fix is in Place
```bash
grep -A 20 "sanitizeFTS5Query" /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/lib/johnny5-db.ts | head -30
```
Look for: `return words.join(' OR ');`

### Step 2: Restart Server (IMPORTANT)
```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npm run dev
```

### Step 3: Test Directly
```bash
# This should return 5+ results
sqlite3 ~/.coder1/johnny5.db "SELECT COUNT(*) FROM memory_fts JOIN memory_chunks mc ON memory_fts.rowid = mc.rowid WHERE memory_fts MATCH 'favorite OR color';"
```

### Step 4: Test in Johnny5
Open http://localhost:3001/ide, ask "What is my favorite color?"

### Step 5: Check Logs
Watch for `[Johnny5 DB] FTS5 query:` - it should show the OR query

---

## IF THE FIX ISN'T WORKING

The issue might be:

1. **Function not being called**: The `searchMemoryKeyword` function might be cached
2. **Different code path**: Memory injection might be disabled
3. **Results not being injected**: Search works but injection doesn't

### Trace the Call Path:

```
User message
    ↓
/app/api/johnny5/chat/route.ts (POST handler)
    ↓
searchMemory() from hybrid-search.ts
    ↓
keywordOnlySearch()
    ↓
searchMemoryKeyword() from johnny5-db.ts
    ↓
sanitizeFTS5Query() ← Fix should be here
    ↓
FTS5 SQL query
    ↓
Results returned
    ↓
formatForPromptInjection()
    ↓
Injected into Gemini prompt
```

### Check Memory Injection in Chat Route

In `/app/api/johnny5/chat/route.ts`, around line 200, there should be code like:

```typescript
const searchResult = await searchMemory(message, queryEmbedding, {
  topK: 5,
  maxTokens: 2000,
  minScore: 0.05,  // Was changed from 0.2
});

if (searchResult.results.length > 0) {
  const memoryContext = formatForPromptInjection(searchResult, 2000);
  // This should be prepended to the message
}
```

---

## DATABASE INFO

**Location**: `~/.coder1/johnny5.db`

### Tables
- `memory_chunks` - Stores indexed content (16 rows)
- `memory_fts` - FTS5 virtual table for keyword search (16 rows)
- `memory_embeddings` - Vector embeddings (may be empty, sqlite-vec not loading)
- `sessions`, `messages` - Chat history

### Verify Content
```bash
# Show chunks with "favorite color"
sqlite3 ~/.coder1/johnny5.db "SELECT source_type, substr(content, 1, 100) FROM memory_chunks WHERE content LIKE '%favorite color%';"

# Should return:
# manuslive_memory|...User's favorite color is blue...
# session|...What's my favorite color...
```

---

## ENVIRONMENT VARIABLES

```env
# In /coder1-ide-next/.env.local
J5_ENABLED=false                    # Bypass J5, use Gemini
GEMINI_API_KEY=AIzaSyC9H2FDdY24...       # For embeddings
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-... # For API calls (not being used currently)
```

---

## WHAT SUCCESS LOOKS LIKE

1. User asks: "Do you remember my favorite color?"
2. Server logs show: `[Johnny5] Memory search completed: 5 results`
3. Johnny5 responds: "Yes! Your favorite color is blue, according to your preferences."

---

## POSSIBLE ROOT CAUSES TO INVESTIGATE

1. **TypeScript compilation caching** - Server might be running old compiled code
2. **Hot reload not picking up changes** - Need full restart
3. **minScore threshold** - Changed from 0.2 to 0.05, verify this is in hybrid-search.ts
4. **Memory injection disabled** - Check if there's a flag or condition skipping injection
5. **Wrong database path** - Ensure DB is at `~/.coder1/johnny5.db` not somewhere else

---

## QUICK COMMANDS

```bash
# Kill server
lsof -ti:3001 | xargs kill -9

# Start server
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next && npm run dev

# Check if data exists
sqlite3 ~/.coder1/johnny5.db "SELECT COUNT(*) FROM memory_chunks;"

# Test FTS5 directly
sqlite3 ~/.coder1/johnny5.db "SELECT * FROM memory_fts WHERE memory_fts MATCH 'favorite OR color' LIMIT 3;"

# Watch server logs
# (Just run npm run dev and watch the output)
```

---

## CONTACT

User: Mike (prefers concise, technical communication)
Project: Coder1 IDE (http://localhost:3001/ide)
Test URL: Open Johnny5 chat panel in the IDE

---

---

## CRITICAL ADDITIONAL DETAILS

### Import/Export Chain (Verified Correct)
```
/app/api/johnny5/chat/route.ts
  imports from '@/services/memory'
    ↓
/services/memory/index.ts
  exports from './search'
    ↓
/services/memory/search/index.ts
  exports from './hybrid-search'
    ↓
/services/memory/search/hybrid-search.ts
  exports: searchMemory, formatForPromptInjection
  imports: searchMemoryKeyword from '@/lib/johnny5-db'
    ↓
/lib/johnny5-db.ts
  exports: searchMemoryKeyword
  uses: sanitizeFTS5Query (internal function - THE BUG WAS HERE)
```

### Memory Injection Configuration (Verified Correct in route.ts)
```typescript
// Line 123: enableMemoryInjection defaults to true
const { message, sessionId, enableMemoryInjection = true } = body;

// Line 324-328: Search is called with minScore 0.05
const searchResult = await searchMemory(message, queryEmbedding, {
  topK: 5,
  maxTokens: 2000,
  minScore: 0.05,  // Lower threshold for keyword-only search
});

// Line 367-368: Memory injected into message
const enhancedMessage = memoryContext
  ? `${memoryContext}\n\n---\n\n**User Query:**\n${message}`
  : message;
```

### Vector Search Status
- **sqlite-vec is NOT loaded** - The system falls back to keyword-only search
- This is expected behavior - keyword search should still work
- `isVectorSearchAvailable()` returns false

### What The Logs SHOULD Show (When Working)
```
[Memory] Keyword search for: "Hello do you remember my favorite color..." minScore=0.05
[Johnny5 DB] FTS5 query: favorite OR color     ← MUST have OR
[Memory] Keyword search returned 5 raw results  ← MUST have results > 0
[Johnny5] Memory search: 5 results, type=keyword, time=26ms
```

### What The Logs ACTUALLY Show (Currently Broken)
```
[Johnny5 DB] FTS5 query: Hello do you remember my favorite color  ← NO OR - BUG!
[Johnny5] Memory search completed: 0 results                        ← No results
[Johnny5] No memories found for query
```

### The Exact Line That Must Have Changed
In `/lib/johnny5-db.ts`, **line 1455**, the return statement MUST be:
```typescript
return words.join(' OR ');  // NOT: return words.join(' ');
```

**VERIFIED**: As of this handoff, `grep -n "return words.join" lib/johnny5-db.ts` returns:
```
1455:  return words.join(' OR ');
```
The fix IS in the file. The issue is likely server restart or caching.

### Why This Matters
FTS5 default operator is **AND**, not OR:
- `"Hello do you remember my favorite color"` = All words must match = 0 results
- `"favorite OR color"` = Any word can match = 5+ results

### Server Restart Verification
After restart, check this log line appears:
```
[dotenv@17.2.3] injecting env (24) from .env.local
```
This confirms server loaded fresh environment and code.

---

*This handoff created by Claude Opus 4.5 on 2026-02-03 after context window exhaustion during debugging session.*
