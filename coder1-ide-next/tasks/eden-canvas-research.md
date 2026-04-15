# Eden.so Canvas/Workspace Feature Research

> Research conducted 2026-03-17 from eden.so help center and marketing pages.
> Note: The domain is **eden.so** (not eden.sl).

---

## 1. What the Canvas UI Looks Like

Eden Canvas is an **infinite visual workspace** — a zoomable, pannable 2D surface where users arrange content spatially and connect it to AI.

### Layout
- **Toolbar (Top)**: Contains creation tools, AI generation access, and canvas settings
- **Zoom Controls (Bottom-Right)**: Zoom in/out buttons
- **Minimap (Bottom-Left, optional)**: Overview for navigating large canvases, toggled in settings
- **Background**: Optional dot grid for visual alignment (toggle in settings)
- **Sidebar (Left, workspace-level)**: Content library with folders, files, links, notes, projects

### Canvas Settings (Gear Icon in Toolbar)
- Dot Grid toggle (background alignment grid)
- Snap to Grid toggle (auto-align elements when dragging)
- Minimap toggle (overview navigator)

---

## 2. How Users Interact With the Canvas

### Navigation
| Action | Input |
|--------|-------|
| Pan | Hold Space + drag, or press H for Pan tool, or Scroll, or Middle Mouse drag |
| Zoom In/Out | Cmd/Ctrl+Scroll |
| Zoom In (click) | Hold Z + click |
| Zoom Out (click) | Hold Alt+Z + click |
| Fit all content | Cmd/Ctrl+0 |
| Select tool | Press V, then click items |
| Multi-select | Drag across canvas, or Shift+Click / Cmd+Click to add to selection |
| Edit item | Double-click |

### Item Manipulation
- **Drag**: Items are freely draggable on the infinite canvas
- **Resize**: Items can be resized (groups resize together)
- **Group**: Select multiple items, Cmd/Ctrl+G to group (move/resize together)
- **Ungroup**: Cmd/Ctrl+Shift+G
- **Duplicate**: Cmd/Ctrl+D
- **Delete**: Delete/Backspace key
- **Undo/Redo**: Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z

### Layer Ordering
| Shortcut | Action |
|----------|--------|
| ] | Bring Forward |
| Shift+] | Bring to Front |
| [ | Send Backward |
| Shift+[ | Send to Back |

### Level of Detail System
Items render at different detail levels depending on zoom:
- **Zoomed in**: Full content visible
- **Zoomed out**: Thumbnails
- **Very zoomed out**: Color-coded placeholders

This keeps the canvas performant at any scale.

---

## 3. Content Types That Can Be Placed on Canvas

### Workspace Items (via "Browse Items" / "Add Existing" / W key)
- Images (PNG, JPG, GIF)
- Videos (MP4, MOV, uploaded files)
- Video links (YouTube, YouTube Shorts)
- Social links (Instagram Reels, Twitter/X posts)
- Audio files (MP3, WAV)
- PDFs / Documents
- Notes (markdown documents)
- Web pages / Articles / Substack posts
- Chats (existing AI conversations)
- Prompts (saved prompt snippets)
- Projects
- HTML files
- CSV data

### Created Directly on Canvas
- **Notes** (Shift+N) -- markdown-enabled writing surface
- **Text** (T) -- standalone text with heading levels (H1, H2, H3, Body), alignment, bold/italic
- **Sticky Notes** (N) -- 8 colors (yellow, pink, green, blue, purple, orange, teal, brown), supports markdown
- **Shapes** (R) -- rectangles, ellipses, triangles with customizable stroke, fill, fill opacity, border radius
- **Freehand Drawing** (D) -- sketch with adjustable stroke color, width, opacity
- **Arrows/Lines** (L) -- connection arrows that snap magnetically to element edges
- **Sections** (S) -- named container frames (like Figma frames)
- **Chat Nodes** (Shift+C) -- AI conversation nodes
- **AI Image Generation** (Shift+I)
- **AI Video Generation** (Shift+V)
- **AI Audio Generation** (Shift+A)
- **Links** (Shift+L) -- paste URL directly

### Paste Support
- Cmd/Ctrl+V to paste links directly onto canvas (auto-processed)
- Upload files with U key

---

## 4. Toolbar and Controls

### Top Toolbar
1. **"+" Button**: Quick-add menu
   - New Note
   - Browse Items... (search workspace files or create new content)
2. **Sparkle Icon (AI)**: AI generation and chat
   - New Chat
   - Generate Image
   - Generate Video
   - Generate Audio
3. **Gear Icon**: Canvas settings (dot grid, snap to grid, minimap)
4. **Tool Palette** (single-key shortcuts):
   - V = Select
   - H = Pan
   - D = Draw (freehand)
   - R = Shape
   - T = Text
   - L = Arrow
   - N = Sticky Note
   - S = Section

### Bottom-Right
- Zoom controls

### Bottom-Left (optional)
- Minimap navigator

---

## 5. How Items Are Connected or Grouped

### Arrows (Connections)
- Press L to activate Arrow tool
- Draw arrows from any item to any other item
- Arrows **snap magnetically** to element edges (left, right, top, bottom)
- Arrows are **functional, not just visual**:
  - Connecting workspace items TO a Chat node gives AI full context of those items
  - Connecting items TO a generation block provides visual reference inputs
  - You can chain multiple generation blocks together for multi-step workflows

### Sections (Container Frames)
- Press S to create a Section
- Sections are named containers (like Figma frames)
- Drag items INTO a section and they belong to it
- **Key feature**: Connecting a Section to a Chat node automatically pulls ALL items inside the section into AI context
  - Instead of drawing 10 individual arrows, drop items in a section and connect once
- Rename section labels to describe contents (topic, status, platform, etc.)

### Groups
- Select multiple elements, Cmd/Ctrl+G to group
- Grouped elements move and resize together
- Ungroup with Cmd/Ctrl+Shift+G

### Chat Node Connections
- Chat nodes are AI conversation panels placed on the canvas
- Draw arrows from workspace items (videos, PDFs, notes, images, links) INTO a chat node
- AI gets full context from all connected items (transcripts, frames, document content, visual data)
- Can branch chats off of one another
- Type @ in chat to mention specific files

---

## 6. Overall UX Pattern Comparison

### Most Similar To: **Miro + Figma + AI**

Eden's help docs explicitly say: "If you've used tools like Miro or Figma, the spatial interface will feel familiar."

### Key UX Patterns
| Pattern | Source Inspiration |
|---------|-------------------|
| Infinite pannable/zoomable canvas | Miro, Figma, Excalidraw |
| Single-key tool shortcuts (V, H, D, R, T, L, N, S) | Figma |
| Sections/Frames as containers | Figma |
| Magnetic arrow snapping to edges | Miro, draw.io |
| Sticky notes with colors | Miro |
| Freehand drawing | Miro, Excalidraw |
| Shapes with customizable fill/stroke | Figma, Excalidraw |
| Level-of-detail rendering by zoom level | Miro |
| Dot grid background | Figma |
| Snap to grid | Figma |
| Minimap navigator | Figma |
| Layer ordering (bring forward/back) | Figma |
| Real-time collaboration with live cursors | Figma, Miro |
| Presence avatars | Figma |
| Conflict-free concurrent editing (CRDT) | Figma |
| Auto-save | Universal |

### What Makes It Unique (vs Miro/Figma)
1. **AI Chat Nodes on canvas** -- place AI conversations directly on the spatial surface
2. **Functional connections** -- arrows from items to chat nodes give AI full context (not just visual)
3. **Sections as AI context containers** -- connect a section to a chat, and all items inside become AI context
4. **AI Generation blocks** -- generate images (Flux, Seedream, etc.), video (Veo, Kling, Runway, Wan), and audio (Suno) directly on canvas
5. **Workspace integration** -- everything in your drive (files, links, transcripts) is available to place on canvas
6. **Auto-processing** -- items placed on canvas are auto-transcribed, tagged, analyzed
7. **@ mentions in chat** -- reference specific files within AI conversations
8. **Multi-provider AI** -- model selector for different AI providers (Claude, GPT, Gemini, etc.)

---

## 7. Technical Details

- **Rendering**: Level-of-detail system (full content > thumbnails > color-coded placeholders based on zoom)
- **Collaboration**: Real-time via conflict-free concurrent editing (likely CRDT-based)
- **Auto-save**: Caches changes instantly, syncs to cloud in background
- **Performance**: Canvas lag was a known issue, mitigated by LOD system; ongoing optimization for canvases with many long chats

---

## 8. Full Keyboard Shortcuts Reference

### Tools
V=Select, H=Pan, D=Draw, R=Shape, T=Text, L=Arrow, N=Sticky Note, S=Section, Space(hold)=Temp Pan, Z(hold)=Temp Zoom In, Alt+Z(hold)=Temp Zoom Out

### Add to Canvas
Shift+N=New Note, Shift+L=New Link, Shift+C=New Chat, Shift+I=Generate Image, Shift+V=Generate Video, Shift+A=Generate Audio, U=Upload File, W=Add from Workspace

### Actions
Cmd/Ctrl+Z=Undo, Cmd/Ctrl+Shift+Z=Redo, Cmd/Ctrl+A=Select All, Cmd/Ctrl+G=Group, Cmd/Ctrl+Shift+G=Ungroup, Cmd/Ctrl+D=Duplicate, Cmd/Ctrl+0=Fit to Content, Delete/Backspace=Delete Selected, Escape=Deselect/Exit Tool

### Layer Ordering
]=Bring Forward, Shift+]=Bring to Front, [=Send Backward, Shift+[=Send to Back

### Navigation
Cmd/Ctrl+Scroll=Zoom, Scroll=Pan, Middle Mouse Drag=Pan, Shift+Click or Cmd+Click=Add to Selection, Double-click=Edit Item

---

## Sources
- https://eden.so/help/getting-started-with-canvas
- https://eden.so/help/understanding-the-workspace
- https://eden.so/help/canvas-use-cases-for-creators-marketers-and-more
- https://eden.so/changelog
- https://eden.so/
