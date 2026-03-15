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

# Task 3: Rewrite Johnny5Panel.tsx (Johnny5 Redesign)

## Plan
- [x] Read existing Johnny5Panel.tsx (625 lines, 10 tabs, overlays, background orbs)
- [x] Verify store shape: `activeTips`, `setActiveTips`, `dismissTip` exist in useJohnny5Store
- [x] Verify tip-engine exports: `J5Tip`, `getTipEngine().start/stop/getActiveTips/dismissTip`
- [x] Write simplified 211-line replacement with: header, tip cards, ChatTab, platform link
- [x] Run project-wide type check — zero errors for Johnny5Panel.tsx

## Review

Replaced the 625-line, 10-tab complex dashboard with a focused 211-line panel.

**Removed:**
- Johnny5TabBar and all tab switching logic (10 tabs)
- All overlay modals (SettingsPanel, SetupWizard, PromptTemplates, CommandTranslator, WorkflowBuilder, AgentPersonas, CrewPanel)
- Background gradient orbs and CSS animations
- ContextBudgetMini, RuleSuggestion, HandoffBanner, SessionMemoryPanel, ErrorPatternCard, CoachTip banners
- LiveFeed, security score badge, crew badge, complex header with multiple icon buttons
- SecurityTabConnected sub-component (40+ lines)
- URL parameter parsing for setup wizard

**Kept:**
- Same export signature: `export default function Johnny5Panel({ className }: Johnny5PanelProps)`
- `data-tour="johnny5-panel"` attribute
- Socket.IO listeners for `johnny5:chat-push` and `johnny5:morning-brief`
- Intelligence service initialization on mount (pattern-detector, rule-suggester, model-advisor, session-memory, handoff-generator, error-pattern-library, session-coach)
- ChatTab component as the main interaction area

**Added:**
- TipEngine integration: starts on mount, polls every 10s, renders max 3 tip cards
- TipCard sub-component with priority-based border colors and action buttons
- "Open Full Johnny5 Platform" link at bottom

---

# Task: Create ScreenshotShape for Screen Drop Workspace Canvas

## Plan

- [x] Explore existing workspace structure (WorkspaceCanvas.tsx, shapes/ directory)
- [x] Verify tldraw v4.4.1 installed and API exports available
- [x] Create `ScreenshotShape.tsx` in screenshotz/components/workspace/shapes/
  - IScreenshotShape type definition with all props
  - ScreenshotShapeUtil class (component, indicator, geometry, resize)
  - Card rendering: image area (70%) + info area (30%)
  - Content type badge with color mapping
  - All inline styles using --sd-* CSS variables
- [x] Verify TypeScript compiles cleanly (0 errors from ScreenshotShape; 5 pre-existing in other files)

## Review

Created `ScreenshotShape.tsx` using the tldraw v4.4.1 canonical custom shape pattern:

- **Module augmentation**: `TLGlobalShapePropsMap` extended with `screenshot` key and all custom props
- **Type**: `IScreenshotShape = TLShape<'screenshot'>` (single generic param via augmented map)
- **BaseBoxShapeUtil**: Extends `BaseBoxShapeUtil<IScreenshotShape>` which provides `getGeometry` and `onResize` for free
- **static props**: Validators using `T.number` / `T.string` without explicit `RecordProps` type annotation
- **component()**: Card layout with 70% image area (img tag or placeholder) + 30% info area (title + content type badge)
- **Badge colors**: 6 content types mapped (tweet, article, product, code, design, default)
- **All styles inline** using `--sd-*` CSS variable fallbacks
