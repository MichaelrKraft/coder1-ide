# 🤝 Coder1 IDE Team Collaboration Roadmap

**Status**: Design Complete - Ready for Implementation  
**Priority**: Medium (Implement when bandwidth available)  
**Estimated Effort**: 2-3 weeks (Tier 2 Git-Based)  
**Last Updated**: January 2025

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Strategic Context: Claude Code Web](#strategic-context-claude-code-web)
3. [Architecture Overview](#architecture-overview)
4. [Tier 2: Git-Based Team Mode](#tier-2-git-based-team-mode-recommended)
5. [Implementation Roadmap](#implementation-roadmap)
6. [Positives & Negatives Analysis](#positives--negatives-analysis)
7. [Technical Specifications](#technical-specifications)
8. [Risk Mitigation Strategies](#risk-mitigation-strategies)
9. [Optional: Tier 3 Cloud Sync](#optional-tier-3-cloud-sync)
10. [Competitive Advantages](#competitive-advantages)

---

## 🎯 Executive Summary

### The Opportunity

Anthropic's Claude Code Web validates the market but **lacks team collaboration features**. Coder1 can capture the "professional development teams" market by adding Git-based session sharing - a feature that:

- Leverages existing infrastructure (90% already built)
- Requires no new servers (uses Git)
- Ships in 2-3 weeks (not months)
- Provides enterprise-ready privacy (self-hosted)
- Differentiates from Claude Code Web (they have nothing)

### The Solution

**Three-tier approach** (only Tier 2 needs implementation now):

```
Tier 1: Solo Mode (Current) ✅ SHIPPED
- Local Coder1 IDE + Claude CLI bridge
- SQLite session history
- $0/month

Tier 2: Git-Based Team Mode ⏳ READY TO IMPLEMENT
- Session export/import via Git commits
- Shared team memory across developers
- Claude can search team context
- $0/month (uses existing Git infrastructure)

Tier 3: Cloud Sync (Optional Future)
- Real-time session synchronization
- Web dashboard for team insights
- $9/month/team (only if teams demand it)
```

### Recommended Action

**Implement Tier 2 when bandwidth available** (2-3 weeks effort):
- Fast to ship (reuses existing code)
- Low risk (proven Git technology)
- High value (unique competitive advantage)
- Validates demand (before investing in cloud infrastructure)

---

## 📊 Strategic Context: Claude Code Web

### What Anthropic Launched (October 2025)

**Claude Code Web** is a hosted version of Claude Code CLI with:
- Runs in Anthropic's containers (no local installation)
- Web UI for terminal interaction
- Parallel tasks across repositories
- Automatic PR creation
- "Teleport" to local CLI (session download)
- Mobile access (iPhone app)
- **$20-200/month required** (Pro/Max subscription)

### What They DON'T Have (Our Opportunity)

| Feature | Claude Code Web | Coder1 Opportunity |
|---------|----------------|-------------------|
| **Team Memory** | ❌ None | ✅ Git-based session sharing |
| **Session Persistence** | ❌ Session-only | ✅ Permanent history |
| **Privacy** | ❌ Anthropic containers | ✅ 100% local/self-hosted |
| **Offline Work** | ❌ Requires internet | ✅ Full offline capability |
| **Team Collaboration** | ❌ Individual only | ✅ Shared team context |
| **Cost** | ❌ $240-2400/year | ✅ $0 with Git |
| **Enterprise** | ❌ Cloud only | ✅ Self-hosted option |

### Market Positioning

**Claude Code Web**: Quick tasks, mobile access, casual users  
**Coder1 IDE**: Professional development, team projects, enterprise

**They validated the market. We own the "serious development" segment.**

---

## 🏗️ Architecture Overview

### Current State (Tier 1: Solo)

```
Developer's Machine:
┌─────────────────────────┐
│ Coder1 IDE (localhost)  │
│         ↓               │
│ Claude Code CLI         │
│         ↓               │
│ SQLite memory.db        │
│         ↓               │
│ Git repository (code)   │
└─────────────────────────┘

✅ What works: Individual productivity, session history, privacy
❌ What's missing: No team collaboration
```

### Proposed State (Tier 2: Git-Based Teams)

```
Team Repository Structure:
my-project/
├── src/                    # Code (existing)
├── .git/                   # Git (existing)
└── .coder1/               # NEW: Team sessions directory
    ├── sessions/
    │   ├── 2025-01-20-alice-auth-feature.json
    │   ├── 2025-01-20-bob-api-refactor.json
    │   └── 2025-01-21-charlie-bug-fix.json
    └── .gitignore         # Exclude local SQLite databases

Workflow:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Alice     │     │     Bob     │     │   Charlie   │
│  (Local)    │     │   (Local)   │     │   (Local)   │
│             │     │             │     │             │
│ 1. Code     │     │ 3. Git pull │     │ 5. Git pull │
│ 2. Export   │────▶│ 4. Import   │────▶│ 6. Import   │
│    session  │     │    Alice's  │     │    Alice &  │
│             │     │    session  │     │    Bob      │
│ 3. Git push │     │             │     │    sessions │
└─────────────┘     └─────────────┘     └─────────────┘
         │                  │                   │
         └──────────────────┼───────────────────┘
                            ↓
                    Shared Team Memory
              (Each dev's local SQLite rebuilt
               from session JSON files in Git)
```

**Key Innovation**: Session files are version-controlled like code. Each developer maintains a local SQLite cache rebuilt from Git.

---

## 🚀 Tier 2: Git-Based Team Mode (RECOMMENDED)

### Core Concept: "Sessions as Pull Requests"

Developers already understand Git workflows. Apply the same mental model to sessions:

```
Code Workflow:           Session Workflow:
git commit              →  Export session
git push                →  Commit to .coder1/sessions/
git pull                →  Pull team sessions
git merge               →  Import into local memory
```

### How It Works

#### 1. Developer Works Locally
```typescript
// Alice codes on auth feature
$ claude help me implement JWT authentication

// Coder1 IDE tracks:
- Terminal history
- Claude conversations
- Files modified
- Commands executed
```

#### 2. Export Session
```typescript
// When Alice finishes, she clicks "Share Session"
// Coder1 generates: .coder1/sessions/2025-01-20-alice-auth.json

{
  "id": "sess_abc123",
  "author": "alice",
  "timestamp": "2025-01-20T14:30:00Z",
  "description": "Implemented JWT authentication",
  "tags": ["authentication", "security", "backend"],
  
  "conversations": [
    {
      "role": "user",
      "content": "claude help me implement JWT authentication",
      "timestamp": "2025-01-20T14:00:00Z"
    },
    {
      "role": "assistant", 
      "content": "I'll help you implement JWT auth. First...",
      "timestamp": "2025-01-20T14:00:15Z"
    }
  ],
  
  "filesModified": ["auth.ts", "middleware.ts", "types.ts"],
  "commands": ["npm install jsonwebtoken", "npm test"],
  "relatedSessions": []
}
```

#### 3. Commit to Git
```bash
# Automatic or manual
git add .coder1/sessions/2025-01-20-alice-auth.json
git commit -m "Session: Implemented JWT authentication (Alice)"
git push origin main
```

#### 4. Bob Pulls and Imports
```typescript
// Bob runs: git pull origin main
// Coder1 detects new session file(s)
// Shows notification: "📥 New session from Alice: Implemented JWT auth"
// Bob clicks "Import" → Added to his local SQLite memory

// Now when Bob asks Claude:
$ claude how did we implement authentication?

// Claude searches Bob's local memory (includes Alice's session!)
// Returns: "Based on Alice's session from Jan 20, we implemented 
//          JWT authentication using jsonwebtoken library..."
```

#### 5. Team Memory Builds Over Time
```
Week 1:  5 sessions  (alice × 3, bob × 2)
Week 2: 12 sessions  (+ charlie × 4, alice × 2, bob × 1)
Week 3: 20 sessions  (distributed across team)

→ Team develops shared knowledge base
→ Claude becomes "team-aware" AI assistant
→ New developers can review team history
→ Onboarding accelerated significantly
```

---

## 📋 Implementation Roadmap

### Phase 1: Session Export/Import (Week 1)

**Goal**: Manual export/import of sessions as JSON

**Tasks**:
1. Create `lib/session-sharing.ts`
   - `exportSession()` - Convert current state to JSON
   - `importSession()` - Load JSON into SQLite
   - Uses existing `TerminalContextExtractor`
   - Uses existing `contextDatabase`

2. Create UI components
   - `components/team/SessionShareButton.tsx` - Export button
   - `components/team/SessionImportButton.tsx` - Import button
   - Modal for session description/tags

3. Add session metadata to SQLite schema
   - Author field
   - Tags field
   - Related sessions field

**Deliverable**: Developers can manually export/import session JSON files

---

### Phase 2: Git Integration (Week 1-2)

**Goal**: Automatic save/load from `.coder1/sessions/` directory

**Tasks**:
1. Create `lib/git-session-sync.ts`
   - `autoCommitSession()` - Save session to Git on completion
   - `syncFromTeam()` - Pull and import new sessions
   - `detectNewSessions()` - Find unimported session files

2. Add Git hooks
   - Pre-commit: Validate session files
   - Post-merge: Auto-import new sessions

3. Create `.coder1/` directory structure
   ```
   .coder1/
   ├── sessions/        # Team session JSON files
   ├── .gitignore       # Exclude local SQLite
   └── README.md        # Explain directory purpose
   ```

4. Auto-sync on IDE startup
   - Pull team sessions on launch
   - Show notification if new sessions available

**Deliverable**: Sessions automatically sync via Git

---

### Phase 3: Team Memory Panel (Week 2)

**Goal**: Visual interface for browsing team sessions

**Tasks**:
1. Create `components/team/TeamMemoryPanel.tsx`
   - Timeline view of team sessions
   - Filter by author, tags, date
   - Search across all sessions
   - Import/export buttons

2. Session detail view
   - Show full conversation history
   - Display files modified
   - List commands executed
   - Related sessions links

3. Integration into main UI
   - Add "Team" tab to sidebar
   - Keyboard shortcut (Cmd+Shift+T)
   - Notification badge for new sessions

**Deliverable**: Beautiful UI for team session exploration

---

### Phase 4: Claude Team Context (Week 2-3)

**Goal**: Claude can search and use team session history

**Tasks**:
1. Create `lib/team-context-provider.ts`
   - `getRelevantTeamContext()` - Search sessions for query
   - SQLite FTS (Full-Text Search) integration
   - Ranking algorithm for relevance

2. Integrate with terminal commands
   - Automatically prepend team context to Claude queries
   - Show "🧠 Using team memory" indicator
   - Display which sessions were referenced

3. Session linking
   - Detect related sessions automatically
   - Suggest relevant past work
   - Build knowledge graph over time

**Deliverable**: Claude becomes team-aware AI assistant

---

### Phase 5: Polish & Testing (Week 3)

**Tasks**:
1. Sensitive data redaction
   - Auto-detect API keys, passwords, tokens
   - Pre-export review UI
   - Safe defaults

2. Performance optimization
   - SQLite FTS index creation
   - Lazy loading for large session lists
   - Compression for large terminal histories

3. User testing
   - Test with 2-3 person team
   - Gather feedback
   - Fix UX issues

4. Documentation
   - Team setup guide
   - Best practices
   - Troubleshooting

**Deliverable**: Production-ready team mode

---

## ⚖️ Positives & Negatives Analysis

### ✅ Positives

#### 1. **Leverages Existing Infrastructure** 🏗️
- 90% of required code already exists
- `TerminalContextExtractor` - Already built ✅
- SQLite storage - Already working ✅
- Git integration - Have `git-context.ts` ✅
- Session summaries - Already generating ✅

**Impact**: Ship in weeks, not months

#### 2. **No New Servers to Maintain** 🎉
- Git is the infrastructure
- No hosting costs
- No database to scale
- No WebSocket complexity
- No DevOps headaches

**Impact**: Stay focused on features, not infrastructure

#### 3. **Familiar Developer Workflow** 💻
- Developers already understand Git
- Natural audit trail (Git history)
- Built-in conflict resolution
- Works with existing PR reviews

**Impact**: Zero learning curve

#### 4. **Privacy-First by Default** 🔒
- Code never leaves company network
- Enterprise-ready from day one
- No compliance concerns
- Complete data ownership

**Impact**: Huge competitive advantage over Claude Code Web

#### 5. **Async = Simple & Reliable** ⏰
- No race conditions
- No connection management
- Works perfectly offline
- Resilient to network issues

**Impact**: Much easier to build correctly

#### 6. **Incremental Adoption** 📈
- Solo → Git → Cloud (optional)
- No forced migration
- Each tier has clear value
- No lock-in

**Impact**: Reduces risk of "team features nobody uses"

---

### ❌ Negatives & Mitigations

#### 1. **Not Real-Time** ⚠️

**Problem**: Team members won't see sessions until they pull

**Scenario**:
```
10:00 AM - Alice working on auth.ts
10:05 AM - Bob starts on auth.ts (hasn't pulled)
10:30 AM - Git conflict
```

**Is this actually a problem?**
- Small teams (2-3): Fine (they communicate anyway)
- Large teams (10+): Could be frustrating
- Distributed teams: Perfect (async is desired)

**Mitigation**:
- Show notification badge when new sessions available
- Auto-pull on idle (don't interrupt work)
- Slack/Discord webhooks: "Alice just shared a session"

---

#### 2. **Git Repo Bloat** 📁

**Problem**: Session files accumulate

**Math**:
```
5 devs × 3 sessions/day × 30 days = 450 files/month
Average session: 50KB
Total: 22.5 MB/month
Annual: 270 MB
```

**Mitigations**:

**Option A: Git LFS** (Recommended)
```bash
git lfs track ".coder1/sessions/*.json"
# Sessions stored separately, pointers in repo
```

**Option B: Retention Policy**
```typescript
// Auto-delete sessions older than 90 days
await cleanupOldSessions(90);
```

**Option C: Separate Repo**
```
my-project/          # Code
my-project-sessions/ # Sessions (separate repo)
```

**Recommendation**: Start simple, add LFS if teams complain

---

#### 3. **SQLite Merge Conflicts** 💥

**Problem**: Binary database files can't be merged

**Solution**: **DON'T commit SQLite to Git**

```typescript
// Correct approach:
.coder1/
├── sessions/*.json      ← Commit these (mergeable)
└── local-cache.db       ← Don't commit (local only)

// On startup or git pull:
async function rebuildLocalCache() {
  const sessionFiles = await glob('.coder1/sessions/*.json');
  for (const file of sessionFiles) {
    const session = JSON.parse(await fs.readFile(file));
    await importSessionToSQLite(session);
  }
}
```

**Result**: JSON files = mergeable, SQLite = local cache only

---

#### 4. **Search Performance** 🐌

**Problem**: Searching 450+ JSON files is slow

**Without optimization**:
```typescript
// BAD: 2-5 seconds for 450 files
for (const file of allSessions) {
  const session = JSON.parse(await fs.readFile(file));
  if (matches(session, query)) results.push(session);
}
```

**Solution: SQLite FTS** (Recommended)
```sql
-- Use SQLite's Full-Text Search
CREATE VIRTUAL TABLE sessions_fts USING fts5(
  session_id,
  author,
  description,
  conversations
);

-- Search in <50ms even with 10,000 sessions
SELECT * FROM sessions_fts WHERE sessions_fts MATCH 'authentication';
```

**Result**: Fast search with existing infrastructure

---

#### 5. **Sensitive Data in Sessions** 🔐

**Problem**: Sessions might contain secrets

**Example**:
```bash
$ export DATABASE_URL=postgres://user:password@host/db
# Gets captured in session → committed to Git → permanent
```

**Solution: Automatic Redaction** (Recommended)

```typescript
const SENSITIVE_PATTERNS = [
  /api[_-]?key[=:]\s*['"]?([^\s'"]+)/gi,
  /password[=:]\s*['"]?([^\s'"]+)/gi,
  /token[=:]\s*['"]?([^\s'"]+)/gi,
  /secret[=:]\s*['"]?([^\s'"]+)/gi,
  /postgres:\/\/[^:]+:([^@]+)@/gi,
];

function redactSensitiveData(text: string): string {
  let redacted = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, (match) => {
      return match.replace(/[^:=\s'"]/g, '*');
    });
  }
  return redacted;
}
```

**Plus: Pre-Export Review UI**
```typescript
<SessionExportPreview>
  <Warning>⚠️ Potential sensitive data detected:</Warning>
  <ul>
    <li>Line 42: "export API_KEY=sk-..." [Redact] [Keep]</li>
  </ul>
  <button>Export with Redactions</button>
</SessionExportPreview>
```

**Result**: Automatic protection + user control

---

#### 6. **Large Terminal History** 📊

**Problem**: 100,000 line terminal history = 8MB session

**Solution: Smart Truncation + Compression**

```typescript
// Keep important lines only
function smartTruncate(history: string[]): string[] {
  const important = history.filter(line => {
    return line.includes('claude ') ||
           line.includes('error') ||
           line.includes('npm install') ||
           line.startsWith('$');
  });
  
  return important.length < 200 
    ? important 
    : history.slice(-200);
}

// Then compress
const compressed = await gzip(JSON.stringify(session));
// 8 MB → 800 KB (10x reduction)
```

**Result**: Sessions stay small and fast

---

## 💻 Technical Specifications

### File Structure

```
coder1-ide-next/
├── lib/
│   ├── session-sharing.ts        # NEW: Export/import logic
│   ├── git-session-sync.ts       # NEW: Git integration
│   ├── team-context-provider.ts  # NEW: Team memory search
│   ├── sensitive-data-filter.ts  # NEW: Auto-redaction
│   └── terminal-context-extractor.ts  # EXISTING: Reuse
│
├── components/
│   └── team/                     # NEW: Team UI components
│       ├── SessionShareButton.tsx
│       ├── SessionImportButton.tsx
│       ├── TeamMemoryPanel.tsx
│       ├── SessionCard.tsx
│       └── SessionDetailView.tsx
│
├── db/
│   └── migrations/
│       └── 003_add_team_fields.sql  # NEW: Add author, tags
│
└── .coder1/                      # NEW: Team session storage
    ├── sessions/
    │   └── *.json                # Team session files
    ├── .gitignore                # Exclude local cache
    └── README.md                 # Documentation
```

---

### Key Interfaces

```typescript
// lib/session-sharing.ts

export interface SessionExport {
  id: string;
  author: string;
  timestamp: Date;
  projectPath: string;
  
  description: string;
  tags: string[];
  relatedSessions: string[];
  
  conversations: ConversationMessage[];
  filesModified: string[];
  commands: string[];
  terminalHistory: string[];
}

export class SessionSharing {
  static async exportSession(
    sessionId: string,
    author: string,
    description: string
  ): Promise<SessionExport> {
    const context = TerminalContextExtractor.extractContext(xtermInstance);
    const filesModified = await GitContext.getModifiedFiles();
    
    return {
      id: generateSessionId(),
      author,
      timestamp: new Date(),
      projectPath: process.cwd(),
      description,
      tags: extractTags(description),
      conversations: context.messages,
      filesModified,
      commands: context.commands,
      terminalHistory: context.messages.map(m => m.content),
      relatedSessions: []
    };
  }
  
  static async importSession(sessionData: SessionExport): Promise<void> {
    await contextDatabase.storeSession({
      id: sessionData.id,
      author: sessionData.author,
      timestamp: sessionData.timestamp,
      description: sessionData.description,
      conversations: sessionData.conversations,
      filesModified: sessionData.filesModified
    });
  }
}
```

---

```typescript
// lib/git-session-sync.ts

export class GitSessionSync {
  private readonly sessionsDir = '.coder1/sessions';
  
  async autoCommitSession(session: SessionExport): Promise<void> {
    const filename = this.generateFilename(session);
    const filepath = path.join(this.sessionsDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(session, null, 2));
    await exec(`git add ${filepath}`);
    await exec(`git commit -m "Session: ${session.description} (${session.author})"`);
  }
  
  async syncFromTeam(): Promise<SessionExport[]> {
    await exec('git pull origin main');
    
    const sessionFiles = await glob(`${this.sessionsDir}/*.json`);
    const newSessions: SessionExport[] = [];
    
    for (const file of sessionFiles) {
      const session = JSON.parse(await fs.readFile(file, 'utf-8'));
      
      const exists = await contextDatabase.sessionExists(session.id);
      if (!exists) {
        await SessionSharing.importSession(session);
        newSessions.push(session);
      }
    }
    
    return newSessions;
  }
  
  private generateFilename(session: SessionExport): string {
    const date = session.timestamp.toISOString().split('T')[0];
    const slug = slugify(session.description);
    return `${date}-${session.author}-${slug}.json`;
  }
}
```

---

```typescript
// lib/team-context-provider.ts

export class TeamContextProvider {
  static async getRelevantTeamContext(query: string): Promise<string> {
    const sessions = await contextDatabase.searchSessions(query);
    
    if (sessions.length === 0) return '';
    
    const contextLines = [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '🧠 TEAM MEMORY CONTEXT:',
      ''
    ];
    
    for (const session of sessions.slice(0, 3)) {
      contextLines.push(`📝 ${session.author} - ${session.description} (${formatDate(session.timestamp)})`);
      contextLines.push('');
      
      const relevant = session.conversations.filter(c => 
        c.content.toLowerCase().includes(query.toLowerCase())
      );
      
      for (const conv of relevant.slice(0, 2)) {
        contextLines.push(`  ${conv.role}: ${conv.content.substring(0, 200)}...`);
      }
      
      contextLines.push('');
    }
    
    contextLines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return contextLines.join('\n');
  }
}
```

---

### Database Schema Changes

```sql
-- db/migrations/003_add_team_fields.sql

ALTER TABLE context_sessions ADD COLUMN author TEXT;
ALTER TABLE context_sessions ADD COLUMN tags TEXT;
ALTER TABLE context_sessions ADD COLUMN related_sessions TEXT;

CREATE VIRTUAL TABLE sessions_fts USING fts5(
  session_id UNINDEXED,
  author,
  description,
  conversations,
  content='context_sessions',
  content_rowid='rowid'
);

CREATE TRIGGER sessions_fts_insert AFTER INSERT ON context_sessions BEGIN
  INSERT INTO sessions_fts(rowid, session_id, author, description, conversations)
  VALUES (new.rowid, new.id, new.author, new.summary, new.terminal_commands);
END;
```

---

## 🛡️ Risk Mitigation Strategies

### Strategy 1: Sensitive Data Protection

**Implementation**:
```typescript
// lib/sensitive-data-filter.ts

export const SENSITIVE_PATTERNS = [
  { name: 'API Keys', pattern: /api[_-]?key[=:]\s*['"]?([^\s'"]+)/gi },
  { name: 'Passwords', pattern: /password[=:]\s*['"]?([^\s'"]+)/gi },
  { name: 'Tokens', pattern: /token[=:]\s*['"]?([^\s'"]+)/gi },
  { name: 'Secrets', pattern: /secret[=:]\s*['"]?([^\s'"]+)/gi },
  { name: 'DB URLs', pattern: /postgres:\/\/[^:]+:([^@]+)@/gi },
  { name: 'Private Keys', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/gi }
];

export function detectSensitiveData(text: string): Array<{
  line: number;
  type: string;
  preview: string;
}> {
  const detections = [];
  const lines = text.split('\n');
  
  lines.forEach((line, index) => {
    SENSITIVE_PATTERNS.forEach(({ name, pattern }) => {
      if (pattern.test(line)) {
        detections.push({
          line: index + 1,
          type: name,
          preview: line.substring(0, 50) + '...'
        });
      }
    });
  });
  
  return detections;
}

export function redactSensitiveData(text: string): string {
  let redacted = text;
  
  SENSITIVE_PATTERNS.forEach(({ pattern }) => {
    redacted = redacted.replace(pattern, (match) => {
      const prefix = match.substring(0, Math.min(10, match.length));
      return prefix + '*'.repeat(Math.max(0, match.length - 10));
    });
  });
  
  return redacted;
}
```

**UI Integration**:
```typescript
// components/team/SessionExportDialog.tsx

const SessionExportDialog = ({ session }) => {
  const [detections, setDetections] = useState([]);
  const [redactAll, setRedactAll] = useState(true);
  
  useEffect(() => {
    const detected = detectSensitiveData(JSON.stringify(session));
    setDetections(detected);
  }, [session]);
  
  return (
    <Dialog>
      <h2>Export Session</h2>
      
      {detections.length > 0 && (
        <Alert type="warning">
          ⚠️ Potential sensitive data detected:
          <ul>
            {detections.map((d, i) => (
              <li key={i}>
                Line {d.line}: {d.type} - {d.preview}
              </li>
            ))}
          </ul>
          
          <Checkbox 
            checked={redactAll}
            onChange={setRedactAll}
          >
            Automatically redact sensitive data
          </Checkbox>
        </Alert>
      )}
      
      <button onClick={() => exportWithRedaction(session, redactAll)}>
        Export Session
      </button>
    </Dialog>
  );
};
```

---

### Strategy 2: Performance Optimization

**SQLite FTS Index Creation**:
```typescript
// lib/search-index.ts

export async function createSearchIndex(): Promise<void> {
  await contextDatabase.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS sessions_fts USING fts5(
      session_id UNINDEXED,
      author,
      description,
      conversations,
      tags
    );
  `);
  
  const sessions = await contextDatabase.getAllSessions();
  
  for (const session of sessions) {
    await contextDatabase.exec(`
      INSERT INTO sessions_fts (session_id, author, description, conversations, tags)
      VALUES (?, ?, ?, ?, ?)
    `, [
      session.id,
      session.author,
      session.description,
      JSON.stringify(session.conversations),
      session.tags?.join(' ')
    ]);
  }
}

export async function searchSessions(query: string, limit = 10): Promise<SessionExport[]> {
  const results = await contextDatabase.query(`
    SELECT 
      sessions.*,
      rank AS relevance
    FROM sessions_fts
    JOIN context_sessions AS sessions ON sessions.id = sessions_fts.session_id
    WHERE sessions_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `, [query, limit]);
  
  return results;
}
```

**Lazy Loading for Large Lists**:
```typescript
// components/team/TeamMemoryPanel.tsx

const TeamMemoryPanel = () => {
  const [sessions, setSessions] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const loadMore = async () => {
    setLoading(true);
    const newSessions = await loadSessionsPage(page, 20);
    setSessions([...sessions, ...newSessions]);
    setPage(page + 1);
    setLoading(false);
  };
  
  return (
    <div className="team-memory">
      <VirtualList
        items={sessions}
        itemHeight={100}
        onNearBottom={loadMore}
      />
      {loading && <Spinner />}
    </div>
  );
};
```

---

### Strategy 3: Git LFS for Large Repos

**Setup Script**:
```bash
# .coder1/setup-git-lfs.sh

#!/bin/bash

# Check if Git LFS is installed
if ! command -v git-lfs &> /dev/null; then
  echo "Installing Git LFS..."
  brew install git-lfs  # macOS
  # apt-get install git-lfs  # Ubuntu
  # choco install git-lfs  # Windows
fi

# Initialize Git LFS
git lfs install

# Track session files
git lfs track ".coder1/sessions/*.json"

# Commit .gitattributes
git add .gitattributes
git commit -m "Configure Git LFS for session files"

echo "✅ Git LFS configured for Coder1 sessions"
```

**Documentation**:
```markdown
# .coder1/README.md

## Git LFS (Optional)

If your team generates many sessions (50+ per month), consider using Git LFS:

1. Install: `brew install git-lfs`
2. Run: `.coder1/setup-git-lfs.sh`
3. Sessions will be stored efficiently

Without LFS: ~270 MB/year added to repo
With LFS: ~5 MB/year (pointers only)
```

---

## 🌥️ Optional: Tier 3 Cloud Sync

**Only implement if teams demand real-time sync** (after shipping Tier 2)

### Architecture

```
Coder1 Cloud Sync Server (Single Instance):
┌─────────────────────────────────────┐
│ - PostgreSQL (team database)       │
│ - REST API (session CRUD)          │
│ - WebSocket (real-time)            │
│ - Web dashboard (analytics)        │
└─────────────────────────────────────┘
              ↕️ HTTPS/WSS
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Dev A   │  │  Dev B   │  │  Dev C   │
│ (Local)  │  │ (Local)  │  │ (Local)  │
└──────────┘  └──────────┘  └──────────┘
```

### Features
- Real-time session notifications
- Web dashboard for team insights
- Session analytics (who, what, when)
- Advanced search across all teams
- Usage metrics and trends

### Pricing
- $9/month per team (up to 10 developers)
- $19/month for 11-25 developers
- Enterprise: Custom pricing

### Tech Stack
- Backend: Node.js + Express + Socket.IO
- Database: PostgreSQL with full-text search
- Frontend: Next.js dashboard
- Hosting: Render or Railway

**Estimated Effort**: 4-6 weeks (only if validated demand)

---

## 🎯 Competitive Advantages

### vs Claude Code Web

| Feature | Claude Code Web | Coder1 Git Team Mode |
|---------|----------------|---------------------|
| **Team Memory** | ❌ None | ✅ Full history via Git |
| **Privacy** | ❌ Cloud containers | ✅ Self-hosted |
| **Cost** | $240-2400/year | $0 (Git) |
| **Offline** | ❌ Requires internet | ✅ Full offline |
| **Enterprise** | ❌ Cloud only | ✅ On-premise ready |
| **Audit Trail** | ⚠️ Limited | ✅ Full Git history |
| **Claude Context** | ❌ Forgets sessions | ✅ Searches team memory |

### vs Cursor

| Feature | Cursor | Coder1 Git Team Mode |
|---------|--------|---------------------|
| **Team Mode** | ❌ None | ✅ Git-based |
| **AI Memory** | ⚠️ Session only | ✅ Permanent team memory |
| **Privacy** | ⚠️ Cloud sync | ✅ Local/Git |
| **Cost** | $20/month | $0 (Git) |

### vs GitHub Copilot

| Feature | GitHub Copilot | Coder1 Git Team Mode |
|---------|---------------|---------------------|
| **Team Sessions** | ❌ None | ✅ Full sharing |
| **Context Memory** | ❌ File only | ✅ Full history |
| **Claude Code** | ❌ No | ✅ Native |

---

## 📊 Success Metrics

### Phase 1 (Week 4)
- [ ] 5+ teams testing Git-based mode
- [ ] Session export/import working smoothly
- [ ] Zero security incidents (sensitive data)
- [ ] Positive user feedback

### Phase 2 (Month 2)
- [ ] 20+ teams using regularly
- [ ] Average 10+ sessions per team per week
- [ ] Search performance <100ms
- [ ] 90%+ user satisfaction

### Phase 3 (Month 3)
- [ ] Feature parity with Claude Code Web team features
- [ ] Documentation complete
- [ ] Ready for marketing push

---

## 🚀 Next Steps

### When Ready to Implement:

1. **Week 1**: Start with Phase 1 (Session Export/Import)
   - Create `lib/session-sharing.ts`
   - Build export/import UI
   - Test with single session

2. **Week 2**: Add Git Integration (Phase 2)
   - Create `lib/git-session-sync.ts`
   - Auto-commit on session complete
   - Auto-import on git pull

3. **Week 3**: Build Team Memory Panel (Phase 3)
   - Create team UI components
   - SQLite FTS for search
   - Claude team context integration

4. **Week 4**: Polish & Launch (Phase 5)
   - Sensitive data protection
   - Performance optimization
   - User testing
   - Documentation

### Priority Dependencies:
- None! This can be implemented anytime
- All required infrastructure already exists
- No blocking issues identified

---

## 📚 Additional Resources

### Related Documentation
- `PARALLEL_AI_AGENTS_SYSTEM.md` - Multi-agent architecture
- `CONTEXT_MEMORY_REALITY.md` - Current memory system
- `ALPHA_LAUNCH_READY.md` - Bridge system architecture

### External References
- [Git LFS Documentation](https://git-lfs.github.com/)
- [SQLite FTS5 Guide](https://www.sqlite.org/fts5.html)
- [Session Storage Best Practices](https://web.dev/storage-for-the-web/)

---

## 💬 Questions or Concerns?

This roadmap represents a comprehensive plan based on:
- Current Coder1 architecture analysis
- Competitive landscape (Claude Code Web)
- Developer workflow best practices
- Risk analysis and mitigation

**Ready to implement when priorities align.**

**Estimated Total Effort**: 2-3 weeks for production-ready Tier 2

**Expected Impact**: 
- Unique competitive advantage
- Enterprise-ready feature
- Zero ongoing infrastructure costs
- Fast time to market

---

**Document Status**: Complete and ready for implementation  
**Last Updated**: January 2025  
**Next Review**: When implementation begins
