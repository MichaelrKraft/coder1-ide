# Coder1 Memory Enhancement Implementation Guide

> **For Claude Code Agents**: This document contains everything needed to implement semantic search and background session capture for Coder1 IDE. Follow the phases in order.

---

## Quick Context

**Goal**: Enhance Coder1's existing memory system with:
1. Vector search (semantic, not just keyword matching)
2. Background daemon to capture ALL Claude Code sessions (including outside the IDE)

**What Already Exists** (DO NOT REPLACE):
- `lib/embedding-service.ts` - OpenAI embeddings (keep using this)
- `services/eternal-memory-search.ts` - FTS5 text search
- `lib/db/memory-database.ts` - SQLite memory storage
- `stores/useSessionStore.ts` - Session state management
- `services/SessionSummaryService.ts` - AI-powered summaries

**What's Missing** (IMPLEMENT THESE):
- sqlite-vec for vector similarity search
- Background daemon watching ~/.claude directory
- Sub-agent synthesis pattern

---

## Phase 1: Add Vector Search Layer (START HERE)

### Step 1.1: Install sqlite-vec

```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npm install sqlite-vec
```

### Step 1.2: Modify memory-database.ts

**File**: `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/lib/db/memory-database.ts`

Add vector table creation and similarity search methods:

```typescript
// Add to imports
import * as sqliteVec from 'sqlite-vec';

// Add to initDatabase() method
private initVectorExtension() {
  sqliteVec.load(this.db);

  // Create vector table for memory embeddings
  // OpenAI text-embedding-3-small produces 1536-dimensional vectors
  this.db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS memory_vectors
    USING vec0(
      memory_id TEXT PRIMARY KEY,
      embedding float[1536]
    );
  `);
}

// Add new method for semantic search
async semanticSearch(queryEmbedding: number[], limit: number = 10): Promise<Array<{
  memoryId: string;
  distance: number;
  memory: Memory;
}>> {
  const results = this.db.prepare(`
    SELECT
      v.memory_id,
      v.distance,
      m.*
    FROM memory_vectors v
    JOIN memories m ON v.memory_id = m.id
    WHERE v.embedding MATCH ?
    AND m.deleted_at IS NULL
    ORDER BY v.distance
    LIMIT ?
  `).all(JSON.stringify(queryEmbedding), limit);

  return results.map(row => ({
    memoryId: row.memory_id,
    distance: row.distance,
    memory: this.rowToMemory(row)
  }));
}

// Add method to store embedding with memory
async storeMemoryEmbedding(memoryId: string, embedding: number[]): Promise<void> {
  this.db.prepare(`
    INSERT OR REPLACE INTO memory_vectors (memory_id, embedding)
    VALUES (?, ?)
  `).run(memoryId, JSON.stringify(embedding));
}

// Add hybrid search (FTS5 + vector combined)
async hybridSearch(
  query: string,
  queryEmbedding: number[],
  limit: number = 10,
  weights: { fts: number; vector: number } = { fts: 0.4, vector: 0.6 }
): Promise<Memory[]> {
  // Get FTS5 results
  const ftsResults = await this.searchMemories(query, limit * 2);

  // Get vector results
  const vectorResults = await this.semanticSearch(queryEmbedding, limit * 2);

  // Combine and re-rank
  const scoreMap = new Map<string, { memory: Memory; score: number }>();

  ftsResults.forEach((memory, index) => {
    const ftsScore = 1 - (index / ftsResults.length);
    scoreMap.set(memory.id, {
      memory,
      score: ftsScore * weights.fts
    });
  });

  vectorResults.forEach((result, index) => {
    const vectorScore = 1 - (index / vectorResults.length);
    const existing = scoreMap.get(result.memoryId);
    if (existing) {
      existing.score += vectorScore * weights.vector;
    } else {
      scoreMap.set(result.memoryId, {
        memory: result.memory,
        score: vectorScore * weights.vector
      });
    }
  });

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.memory);
}
```

### Step 1.3: Update eternal-memory-search.ts

**File**: `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/services/eternal-memory-search.ts`

Add semantic search integration:

```typescript
// Add to imports
import { EmbeddingService } from '@/lib/embedding-service';

// Add to class
private embeddingService: EmbeddingService;

constructor() {
  // ... existing constructor code
  this.embeddingService = EmbeddingService.getInstance();
}

// Add new semantic search method
async semanticSessionSearch(
  query: string,
  options: {
    limit?: number;
    sessionIds?: string[];
    dateRange?: { start: Date; end: Date };
  } = {}
): Promise<SessionSearchResult[]> {
  const { limit = 10, sessionIds, dateRange } = options;

  // Generate embedding for query
  const queryEmbedding = await this.embeddingService.generateEmbedding(query);

  if (!queryEmbedding) {
    // Fall back to FTS if embedding fails
    return this.searchSessions(query, limit);
  }

  // Use hybrid search
  const memories = await this.memoryDatabase.hybridSearch(query, queryEmbedding, limit);

  // Convert to session results format
  return this.memoriesToSessionResults(memories);
}
```

### Step 1.4: Create Semantic Search API Endpoint

**Create file**: `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/app/api/memory/semantic-search/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { EternalMemorySearch } from '@/services/eternal-memory-search';

const searchService = new EternalMemorySearch();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '10');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    const results = await searchService.semanticSessionSearch(query, { limit });

    return NextResponse.json({
      success: true,
      query,
      count: results.length,
      results
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
```

---

## Phase 2: Background Daemon for System-Wide Session Capture

### Step 2.1: Create Daemon Directory Structure

```bash
mkdir -p /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/daemon
```

### Step 2.2: Install Dependencies

```bash
npm install chokidar
```

### Step 2.3: Create Session Watcher

**Create file**: `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/daemon/session-watcher.ts`

```typescript
import chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SessionParser } from './session-parser';
import { EmbeddingQueue } from './embedding-queue';

export class SessionWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private parser: SessionParser;
  private embeddingQueue: EmbeddingQueue;
  private claudeDir: string;

  constructor() {
    this.claudeDir = path.join(os.homedir(), '.claude');
    this.parser = new SessionParser();
    this.embeddingQueue = new EmbeddingQueue();
  }

  start() {
    console.log(`[SessionWatcher] Starting to watch ${this.claudeDir}`);

    // Watch for JSONL conversation files in Claude's project directories
    const watchPattern = path.join(this.claudeDir, 'projects', '**', 'conversations', '*.jsonl');

    this.watcher = chokidar.watch(watchPattern, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });

    this.watcher
      .on('add', (filePath) => this.handleNewSession(filePath))
      .on('change', (filePath) => this.handleSessionUpdate(filePath))
      .on('error', (error) => console.error('[SessionWatcher] Error:', error));

    console.log('[SessionWatcher] Watcher initialized');
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('[SessionWatcher] Stopped');
    }
  }

  private async handleNewSession(filePath: string) {
    console.log(`[SessionWatcher] New session detected: ${filePath}`);

    try {
      const conversations = await this.parser.parseJSONL(filePath);
      const sessionId = this.extractSessionId(filePath);

      for (const conversation of conversations) {
        await this.embeddingQueue.add({
          sessionId,
          content: conversation.content,
          role: conversation.role,
          timestamp: conversation.timestamp,
          filePath
        });
      }
    } catch (error) {
      console.error(`[SessionWatcher] Error processing ${filePath}:`, error);
    }
  }

  private async handleSessionUpdate(filePath: string) {
    console.log(`[SessionWatcher] Session updated: ${filePath}`);
    // Re-process the file (could optimize to only process new lines)
    await this.handleNewSession(filePath);
  }

  private extractSessionId(filePath: string): string {
    // Extract session ID from file path
    // e.g., ~/.claude/projects/foo/conversations/abc123.jsonl -> abc123
    const fileName = path.basename(filePath, '.jsonl');
    return fileName;
  }
}
```

### Step 2.4: Create Session Parser

**Create file**: `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/daemon/session-parser.ts`

```typescript
import * as fs from 'fs';
import * as readline from 'readline';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolUse?: any[];
}

export class SessionParser {
  async parseJSONL(filePath: string): Promise<ConversationMessage[]> {
    const messages: ConversationMessage[] = [];

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.trim()) {
        try {
          const parsed = JSON.parse(line);
          messages.push(this.normalizeMessage(parsed));
        } catch (error) {
          console.warn(`[SessionParser] Skipping malformed line: ${line.substring(0, 50)}...`);
        }
      }
    }

    return messages;
  }

  private normalizeMessage(raw: any): ConversationMessage {
    // Normalize different Claude conversation formats
    return {
      role: raw.role || raw.type || 'unknown',
      content: this.extractContent(raw),
      timestamp: raw.timestamp || raw.created_at || Date.now(),
      toolUse: raw.tool_use || raw.toolUse || []
    };
  }

  private extractContent(raw: any): string {
    if (typeof raw.content === 'string') {
      return raw.content;
    }
    if (Array.isArray(raw.content)) {
      return raw.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');
    }
    return raw.message || raw.text || '';
  }
}
```

### Step 2.5: Create Embedding Queue

**Create file**: `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/daemon/embedding-queue.ts`

```typescript
import { EmbeddingService } from '@/lib/embedding-service';
import { MemoryDatabase } from '@/lib/db/memory-database';

interface QueueItem {
  sessionId: string;
  content: string;
  role: string;
  timestamp: number;
  filePath: string;
}

export class EmbeddingQueue {
  private queue: QueueItem[] = [];
  private processing = false;
  private embeddingService: EmbeddingService;
  private memoryDb: MemoryDatabase;

  constructor() {
    this.embeddingService = EmbeddingService.getInstance();
    this.memoryDb = new MemoryDatabase();
  }

  async add(item: QueueItem) {
    this.queue.push(item);
    if (!this.processing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;

      try {
        // Skip very short content
        if (item.content.length < 50) continue;

        // Generate embedding
        const embedding = await this.embeddingService.generateEmbedding(item.content);

        if (embedding) {
          // Store memory
          const memoryId = await this.memoryDb.createMemory({
            content: item.content,
            type: 'conversation',
            source: 'claude-code',
            metadata: {
              sessionId: item.sessionId,
              role: item.role,
              filePath: item.filePath
            }
          });

          // Store embedding
          await this.memoryDb.storeMemoryEmbedding(memoryId, embedding);

          console.log(`[EmbeddingQueue] Indexed conversation from ${item.sessionId}`);
        }
      } catch (error) {
        console.error(`[EmbeddingQueue] Error processing item:`, error);
      }

      // Rate limiting - wait 100ms between items
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.processing = false;
  }
}
```

### Step 2.6: Create Daemon Entry Point

**Create file**: `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/daemon/index.ts`

```typescript
import { SessionWatcher } from './session-watcher';

const watcher = new SessionWatcher();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Daemon] Shutting down...');
  watcher.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  watcher.stop();
  process.exit(0);
});

// Start watching
console.log('[Daemon] Coder1 Memory Daemon starting...');
watcher.start();
console.log('[Daemon] Running. Press Ctrl+C to stop.');
```

### Step 2.7: Add Daemon Scripts to package.json

**Edit**: `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/package.json`

Add to "scripts":

```json
{
  "scripts": {
    "daemon": "npx tsx daemon/index.ts",
    "daemon:start": "nohup npm run daemon > ~/.coder1/daemon.log 2>&1 &",
    "daemon:stop": "pkill -f 'tsx daemon/index.ts'"
  }
}
```

---

## Phase 3: Sub-Agent Synthesis (Context Window Optimization)

### Step 3.1: Create Memory Synthesizer Service

**Create file**: `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/services/memory-synthesizer.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { EternalMemorySearch } from './eternal-memory-search';
import { Memory } from '@/lib/db/memory-database';

export class MemorySynthesizer {
  private anthropic: Anthropic;
  private searchService: EternalMemorySearch;

  constructor() {
    this.anthropic = new Anthropic();
    this.searchService = new EternalMemorySearch();
  }

  /**
   * Search past sessions and synthesize an answer WITHOUT loading
   * full session content into the main context window.
   *
   * Uses Claude Haiku as a sub-agent to read and summarize relevant sessions.
   */
  async searchAndSummarize(query: string): Promise<{
    answer: string;
    sources: Array<{ sessionId: string; snippet: string }>;
  }> {
    // Step 1: Semantic search for relevant memories
    const relevantMemories = await this.searchService.semanticSessionSearch(query, {
      limit: 5
    });

    if (relevantMemories.length === 0) {
      return {
        answer: "I couldn't find any relevant past conversations about this topic.",
        sources: []
      };
    }

    // Step 2: Prepare context for sub-agent (truncated to avoid context bloat)
    const context = relevantMemories.map((result, index) => ({
      index: index + 1,
      sessionId: result.sessionId,
      content: result.content.substring(0, 2000), // Truncate long content
      timestamp: result.timestamp
    }));

    // Step 3: Use Haiku sub-agent to synthesize answer
    const synthesis = await this.anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      system: `You are a research assistant helping summarize past coding sessions.
Given relevant session excerpts, synthesize a clear, direct answer to the user's question.
Focus on decisions made, solutions found, and lessons learned.
Be concise - the user just wants the key information.`,
      messages: [{
        role: 'user',
        content: `Question: ${query}

Relevant past sessions:
${context.map(c => `
[Session ${c.index}] (${new Date(c.timestamp).toLocaleDateString()})
${c.content}
`).join('\n---\n')}

Please synthesize an answer based on these sessions.`
      }]
    });

    const answer = synthesis.content[0].type === 'text'
      ? synthesis.content[0].text
      : 'Unable to synthesize answer.';

    return {
      answer,
      sources: context.map(c => ({
        sessionId: c.sessionId,
        snippet: c.content.substring(0, 200) + '...'
      }))
    };
  }
}
```

### Step 3.2: Create Synthesis API Endpoint

**Create file**: `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/app/api/memory/synthesize/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { MemorySynthesizer } from '@/services/memory-synthesizer';

const synthesizer = new MemorySynthesizer();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    const result = await synthesizer.searchAndSummarize(query);

    return NextResponse.json({
      success: true,
      query,
      answer: result.answer,
      sources: result.sources
    });
  } catch (error) {
    console.error('Synthesis error:', error);
    return NextResponse.json({ error: 'Synthesis failed' }, { status: 500 });
  }
}
```

---

## Verification Steps

### Test 1: Vector Search Working

```bash
# Store a test memory
curl -X POST http://localhost:3001/api/memory -H "Content-Type: application/json" \
  -d '{"content": "Fixed authentication bug by implementing token refresh logic"}'

# Search semantically (should find the memory even with different words)
curl "http://localhost:3001/api/memory/semantic-search?q=login%20session%20expired"

# Expected: Should return the auth bug memory due to semantic similarity
```

### Test 2: Daemon Capturing Sessions

```bash
# Start the daemon
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npm run daemon

# In another terminal, run a Claude Code session
claude "What is 2+2?"

# Check daemon logs
tail -f ~/.coder1/daemon.log

# Expected: Should see "New session detected" and "Indexed conversation" messages
```

### Test 3: Sub-Agent Synthesis

```bash
# After some sessions have been captured
curl "http://localhost:3001/api/memory/synthesize?q=What%20did%20we%20decide%20about%20authentication?"

# Expected: JSON response with synthesized answer and sources, NOT raw session dumps
```

---

## File Summary

### Files to MODIFY:
1. `lib/db/memory-database.ts` - Add vector table and similarity search
2. `services/eternal-memory-search.ts` - Add hybrid search
3. `package.json` - Add dependencies and scripts

### Files to CREATE:
1. `app/api/memory/semantic-search/route.ts` - Search API
2. `app/api/memory/synthesize/route.ts` - Synthesis API
3. `daemon/session-watcher.ts` - File watcher
4. `daemon/session-parser.ts` - JSONL parser
5. `daemon/embedding-queue.ts` - Async embedding processor
6. `daemon/index.ts` - Daemon entry point
7. `services/memory-synthesizer.ts` - Sub-agent synthesis

### Dependencies to ADD:
```bash
npm install sqlite-vec chokidar
```

---

## Reference: cmem Article

The implementation is inspired by cmem (https://www.npmjs.com/package/@colbymchenry/cmem) which provides:
- Background daemon watching ~/.claude
- Local embeddings with transformers.js (we use OpenAI instead)
- SQLite + sqlite-vec for vector storage
- MCP server for Claude integration
- Sub-agent synthesis pattern

Our implementation adapts these concepts to integrate with Coder1's existing memory infrastructure.
