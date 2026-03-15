# Knowledge Base / Notes Feature — Ideation

> Generated after reading: `NoteDetailView.tsx`, `KnowledgeGraph.tsx`, `NotesPanel.tsx`
> Target: Claude Code power users, solo founders, vibe coders

---

## What Already Exists (Baseline)

- Two-pane list (folder tree + note list), Monaco markdown editor, split preview
- `[[wikilink]]` autocomplete + backlinks panel
- `react-force-graph-2d` knowledge graph (nodes sized by link count, active node highlighted amber)
- Full-text search, `@mention` in search bar, relative timestamps
- SQLite + markdown file storage at `~/.coder1/knowledge/`
- API routes: `/api/vault`, `/api/vault/graph`, `/api/vault/backlinks`
- Conflict detection banner (disk vs. in-memory)
- Note history navigation (back/forward)

**Gaps visible in the code:**
- Graph has no filtering, clustering, or semantic grouping — all nodes/links are one color
- No AI interaction inside the notes panel at all
- No connection between notes and open files/terminal/chat
- New note always named by date — no smart titling
- No tagging/frontmatter system surfaced in the UI
- No export, no sharing, no templates

---

## Ideas — Prioritized

---

### 1. AI Auto-Summarize on Save
**What it does:** When you save a note (after a debounce), Claude reads the full content and writes a 2-3 sentence summary into the note's frontmatter (`summary:` field). The summary is shown as a subtle subtitle in the note list instead of a raw text excerpt.

**Why it's wow:** Every note list today shows a dumb text truncation. This shows *meaning* — "This note is about the rate-limiting strategy for the payments API." Unique to an AI-native IDE.

**Complexity:** Low — one API call on save, store result in frontmatter
**Priority:** Must-have

---

### 2. "Capture From Chat" — 1-Click Note from AI Conversation
**What it does:** A `Save to Notes` button appears next to any Claude response in the AI chat panel. One click creates a new note pre-filled with the conversation excerpt, a title Claude suggests, and a backlink to the current file being worked on.

**Why it's wow:** This is the core workflow: you're building something, Claude explains an architectural decision, and you capture it permanently. No other IDE has this bridge from AI chat → persistent knowledge.

**Complexity:** Low — event from chat panel → POST /api/vault with prefilled content
**Priority:** Must-have

---

### 3. Code-Linked Notes — Notes That Know About Files
**What it does:** In the Monaco editor (code editor), a gutter icon appears on any line that has a linked note. In the note editor, you can type `/link-file path/to/file.ts:42` to create a bidirectional link. Clicking the gutter icon opens the note. Notes linked to a file appear in a "Related Notes" section in the file's context.

**Why it's wow:** Obsidian-style linking but between *notes and code lines*, not just notes. "Why did I write this function this way?" — the answer is one gutter click away. No IDE does this.

**Complexity:** Medium — requires Monaco gutter decoration API + new join table in SQLite
**Priority:** Must-have

---

### 4. Smart Graph Clustering — Semantic Groups in the Knowledge Graph
**What it does:** The force graph currently colors everything the same purple/amber. Add a "Cluster by topic" toggle: Claude analyzes all note titles + summaries in a batch, assigns each note to a semantic cluster (e.g., "Architecture", "Bug Fixes", "Product Decisions"), and the graph renders clusters as colored regions with a label. Hovering a cluster highlights all its nodes.

**Why it's wow:** The graph goes from "pretty but confusing" to genuinely navigable. You can immediately see "all my architecture notes" as a constellation. No other note tool does AI-driven semantic clustering of the visual graph.

**Complexity:** Medium — batch summarize call, add cluster field to graph API, update ForceGraph2D `nodeColor` logic
**Priority:** Must-have

---

### 5. Daily Dev Log — Auto-Populated Context Note
**What it does:** Each morning, a new note is auto-created (building on the existing date-named note pattern) and Claude pre-populates it with: files you edited yesterday (from git log), terminal commands you ran, and open questions from your last session summary. Acts as a standup-in-a-note.

**Why it's wow:** The IDE already knows everything you did. Synthesizing it into a structured dev log requires zero effort from the user. Nobody else has context-aware journaling that actually knows your git history.

**Complexity:** Medium — reads git log + session summaries, one Claude call to synthesize
**Priority:** Must-have

---

### 6. "Explain This" → Inline Note Fragment
**What it does:** Select any block of text in a note and press `Cmd+Shift+E`. Claude inserts an inline callout block below the selection explaining the concept in more depth — like a hover tooltip but *permanent and editable*. The callout is styled differently from the main note content.

**Why it's wow:** Notes become self-documenting. You write "we use CQRS here" and immediately get a permanent in-note explanation. It's Notion AI's explain feature but embedded in a code-adjacent knowledge base.

**Complexity:** Low — selection range → Claude call → insert markdown callout at cursor
**Priority:** Nice-to-have

---

### 7. Graph "Path Finder" — How Are Two Notes Connected?
**What it does:** Click two nodes on the knowledge graph while holding Shift. Claude finds the shortest link path between them AND explains *why* they're related based on their content — "Note A links to Note B via 'rate limiting', which both discuss in the context of the payments service."

**Why it's wow:** Turns the graph from a visualization into a reasoning tool. Obsidian has shortest-path but no AI explanation of the semantic connection. Unique.

**Complexity:** Medium — graph traversal (already have adjacency data) + one Claude call for explanation
**Priority:** Nice-to-have

---

### 8. Note Templates with Smart Prefill
**What it does:** When creating a new note, a template picker appears: "ADR (Architecture Decision Record)", "Bug Post-Mortem", "Feature Brief", "Meeting Notes", "Sprint Retro". Each template has structured frontmatter + section headings. Claude auto-fills the context-aware fields (current date, current project, relevant open files).

**Why it's wow:** The ADR template in particular is gold for vibe coders — you make a decision, capture it in 30 seconds with full context. Nobody else has IDE-aware note templates.

**Complexity:** Low — JSON template definitions + frontmatter prefill logic
**Priority:** Must-have

---

### 9. "Orphan Finder" — Surface Isolated Knowledge
**What it does:** A status indicator in the notes panel header shows how many notes have zero backlinks ("orphans"). Clicking it filters the note list to orphans and offers a one-click Claude action: "Connect this note — Claude will suggest which existing notes should link to it."

**Why it's wow:** Knowledge graphs die when nodes become isolated. This actively fights entropy. The AI-suggested linking is something Roam/Obsidian users have wanted for years and never gotten.

**Complexity:** Low — query for nodes with zero backlinks + Claude call for link suggestions
**Priority:** Nice-to-have

---

### 10. Terminal → Note Capture
**What it does:** In the terminal panel, any command output block gets a small "Save to Notes" icon on hover. Clicking it creates a note with the command, its output, a timestamp, and a Claude-generated explanation of what the output means (e.g., for an npm audit output: "3 critical vulnerabilities found, all in devDependencies, safe to address post-launch").

**Why it's wow:** Terminal output is ephemeral and gets scrolled away. This makes it persistent and annotated. Perfect for debugging sessions where you want to remember what you tried.

**Complexity:** Medium — terminal component event + vault API + Claude annotation call
**Priority:** Nice-to-have

---

### 11. Semantic Search ("What do I know about X?")
**What it does:** Replace the current full-text search with a hybrid semantic + keyword search. User types a natural language question: "What did I decide about authentication?" Claude searches note embeddings (stored in SQLite via sqlite-vec or a simple cosine similarity over pre-computed embeddings) and returns the most relevant notes ranked by meaning, not just keyword match.

**Why it's wow:** Current search is just `LIKE '%query%'` in SQLite. Semantic search means you find the note even if you didn't use the exact word. This is table-stakes for a serious knowledge base and no IDE has it.

**Complexity:** High — requires embedding generation pipeline + vector storage in SQLite
**Priority:** Must-have (but phase 2)

---

### 12. "Knowledge Gaps" Detector
**What it does:** Periodically (or on demand), Claude scans all your notes and the current project's codebase and asks: "What is this codebase doing that has no corresponding note explaining it?" It surfaces a list of undocumented decisions, complex files with no linked notes, and TODO comments that never became notes.

**Why it's wow:** Proactive knowledge debt detection. Like a code coverage report but for *documentation*. Nobody has thought to frame it this way in an IDE context.

**Complexity:** High — requires codebase scan + cross-reference with vault
**Priority:** Future

---

### 13. Note Diffing + Version History
**What it does:** Every save creates a git-style snapshot stored in SQLite (hash already exists in the data model — `diskContent` vs `note.content` is already tracked in `NoteDetailView`). A "History" button in the note header opens a side-by-side diff viewer showing what changed between saves. Claude can summarize: "In this edit you clarified the retry strategy and removed the old timeout values."

**Why it's wow:** The conflict detection infrastructure is already 30% built (`diskContent` state, `ConflictBanner`). Version history with AI change summaries is a natural extension that no note tool pairs with AI explanation.

**Complexity:** Medium — extend SQLite schema for note_versions table, use existing diff infrastructure
**Priority:** Nice-to-have

---

### 14. "This Session" Live Notes Sidebar
**What it does:** A persistent, auto-updating "Session Log" note is maintained for the current IDE session. Every time you switch files, run a command, or get a Claude response, a timestamped bullet is appended automatically. At session end, Claude condenses it into a structured summary with decisions made, files changed, and open questions.

**Why it's wow:** Like a black box flight recorder for your dev session. The session summary feature already exists in the IDE — this makes it visible and editable in real-time inside the notes panel, not just a background export.

**Complexity:** Medium — listen to existing IDE events, stream bullets to a special note path
**Priority:** Must-have

---

### 15. Wikilink Hover Preview
**What it does:** In both the Monaco markdown editor and the preview pane, hovering over a `[[wikilink]]` shows a popover with the linked note's title, summary (from idea #1), and first 3 backlinks. Click navigates; the popover has a "Quick Edit" icon that opens the linked note in a split view.

**Why it's wow:** Currently clicking a wikilink is the only interaction — you lose your place. Hover preview is the most-requested Obsidian feature for new users. In a code IDE context where context-switching is expensive, this is especially valuable.

**Complexity:** Low — Monaco hover provider API + existing `/api/vault?path=` endpoint
**Priority:** Must-have

---

## Priority Matrix

| Priority    | Ideas |
|-------------|-------|
| Must-have   | #1 Auto-Summarize, #2 Capture From Chat, #3 Code-Linked Notes, #4 Smart Graph Clustering, #5 Daily Dev Log, #8 Note Templates, #11 Semantic Search, #14 Session Live Notes, #15 Wikilink Hover |
| Nice-to-have | #6 Explain This, #7 Path Finder, #9 Orphan Finder, #10 Terminal Capture, #13 Note Diffing |
| Future      | #12 Knowledge Gaps Detector |

## Recommended Implementation Order (quick wins first)

1. **#15 Wikilink Hover Preview** — Low complexity, immediately improves daily use
2. **#2 Capture From Chat** — Low complexity, defines the core AI-native workflow
3. **#8 Note Templates** — Low complexity, high perceived value for new users
4. **#1 Auto-Summarize** — Low complexity, improves note list quality immediately
5. **#4 Smart Graph Clustering** — Medium, transforms the graph from decoration to tool
6. **#3 Code-Linked Notes** — Medium, the most differentiated feature vs. any competitor
7. **#5 Daily Dev Log** — Medium, drives daily habit formation
8. **#14 Session Live Notes** — Medium, builds on existing session summary infrastructure
9. **#11 Semantic Search** — High complexity but table-stakes for a serious knowledge base
