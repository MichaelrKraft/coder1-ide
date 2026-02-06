# Coder1 IDE - Comprehensive QA Test Report

**Tested:** 2026-02-06
**URL:** http://localhost:3001/ide
**Page Title:** Coder1 IDE
**Tester:** Claude (automated via Claude in Chrome)

---

## Test Areas

### 1. Page Load & Layout
- [x] Page loads without errors
- [x] Three-panel layout renders (explorer, editor, right panel)
- [x] Terminal panel renders at bottom
- [x] Status bar renders at bottom

### 2. Menu Bar
- [x] File menu opens (New File, Open File, Open from Computer, Save, Save As, Close Editor, Exit with keyboard shortcuts)
- [x] Edit menu opens (Undo, Redo, Cut, Copy, Paste, Find, Replace with shortcuts)
- [x] View menu opens (Explorer, Terminal, Output, Focus Mode, Zoom In/Out/Reset)
- [x] Run menu opens (Run Code F5, Debug F9, Stop Shift+F5)
- [x] Help menu opens (Bridge Setup Instructions, GLM 4.6 Setup Guide, About Coder1, Documentation, Keyboard Shortcuts, Report Issue)
- [x] Settings gear works (opens modal with General, Editor, Terminal, AI/LLMs, Memory tabs)
- [x] Alpha Tester #1 badge visible
- [x] Mission Control button works (opens Agent Dashboard with AI Team, Parallel Exploration, Artifacts, Feedback tabs)
- [x] Menu dropdown works (Home page, AI dashboard, Features, AI PRD, Documentation, Settings)

### 3. File Explorer (Left Panel)
- [x] Explorer tab active
- [x] Search tab clickable (opens Codebase Wiki with search, Reindex button, AI features description)
- [x] File tree shows user-workspaces
- [x] Can expand/collapse folders (default folder shows app.js, index.html, README.md, styles.css, test-upload-file...)
- [x] Navigation breadcrumbs work

### 4. Editor (Center Panel)
- [x] Welcome screen displays ("// Welcome to Coder1 IDE", "// Open a file to start coding")
- [x] File opens in Monaco editor with syntax highlighting and line numbers
- [x] "Currently editing: default/index.html" header shows when file is open

### 5. Terminal (Bottom Panel)
- [x] Terminal connected ("Connected to backend terminal")
- [x] Bash prompt responsive (echo command executed successfully)
- [x] Model selector (Sonnet 4.5) visible
- [x] AI Team button visible
- [x] Error Dr. button visible
- [x] Supervision button visible
- [x] Sandbox button visible
- [x] New Claude Tab button visible
- [x] Context counter visible (7 / 200,000 (0%))
- [x] Claude Code activity stats shown (2 in, 5 out, 7 total, $<$0.01)

### 6. Johnny5 Panel (Right)
- [x] Johnny5 tab active (shows "Online - Ready to assist", Ready 85 indicator)
- [x] Preview tab clickable (shows live preview with auto-refresh 300ms)
- [x] Memory tab clickable (shows Contextual Memory, Learning Progress, Session Continuity Timeline with 5 sessions)
- [x] Chat interface visible with conversation history
- [x] Message input works (typed and sent message successfully)
- [x] Johnny5 responds to messages with contextual replies
- [x] Quick action buttons visible (Build a feature, Research, Check status, Delegate to Cl...)
- [x] Limited Mode notice visible (explains bridge requirement)
- [x] Agent icons row visible at top (C, S, R, A, C, S, MI, B...)

### 7. Status Bar
- [x] Connect Bridge button visible
- [x] CheckPoint button works (opens "Name Your Checkpoint" modal)
- [x] Docs button works (opens documentation panel with search, AI Search, cached docs)
- [x] Connected indicator shows green
- [x] Feedback button visible
- [x] Alpha and date indicators visible

### 8. Console Errors
- [ ] No critical JS errors in console (4 errors found - see bugs below)

---

## Bugs Found

### Critical (3)

#### BUG-1: Session Summary modal cannot be closed
- **Severity:** Critical
- **Steps:** Click Session Summary button in status bar OR return from Mission Control
- **Expected:** Modal can be closed via X button, Escape key, or clicking outside
- **Actual:** X button, Escape key, and clicking outside backdrop all fail to dismiss the modal. User is stuck.
- **Impact:** Blocks user from interacting with IDE until page refresh
- **Workaround:** Page refresh
- **File to investigate:** Session Summary modal component (close handler not wired up)

#### BUG-2: Session Summary modal auto-opens on navigation back from Mission Control
- **Severity:** Critical
- **Steps:** Click Mission Control > Click "Back to IDE"
- **Expected:** Returns to IDE normally
- **Actual:** Session Summary modal auto-opens on return, blocking the IDE
- **Impact:** Combined with BUG-1, user must refresh page after visiting Mission Control

#### BUG-3: Preview panel shows "File not found" error for open files
- **Severity:** Critical
- **Steps:** Click any file in explorer (e.g., index.html) to open in editor
- **Expected:** Preview panel renders the file content
- **Actual:** Preview panel shows `{"success":false,"error":"File not found"}`
- **Impact:** Live preview feature is non-functional
- **File to investigate:** Preview API route, file path resolution

### Medium (4)

#### BUG-4: "CoderOne" branding used instead of "Coder1"
- **Severity:** Medium
- **Locations found:**
  - Session Summary modal content: "CoderOne v2.0 IDE session started"
  - Cached Documentation entries: "CoderOne v2.0 Session" (multiple entries)
- **Expected:** All references should use "Coder1" per brand guidelines
- **Impact:** Brand inconsistency

#### BUG-5: Docs panel has no close mechanism
- **Severity:** Medium
- **Steps:** Click Docs button in status bar
- **Expected:** Panel can be toggled off by clicking Docs again, Escape, or a close button
- **Actual:** Clicking Docs again does not toggle it off. Escape doesn't work. No close button.
- **Impact:** User must navigate away or refresh to dismiss the Docs panel

#### BUG-6: "NaNd ago" relative timestamps in Docs panel
- **Severity:** Medium
- **Steps:** Open Docs panel, view Cached Documentation entries
- **Expected:** Shows proper relative time (e.g., "3 months ago")
- **Actual:** Shows "NaNd ago" for all entries
- **Impact:** Timestamp information is unreadable
- **File to investigate:** Date formatting utility for documentation cache

#### BUG-7: Auto-checkpoint fails repeatedly (console errors)
- **Severity:** Medium
- **Steps:** Load IDE page, wait
- **Expected:** Auto-checkpoint saves silently
- **Actual:** Console shows repeated errors: `[AutoCheckpoint:failure] Auto-checkpoint failed (attempt N/3): Error: Checkpoint creation failed`
- **Impact:** Auto-save/checkpoint feature not working. Likely causes "Service Issue" indicator in status bar.
- **File:** `lib/hooks/useAutoCheckpoint.ts:152`

### Low (3)

#### BUG-8: Discover button has no visible effect
- **Severity:** Low
- **Steps:** Click Discover button in status bar
- **Expected:** Opens a Discover panel or navigates somewhere
- **Actual:** No visible response
- **Impact:** Feature appears non-functional or may open behind another panel

#### BUG-9: "Service Issue" indicator intermittently appears in status bar
- **Severity:** Low
- **Steps:** Use IDE normally
- **Expected:** Status bar shows healthy state
- **Actual:** "Service Issue" text appears intermittently next to "Connected" indicator
- **Impact:** May confuse users; likely related to BUG-7 (auto-checkpoint failures)

#### BUG-10: "Memory: keyword-only -- embeddings unavailable" notification
- **Severity:** Low (Informational)
- **Steps:** Send a message to Johnny5
- **Expected:** No warning, or graceful degradation
- **Actual:** Blue info banner appears: "Memory: keyword-only -- embeddings unavailable"
- **Impact:** Minor UX concern; indicates reduced AI memory capability

---

## Summary

| Category | Count |
|----------|-------|
| Features tested | 45+ |
| Passed | 38 |
| Critical bugs | 3 |
| Medium bugs | 4 |
| Low bugs | 3 |
| **Total bugs** | **10** |

### What Works Well
- Three-panel layout loads cleanly with proper styling
- All 5 menu dropdowns function correctly with keyboard shortcuts
- Monaco editor opens files with proper syntax highlighting
- Terminal is fully connected and responsive to bash commands
- Johnny5 AI chat works (sends messages, receives contextual responses)
- Mission Control Agent Dashboard is well-organized
- Settings modal is comprehensive (General, Editor, Terminal, AI/LLMs, Memory)
- Memory tab shows rich session continuity data
- File explorer expand/collapse works
- Codebase Wiki search interface is present

### Top Priority Fixes
1. **Session Summary modal close handler** (BUG-1) — blocking bug, must fix before alpha
2. **Session Summary auto-open on navigation** (BUG-2) — related to BUG-1
3. **Preview "File not found"** (BUG-3) — core feature broken
4. **"CoderOne" -> "Coder1" branding** (BUG-4) — brand consistency
5. **Auto-checkpoint failure** (BUG-7) — causes Service Issue indicator

---

## Review

Testing was performed via Claude in Chrome browser automation on http://localhost:3001/ide. Over 45 individual features were tested across 8 test areas. The IDE loads well and core functionality (editor, terminal, file explorer, AI chat) is solid. The main issues are around modal dismiss behavior, preview file resolution, branding consistency, and the auto-checkpoint service. Fixing the 3 critical and 4 medium bugs would bring the IDE to a solid alpha-ready state.
