# Agent Hub Phase 1 — SQLite Data Layer + Agents Panel

## Decisions
- `uuid` v11 available → use `import { v4 as uuidv4 } from 'uuid'`
- `better-sqlite3` v12.2.0, `@anthropic-ai/sdk` v0.63.0 both available
- Auth pattern: `verifyAccessToken` + `extractTokenFromHeader` from `lib/auth/jwt`, `auth-token` cookie fallback, dev fallback `'default'`
- DB pattern: singleton getter `getAgentHubDatabase()`, inline `CREATE TABLE IF NOT EXISTS`, WAL+pragmas

## Todo
- [x] `lib/agent-hub/db.ts`
- [x] `lib/agent-hub/agents.ts`
- [x] `lib/agent-hub/skills-registry.ts`
- [x] `app/api/agent-hub/agents/route.ts`
- [x] `app/api/agent-hub/agents/[id]/route.ts`
- [x] `app/api/agent-hub/agents/generate-prompt/route.ts`
- [x] `app/api/agent-hub/skills/route.ts`
- [x] `components/agent-hub/agents/AgentStatusChip.tsx`
- [x] `components/agent-hub/agents/AgentList.tsx`
- [x] `components/agent-hub/agents/AgentDetail.tsx`
- [x] `components/agent-hub/agents/AgentForm.tsx`
- [x] `app/ide/agent-hub/agents/page.tsx`

## Review
All 12 files created. Phase 1 complete.

---

# Coder1 IDE: Beta Readiness + Johnny5 Simplification

## Part 1: Beta Readiness Fixes
- [x] Fix 1: MenuBar hardcoded localhost link → relative URL
- [x] Fix 2: Add `getDocsServiceUrl()` to api-config.ts
- [x] Fix 3: Update DocumentationPanel to use config function
- [x] Fix 4: Update StatusBarActions to use config function

## Part 2: Johnny5 Simplification

### Phase 1: Tab Bar + Panel Shell
- [x] Update `Johnny5Tab` type to `'chat' | 'activity' | 'security'`
- [x] Rewrite `Johnny5TabBar.tsx` with 3 tabs
- [x] Strip `Johnny5Panel.tsx` (remove banners, overlays, background services, crew logic)
- [x] Simplify header buttons

### Phase 2: Activity Tab
- [x] Rename/refactor `SessionsTab` → `ActivityTab` (using existing SessionsTab, removed replay navigation)

### Phase 3: Store Cleanup
- [x] Clean up `useJohnny5Store.ts` - deferred (unused state is harmless, avoids hydration risk)

### Phase 4: Component + Service Cleanup
- [x] Delete removed component directories (8 dirs)
- [x] Delete individual removed components (12 files)
- [x] Delete unused service files (21 files + content-factory dir)
- [x] Delete unused API route directories (17 dirs)

### Phase 5: Settings + Onboarding Simplification
- [x] Simplify SettingsPanel and SetupWizard (removed messaging/integrations steps, Telegram/WhatsApp/Zapier cards)

## Verification
- [x] All broken imports from deleted files fixed (1 in morning-brief-generator, 1 in SessionsTab, 1 in MorningBriefTab)
- [x] Confirm 3 tabs render correctly (verified via Chrome: Chat, Activity, Security all render)
- [x] No console errors from removed components (zero errors in console)
- [x] Chat tab functional (renders with Johnny5 ready status)
- [x] Activity tab shows sessions (20 sessions displayed with search/filters)
- [x] Security tab shows score gauge (85/100) and "All Systems Secure"

## Review

### Part 1: Beta Readiness Fixes
- `components/MenuBar.tsx`: Changed AI PRD link from `http://localhost:3001/...` to relative `/smart-prd-generator-standalone.html`
- `lib/api-config.ts`: Added `getDocsServiceUrl()` using `NEXT_PUBLIC_DOCS_SERVICE_URL` env var with localhost fallback
- `components/documentation/DocumentationPanel.tsx`: Updated 5 hardcoded `localhost:57132` refs to use `getDocsServiceUrl()`
- `components/status-bar/StatusBarActions.tsx`: Updated 1 hardcoded `localhost:57132` ref to use `getDocsServiceUrl()`

### Part 2: Johnny5 Simplification
**Files modified:**
- `types/johnny5.d.ts`: Type reduced from 8 tab values to 3 (`chat | activity | security`)
- `components/johnny5/Johnny5TabBar.tsx`: Rewritten — 10 tabs → 3 tabs (Chat, Activity, Security)
- `components/johnny5/Johnny5Panel.tsx`: Stripped from 625 lines to ~240 lines. Removed 20 imports, 7 background services, 6 banners, 5 overlays, all crew logic
- `components/johnny5/sessions/SessionsTab.tsx`: Removed replay navigation (references deleted reasoning tab)
- `components/johnny5/index.ts`: Cleaned barrel exports (removed 6 deleted module refs)
- `components/johnny5/settings/SetupWizard.tsx`: Removed messaging + integrations wizard steps, deleted Telegram/WhatsApp/Zapier card imports
- `components/johnny5/morning-brief/MorningBriefTab.tsx`: Removed client-side activity generation (deleted accomplishment-detector import)
- `services/johnny5/morning-brief-generator.ts`: Replaced deleted scout-service import with null stub

**Files deleted:**
- 8 component directories (analytics, reasoning, context, mission-control, skills, second-brain, builder, trends)
- 12 individual components (CrewPanel, LiveFeed, AgentPersonas, WorkflowBuilder, etc.)
- 6 onboarding components (TelegramSetupCard, WhatsAppSetupCard, ZapierMCPSetupCard, etc.)
- 21 service files + content-factory dir
- 17 API route directories

**Reduction:** ~70% of Johnny5 UI complexity removed. 10 tabs → 3 tabs. ~60 components → ~20.

---

# (Previous Tasks Below)

# Feature #3: Code-Linked Notes — Gutter Decorations

## Plan

- [x] 1. Add `fileLinksRef` and `decorationsCollectionRef` refs to MonacoEditor
- [x] 2. Add `applyFileLinkDecorations` useCallback (fetch + apply glyph decorations)
- [x] 3. Add `useEffect` to call `applyFileLinkDecorations` when `file` prop changes
- [x] 4. Enable `glyphMargin: true` in `handleEditorDidMount` updateOptions call
- [x] 5. Register `vault.link-note` editor action in `handleEditorDidMount`
- [x] 6. Add `.note-gutter-icon` CSS class to `app/globals.css`

## Key findings from MonacoEditor.tsx

- `editorRef` is the editor instance ref (line 101), `monacoRef` is the monaco namespace (line 102)
- monaco is a **type-only** import — runtime Range must use `monacoRef.current`
- `useCallback` already imported (line 3); `file` prop is the active file path
- `updateOptions` called at line 287 — `glyphMargin: true` added there
- `createDecorationsCollection` used with `deltaDecorations` fallback for older Monaco

## Review

Both files modified with purely additive changes — no existing logic altered.

- `MonacoEditor.tsx`: added 2 refs + 1 `useCallback` + 1 `useEffect` + `glyphMargin: true` + 1 editor action in `handleEditorDidMount`
- `globals.css`: appended `.note-gutter-icon` rule

---

# Phase 2: AI OS Knowledge Base

## Todo

- [x] Task 1: Auto-inject vault context on session start (SessionContext.tsx)
- [x] Task 2: Create `app/api/vault/reindex/route.ts`
- [x] Task 3: Create `services/FossilRecordService.ts`

## Phase 2 UI Features

- [x] UI Task 1: Create `components/notes/NoteDetailView.tsx`
- [x] UI Task 2: Fix LeftPanel NotesPanel missing props + wire @mention into NotesPanel search input
- [x] UI Task 3: Wire NoteDetailView into `app/ide/page.tsx` right panel

## Key Decisions

- LeftPanel's NotesPanel at line 171 is called with no props — need to add onNoteSelect and activeNotePath wired to useVaultStore
- ide/page.tsx right panel: add NoteDetailView as overlay on top of PreviewPanel when activeNotePath is set and vaultEnabled
- For Task 2 @mention: LeftPanel has no chat input. Wire @mention into the notes search input in LeftPanel (the nearest text input in the notes flow). Use useVaultStore().openNote for navigation.
- ConflictBanner: implement simple disk-polling check inside NoteDetailView

## Review

### Task 1 — NoteDetailView.tsx
Created `components/notes/NoteDetailView.tsx` (196 lines). Fetches note from `/api/vault?path=`, shows NoteEditor in edit mode or NoteViewer in preview mode, has back/forward nav wired to useVaultStore, collapsible BacklinksPanel, ConflictBanner when disk content differs, and a "Create it" button for missing notes. Saves via `PATCH /api/vault?path=`.

### Task 2 — @mention in NotesPanel + LeftPanel prop fix
- `LeftPanel.tsx`: imported `useVaultStore`, destructured `openNote` + `activeNotePath`, passed them as props to `<NotesPanel>`.
- `NotesPanel.tsx`: imported `useVaultMention` + `MentionDropdown`, wired the search input to fire `handleMentionChange` on every keystroke, renders `<MentionDropdown>` when `mentionState?.isOpen`. No chat input exists in LeftPanel so the notes search input is the correct integration point.

### Task 3 — ide/page.tsx right panel
- Added `const vaultEnabled = ...` at module level (before component).
- Imported `useVaultStore` and destructured `activeNotePath` + `openNote` inside `IDEPageContent`.
- Added dynamic import for `NoteDetailView`.
- Right panel now renders `<NoteDetailView>` when `vaultEnabled && activeNotePath`, otherwise falls back to `<PreviewPanel>`. Close button calls `useVaultStore.setState({ activeNotePath: null })` to clear the active note.

---

# Flight Recorder Storage Layer (Phase 1)

## Plan

Build the foundational storage layer for the Flight Recorder feature. Three files:

1. **Types** (`lib/flight-recorder/types.ts`) - All TypeScript interfaces and type unions
2. **Migration** (`db/migrations/flight-recorder-v1.sql`) - SQLite schema with FTS5
3. **Storage** (`lib/flight-recorder/storage.ts`) - Singleton class managing SQLite + JSONL

## Todo

- [ ] Create `lib/flight-recorder/types.ts` with all type definitions
- [ ] Create `db/migrations/flight-recorder-v1.sql` with schema + indexes + FTS5 triggers
- [ ] Create `lib/flight-recorder/storage.ts` with singleton storage class
- [ ] Verify TypeScript compiles without errors

## Design Decisions

- **JSONL for bulk event data**: SQLite indexes events but raw data lives in JSONL files for append-only perf
- **FTS5 for search**: Triggers keep FTS in sync with event inserts/deletes
- **WAL mode**: Better concurrent read/write performance
- **`require()` not `import`**: Server-only Node modules in Next.js must use require to avoid client bundling
- **Tiered retention**: 7d full, 30d compact, 90+ delete (unless starred)
- **Terminal chunks**: Output > 10KB gets gzipped to separate file

## Review

(To be filled after completion)

---

# Flight Recorder: Client-Side Event Collector & Secret Scrubber

## Plan

### Task 1: Create `lib/flight-recorder/types.ts`
- [ ] Define FlightEventType union type
- [ ] Define FlightEvent interface
- [ ] Define FlightEventBatch interface

### Task 2: Create `lib/flight-recorder/scrubber.ts`
- [ ] SecretScrubber class with regex patterns for API keys, tokens, passwords, PEM keys
- [ ] `scrub()` method for pre-storage scrubbing
- [ ] `deepScrub()` method for aggressive scrubbing before export
- [ ] `isPasswordPrompt()` method for terminal password detection
- [ ] `.env` content dump detection
- [ ] Export as singleton

### Task 3: Create `lib/flight-recorder/event-collector.ts`
- [ ] EventCollector class with ring buffer (500 max)
- [ ] `record()` method (<1ms, array push + metadata)
- [ ] `startSession()` / `endSession()` methods
- [ ] `pause()` / `resume()` methods
- [ ] `flush()` with fetch to `/api/flight-recorder/events`
- [ ] `beforeunload` handler with `navigator.sendBeacon`
- [ ] Terminal output coalescing (100ms window)
- [ ] Deduplication for repeated terminal output
- [ ] Offline queue (5MB cap, drop oldest)
- [ ] Flush timer (3s interval OR 200 events)
- [ ] Import and use secretScrubber
- [ ] Export as singleton

### Task 4: Create `lib/hooks/useFlightRecorder.ts`
- [ ] React hook wrapping eventCollector
- [ ] Poll getStats() every 2 seconds
- [ ] Check feature flag for isEnabled
- [ ] Provide start/stop/pause/resume controls

### Task 5: Verification
- [ ] Read back all files and verify internal consistency
- [ ] Verify imports resolve correctly
- [ ] Verify types are consistent across files

## Review
(To be filled after completion)

---

# Flight Recorder - Terminal Replay, Annotation Editor & AI Conversation Panel

## Plan

Build three components for the Flight Recorder replay experience:

1. **TerminalReplay.tsx** - Read-only xterm.js terminal for replaying recorded output
2. **AnnotationEditor.tsx** - Compact editor for adding typed annotations at timestamps
3. **AIConversationPanel.tsx** - Chat-bubble panel showing AI prompt/response pairs

## Todo

- [x] Read existing Terminal.tsx to understand xterm initialization pattern
- [x] Read flight-recorder types to understand FlightEvent shape
- [x] Confirm xterm package versions in package.json
- [x] Create TerminalReplay.tsx (~100 lines)
- [x] Create AnnotationEditor.tsx (~80 lines)
- [x] Create AIConversationPanel.tsx (~120 lines)
- [x] Read back all files to verify correctness

## Key Patterns (from existing codebase)

- xterm: `@xterm/xterm` v5.5.0, `@xterm/addon-fit` v0.10.0
- SSR guard: `if (typeof window !== 'undefined') { require(...) }`
- CSS import: `require('@xterm/xterm/css/xterm.css')`
- Types: FlightEvent, FlightAnnotation already defined in `lib/flight-recorder/types.ts`
- Annotation types: 'note' | 'breakthrough' | 'bug' | 'decision' | 'wtf'

## Review - Terminal Replay & Annotation Editor

All three components created and verified. Purely additive -- no existing files modified.

### TerminalReplay.tsx (118 lines)
- Read-only xterm terminal using `@xterm/xterm` v5.5.0 with `disableStdin: true`
- SSR-safe: uses `require()` guard matching existing Terminal.tsx pattern
- Props-driven: `currentEvent` writes output, `snapshot` restores state for seeking, `resetSignal` clears
- ResizeObserver + FitAddon for responsive sizing
- Full Catppuccin-style color theme matching Coder1 design

### AnnotationEditor.tsx (128 lines)
- Compact 288px-wide card for popover/panel use
- 5 annotation types with color-coded icon buttons (note, breakthrough, bug, decision, wtf)
- Derives `AnnotationType` from existing `FlightAnnotation` type -- no duplication
- Keyboard shortcuts: Cmd+Enter to save, Escape to cancel
- `onSave` callback prop (API route wiring deferred)

### AIConversationPanel.tsx (159 lines)
- Chat-bubble layout: user prompts right-aligned (blue), AI responses left-aligned (cyan)
- `ToolUseCard` sub-component: collapsible cards for `ai:tool_use` events
- `ChatBubble` sub-component: handles text extraction from `data.text`, `data.prompt`, or `data.response`
- Auto-scrolls to active event via ref callback + `scrollIntoView`
- Empty state with "No AI interactions in this segment" message
- Active event highlighted with cyan ring glow

### Cleanup
- Removed unused `useCallback` import from TerminalReplay.tsx and AIConversationPanel.tsx

---

# Recordings Dashboard + Timeline Tab Integration

## Plan

- [x] Read existing timeline page (`app/timeline/page.tsx`) - tab system uses URL param `?tab=` with `activeTab` state
- [x] Read StatusBarCore for styling patterns - uses `bg-bg-secondary`, `text-text-muted`, `border-border-default`, cyan accent
- [ ] Create `components/flight-recorder/RecordingsDashboard.tsx` (~200 lines)
- [ ] Add "Recordings" tab to `app/timeline/page.tsx` (dynamic import, new tab button, conditional render)
- [ ] Read files back to verify correctness

## Key Observations

- Tab system: `activeTab` from `searchParams.get('tab')` cast to union type, default='timeline'
- Tab buttons: `router.push('/timeline?tab=...')` with cyan border-b-2 when active
- Existing tabs: "Checkpoints" (timeline) and "FlowTrace" (flowtrace)
- Styling: dark gradient background, gray-800 cards, gray-700 borders, cyan accents
- Icons from lucide-react

## Review
(To be filled after completion)

---

# Flight Recorder: Replay View & Playback Engine

## Plan

Build 4 files for the replay experience when a user clicks a recorded session.

### Files to Create

1. **`lib/flight-recorder/playback-engine.ts`** (~150 lines)
   - Client-side `PlaybackEngine` class managing replay state
   - Play/pause/stop, speed control (1x/2x/5x/10x/50x)
   - Idle gap compression (skip gaps > 2min)
   - Binary search seekTo, step forward/backward
   - Emits events at recorded timestamps adjusted by speed

2. **`components/flight-recorder/FlightTimelineScrubber.tsx`** (~200 lines)
   - Extends patterns from `TimelineScrubber.tsx` (drag, click-to-seek, speed menu)
   - Activity heatmap: colored density bars where events cluster
   - Bookmark markers: red=errors, blue=commits, purple=AI, yellow=annotations
   - Playback controls: |<< < Play/Pause > >>| + speed selector
   - Dark theme, cyan accent playhead

3. **`components/flight-recorder/ReplayView.tsx`** (~250 lines)
   - Main replay layout composing all panels
   - Header: back button, session name, speed selector
   - Timeline scrubber row
   - 3-column panel: Terminal | Event Details | AI Conversation
   - Fetches session + events from API, initializes PlaybackEngine
   - Routes events to correct panel by type prefix

4. **`components/flight-recorder/EventDetailPanel.tsx`** (~120 lines)
   - Renders current event based on type
   - Different views per type (terminal input/output, file ops, AI, errors, git, annotations)
   - Code blocks for terminal, markdown for AI, red highlight for errors

### Todo

- [ ] Step 1: Create `lib/flight-recorder/playback-engine.ts`
- [ ] Step 2: Create `components/flight-recorder/FlightTimelineScrubber.tsx`
- [ ] Step 3: Create `components/flight-recorder/ReplayView.tsx`
- [ ] Step 4: Create `components/flight-recorder/EventDetailPanel.tsx`
- [ ] Step 5: Read back all files to verify correctness

### Design Decisions

- Follow existing TimelineScrubber patterns (drag handling, speed dropdown, click-to-seek)
- Use existing Tailwind theme tokens: `bg-bg-primary`, `coder1-cyan`, `text-text-muted`, etc.
- Use `lucide-react` icons (already in project)
- All components `'use client'`, TypeScript strict, no `any`
- PlaybackEngine is pure logic, no React -- components consume it via callbacks
- Events categorized by type prefix for panel routing (`terminal:*`, `ai:*`, `file:*`, etc.)

### Review

_(to be filled after implementation)_

---

# Flight Recorder Phase 3: Search + Intelligence

## Plan

Build git detection, session analytics, analytics API route, and integrate git detection into the event collector.

### Todo

- [ ] Task 1: Create `lib/flight-recorder/git-detector.ts` — regex-based git event detection (~60 lines)
- [ ] Task 2: Create `lib/flight-recorder/session-analytics.ts` — compute session analytics from events (~80 lines)
- [ ] Task 3: Create `app/api/flight-recorder/sessions/[id]/analytics/route.ts` — API route for analytics
- [ ] Task 4: Integrate git detection into `lib/flight-recorder/event-collector.ts` — auto-detect git events from terminal output

### Design Decisions

- GitDetector uses simple regex patterns matching git CLI output format
- Session analytics computes idle periods using a 2-minute gap threshold
- Analytics route follows existing `[id]/route.ts` pattern (lazy require, Promise params)
- Git detection hooks into `flushPendingTerminalOutput()` after the terminal event is pushed to buffer
- Both terminal event AND git event are recorded (not one or the other)

### Review

_(to be filled after implementation)_

---

# Flight Recorder Phase 4: Export/Import + GDPR + Polish

## Plan

- [ ] Task 1: Create `lib/flight-recorder/exporter.ts` — exports session as `.coder1-recording` JSON with deep scrubbing + path anonymization
- [ ] Task 2: Create `app/api/flight-recorder/sessions/[id]/export/route.ts` — API route for downloading exported session
- [ ] Task 3: Create `app/api/flight-recorder/delete-all/route.ts` — GDPR compliance route to delete all recordings
- [ ] Task 4: Add Export button + Delete All Recordings button to `RecordingsDashboard.tsx`

## Notes

- All files: TypeScript strict, no `any`
- Exporter deep-scrubs all string fields via `secretScrubber.deepScrub()` and anonymizes file paths (strips `/Users/xxx/`, `/home/xxx/`, `C:\Users\xxx\`)
- Export format: single JSON file with manifest, events, and annotations
- Delete All uses two-click confirmation (first click = "Are you sure?", second click = delete)
- Export triggers browser download via `window.open()`
- Minimal changes to RecordingsDashboard: add Download icon import, export button, delete-all button + state

## Review

(To be filled after completion)
