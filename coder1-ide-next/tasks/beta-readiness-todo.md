# Coder1 IDE Beta Readiness Plan

**Started**: January 16, 2026
**Timeline**: 1-2 weeks
**Status**: IN PROGRESS

---

## Executive Summary

Three parallel work tracks to achieve beta readiness:
1. **Track 1**: Terminal Full Refactor (Fix xterm.js scrolling properly) - **ANALYSIS PHASE**
2. **Track 2**: Error Handling System (All errors visible to users) - **✅ COMPLETED**
3. **Track 3**: TypeScript Migration (Convert JS files) - **IN PROGRESS (6/8 priority files done)**

---

## Track 1: Terminal Full Refactor (Days 1-5)

**Goal**: Fix xterm.js scrolling without the 400px padding hack

### Current State (The Problem)
- BetaTerminal.tsx lines 1789-1814 have a 400px padding workaround
- When Claude Code is active, the terminal adds massive padding to force scrolling
- This is a hack, not a proper solution

### Day 1-2: Analysis & Architecture
- [ ] Analyze xterm.js viewport calculation in depth
- [ ] Design CSS Grid layout for terminal container
- [ ] Create test cases for scrolling edge cases

### Day 3-4: Implementation
- [ ] Restructure BetaTerminal.tsx container layout to CSS Grid
- [ ] Implement proper viewport height calculation
- [ ] Fix ResizeObserver integration for dynamic sizing
- [ ] Remove 400px padding workaround

### Day 5: Testing & Polish
- [ ] Test with Claude Code long outputs
- [ ] Test with rapid terminal output (npm install, builds)
- [ ] Test resize behavior (panel dragging, window resize)
- [ ] Clean up Terminal.tsx backup files

**Key Files**:
- `components/terminal/BetaTerminal.tsx` (lines 1789-1814)
- `components/terminal/Terminal.css`
- `components/layout/ThreePanelLayout.tsx`

---

## Track 2: Error Handling System (Days 1-4) ✅ COMPLETED

**Goal**: All errors visible to users, no silent failures

### ✅ COMPLETED WORK

- [x] Created `lib/error-handler.ts` - Centralized error handling utility
  - Error categorization (network, validation, auth, server, unknown)
  - EventEmitter pattern for Toast integration
  - Unique error IDs for tracking
- [x] Updated `/api/bridge/command/route.ts` - Error handler integrated
- [x] Updated `/api/terminal-rest/sessions/route.ts` - Error handler integrated
- [x] Updated `/api/claude/route.ts` - Error handler integrated
- [x] Updated `/api/claude/session-summary/route.ts` - Error handler integrated

**Files Modified**:
- `lib/error-handler.ts` ✅ Created
- `app/api/bridge/command/route.ts` ✅ Updated
- `app/api/terminal-rest/sessions/route.ts` ✅ Updated
- `app/api/claude/route.ts` ✅ Updated
- `app/api/claude/session-summary/route.ts` ✅ Updated

---

## Track 3: TypeScript Migration (Days 3-7)

**Goal**: Convert JS files to TypeScript for type safety

### ✅ COMPLETED FILES

**Priority 1: Critical Services (2/3 done)**
- [x] services/cli-output-parser.ts ✅ (converted from .js)
- [x] services/agent-coordinator.ts ✅ (1100+ lines, 25+ interfaces)
- [ ] services/claude-cli-puppeteer.js → .ts (pending)

**Priority 2: Pattern Engine (4/4 COMPLETE) ✅**
- [x] services/pattern-engine/PatternEngine.ts ✅ (~559 lines, 15+ interfaces)
- [x] services/pattern-engine/QuestionEngine.ts ✅ (~605 lines, 20+ interfaces)
- [x] services/pattern-engine/DocumentGenerator.ts ✅ (~956 lines, 25+ interfaces)
- [x] services/pattern-engine/QuestionnaireOrchestrator.ts ✅ (~554 lines, 10+ interfaces)

**Total Pattern Engine Lines Converted**: ~2,674 lines

### Remaining Files

**Priority 3: Utilities**
- [ ] lib/websocket-auth.js → .ts
- [ ] lib/stubs/browser-stub.js → .ts
- [ ] bridge-cli/src/logger.js → .ts
- [ ] bridge-cli/src/file-handler.js → .ts

**Lower Priority: Public/Scripts/Tests** (can be done later)
- public/js/*.js (10 files)
- scripts/*.js (15 files)
- test-*.js (15 files)

---

## Final Integration & Testing (Days 8-10)

### Day 8: Integration Testing
- [ ] Full IDE workflow test (create file, edit, terminal commands)
- [ ] Claude Code integration test (spawn agent, receive output)
- [ ] Session persistence test (checkpoint save/restore)
- [ ] Error scenario testing (network failures, invalid inputs)

### Day 9: Performance Verification
- [ ] Measure cold startup time (target: <3 seconds)
- [ ] Verify terminal scrolling performance with 10,000+ lines
- [ ] Check for memory leaks in long sessions
- [ ] Bundle size analysis

### Day 10: Beta Deploy
- [ ] Deploy to staging environment
- [ ] Smoke test all critical features
- [ ] Monitor for 24 hours
- [ ] Address any critical issues

---

## Success Criteria

- [ ] Terminal scrolling works without 400px hack
- [ ] All API errors surface to users via Toast notifications
- [ ] Zero silent failures on critical paths
- [ ] Priority 1 & 2 JS files converted to TypeScript
- [ ] Cold startup <3 seconds
- [ ] 24+ hours on staging with no critical bugs

---

## Progress Log

### January 16, 2026
- Created initial task plan
- Read key files: BetaTerminal.tsx, Toast.tsx, Terminal.css
- Read API files: bridge/command/route.ts, terminal-rest/sessions/route.ts
- Identified 40+ JS files for TypeScript migration (core services)
- **Track 2 COMPLETED**: Error handling system implemented
- **Track 3 Priority 1**: cli-output-parser.ts, agent-coordinator.ts converted
- **Track 3 Priority 2 COMPLETED**: All 4 Pattern Engine files converted to TypeScript
  - PatternEngine.ts (~559 lines)
  - QuestionEngine.ts (~605 lines)
  - DocumentGenerator.ts (~956 lines)
  - QuestionnaireOrchestrator.ts (~554 lines)
  - Fixed TypeScript errors (TechStackRecommendation interface)
  - All files compile successfully with `npx tsc --noEmit`

### TypeScript Conversion Details
**Pattern Engine Files Include**:
- Comprehensive interfaces for Pattern, Question, Document types
- EventEmitter-based architecture
- Proper ES module imports (`import * as path from 'path'`)
- Array.from() for Map/Set iteration (avoids downlevelIteration issues)
- Full type safety with 70+ interfaces defined

---

## Review Section
*(To be filled after completion)*
