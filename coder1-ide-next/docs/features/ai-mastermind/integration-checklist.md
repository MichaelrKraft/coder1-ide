# AI Mastermind Integration Checklist

**Purpose**: Step-by-step verification checklist for implementing AI Mastermind  
**Use**: Check off each item as you complete it to ensure nothing is missed  
**Status Tracking**: ⏳ Not Started | 🚧 In Progress | ✅ Complete | ❌ Blocked

---

## Phase 1: Foundation (Days 1-4)

### Day 1: Types & Personas

#### Types Implementation
- [ ] ⏳ Create `/types/mastermind.ts`
- [ ] ⏳ Define `MastermindPersona` interface
- [ ] ⏳ Define `IdeaConcept` interface
- [ ] ⏳ Define `VoteRecord` interface
- [ ] ⏳ Define `ActionType` type ('BUILD' | 'CRITIQUE' | 'QUESTION')
- [ ] ⏳ Define `DeliberationTurn` interface
- [ ] ⏳ Define `MastermindPhase` type
- [ ] ⏳ Define `MastermindSession` interface
- [ ] ⏳ Define `MastermindReport` interface
- [ ] ⏳ Define `MastermindConfig` interface
- [ ] ⏳ Define `ClaudeAgentTask` interface
- [ ] ⏳ Define `ClaudeAgentResponse` interface
- [ ] ⏳ Run TypeScript compilation - no errors
- [ ] ⏳ Export all types from index

**Validation**:
```bash
cd coder1-ide-next
npx tsc --noEmit
# Should compile with 0 errors
```

#### Personas Implementation
- [ ] ⏳ Create `/services/mastermind-personas.ts`
- [ ] ⏳ Define `BASE_SYSTEM_PROMPT` constant
- [ ] ⏳ Define `MASTER_OF_INNOVATION` persona
  - [ ] ⏳ system_prompt includes BASE + role-specific
  - [ ] ⏳ color is `#FF6B6B`
  - [ ] ⏳ displayName has 🚀 emoji
- [ ] ⏳ Define `MASTER_OF_EXECUTION` persona
  - [ ] ⏳ system_prompt includes BASE + role-specific
  - [ ] ⏳ color is `#4ECDC4`
  - [ ] ⏳ displayName has ⚙️ emoji
- [ ] ⏳ Define `MASTER_OF_RISK` persona
  - [ ] ⏳ system_prompt includes BASE + role-specific
  - [ ] ⏳ color is `#FFE66D`
  - [ ] ⏳ displayName has ⚠️ emoji
- [ ] ⏳ Define `MASTER_OF_EMPATHY` persona
  - [ ] ⏳ system_prompt includes BASE + role-specific
  - [ ] ⏳ color is `#A8DADC`
  - [ ] ⏳ displayName has 💙 emoji
- [ ] ⏳ Export `getPersona(id: string)` function
- [ ] ⏳ Export `getAllPersonas()` function
- [ ] ⏳ Write unit test for persona retrieval
- [ ] ⏳ Test passes

**Validation**:
```typescript
import { getAllPersonas } from '@/services/mastermind-personas';
const personas = getAllPersonas();
console.assert(personas.length === 4, 'Should have 4 personas');
console.assert(personas[0].color === '#FF6B6B', 'Innovation color correct');
```

### Day 2: Configuration & Orchestrator Skeleton

#### Configuration
- [ ] ⏳ Create `/lib/mastermind-config.ts`
- [ ] ⏳ Define `DEFAULT_MAX_TURNS = 10`
- [ ] ⏳ Define `DEFAULT_TURN_TIMEOUT = 30000` (30s)
- [ ] ⏳ Define `DEFAULT_IDEATION_TIMEOUT = 60000` (60s)
- [ ] ⏳ Define `ENABLED_PERSONAS` (default: all 4)
- [ ] ⏳ Define `AUTO_PROGRESS_PHASES` (default: false)
- [ ] ⏳ Export `getMastermindConfig()` function
- [ ] ⏳ Export `updateMastermindConfig()` function

**Validation**:
```typescript
import { getMastermindConfig } from '@/lib/mastermind-config';
const config = getMastermindConfig();
console.assert(config.maxTurns === 10, 'Default max turns is 10');
```

#### Orchestrator Skeleton
- [ ] ⏳ Create `/services/mastermind-orchestrator.ts`
- [ ] ⏳ Define `MastermindOrchestrator` class
- [ ] ⏳ Implement constructor with problemStatement, projectContext
- [ ] ⏳ Implement `conversationHistory: ConversationEntry[]` property
- [ ] ⏳ Implement `sessionId` generation
- [ ] ⏳ Implement `addToHistory()` method
- [ ] ⏳ Implement `getConversationContext()` method
- [ ] ⏳ Implement `generatePhasePrompt()` method stub
- [ ] ⏳ Export singleton pattern or factory function
- [ ] ⏳ Write unit test for conversation history
- [ ] ⏳ Test passes

**Validation**:
```typescript
import { MastermindOrchestrator } from '@/services/mastermind-orchestrator';
const orch = new MastermindOrchestrator('Test problem', 'Test context');
orch.addToHistory('Innovation', 'Test message', 'BUILD');
console.assert(orch.conversationHistory.length === 1, 'History entry added');
```

### Day 3: Phase One Service

#### Phase One Implementation
- [ ] ⏳ Create `/services/phase-one-service.ts`
- [ ] ⏳ Define `PhaseOneService` class
- [ ] ⏳ Implement `processIdeationResponses()` method
  - [ ] ⏳ Handles `ClaudeAgentResponse[]` input
  - [ ] ⏳ Extracts concepts from responses
  - [ ] ⏳ Adds to conversation history
  - [ ] ⏳ Returns `IdeaConcept[]`
- [ ] ⏳ Implement `parseVoteResponse()` method
  - [ ] ⏳ Regex: `/Concept ID:\s*(\S+)/i`
  - [ ] ⏳ Regex: `/Justification:\s*(.+)/is`
  - [ ] ⏳ Returns `{ conceptId, justification }` or null
- [ ] ⏳ Implement `processVotingResponses()` method
  - [ ] ⏳ Parses all vote responses
  - [ ] ⏳ Tallies votes by concept
  - [ ] ⏳ Determines winner (with tie-breaking)
  - [ ] ⏳ Returns voting results
- [ ] ⏳ Implement `addUserVote()` method
- [ ] ⏳ Write unit tests for vote parsing
- [ ] ⏳ Write unit tests for tie-breaking
- [ ] ⏳ All tests pass

**Validation**:
```typescript
import { PhaseOneService } from '@/services/phase-one-service';
const service = new PhaseOneService(orchestrator);

const voteText = "Concept ID: concept_innovation\nJustification: Best idea";
const parsed = service.parseVoteResponse(voteText);
console.assert(parsed.conceptId === 'concept_innovation', 'Concept ID parsed');
console.assert(parsed.justification === 'Best idea', 'Justification parsed');
```

### Day 4: Phase Two Service

#### Phase Two Implementation
- [ ] ⏳ Create `/services/phase-two-service.ts`
- [ ] ⏳ Define `PhaseTwoService` class
- [ ] ⏳ Implement `parseActionResponse()` method
  - [ ] ⏳ Regex: `/Action:\s*(BUILD|CRITIQUE|QUESTION)/i`
  - [ ] ⏳ Extracts content after action declaration
  - [ ] ⏳ Defaults to BUILD if no action found
  - [ ] ⏳ Returns `{ action, content }`
- [ ] ⏳ Implement `processTurnResponse()` method
  - [ ] ⏳ Parses action from agent response
  - [ ] ⏳ Creates turn object
  - [ ] ⏳ Adds to conversation history
  - [ ] ⏳ Increments turn counter
- [ ] ⏳ Implement `addUserContribution()` method
- [ ] ⏳ Implement `shouldContinue()` method
  - [ ] ⏳ Checks max turns limit
  - [ ] ⏳ Detects natural conclusion (3 consecutive QUESTIONs)
  - [ ] ⏳ Returns boolean
- [ ] ⏳ Implement `getTurnScheduler()` method (round-robin)
- [ ] ⏳ Write unit tests for action parsing
- [ ] ⏳ Write unit tests for natural conclusion
- [ ] ⏳ All tests pass

**Validation**:
```typescript
import { PhaseTwoService } from '@/services/phase-two-service';
const service = new PhaseTwoService(orchestrator, winningConcept);

const actionText = "Action: BUILD\n\nLet's add this feature...";
const parsed = service.parseActionResponse(actionText);
console.assert(parsed.action === 'BUILD', 'Action parsed');
console.assert(parsed.content.includes('feature'), 'Content extracted');
```

---

## Phase 2: Services & Report Generation (Days 5-8)

### Day 5: Report Generator Service

#### Report Generation Implementation
- [ ] ⏳ Create `/services/report-generator-service.ts`
- [ ] ⏳ Define `ReportGeneratorService` class
- [ ] ⏳ Implement `generateFullReport()` method
  - [ ] ⏳ Calls all section generators
  - [ ] ⏳ Joins with double newlines
  - [ ] ⏳ Returns complete Markdown string
- [ ] ⏳ Implement `_generateHeader()` method
- [ ] ⏳ Implement `_generateExecutiveSummary()` method
  - [ ] ⏳ Includes winning concept
  - [ ] ⏳ Includes session stats
  - [ ] ⏳ Includes key decisions
- [ ] ⏳ Implement `_generateDetailedProjectPlan()` method
  - [ ] ⏳ Extracts BUILD actions
  - [ ] ⏳ Formats as feature breakdown
  - [ ] ⏳ Infers implementation phases
- [ ] ⏳ Implement `_generateUnresolvedRisks()` method
  - [ ] ⏳ Extracts CRITIQUE actions
  - [ ] ⏳ Extracts QUESTION actions
  - [ ] ⏳ Formats as risks and open questions
- [ ] ⏳ Implement `_generateFutureEnhancements()` method
- [ ] ⏳ Implement `_generateAppendix()` method
  - [ ] ⏳ Conversation statistics
  - [ ] ⏳ Participant contributions
  - [ ] ⏳ Full conversation history
- [ ] ⏳ Implement `exportAsJSON()` method
- [ ] ⏳ Implement `exportAsHTML()` method
- [ ] ⏳ Write unit test with mock session data
- [ ] ⏳ Test passes, report validates

**Validation**:
```typescript
import { ReportGeneratorService } from '@/services/report-generator-service';
const generator = new ReportGeneratorService(orchestrator, sessionData);
const report = generator.generateFullReport();

console.assert(report.includes('# AI Mastermind Session Report'), 'Has title');
console.assert(report.includes('## 1. Executive Summary'), 'Has section 1');
console.assert(report.includes('## 2. Detailed Project Plan'), 'Has section 2');
console.assert(report.includes('## 3. Unresolved Risks'), 'Has section 3');
console.assert(report.includes('## 4. Future Enhancements'), 'Has section 4');
```

### Day 6: Complete Orchestrator Integration

#### Orchestrator Complete Implementation
- [ ] ⏳ Complete `generatePhasePrompt()` method
  - [ ] ⏳ Handles 'ideation' phase
  - [ ] ⏳ Handles 'voting' phase
  - [ ] ⏳ Handles 'deliberation' phase
- [ ] ⏳ Implement phase transition logic
- [ ] ⏳ Integrate PhaseOneService
- [ ] ⏳ Integrate PhaseTwoService
- [ ] ⏳ Integrate ReportGeneratorService
- [ ] ⏳ Implement session state management
- [ ] ⏳ Implement error handling for all methods
- [ ] ⏳ Write integration test: full Phase 1 flow
- [ ] ⏳ Write integration test: full Phase 2 flow
- [ ] ⏳ All tests pass

**Validation**:
```bash
npm test services/mastermind-orchestrator
# All integration tests should pass
```

### Day 7: Database Integration

#### Database Schema
- [ ] ⏳ Create migration file: `001_add_mastermind_tables.sql`
- [ ] ⏳ Define `mastermind_sessions` table
- [ ] ⏳ Define `mastermind_concepts` table
- [ ] ⏳ Define `mastermind_votes` table
- [ ] ⏳ Define `mastermind_turns` table
- [ ] ⏳ Add indexes for performance
- [ ] ⏳ Run migration on development database
- [ ] ⏳ Verify tables created

**Validation**:
```bash
sqlite3 coder1-ide-next/data/sessions.db ".tables"
# Should show: mastermind_sessions, mastermind_concepts, mastermind_votes, mastermind_turns
```

#### Database Service Integration
- [ ] ⏳ Create `/services/mastermind-database.ts`
- [ ] ⏳ Implement `saveSession()` method
- [ ] ⏳ Implement `saveConcepts()` method
- [ ] ⏳ Implement `saveVotes()` method
- [ ] ⏳ Implement `saveTurns()` method
- [ ] ⏳ Implement `loadSession()` method
- [ ] ⏳ Implement `deleteSession()` method
- [ ] ⏳ Write tests for CRUD operations
- [ ] ⏳ All tests pass

**Validation**:
```typescript
import { saveSession, loadSession } from '@/services/mastermind-database';
const sessionId = await saveSession(sessionData);
const loaded = await loadSession(sessionId);
console.assert(loaded.problemStatement === sessionData.problemStatement, 'Data persisted');
```

### Day 8: CLI Puppeteer Integration

#### Claude Code Bridge Modification
- [ ] ⏳ Open `/services/claude-code-bridge.ts`
- [ ] ⏳ Add `spawnMastermindAgents()` function
  - [ ] ⏳ Accepts problemStatement, personas, phase, context
  - [ ] ⏳ Creates agent tasks for each persona
  - [ ] ⏳ Calls existing `spawnParallelAgents()` method
  - [ ] ⏳ Returns `ClaudeAgentResponse[]`
- [ ] ⏳ Test with 1 agent (single spawn)
- [ ] ⏳ Test with 4 agents (parallel spawn)
- [ ] ⏳ Verify responses parse correctly

**Validation**:
```typescript
import { spawnMastermindAgents } from '@/services/claude-code-bridge';
const responses = await spawnMastermindAgents(
  'Test problem',
  getAllPersonas(),
  'ideation',
  'Test context'
);
console.assert(responses.length === 4, 'All 4 agents responded');
console.assert(responses.every(r => r.success), 'All agents succeeded');
```

---

## Phase 3: API Routes & UI Components (Days 9-13)

### Day 9: API Routes (Part 1)

#### Start Route
- [ ] ⏳ Create `/app/api/mastermind/start/route.ts`
- [ ] ⏳ Implement POST handler
  - [ ] ⏳ Accepts problemStatement, projectContext
  - [ ] ⏳ Creates orchestrator instance
  - [ ] ⏳ Saves to database
  - [ ] ⏳ Returns session object
- [ ] ⏳ Test with curl or Postman

**Validation**:
```bash
curl -X POST http://localhost:3001/api/mastermind/start \
  -H "Content-Type: application/json" \
  -d '{"problemStatement": "Test problem"}'
# Should return session object with sessionId
```

#### Vote Route
- [ ] ⏳ Create `/app/api/mastermind/vote/route.ts`
- [ ] ⏳ Implement POST handler
  - [ ] ⏳ Accepts sessionId, conceptId, justification
  - [ ] ⏳ Adds user vote
  - [ ] ⏳ Calculates winner if all votes in
  - [ ] ⏳ Updates database
  - [ ] ⏳ Returns voting results
- [ ] ⏳ Test with curl or Postman

**Validation**:
```bash
curl -X POST http://localhost:3001/api/mastermind/vote \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "xxx", "conceptId": "yyy", "justification": "Test"}'
# Should return updated voting results
```

#### Status Route
- [ ] ⏳ Create `/app/api/mastermind/status/route.ts`
- [ ] ⏳ Implement GET handler
  - [ ] ⏳ Accepts sessionId query param
  - [ ] ⏳ Loads session from database
  - [ ] ⏳ Returns current phase and state
- [ ] ⏳ Test with curl or Postman

**Validation**:
```bash
curl http://localhost:3001/api/mastermind/status?sessionId=xxx
# Should return session status
```

### Day 10: API Routes (Part 2)

#### Deliberate Route
- [ ] ⏳ Create `/app/api/mastermind/deliberate/route.ts`
- [ ] ⏳ Implement POST handler
  - [ ] ⏳ Accepts sessionId, agentId
  - [ ] ⏳ Gets next agent in rotation
  - [ ] ⏳ Spawns agent via CLI Puppeteer
  - [ ] ⏳ Parses action from response
  - [ ] ⏳ Saves turn to database
  - [ ] ⏳ Returns turn object
- [ ] ⏳ Test with curl or Postman

#### Contribute Route
- [ ] ⏳ Create `/app/api/mastermind/contribute/route.ts`
- [ ] ⏳ Implement POST handler
  - [ ] ⏳ Accepts sessionId, action, content
  - [ ] ⏳ Adds user contribution
  - [ ] ⏳ Saves to database
  - [ ] ⏳ Returns turn object
- [ ] ⏳ Test with curl or Postman

#### Report Route
- [ ] ⏳ Create `/app/api/mastermind/report/route.ts`
- [ ] ⏳ Implement GET handler
  - [ ] ⏳ Accepts sessionId and format (md/json/html)
  - [ ] ⏳ Loads session data
  - [ ] ⏳ Generates report
  - [ ] ⏳ Returns formatted report
- [ ] ⏳ Test with curl or Postman

**Validation**:
```bash
curl http://localhost:3001/api/mastermind/report?sessionId=xxx&format=md
# Should return Markdown report
```

### Day 11: Zustand Store & WebSocket Events

#### Zustand Store
- [ ] ⏳ Create `/stores/useMastermindStore.ts`
- [ ] ⏳ Define store interface
- [ ] ⏳ Implement state properties
  - [ ] ⏳ currentSession
  - [ ] ⏳ phase
  - [ ] ⏳ concepts
  - [ ] ⏳ votes
  - [ ] ⏳ winningConcept
  - [ ] ⏳ deliberationTurns
  - [ ] ⏳ report
- [ ] ⏳ Implement actions
  - [ ] ⏳ startSession()
  - [ ] ⏳ submitVote()
  - [ ] ⏳ submitTurn()
  - [ ] ⏳ generateReport()
  - [ ] ⏳ resetSession()
- [ ] ⏳ Export store hook
- [ ] ⏳ Test store in isolation

**Validation**:
```typescript
import { useMastermindStore } from '@/stores/useMastermindStore';
const { startSession } = useMastermindStore();
await startSession('Test problem');
const { currentSession } = useMastermindStore.getState();
console.assert(currentSession !== null, 'Session created');
```

#### WebSocket Events
- [ ] ⏳ Open `/server.js`
- [ ] ⏳ Find Socket.IO connection handler (around line 200-250)
- [ ] ⏳ Add event: `mastermind:start`
- [ ] ⏳ Add event: `mastermind:vote`
- [ ] ⏳ Add event: `mastermind:contribute`
- [ ] ⏳ Add event: `mastermind:phase-update` (emit)
- [ ] ⏳ Add event: `mastermind:agent-response` (emit)
- [ ] ⏳ Add event: `mastermind:voting-open` (emit)
- [ ] ⏳ Add event: `mastermind:turn-complete` (emit)
- [ ] ⏳ Restart server
- [ ] ⏳ Test WebSocket connection

**Validation**:
```javascript
const socket = io('http://localhost:3001');
socket.on('connect', () => {
  socket.emit('mastermind:start', { problemStatement: 'Test' });
});
socket.on('mastermind:phase-update', (data) => {
  console.log('Phase update received:', data);
});
```

### Day 12: UI Components (Part 1)

#### MastermindPanel Container
- [ ] ⏳ Create `/components/mastermind/MastermindPanel.tsx`
- [ ] ⏳ Implement modal/panel structure
- [ ] ⏳ Connect to useMastermindStore
- [ ] ⏳ Implement phase-based view switching
  - [ ] ⏳ ideation → IdeationView
  - [ ] ⏳ voting → VotingInterface
  - [ ] ⏳ deliberation → DeliberationView
  - [ ] ⏳ report → ReportViewer
- [ ] ⏳ Add PhaseIndicator component
- [ ] ⏳ Add close button
- [ ] ⏳ Style with Tailwind (Tokyo Night colors)
- [ ] ⏳ Test rendering

#### PhaseIndicator Component
- [ ] ⏳ Create `/components/mastermind/PhaseIndicator.tsx`
- [ ] ⏳ Implement progress bar UI
- [ ] ⏳ Show current phase (ideation/voting/deliberation/report)
- [ ] ⏳ Show turn count in deliberation
- [ ] ⏳ Style with persona colors
- [ ] ⏳ Test rendering

#### AgentAvatar Component
- [ ] ⏳ Create `/components/mastermind/AgentAvatar.tsx`
- [ ] ⏳ Display persona emoji and name
- [ ] ⏳ Use persona color for border/background
- [ ] ⏳ Accept persona prop
- [ ] ⏳ Add size variants (sm/md/lg)
- [ ] ⏳ Test rendering

### Day 13: UI Components (Part 2)

#### IdeationView Component
- [ ] ⏳ Create `/components/mastermind/IdeationView.tsx`
- [ ] ⏳ Display loading state while agents generate
- [ ] ⏳ Show 4 concept cards (grid layout)
- [ ] ⏳ Use AgentAvatar for each concept
- [ ] ⏳ Add "Read More" expansion
- [ ] ⏳ Transition to VotingInterface when ready
- [ ] ⏳ Style with Tailwind
- [ ] ⏳ Test rendering

#### VotingInterface Component
- [ ] ⏳ Create `/components/mastermind/VotingInterface.tsx`
- [ ] ⏳ Display all 4 concepts side-by-side
- [ ] ⏳ Add vote button for each concept
- [ ] ⏳ Add justification textarea (required, min 50 chars)
- [ ] ⏳ Disable voting after submission
- [ ] ⏳ Show live vote count as agents vote
- [ ] ⏳ Highlight winning concept
- [ ] ⏳ Implement vote submission via store
- [ ] ⏳ Style with Tailwind
- [ ] ⏳ Test rendering and interaction

#### DeliberationView Component
- [ ] ⏳ Create `/components/mastermind/DeliberationView.tsx`
- [ ] ⏳ Display winning concept summary at top
- [ ] ⏳ Show turn history (scrollable)
  - [ ] ⏳ Each turn shows: avatar, action label, content
  - [ ] ⏳ Different styling per action (BUILD/CRITIQUE/QUESTION)
- [ ] ⏳ Add user contribution input at bottom
  - [ ] ⏳ Action selector (3 buttons: BUILD/CRITIQUE/QUESTION)
  - [ ] ⏳ Content textarea
  - [ ] ⏳ Submit button
- [ ] ⏳ Auto-scroll to latest turn
- [ ] ⏳ Implement contribution submission via store
- [ ] ⏳ Style with Tailwind
- [ ] ⏳ Test rendering and interaction

#### ReportViewer Component
- [ ] ⏳ Create `/components/mastermind/ReportViewer.tsx`
- [ ] ⏳ Display 4 sections in tabs or accordion
  - [ ] ⏳ Executive Summary
  - [ ] ⏳ Detailed Project Plan
  - [ ] ⏳ Unresolved Risks
  - [ ] ⏳ Future Enhancements
- [ ] ⏳ Add export buttons (MD/JSON/HTML/Copy)
- [ ] ⏳ Implement export functionality
- [ ] ⏳ Add session statistics summary
- [ ] ⏳ Style with Tailwind
- [ ] ⏳ Test rendering and export

---

## Phase 4: Integration, Testing & Polish (Days 14-17)

### Day 14: Status Bar Integration

#### StatusBarCore Modification
- [ ] ⏳ Open `/components/status-bar/StatusBarCore.tsx`
- [ ] ⏳ Import MastermindPanel component
- [ ] ⏳ Add state: `showMastermind` boolean
- [ ] ⏳ Add button next to AI Team button:
  ```tsx
  <button onClick={() => setShowMastermind(true)}>
    🧠 AI Mastermind
  </button>
  ```
- [ ] ⏳ Render MastermindPanel conditionally
- [ ] ⏳ Test button click opens panel
- [ ] ⏳ Test panel close

**Validation**:
- [ ] ⏳ Navigate to http://localhost:3001/ide
- [ ] ⏳ Status bar shows "🧠 AI Mastermind" button
- [ ] ⏳ Clicking button opens mastermind panel
- [ ] ⏳ Panel displays problem statement input
- [ ] ⏳ Closing panel returns to IDE

### Day 15: End-to-End Testing

#### Full Flow Test: Phase 1
- [ ] ⏳ Start mastermind session with test problem
- [ ] ⏳ Verify Phase 1 ideation starts
- [ ] ⏳ Verify 4 agents spawn in parallel
- [ ] ⏳ Verify concepts display in IdeationView
- [ ] ⏳ Verify voting interface appears
- [ ] ⏳ Submit user vote
- [ ] ⏳ Verify winner is selected
- [ ] ⏳ Verify phase transitions to deliberation

#### Full Flow Test: Phase 2
- [ ] ⏳ Verify DeliberationView displays winning concept
- [ ] ⏳ Verify agents take turns (round-robin)
- [ ] ⏳ Verify actions parsed correctly (BUILD/CRITIQUE/QUESTION)
- [ ] ⏳ Submit user contribution
- [ ] ⏳ Verify user turn appears in history
- [ ] ⏳ Continue until natural conclusion or max turns
- [ ] ⏳ Verify phase transitions to report

#### Full Flow Test: Report
- [ ] ⏳ Verify ReportViewer displays all 4 sections
- [ ] ⏳ Verify Executive Summary has content
- [ ] ⏳ Verify Detailed Plan has BUILD actions
- [ ] ⏳ Verify Risks has CRITIQUE/QUESTION actions
- [ ] ⏳ Export report as Markdown
- [ ] ⏳ Export report as JSON
- [ ] ⏳ Export report as HTML
- [ ] ⏳ Verify all exports valid

#### Full Flow Test: Database Persistence
- [ ] ⏳ Complete a full session
- [ ] ⏳ Check database for mastermind_sessions record
- [ ] ⏳ Check database for mastermind_concepts records (4)
- [ ] ⏳ Check database for mastermind_votes records (5 = 4 agents + user)
- [ ] ⏳ Check database for mastermind_turns records
- [ ] ⏳ Reload session from database
- [ ] ⏳ Verify all data restored correctly

### Day 16: Unit & Integration Tests

#### Unit Tests
- [ ] ⏳ Test: mastermind-personas.ts
  - [ ] ⏳ getPersona() retrieves correct persona
  - [ ] ⏳ getAllPersonas() returns 4 personas
  - [ ] ⏳ Persona colors are correct
- [ ] ⏳ Test: phase-one-service.ts
  - [ ] ⏳ parseVoteResponse() with valid input
  - [ ] ⏳ parseVoteResponse() with invalid input
  - [ ] ⏳ Tie-breaking logic (user vote wins)
  - [ ] ⏳ Tie-breaking logic (earliest wins)
- [ ] ⏳ Test: phase-two-service.ts
  - [ ] ⏳ parseActionResponse() with BUILD
  - [ ] ⏳ parseActionResponse() with CRITIQUE
  - [ ] ⏳ parseActionResponse() with QUESTION
  - [ ] ⏳ parseActionResponse() with no action (defaults to BUILD)
  - [ ] ⏳ shouldContinue() max turns
  - [ ] ⏳ shouldContinue() natural conclusion (3 QUESTIONs)
- [ ] ⏳ Test: report-generator-service.ts
  - [ ] ⏳ generateFullReport() returns valid Markdown
  - [ ] ⏳ Report has all 4 sections
  - [ ] ⏳ BUILD actions in project plan
  - [ ] ⏳ CRITIQUE actions in risks
  - [ ] ⏳ QUESTION actions in risks
- [ ] ⏳ Test: mastermind-orchestrator.ts
  - [ ] ⏳ Conversation history management
  - [ ] ⏳ Context building for agents
  - [ ] ⏳ Phase prompt generation

**Validation**:
```bash
npm test
# All unit tests should pass
```

#### Integration Tests
- [ ] ⏳ Test: Full Phase 1 flow (ideation → voting → winner)
- [ ] ⏳ Test: Full Phase 2 flow (deliberation → turns → conclusion)
- [ ] ⏳ Test: Report generation from session data
- [ ] ⏳ Test: Database CRUD operations
- [ ] ⏳ Test: WebSocket event flow
- [ ] ⏳ Test: CLI Puppeteer integration

**Validation**:
```bash
npm run test:integration
# All integration tests should pass
```

#### Test Coverage Report
- [ ] ⏳ Generate coverage report
- [ ] ⏳ Verify 90%+ coverage on services
- [ ] ⏳ Verify 80%+ coverage on components
- [ ] ⏳ Identify uncovered code
- [ ] ⏳ Add tests for critical uncovered paths
- [ ] ⏳ Regenerate report - meets targets

**Validation**:
```bash
npm run test:coverage
# Coverage should be 90%+ overall
```

### Day 17: Polish, Documentation & Launch Prep

#### UI/UX Polish
- [ ] ⏳ Add loading spinners for all async operations
- [ ] ⏳ Add error messages with recovery actions
- [ ] ⏳ Add success animations (voting, turn submission)
- [ ] ⏳ Verify responsive design (mobile, tablet, desktop)
- [ ] ⏳ Add keyboard shortcuts (ESC to close, ENTER to submit)
- [ ] ⏳ Test with screen reader (accessibility)
- [ ] ⏳ Polish transitions between phases
- [ ] ⏳ Add tooltips for all buttons
- [ ] ⏳ Verify all text is readable (contrast)

#### Performance Optimization
- [ ] ⏳ Verify Phase 1 ideation completes in <60s
- [ ] ⏳ Verify Phase 2 turns average <30s
- [ ] ⏳ Verify memory usage stays <500MB
- [ ] ⏳ Verify WebSocket events have <100ms latency
- [ ] ⏳ Profile component render times
- [ ] ⏳ Optimize any slow renders
- [ ] ⏳ Test with 10 concurrent sessions
- [ ] ⏳ Verify database queries optimized

#### Documentation
- [ ] ⏳ Write user guide (how to use mastermind)
- [ ] ⏳ Write developer guide (architecture overview)
- [ ] ⏳ Document all API endpoints
- [ ] ⏳ Create troubleshooting guide
- [ ] ⏳ Add inline code comments for complex logic
- [ ] ⏳ Update main CLAUDE.md with mastermind section
- [ ] ⏳ Create demo video/GIF

#### Alpha Launch Preparation
- [ ] ⏳ Create announcement draft
- [ ] ⏳ Prepare demo for alpha users
- [ ] ⏳ Set up feedback collection system
- [ ] ⏳ Create issue templates for bug reports
- [ ] ⏳ Deploy to alpha environment
- [ ] ⏳ Smoke test in alpha environment
- [ ] ⏳ Final review with Mike

---

## Final Validation Checklist

### Technical Validation
- [ ] ⏳ All 26 files created and implemented
- [ ] ⏳ All 3 file modifications complete
- [ ] ⏳ All TypeScript compiles without errors
- [ ] ⏳ All unit tests pass (90%+ coverage)
- [ ] ⏳ All integration tests pass
- [ ] ⏳ All E2E tests pass
- [ ] ⏳ Database migrations applied successfully
- [ ] ⏳ WebSocket events working in real-time
- [ ] ⏳ CLI Puppeteer integration functioning
- [ ] ⏳ No console errors in browser
- [ ] ⏳ No memory leaks detected
- [ ] ⏳ Performance benchmarks met

### User Experience Validation
- [ ] ⏳ Mastermind button visible in status bar
- [ ] ⏳ Panel opens/closes smoothly
- [ ] ⏳ Problem statement input is intuitive
- [ ] ⏳ Phase transitions are clear
- [ ] ⏳ Loading states communicate progress
- [ ] ⏳ Error messages are helpful
- [ ] ⏳ Voting interface is intuitive
- [ ] ⏳ Deliberation chat is easy to follow
- [ ] ⏳ Report is comprehensive and readable
- [ ] ⏳ Export functionality works reliably
- [ ] ⏳ Responsive on all screen sizes
- [ ] ⏳ Accessible with keyboard navigation

### Documentation Validation
- [ ] ⏳ User guide complete and clear
- [ ] ⏳ Developer guide covers architecture
- [ ] ⏳ API documentation has all endpoints
- [ ] ⏳ Troubleshooting guide addresses common issues
- [ ] ⏳ Code comments explain complex logic
- [ ] ⏳ README updated with mastermind info
- [ ] ⏳ Demo materials prepared

### Deployment Validation
- [ ] ⏳ Feature flag configured (if using flags)
- [ ] ⏳ Environment variables set
- [ ] ⏳ Database backed up before migration
- [ ] ⏳ Rollback plan documented
- [ ] ⏳ Monitoring/logging configured
- [ ] ⏳ Alpha users identified
- [ ] ⏳ Feedback mechanism ready
- [ ] ⏳ Alpha announcement ready

---

## Success Metrics

### Completion Metrics
- **Files Created**: 26/26 ✅
- **Files Modified**: 3/3 ✅
- **Test Coverage**: >90% ✅
- **Documentation**: Complete ✅
- **Timeline**: 2-3 weeks ✅

### Quality Metrics
- **TypeScript Errors**: 0 ✅
- **Test Failures**: 0 ✅
- **Console Errors**: 0 ✅
- **Memory Leaks**: 0 ✅
- **Performance**: Meets benchmarks ✅

### Launch Readiness Metrics
- **Alpha Environment**: Deployed ✅
- **Smoke Tests**: Passing ✅
- **Documentation**: Published ✅
- **Feedback System**: Active ✅
- **Stakeholder Approval**: Obtained ✅

---

**Implementation Status**: Ready to Begin  
**Last Updated**: January 2025  
**For**: Future Claude Agents

*Use this checklist to track your progress through the implementation. Check off items as you complete them to ensure nothing is missed.*
