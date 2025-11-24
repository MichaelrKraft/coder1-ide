# Coder1 IDE - Essential Reference (Lean Version)

**🚨 CRITICAL**: Platform name is "Coder1" (with number 1), NOT "CoderOne"

## Repository & Paths

**Primary Repository**: `/Users/michaelkraft/autonomous_vibe_interface/`
- GitHub: `git@github.com:MichaelrKraft/coder1-ide.git`
- Branch: `master`
- IDE Location: `/coder1-ide-next/`

**Commit Process**:
```bash
cd /Users/michaelkraft/autonomous_vibe_interface
git add [files]
git commit -m "[message]"
git push origin master
```

## Quick Start

**Development Server**:
```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npm run dev  # Server runs on port 3001
```

**Access**: http://localhost:3001/ide

## Critical Files

- `/MASTER_CONTEXT.md` - Complete project context
- `/CURRENT_IDE_STATUS.md` - Current IDE location
- `/coder1-ide-next/docs/` - All detailed documentation

## Terminal Configuration

**Current Settings** (Terminal.tsx line 1089):
```typescript
scrollback: 10000  // Optimized for performance
// NOTE: Do NOT add ignoreBracketedPasteMode - breaks Claude CLI UI
```

## Known Issues

1. **CLAUDE.md Size**: Keep under 20KB for fast Claude Code responses
2. **Scrollback Buffer**: Use 10,000 lines (not 50,000 - causes memory issues)
3. **Bracketed Paste**: Must stay ENABLED for Claude CLI to work properly

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Clear Next.js cache (if build issues)
rm -rf .next && npm run dev
```

## Documentation Structure

- **This File**: Daily essentials only (<5KB)
- **Full Docs**: `/coder1-ide-next/docs/` directory
  - `/docs/guides/` - How-to guides
  - `/docs/architecture/` - System design
  - `/docs/api/` - API documentation
  - `/docs/troubleshooting/` - Problem solving

**For Detailed Info**: Reference specific docs instead of keeping everything in CLAUDE.md

## Quick Commands

```bash
# Check if server is running
lsof -ti :3001

# Kill process on port 3001
lsof -ti :3001 | xargs kill -9

# View server logs
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npm run dev
```

---

**Need More Info?** Check `/coder1-ide-next/docs/README.md` for complete documentation index.
