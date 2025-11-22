# AI Mastermind Quick Start Guide

**For**: Claude Agents who want to start implementing immediately  
**Time to Read**: 5 minutes  
**Time to First Code**: 30 minutes

---

## 🎯 What You're Building

A multi-agent collaborative brainstorming system where 4 specialized AI personas (Innovation, Execution, Risk, Empathy) work together through:
1. **Phase 1**: Parallel ideation → Democratic voting → Best idea wins
2. **Phase 2**: Turn-based deliberation with BUILD/CRITIQUE/QUESTION actions
3. **Phase 3**: Comprehensive 4-section Markdown report

**Cost**: $0 (uses CLI Puppeteer, not API)  
**Timeline**: 2-3 weeks  
**Complexity**: Moderate (leverages existing Coder1 infrastructure)

---

## 📚 Essential Reading (30 minutes)

Before coding, read these sections in order:

### 1. Main Implementation Guide
**File**: `AI_MASTERMIND_IMPLEMENTATION_GUIDE.md`

**Read These Sections**:
- Section 1: Executive Summary (10 min) - Quick reference and key decisions
- Section 2: System Overview (15 min) - Understanding AI Mastermind concept
- Section 4: Coder1 Integration Strategy (20 min) - How it fits into Coder1

**Skip for Now**:
- Section 3: Python Reference Analysis (read when implementing specific services)
- Sections 5-13: Detailed implementation (reference as needed)

### 2. Integration Checklist
**File**: `integration-checklist.md`

**Purpose**: Track your progress, validate each step

### 3. Test Data
**File**: `test-data-examples.json`

**Purpose**: Mock agent responses for testing without running real agents

---

## 🚀 Implementation Sequence (17 Days)

### Week 1: Foundation (Days 1-5)

#### Day 1: Types & Personas (4-6 hours)
```bash
# Create these files:
1. /types/mastermind.ts
2. /services/mastermind-personas.ts
3. /lib/mastermind-config.ts

# Validation:
npx tsc --noEmit  # Should compile with 0 errors
```

**Key Code to Write**:
- 10 TypeScript interfaces (MastermindPersona, IdeaConcept, VoteRecord, etc.)
- 4 persona definitions with system prompts
- Default configuration values

**Reference**: Sections 3.2 (personas) and implementation guide types section

#### Day 2: Orchestrator Skeleton (4-6 hours)
```bash
# Create:
/services/mastermind-orchestrator.ts

# Validation:
npm test services/mastermind-orchestrator  # Basic tests
```

**Key Methods**:
- `addToHistory(speaker, content, action)`
- `getConversationContext()`
- `generatePhasePrompt(phase, agent)`

**Reference**: Section 3.1 (orchestrator Python analysis)

#### Day 3: Phase One Service (4-6 hours)
```bash
# Create:
/services/phase-one-service.ts

# Validation:
npm test services/phase-one-service  # Vote parsing tests
```

**Critical Code**:
```typescript
// Vote parsing regex
const conceptMatch = responseContent.match(/Concept ID:\s*(\S+)/i);
const justificationMatch = responseContent.match(/Justification:\s*(.+)/is);

// Tie-breaking logic
if (tiedConcepts.length > 1) {
  const userVote = votes.find(v => v.voterId === 'user');
  if (userVote && tiedConcepts.includes(userVote.conceptId)) {
    winner = userVote.conceptId;  // User vote wins tie
  }
}
```

**Reference**: Section 3.3 (Phase One analysis)

#### Day 4: Phase Two Service (4-6 hours)
```bash
# Create:
/services/phase-two-service.ts

# Validation:
npm test services/phase-two-service  # Action parsing tests
```

**Critical Code**:
```typescript
// Action parsing regex
const actionMatch = responseContent.match(/Action:\s*(BUILD|CRITIQUE|QUESTION)/i);

// Natural conclusion detection
if (turns.length >= 3) {
  const lastThree = turns.slice(-3);
  if (lastThree.every(t => t.action === 'QUESTION')) {
    return false;  // Stop deliberation
  }
}
```

**Reference**: Section 3.4 (Phase Two analysis)

#### Day 5: Report Generator (4-6 hours)
```bash
# Create:
/services/report-generator-service.ts

# Validation:
const report = generator.generateFullReport();
console.assert(report.includes('## 1. Executive Summary'));
```

**4-Section Structure**:
1. Executive Summary (winning concept, session stats)
2. Detailed Project Plan (BUILD actions)
3. Unresolved Risks (CRITIQUE + QUESTION actions)
4. Future Enhancements (deferred ideas)

**Reference**: Section 3.5 (Report Generator analysis)

### Week 2: API & Database (Days 6-10)

#### Day 6: Database Schema (2-3 hours)
```bash
# Create migration:
/db/migrations/001_add_mastermind_tables.sql

# Run migration:
sqlite3 data/sessions.db < db/migrations/001_add_mastermind_tables.sql

# Verify:
sqlite3 data/sessions.db ".tables"
# Should show: mastermind_sessions, mastermind_concepts, mastermind_votes, mastermind_turns
```

**Reference**: Section 4 (Database Schema Extensions)

#### Day 7-8: API Routes (6-8 hours total)
```bash
# Create 6 routes:
/app/api/mastermind/start/route.ts
/app/api/mastermind/vote/route.ts
/app/api/mastermind/deliberate/route.ts
/app/api/mastermind/contribute/route.ts
/app/api/mastermind/status/route.ts
/app/api/mastermind/report/route.ts

# Test each route:
curl -X POST http://localhost:3001/api/mastermind/start \
  -H "Content-Type: application/json" \
  -d '{"problemStatement": "Test"}'
```

**Pattern for Each Route**:
```typescript
export async function POST(request: NextRequest) {
  try {
    const { sessionId, ...data } = await request.json();
    const result = await mastermindService.doSomething(data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

#### Day 9: WebSocket Events (3-4 hours)
```bash
# Modify:
/server.js  # Add around line 200-250

# Events to add:
socket.on('mastermind:start', ...)
socket.on('mastermind:vote', ...)
socket.on('mastermind:contribute', ...)

# Emits:
socket.emit('mastermind:phase-update', ...)
socket.emit('mastermind:agent-response', ...)
socket.emit('mastermind:turn-complete', ...)
```

#### Day 10: Zustand Store (3-4 hours)
```bash
# Create:
/stores/useMastermindStore.ts

# Validation:
const { startSession } = useMastermindStore();
await startSession('Test problem');
```

**Store Structure**:
```typescript
interface MastermindStore {
  currentSession: MastermindSession | null;
  phase: MastermindPhase;
  concepts: IdeaConcept[];
  votes: VoteRecord[];
  deliberationTurns: DeliberationTurn[];
  report: MastermindReport | null;
  
  startSession: (problemStatement: string) => Promise<void>;
  submitVote: (conceptId: string, justification: string) => Promise<void>;
  submitTurn: (action: ActionType, content: string) => Promise<void>;
  generateReport: () => Promise<void>;
}
```

### Week 3: UI & Integration (Days 11-17)

#### Day 11-13: UI Components (12 hours total)
```bash
# Create 7 components:
/components/mastermind/MastermindPanel.tsx
/components/mastermind/PhaseIndicator.tsx
/components/mastermind/IdeationView.tsx
/components/mastermind/VotingInterface.tsx
/components/mastermind/DeliberationView.tsx
/components/mastermind/ReportViewer.tsx
/components/mastermind/AgentAvatar.tsx
```

**Start with**: MastermindPanel → PhaseIndicator → IdeationView → VotingInterface → DeliberationView → ReportViewer

**Design System**:
- Colors: Tokyo Night theme (`#1a1b26` background, `#7aa2f7` primary)
- Persona colors: Innovation `#FF6B6B`, Execution `#4ECDC4`, Risk `#FFE66D`, Empathy `#A8DADC`
- Components: Use existing Coder1 button/card/modal patterns

#### Day 14: Status Bar Integration (2-3 hours)
```bash
# Modify:
/components/status-bar/StatusBarCore.tsx
```

**Code to Add**:
```typescript
const [showMastermind, setShowMastermind] = useState(false);

// In render:
<button onClick={() => setShowMastermind(true)}>
  🧠 AI Mastermind
</button>

{showMastermind && (
  <MastermindPanel onClose={() => setShowMastermind(false)} />
)}
```

#### Day 15: CLI Puppeteer Integration (3-4 hours)
```bash
# Modify:
/services/claude-code-bridge.ts
```

**Add Function**:
```typescript
export async function spawnMastermindAgents(
  problemStatement: string,
  personas: MastermindPersona[],
  phase: 'ideation' | 'deliberation',
  context?: string
): Promise<ClaudeAgentResponse[]> {
  // Use existing spawnParallelAgents infrastructure
  // Return responses from all agents
}
```

#### Day 16: Integration Testing (6-8 hours)
```bash
# Run full flow tests:
npm run test:integration

# Manual E2E test:
1. Click "🧠 AI Mastermind" in status bar
2. Enter problem statement
3. Verify Phase 1 (ideation → voting → winner)
4. Verify Phase 2 (deliberation → turns → conclusion)
5. Verify Phase 3 (report generation → export)
```

#### Day 17: Polish & Documentation (4-6 hours)
- Add loading spinners
- Add error messages
- Write user guide
- Create demo GIF/video
- Final testing

---

## 🔑 Critical Code Patterns

### 1. Regex Patterns (Don't Modify These!)

```typescript
// Vote parsing
const conceptMatch = /Concept ID:\s*(\S+)/i;
const justificationMatch = /Justification:\s*(.+)/is;

// Action parsing
const actionMatch = /Action:\s*(BUILD|CRITIQUE|QUESTION)/i;
```

### 2. Natural Conclusion Detection

```typescript
if (turns.length >= 3) {
  const lastThree = turns.slice(-3);
  const allQuestions = lastThree.every(turn => turn.action === 'QUESTION');
  if (allQuestions) return false;  // Stop deliberation
}
```

### 3. Tie-Breaking Logic

```typescript
if (winners.length > 1) {
  const userVote = votes.find(v => v.voterId === 'user');
  if (userVote && winners.includes(userVote.conceptId)) {
    return userVote.conceptId;  // User vote wins
  } else {
    return winners[0];  // Earliest submission wins
  }
}
```

### 4. WebSocket Event Pattern

```typescript
// Client emits
socket.emit('mastermind:start', { problemStatement });

// Server handles
socket.on('mastermind:start', async ({ problemStatement }) => {
  const session = await orchestrator.startSession(problemStatement);
  socket.emit('mastermind:phase-update', { phase: 'ideation', session });
});

// Client receives
socket.on('mastermind:phase-update', ({ phase, session }) => {
  useMastermindStore.setState({ phase, currentSession: session });
});
```

---

## ✅ Validation Checkpoints

After each day, run these validations:

### Day 1 ✓
```bash
npx tsc --noEmit  # 0 errors
```

### Day 3 ✓
```bash
npm test services/phase-one-service
# Verify vote parsing works with test-data-examples.json
```

### Day 4 ✓
```bash
npm test services/phase-two-service
# Verify action parsing and natural conclusion detection
```

### Day 6 ✓
```bash
sqlite3 data/sessions.db ".tables"
# Should show 4 new mastermind tables
```

### Day 10 ✓
```typescript
const store = useMastermindStore();
console.assert(typeof store.startSession === 'function');
console.assert(typeof store.submitVote === 'function');
```

### Day 14 ✓
```bash
# Navigate to http://localhost:3001/ide
# Status bar should show "🧠 AI Mastermind" button
```

### Day 16 ✓
```bash
# Complete full E2E flow from problem statement → report
# Export report in all 3 formats (MD/JSON/HTML)
```

---

## 🚨 Common Pitfalls to Avoid

### 1. Regex Parsing
❌ **Wrong**: `const match = /Concept ID: (.+)/` (no \s*, no case-insensitive flag)  
✅ **Right**: `const match = /Concept ID:\s*(\S+)/i`

### 2. Conversation History
❌ **Wrong**: Storing only agent responses  
✅ **Right**: Store ALL interactions (agents + user) with timestamps and action types

### 3. Phase Transitions
❌ **Wrong**: Auto-advancing phases without user confirmation  
✅ **Right**: Wait for explicit user action or API call to transition

### 4. CLI Puppeteer Integration
❌ **Wrong**: Creating new puppeteer spawning logic  
✅ **Right**: Use existing `spawnParallelAgents` from claude-code-bridge.ts

### 5. Database Persistence
❌ **Wrong**: Storing entire conversation in one JSON blob  
✅ **Right**: Separate tables for concepts, votes, turns (normalized schema)

---

## 💡 Quick Tips

1. **Use Test Data First**: Before integrating real CLI Puppeteer, use `test-data-examples.json` for faster iteration

2. **Test Each Phase Independently**: Don't wait until everything is done - test Phase 1 thoroughly before moving to Phase 2

3. **WebSocket Debug Tool**: Use browser console to monitor socket events:
   ```javascript
   const socket = io('http://localhost:3001');
   socket.onAny((event, ...args) => {
     console.log('Socket event:', event, args);
   });
   ```

4. **Database Queries**: Test your database queries directly:
   ```bash
   sqlite3 data/sessions.db
   SELECT * FROM mastermind_sessions;
   ```

5. **Component Iteration**: Build ugly working components first, then style them - function before form

---

## 📞 When You Get Stuck

### Problem: Vote parsing fails
**Solution**: Check the regex patterns in Section 3.3 of main guide. The Python reference has the exact patterns.

### Problem: CLI Puppeteer not spawning agents
**Solution**: Verify `claude-code-bridge.ts` exists and has `spawnParallelAgents` method. Reference existing AI Team implementation.

### Problem: WebSocket events not firing
**Solution**: Check server.js Socket.IO connection. Test with basic ping/pong events first.

### Problem: Database migration fails
**Solution**: Drop all mastermind tables and re-run migration:
```bash
sqlite3 data/sessions.db "DROP TABLE IF EXISTS mastermind_sessions;"
# Repeat for all 4 tables, then re-run migration
```

### Problem: UI components not rendering
**Solution**: Check console for errors. Verify Zustand store is imported correctly. Test store state with React DevTools.

---

## 🎯 Success Criteria

You'll know you're done when:

- ✅ Click "🧠 AI Mastermind" button → Panel opens
- ✅ Enter problem → 4 agents generate concepts in parallel
- ✅ Vote for concept → Winner selected democratically
- ✅ Deliberation proceeds turn-by-turn with clear action labels
- ✅ Report generates with all 4 sections
- ✅ Export works in MD/JSON/HTML formats
- ✅ All tests pass (90%+ coverage)
- ✅ Database persists all session data
- ✅ WebSocket events stream in real-time

---

## 🚀 Go Build It!

You have everything you need:
1. **Main Guide**: Complete implementation details
2. **Checklist**: Step-by-step validation
3. **Test Data**: Mock responses for testing
4. **This Quick Start**: Your roadmap

**Start with Day 1, validate each checkpoint, and you'll have a working AI Mastermind in 2-3 weeks.**

Good luck! 🎉

---

*Last Updated: January 2025*  
*For: Future Claude Agents implementing AI Mastermind*
