# Pencil.dev Integration Plan for Coder1

**Status:** Research Complete - Ready for Implementation
**Priority:** Future Enhancement
**Last Updated:** January 31, 2026
**Research By:** Claude Code Session

---

## Executive Summary

Pencil.dev is a design canvas tool that enables "vibe design" alongside "vibe coding." Integrating it into Coder1 would allow Claude to understand visual design intent, generating code that matches user sketches. This document outlines the research findings and implementation paths.

**Goal:** Make Pencil's capabilities feel native to Coder1, as if it were our own product.

---

## What is Pencil.dev?

- **Website:** https://www.pencil.dev
- **Company:** High Agency, Inc.
- **Founder:** Tom Krcha (ex-Adobe XD, Behance, Alter/Google)
- **Funding:** a16z Speedrun accelerator

### Core Value Proposition

> "Design on canvas. Land in code."

Pencil is an MCP-driven design canvas where:
- Design files (`.pen`) live in your Git repo
- AI agents can read/write designs
- Changes sync bidirectionally between design and code
- Figma copy-paste is supported

### Key Features

| Feature | Description |
|---------|-------------|
| In-IDE Canvas | Vector design tool inside your development environment |
| MCP Protocol | Claude/AI agents can read and write design files |
| `.pen` Files | Open JSON format, version controlled with Git |
| Git Integration | Branch, merge, rollback designs like code |
| Figma Import | Copy-paste from Figma with assets preserved |
| AI Code Gen | Draw UI → AI generates matching HTML/CSS/React |

---

## Why This Matters for Coder1

### The Problem

Current AI coding assistants (Cursor, Windsurf, VS Code + Copilot) work with **text only**. Users describe UI in words, AI guesses what they mean. This leads to:
- Misaligned implementations
- Multiple revision cycles
- Lost design intent

### The Solution

With Pencil integration, the workflow becomes:

```
User sketches dashboard layout in Coder1
        ↓
.pen file saves to project repo
        ↓
Claude reads design via MCP
        ↓
Claude generates React components matching the visual
        ↓
Preview shows result side-by-side with design
```

**Competitive advantage:** Coder1 would be the only Claude Code IDE where AI can see your designs.

---

## Technical Research Findings

### Architecture

| Aspect | Finding |
|--------|---------|
| Protocol | MCP (Model Context Protocol) via stdio, NOT HTTP |
| Desktop App | Electron or Tauri-based (unconfirmed) |
| Port | Dynamic - changes on restart |
| Config Location | Writes to `~/.claude.json` when running |
| Lifecycle | Removes config when app closes |
| File Format | `.pen` - open JSON format |

### Key Discovery: Iframe Not Possible

**Pencil does NOT expose a localhost HTTP server.** It communicates via MCP's stdio protocol. The canvas renders inside IDE webviews (VS Code/Cursor extension system), not as a standalone web page.

This means we **cannot** simply iframe Pencil into Coder1.

### What IS Accessible

1. **`.pen` file format** - Open JSON, can be parsed and rendered
2. **MCP server** - Claude can read/write designs when Pencil desktop is running
3. **VS Code extension** - Available but requires VS Code extension host

---

## Integration Options

### Option 1: MCP-Only Integration (Low Effort)

**Scope:** Claude can read/write `.pen` files, but no visual canvas in Coder1

**User Experience:**
- User designs in Pencil desktop app (separate window)
- `.pen` files save to project
- Coder1's Claude reads designs via MCP
- Claude generates matching code

**Pros:**
- Quick to implement
- Core AI value delivered
- No dependency on Pencil's UI

**Cons:**
- Two separate apps (not seamless)
- Users need to install Pencil separately

**Effort:** 1-2 weeks

---

### Option 2: Build Native Canvas (Full Control)

**Scope:** Build our own design canvas that reads/writes `.pen` format

**User Experience:**
- Design canvas in Coder1's right panel
- Feels completely native
- Full Coder1 branding
- `.pen` file compatibility with Pencil desktop

**Recommended Library: tldraw**
- React/TypeScript native
- MIT licensed
- Modern architecture
- Active development
- Built for collaborative design

**Implementation Phases:**

| Phase | Deliverable | Effort |
|-------|-------------|--------|
| 1 | Basic canvas in right panel | 1-2 weeks |
| 2 | `.pen` file read/write | 1 week |
| 3 | Component library (buttons, forms) | 2-3 weeks |
| 4 | MCP server for Claude access | 1 week |
| 5 | Polish + Figma import | 2-3 weeks |

**Total:** ~8-10 weeks for MVP

**Pros:**
- 100% Coder1 owned
- Full UX control
- No licensing costs
- No external dependencies

**Cons:**
- Significant development effort
- Need to maintain canvas codebase
- May not match Pencil's feature depth initially

---

### Option 3: Business Partnership (White-Label)

**Scope:** License Pencil for embedded use in Coder1

**Contact:**
- Tom Krcha - Founder/CEO
- LinkedIn: https://www.linkedin.com/in/tomkrcha/
- Company: High Agency, Inc.

**What to Propose:**
- Embedded canvas component for Coder1
- White-label or co-branded
- Revenue share or licensing fee

**Pros:**
- Full-featured canvas immediately
- Their team handles maintenance
- Proven product

**Cons:**
- Ongoing licensing cost
- Dependency on external company
- They may decline

**Effort:** Unknown (depends on negotiation)

---

## Recommended Approach

### Strategy: Parallel Paths

1. **Immediately:** Reach out to High Agency about partnership
2. **In parallel:** Build basic tldraw canvas proof-of-concept
3. **Decision point:**
   - If partnership works → integrate their solution
   - If not → continue building native canvas

### Phase 1 Implementation (Quick Win)

Even without full canvas, implement MCP integration:

```typescript
// Add to Coder1's MCP config
{
  "mcpServers": {
    "pencil": {
      // Read from ~/.claude.json when Pencil is running
      // Enables Claude to access .pen files
    }
  }
}
```

This delivers the core AI value: **Claude understands design intent.**

---

## File Locations

### Where `.pen` Files Should Live

```
/project
  /src
  /designs          ← Design files here
    dashboard.pen
    login-modal.pen
    components.pen
  /public
```

### Coder1 Integration Points

| Component | Location | Purpose |
|-----------|----------|---------|
| Right Panel | `components/preview/PreviewPanel.tsx` | Add `design-canvas` mode |
| File Explorer | `components/SafeFileExplorer.tsx` | Detect `.pen` files |
| Menu Bar | `components/MenuBar.tsx` | "Open Design Canvas" |
| API Route | `app/api/design/` | Read/write `.pen` files |
| MCP Config | `lib/mcp-config.ts` | Pencil server integration |

---

## Resources

### Official Links
- Website: https://www.pencil.dev
- Downloads: https://www.pencil.dev/downloads
- Documentation: https://docs.pencil.dev

### Technical References
- OpenCode Pencil Sync: https://github.com/liamvinberg/opencode-pencil-sync
- VS Code Extension: https://marketplace.visualstudio.com/items?itemName=highagency.pencildev

### Canvas Library Options
- tldraw: https://tldraw.dev (Recommended)
- Fabric.js: http://fabricjs.com
- Konva.js: https://konvajs.org
- Excalidraw: https://excalidraw.com

---

## Next Steps When Ready

1. [ ] Contact Tom Krcha at High Agency about partnership
2. [ ] Install Pencil desktop and test `.pen` file format
3. [ ] Prototype tldraw canvas in Coder1's right panel
4. [ ] Implement `.pen` file detection in file explorer
5. [ ] Add MCP server config for Pencil integration
6. [ ] Build component library for common UI elements
7. [ ] Implement Figma copy-paste support

---

## Questions to Answer Before Implementation

1. **Partnership:** Is High Agency interested in white-label/embedding?
2. **Scope:** Full canvas or MCP-only for v1?
3. **Priority:** Where does this rank against other Coder1 features?
4. **Resources:** Who will build/maintain the canvas?

---

*Document created from research session on January 31, 2026*
