# Johnny5 Phase 1 Implementation (Feb 6, 2026)

## Status: COMPLETE

## Completed Features

### 1c. Context Budget Visualizer - DONE
- [x] `components/johnny5/ContextBudgetMini.tsx` - 28px compact bar with color thresholds
- [x] `components/johnny5/context/ContextTab.tsx` - Wired real token data from IDE store

### 1d. Prompt Templates Library - DONE
- [x] `data/prompt-templates.json` - 10 templates (Debug, Build, Refactor, Test, Review, PR, Explain, Optimize, Error Handling, Setup)
- [x] `components/johnny5/PromptTemplates.tsx` - Two-view component (picker + fill) with auto-fill, search, and categories

### 1e. Daily Activity Intelligence Foundation - DONE
- [x] `services/johnny5/terminal-activity-collector.ts` - Singleton listening to terminalOutput CustomEvent, classifies into 20+ event types, ring buffer + localStorage persistence
- [x] `services/johnny5/accomplishment-detector.ts` - Processes events into WorkSessions and Accomplishments, extracts intent, generates morning brief data
- [x] `components/johnny5/morning-brief/MorningBriefTab.tsx` - Enhanced with client-side activity data merging, "since last brief viewed" time window, Resume buttons, Copy as markdown

### Integration - DONE
- [x] `components/johnny5/Johnny5Panel.tsx` - Added ContextBudgetMini strip, Prompt Templates button + overlay, event listener for johnny5:openTemplates

### Build Verification - PASS
- [x] `npx next build` compiles successfully with zero TypeScript errors
- [x] All 191 pages generate correctly

---

# Context Budget Mini + ContextTab Real Data Wiring (Feb 6, 2026)

## Status: COMPLETE

## Summary of Changes

### File 1: Created `components/johnny5/ContextBudgetMini.tsx`
- [x] New compact 28px bar component showing context token usage
- [x] 4px thin progress bar at top with color thresholds (green/yellow/orange/red)
- [x] Text showing "~67K / 200K tokens (estimated)" in 10px
- [x] Reads contextComposition from Johnny5 store, falls back to IDE store tokenUsage
- [x] Three states: disconnected ("Context: not connected"), no data ("waiting for data..."), and normal display
- [x] Entire component clickable (onClick prop)
- [x] Tailwind CSS, dark theme matching Coder1 design

### File 2: Modified `components/johnny5/context/ContextTab.tsx`
- [x] Imported `useIDEStore`
- [x] Added `aiState` read from IDE store
- [x] Added `useEffect` watching `aiState.tokenUsage.total` that computes real context composition
- [x] Real data uses estimated breakdown: system 5%, conversation 60%, tools 25%, remaining 10% unaccounted
- [x] Added "Estimated" cyan info banner below ContextUsageBar
- [x] Changed mock data limit from 128000 to 200000
- [x] No changes to ContextUsageBar, ContextPieChart, or FileContextList components

### TypeScript Verification
- Zero new TypeScript errors introduced

---

# Johnny5 Phase 2 Implementation (Feb 6, 2026)

## Status: COMPLETE

## Features

### 2a. Loop & Stuck Detection - DONE
- [x] `services/johnny5/pattern-detector.ts` - Singleton service detecting repeated errors (3+ in 5min), file thrashing (3+ mods in 2min), consecutive build/test failures, and stuck-after-error (60s idle). RingBuffer approach, deduplication, emits `johnny5:loopDetected` CustomEvent
- [x] Integration: hooks into TerminalActivityCollector via `.on()` for error_encountered, file_modify, build_fail, build_success, test_fail, test_pass, and wildcard events

### 2b. CLAUDE.md Auto-Suggestions - DONE
- [x] `services/johnny5/rule-suggester.ts` - Singleton service: subscribes to error_encountered events, normalizes patterns, tracks occurrences, emits johnny5:ruleSuggestion CustomEvent at 3+ hits, 15 rule mappings, localStorage persistence
- [x] `components/johnny5/RuleSuggestion.tsx` - Compact amber banner with monospace rule text, "Add to CLAUDE.md" (dispatches johnny5:applyRule) and "Dismiss" buttons, 15s auto-hide, slide-down animation

### 2c. Model Recommender - DONE
- [x] `services/johnny5/model-advisor.ts` - Analyzes prompt complexity (word count, keyword heuristics, file reference count), recommends Haiku/Sonnet/Opus with cost savings string, 2-min debounce, only fires when recommendation differs from current model

### 2d. Command Translator - DONE
- [x] `components/johnny5/CommandTranslator.tsx` - Overlay with natural language search, fuzzy word-overlap matching, category tabs (All/Git/Claude/Dev/Nav), command cards with Copy + Send buttons
- [x] `data/command-mappings.json` - 20 command mappings across 4 categories with phrases, commands, descriptions, and difficulty levels

### Integration - DONE
- [x] `components/johnny5/Johnny5Panel.tsx` - Added imports for all 4 features, Terminal icon button in header, CommandTranslator overlay, RuleSuggestion banner, services startup (PatternDetector, RuleSuggester, ModelAdvisor) with cleanup on unmount
- [x] Build verification: `npx next build` compiles with zero TypeScript errors

---

# Johnny5 Phase 3 Implementation (Feb 6, 2026)

## Status: COMPLETE

## Features

### 3a. Cross-Session Memory - DONE
- [x] `services/johnny5/session-memory.ts` - Client-side singleton that indexes session summaries by project, files touched, error patterns, and topics. localStorage persistence (key: johnny5_session_memory, max 100 entries, 90-day retention). Relevance scoring: file overlap (3pts), error match (2pts), same project (1pt), same branch (1pt). Auto-recall debounced at 30s on file_modify/file_create. Emits `johnny5:memoryRecall` CustomEvent.
- [x] `components/johnny5/SessionMemoryPanel.tsx` - Compact violet-themed memory recall card. Shows max 3 entries with session name, time ago, truncated file list, accomplishments. "Resume" button dispatches johnny5:resumeFromMemory. 30s auto-hide paused on hover. Slide-down animation matching RuleSuggestion pattern.

### 3b. Context Carry-Forward - DONE
- [x] `services/johnny5/handoff-generator.ts` - Client-side singleton with start()/stop() lifecycle. Monitors token usage via johnny5:tokenUpdate CustomEvent + localStorage polling (30s interval). Threshold warnings at 75%/85%/95% via johnny5:contextWarning CustomEvent (only emits once per crossing). generateHandoff() collects accomplishments from AccomplishmentDetector, events from TerminalActivityCollector, builds structured markdown handoff text. Persists last handoff to localStorage.
- [x] `components/johnny5/HandoffBanner.tsx` - Warning banner with three visual states (yellow/orange/red) based on johnny5:contextWarning level. "Generate Handoff" button creates summary. Handoff text shown in scrollable pre block (max-h-40). "Copy for New Session" copies to clipboard with "Copied!" feedback. Follows RuleSuggestion.tsx compact banner pattern.

### 3c. Workflow Orchestrator - DONE
- [x] `services/johnny5/workflow-engine.ts` - Client-side singleton with localStorage persistence (key: johnny5_workflows, max 20). 5 built-in templates (Feature, Bugfix, Refactor, Test Coverage, Deploy) with placeholder tokens. CRUD methods: createFromTemplate, createCustom, getWorkflows, updateStepStatus, completeWorkflow, deleteWorkflow, pauseWorkflow, resumeWorkflow. Emits `johnny5:workflowUpdate` CustomEvent.
- [x] `components/johnny5/WorkflowBuilder.tsx` - Three-view overlay (List, Detail, Create). List view: workflow cards with category badge, status indicator, progress bar, empty state. Detail view: vertical step checklist with status colors (pending=gray, in_progress=cyan, completed=green, skipped=yellow), expandable prompt preview, "Send to Terminal" / "Copy" / "Complete" / "Skip" buttons per step, inline notes editing. Create view: template picker with 5 cards + custom workflow builder with dynamic step editor.

### Integration - DONE
- [x] `components/johnny5/Johnny5Panel.tsx` - Added imports for all 6 Phase 3 files, ListChecks icon, 3 new state vars (showWorkflows, showMemoryPanel, showHandoffBanner), Phase 3 service initialization (SessionMemory + HandoffGenerator start/stop alongside Phase 2), Workflow Orchestrator header button, HandoffBanner + SessionMemoryPanel banners between RuleSuggestion and tab content, WorkflowBuilder overlay
- [x] Build verification: `npx next build` compiles with zero TypeScript errors

---

## Review: Cross-Session Memory (3a) - Feb 6, 2026

### Files Created
1. `services/johnny5/session-memory.ts` - 295 lines
2. `components/johnny5/SessionMemoryPanel.tsx` - 205 lines

### Key Design Decisions
- Followed the exact singleton pattern from `pattern-detector.ts` and `rule-suggester.ts` (class + `getSessionMemory()` export)
- Used `StoredMemoryEntry` separate interface for serialization (Date -> ISO string) to avoid type confusion
- Error normalization reuses the same approach as pattern-detector (strip ANSI, line numbers, timestamps)
- File matching uses basename extraction for fuzzy cross-project matching
- Auto-recall clears the active file set after each recall to prevent repeated notifications for the same context
- Component follows RuleSuggestion.tsx patterns exactly: auto-hide timer, pause on hover via interactedRef, slide-in-from-top animation

### TypeScript Verification
- `npx tsc --noEmit` reports zero errors related to the new files
- All pre-existing errors are in unrelated `__tests__/test-utils/test-helpers.ts`

---

## Review: Workflow Orchestrator (3c) - Feb 6, 2026

### Files Created
1. `services/johnny5/workflow-engine.ts` - ~390 lines
2. `components/johnny5/WorkflowBuilder.tsx` - ~540 lines

### Key Design Decisions
- Followed singleton pattern from `rule-suggester.ts` (class + `getWorkflowEngine()` export, localStorage persistence with serialization/deserialization)
- Used separate `SerializedWorkflow` interface for Date-to-ISO-string serialization to avoid type confusion
- Overlay layout matches `CommandTranslator.tsx` and `PromptTemplates.tsx` exactly: `absolute inset-0 z-50 bg-bg-primary/95 backdrop-blur-sm`, header with icon + title + X button, back navigation via ChevronLeft
- 5 built-in templates with realistic prompt templates containing `{placeholder}` tokens
- Max 20 workflows enforced by evicting oldest completed workflows first
- Step status uses discriminated union pattern: pending (numbered circle), in_progress (pulsing cyan dot), completed (check icon), skipped (skip-forward icon)
- "Send to Terminal" dispatches `johnny5:sendToTerminal` CustomEvent matching the existing pattern used by CommandTranslator and PromptTemplates
- Custom workflow builder allows dynamic step addition/removal with validation (disabled Create button until name and at least one valid step)
- Inline notes editing per step with save/cancel, persisted via `updateStepStatus()`

### TypeScript Verification
- `npx tsc --noEmit` reports zero errors from the new files
- All 18 pre-existing errors are in `__tests__/test-utils/test-helpers.ts` (JSX in .ts file)

---

## Review: Phase 3 Integration - Feb 6, 2026

### Files Created (6 total)
1. `services/johnny5/session-memory.ts` - ~295 lines, cross-session memory with localStorage indexing
2. `components/johnny5/SessionMemoryPanel.tsx` - ~205 lines, violet-themed memory recall card
3. `services/johnny5/handoff-generator.ts` - ~490 lines, token monitoring + handoff summary generation
4. `components/johnny5/HandoffBanner.tsx` - context warning banner with three severity levels
5. `services/johnny5/workflow-engine.ts` - ~615 lines, multi-step workflow management with 5 templates
6. `components/johnny5/WorkflowBuilder.tsx` - ~540 lines, three-view overlay (List, Detail, Create)

### Files Modified (1)
- `components/johnny5/Johnny5Panel.tsx` - 6 edits:
  1. Added imports: SessionMemoryPanel, HandoffBanner, WorkflowBuilder, ListChecks, getSessionMemory, getHandoffGenerator
  2. Added state: showWorkflows, showMemoryPanel, showHandoffBanner
  3. Extended service initialization useEffect with getSessionMemory().start/stop() and getHandoffGenerator().start/stop()
  4. Added ListChecks icon button for Workflow Orchestrator in header
  5. Added HandoffBanner and SessionMemoryPanel between RuleSuggestion and tab content
  6. Added WorkflowBuilder overlay alongside CommandTranslator and PromptTemplates

### Architecture Summary
- All Phase 3 services follow the established singleton pattern (class + `get*()` export + start/stop lifecycle)
- All services are client-side only (browser), no Node.js imports
- All use CustomEvents for cross-component communication
- HandoffGenerator monitors token usage and emits `johnny5:contextWarning` at thresholds (75%/85%/95%)
- SessionMemory auto-recalls relevant past sessions on file changes (30s debounce)
- WorkflowEngine provides 5 built-in templates with `{placeholder}` tokens for guided sessions

### Build Verification
- `npx next build` compiles with zero TypeScript errors
- All pages generate correctly

---

# Johnny5 Phase 4 Implementation (Feb 6, 2026)

## Status: COMPLETE

## Features

### 4a. Error Pattern Library - DONE
- [x] `services/johnny5/error-pattern-library.ts` - Client-side singleton that stores error->solution pairs. Listens to TerminalActivityCollector for error_encountered, error_resolved, build_success, test_pass, file_modify, and user_prompt events. Normalizes errors (strip ANSI, paths, line numbers, timestamps), tracks error->resolution sequences within 5-min window, localStorage persistence (key: johnny5_error_patterns, max 200 patterns, 90-day retention). Jaccard word-overlap similarity matching (threshold 0.7). Emits `johnny5:knownErrorMatch` CustomEvent with previous solution. Confidence scoring with boost on resolution and downgrade on "Not Helpful" dismiss.
- [x] `components/johnny5/ErrorPatternCard.tsx` - Compact emerald-themed card that appears when a recurring error is detected. Shows: error summary (truncated, 2-line clamp, monospace), last resolved time ("X ago"), hit count, confidence percentage, resolution details (files modified, commands run). "Apply Fix" dispatches johnny5:sendToTerminal, "Copy Fix" copies description to clipboard, "Not Helpful" dispatches johnny5:errorPatternDismiss for confidence downgrade, X close button. 30s auto-hide paused on hover. Slide-in animation.

### 4b. Agent Specialization Modes - DONE
- [x] `data/agent-personas.json` - 6 pre-configured personas with practical CLAUDE.md rules
- [x] `components/johnny5/AgentPersonas.tsx` - Overlay matching CommandTranslator/PromptTemplates pattern
- [x] Wire into Johnny5Panel.tsx - Add UserCog button + overlay + state
- [x] TypeScript verification: zero new errors (pre-existing 17 in test-helpers.ts only)

### 4c. Smart Session Coach - DONE
- [x] `services/johnny5/session-coach.ts` - Client-side singleton monitoring session patterns. Detects: long sessions without checkpoint (>8 min), high context usage without /compact, idle after error (>2 min), complex task without plan mode, rapid file changes suggesting scope creep. Emits `johnny5:coachTip` CustomEvent with message and action. Debounced to max 1 tip per 5 minutes. Respects dismiss preferences via localStorage.
- [x] `components/johnny5/CoachTip.tsx` - Subtle teal-themed tip card (non-intrusive). Shows: tip message, suggested action button, "Got it" dismiss, "Don't show again" for that tip type. Slides in from top of Johnny5 panel. 15s auto-hide paused on hover.

### Integration - DONE
- [x] `components/johnny5/Johnny5Panel.tsx` - Added imports for ErrorPatternCard, CoachTip, getErrorPatternLibrary, getSessionCoach. Added showErrorPattern + showCoachTip state vars. Extended service initialization with getErrorPatternLibrary().start/stop() and getSessionCoach().start/stop(). Added johnny5:openWorkflows event listener for SessionCoach's scope_creep tip. Added ErrorPatternCard + CoachTip banners between SessionMemoryPanel and tab content. Agent 4b already wired in AgentPersonas (UserCog button + overlay + showPersonas state).
- [x] Build verification: `npx next build` compiles with zero TypeScript errors

---

## Review: Smart Session Coach (4c) - Feb 6, 2026

### Files Created (2 total)
1. `services/johnny5/session-coach.ts` - ~310 lines, singleton coaching service
2. `components/johnny5/CoachTip.tsx` - ~175 lines, teal-themed tip card component

### Service: session-coach.ts

**Singleton pattern**: Follows `pattern-detector.ts` exactly -- class with `start()`/`stop()` lifecycle, `getSessionCoach()` export, module-level `let instance` variable.

**5 coaching tip detectors:**
- `long_session` - Periodic check (60s interval). Tracks `lastCommitTime` reset on every `git_commit` event. Fires when >8 minutes since last commit. Action: dispatch `johnny5:sendToTerminal` with `git add -A && git commit -m "WIP: checkpoint"`.
- `high_context` - Dual trigger: listens for `johnny5:tokenUpdate` CustomEvent AND polls `johnny5_token_percentage` from localStorage every 60s. Fires at >=70%. Action: dispatch `johnny5:sendToTerminal` with `/compact`.
- `idle_after_error` - Timer-based. Starts 2-minute timer on `error_encountered`. Cleared by any non-error activity via wildcard `*` listener. Action: dispatch `johnny5:openTemplates`.
- `scope_creep` - Event-driven. Tracks distinct file paths from `file_modify`/`file_create` in a sliding 5-minute window. Fires when >=10 distinct files. Action: dispatch `johnny5:openWorkflows`.
- `needs_plan` - Periodic check. After 5 minutes of session, fires if >=5 read/exploration events but 0 file modifications. Action: dispatch `johnny5:sendToTerminal` with `/plan`.

**Constraints:**
- COACH_COOLDOWN_MS = 5 minutes between any two tips
- Per-type permanent dismissal stored in localStorage (`johnny5_coach_dismissed`)
- `dismissType()` public method for UI to call
- No Node.js imports (browser-only)

### Component: CoachTip.tsx

**Pattern followed**: RuleSuggestion.tsx exactly -- `'use client'`, props `{ isVisible, onDismiss }`, CustomEvent listener, auto-hide timer (15s), pause on hover via `interactedRef`, slide-in animation.

**Design:**
- Teal/cyan theme: `bg-teal-500/10 border border-teal-500/30`
- Header: MessageCircle icon + "Session Coach" label in `text-teal-400` + X close button
- Body: tip message in `text-xs text-text-secondary`
- Action button: Sparkles icon + label, teal-themed with hover glow
- "Got it" button: secondary muted style, just dismisses
- "Don't show again" link: `text-[10px] text-text-muted underline`, calls `getSessionCoach().dismissType()`

**Event dispatching:**
- Action button dispatches `tip.action` as CustomEvent name, with `{ command: tip.actionPayload }` as detail
- Consistent with existing patterns (johnny5:sendToTerminal, johnny5:openTemplates, johnny5:openWorkflows)

### Event Names Used (all pre-existing in codebase)
- `johnny5:sendToTerminal` - used by CommandTranslator, PromptTemplates, WorkflowBuilder
- `johnny5:openTemplates` - used by Johnny5Panel
- `johnny5:openWorkflows` - used by Johnny5Panel
- `johnny5:tokenUpdate` - used by HandoffGenerator, ContextBudgetMini
- `johnny5:coachTip` - NEW event, emitted by SessionCoach, consumed by CoachTip component

### TypeScript Verification
- `npx tsc --noEmit` reports zero new errors (only pre-existing test-helpers.ts issues)

---

## Review: Error Pattern Library (4a) - Feb 6, 2026

### Files Created (2 total)
1. `services/johnny5/error-pattern-library.ts` - ~360 lines, singleton error pattern tracking service
2. `components/johnny5/ErrorPatternCard.tsx` - ~260 lines, emerald-themed known fix card component

### Key Design Decisions

**Service: error-pattern-library.ts**
- Followed the exact singleton pattern from `pattern-detector.ts` and `rule-suggester.ts` (class + `getErrorPatternLibrary()` export + start/stop lifecycle)
- Error normalization reuses the same approach as rule-suggester.ts (strip ANSI, paths, line:col, timestamps, hex addresses, collapse whitespace, lowercase)
- Uses `StoredPattern` separate interface for serialization (Date -> ISO string) to avoid type confusion
- Jaccard similarity (word overlap) for fuzzy matching with 0.7 threshold
- Tracks "pending errors" - when an error_encountered is followed by error_resolved/build_success/test_pass within 5 minutes, the intermediate file_modify and user_prompt events are captured as the resolution
- Confidence starts at 0.5 for new patterns, boosts +0.1 on each resolution, degrades -0.2 on "Not Helpful" dismiss
- Max 200 patterns enforced by evicting lowest-confidence/oldest patterns
- 90-day retention with cleanup on load
- Periodic cleanup of stale pending errors (every 60s)

**Component: ErrorPatternCard.tsx**
- Pattern followed: RuleSuggestion.tsx and HandoffBanner.tsx exactly -- `'use client'`, props `{ isVisible, onDismiss }`, CustomEvent listener, auto-hide timer (30s), pause on hover via `interactedRef`, slide-in animation
- Emerald green theme: `bg-emerald-500/10 border border-emerald-500/30`
- Header: Lightbulb icon + "Known Fix Available" label in `text-emerald-400` + X close button
- Body: error summary (truncated, `text-[10px] font-mono line-clamp-2`), metadata row (last resolved time, hit count, confidence percentage), resolution details box (files modified, commands run)
- "Apply Fix" dispatches `johnny5:sendToTerminal` with commands, "Copy Fix" copies description to clipboard with feedback, "Not Helpful" dispatches `johnny5:errorPatternDismiss` for confidence downgrade

### Event Names
- `johnny5:knownErrorMatch` - NEW event, emitted by ErrorPatternLibrary, consumed by ErrorPatternCard
- `johnny5:errorPatternDismiss` - NEW event, emitted by ErrorPatternCard, should be consumed by integration code to call `getErrorPatternLibrary().downgradeConfidence()`
- `johnny5:sendToTerminal` - EXISTING event, reused for "Apply Fix" button

### TypeScript Verification
- `npx tsc --noEmit` reports zero new errors (only pre-existing test-helpers.ts issues)

---

## Review: Phase 4 Integration - Feb 6, 2026

### Files Created (8 total)
1. `services/johnny5/error-pattern-library.ts` - ~360 lines, error→solution pair tracking with Jaccard similarity matching
2. `components/johnny5/ErrorPatternCard.tsx` - ~260 lines, emerald-themed known fix card
3. `data/agent-personas.json` - 6 pre-configured personas (Security Auditor, Performance Optimizer, Documentation Writer, Test Engineer, Code Reviewer, Refactoring Expert)
4. `components/johnny5/AgentPersonas.tsx` - Overlay for browsing/activating personas with CLAUDE.md rule copying
5. `services/johnny5/session-coach.ts` - ~310 lines, session pattern monitoring with 5 coaching tip detectors
6. `components/johnny5/CoachTip.tsx` - ~175 lines, teal-themed non-intrusive tip card

### Files Modified (1)
- `components/johnny5/Johnny5Panel.tsx` - 8 edits total (4 by agent 4b for AgentPersonas, 4 for ErrorPatternCard + CoachTip + services):
  1. Added imports: ErrorPatternCard, CoachTip, getErrorPatternLibrary, getSessionCoach
  2. Added state: showErrorPattern, showCoachTip
  3. Extended service initialization useEffect with getErrorPatternLibrary().start/stop() and getSessionCoach().start/stop()
  4. Added johnny5:openWorkflows event listener (for SessionCoach's scope_creep tip)
  5. Added ErrorPatternCard + CoachTip banners between SessionMemoryPanel and tab content
  6. (Agent 4b) Added AgentPersonas import, UserCog icon, showPersonas state, header button, overlay

### Architecture Summary
- All Phase 4 services follow the singleton pattern (class + `get*()` export + start/stop lifecycle)
- All client-side only (browser), no Node.js imports
- ErrorPatternLibrary hooks into TerminalActivityCollector for error tracking
- SessionCoach monitors 5 session patterns with 5-minute cooldown between tips
- AgentPersonas is data-driven from JSON, activates via clipboard + terminal dispatch

### New CustomEvents
- `johnny5:knownErrorMatch` - ErrorPatternLibrary → ErrorPatternCard
- `johnny5:errorPatternDismiss` - ErrorPatternCard → confidence downgrade
- `johnny5:coachTip` - SessionCoach → CoachTip
- `johnny5:openWorkflows` - SessionCoach → Johnny5Panel (opens workflow builder)

### Build Verification
- `npx next build` compiles with zero TypeScript errors
- All pages generate correctly

---

# Johnny5 Proactivity Wiring (Feb 6, 2026)

## Status: COMPLETE

## Context
Wired up disconnected Johnny5 proactive features so Johnny5 can autonomously detect opportunities, classify events via Claude, and notify Mike via Telegram - similar to Klouse from the YouTube video.

## Tasks

- [x] Install telegraf dependency (`npm install telegraf@^4.16.3`)
- [x] Create Telegram Bot service (`services/johnny5/telegram-bot.ts`)
- [x] Create Opportunity Engine service (`services/johnny5/opportunity-engine.ts`)
- [x] Create Webhook Handler API route (`app/api/johnny5/proactive/webhook/route.ts`)
- [x] Add Audit Logging API route (`app/api/johnny5/proactive/audit/route.ts`)
- [x] Wire trend_check to Opportunity Engine (`server.js:3479`)
- [x] Add Proactivity Level checks (built into Opportunity Engine)
- [x] Add Config Validation on startup (`server.js:3541`)
- [x] Create Health Check endpoint (`app/api/johnny5/proactive/health/route.ts`)

## Future Tasks (not in scope)
- [ ] Replace `generateMockAlerts()` in trend-monitor.ts with real API calls
- [ ] Replace `simulateBuildProcess()` in proactive-builder.ts with real Claude calls
- [ ] Connect self-improvement service weekly cron analysis

## Review

### Files Created (5 new)
| File | Purpose |
|------|---------|
| `services/johnny5/telegram-bot.ts` | Telegram bot with reconnection, rate limiting, message splitting, inline buttons |
| `services/johnny5/opportunity-engine.ts` | Core engine: event queue, AI classification, proactivity gating, audit logging |
| `app/api/johnny5/proactive/webhook/route.ts` | Webhook handler with signature verification, Zod validation, rate limiting |
| `app/api/johnny5/proactive/audit/route.ts` | Audit log query API |
| `app/api/johnny5/proactive/health/route.ts` | Health check endpoint (200/503) |

### Files Modified (1)
| File | Change |
|------|--------|
| `server.js` | Added Opportunity Engine integration in trend_check handler (+10 lines). Added proactive services initialization block (+40 lines). |

### Dependencies Added (1)
| Package | Version | Purpose |
|---------|---------|---------|
| `telegraf` | ^4.16.3 | Telegram Bot API library |

### Architecture Decisions
1. **Singleton pattern** - Both telegram-bot.ts and opportunity-engine.ts export singletons matching existing services
2. **Additive only** - No existing code removed or refactored. Only new code added.
3. **Graceful degradation** - If Telegram fails, falls back to Socket.IO. If Claude API fails, logs and skips.
4. **Conservative proactivity** - When in doubt, prompt user rather than auto-act.
