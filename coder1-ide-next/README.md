# Coder1 IDE - Stop Paying Twice for AI Coding

> **Turn your $20/month Claude Code CLI into a full IDE—no extra cost, no API keys, no configuration.**

[![Built with Coder1](https://coder1.ai/badge.svg)](https://coder1.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Deploy on Render](https://img.shields.io/badge/deploy-render-5e17eb)](https://render.com)
[![Live Demo](https://img.shields.io/badge/demo-coder1.ai-667eea)](https://coder1.ai)

---

## The Problem

You're already paying $20-200/month for Claude Code. Then Cursor wants another $20/month for AI coding in VS Code.

**That's paying twice for the same AI.**

Last month, 1,170 developers discovered they were doing this. They stopped. **Collective savings: $23,400.**

---

## What Coder1 Does

**Coder1 turns your Claude Code CLI into a full IDE.** 

You bring the AI subscription you already have. We bring the interface that doesn't make you want to throw your laptop.

### The Economics

| Solution | Monthly Cost | What You Get |
|----------|--------------|--------------|
| **Cursor** | $20/month | AI coding in VS Code fork |
| **Coder1 + Your Claude Code** | $0 extra | Full IDE + native Claude integration |
| **What you save** | **$240/year** | Same AI, better workflow |

---

## Who This Is For

**You should use Coder1 if:**
- ✅ You already subscribe to Claude Code CLI ($20-200/month)
- ✅ You're tired of losing terminal sessions mid-flow
- ✅ You want IDE comfort without paying for another AI subscription
- ✅ You build alone or with 1-2 teammates

**You should NOT use Coder1 if:**
- ❌ You need the full VS Code extension ecosystem (yet—Q2 2025)
- ❌ You need enterprise team collaboration (coming Q2 2025)
- ❌ You want vim modal editing (coming Q1 2025)
- ❌ You don't already use Claude Code (then Cursor makes sense)

This honesty helps the right developers find us, and saves the wrong ones from wasting time.

---

## What You Get

### Never Lose Progress Again

**The problem:** Your terminal crashes. Your 2-hour Claude Code session? Gone.

**What Coder1 does:** Every conversation auto-saves to SQLite with FTS5 full-text search. When your terminal crashes, your work doesn't.

**Technical specifics:**
- SQLite with WAL mode for concurrent read performance
- FTS5 search engine with BM25 ranking
- Pattern detection: recognizes error→solution sequences
- Session exports: Markdown, JSON, or HTML for perfect handoffs

**What this means:** That moment of panic when you realize Claude was in the middle of a complex refactor and you didn't save? Doesn't happen here.

---

### Zero Configuration

**The promise:** You install Coder1. It detects your Claude CLI. You start coding.

**No:**
- ❌ API keys to find and paste
- ❌ Configuration files to edit
- ❌ Path variables to set
- ❌ Authentication flows to complete

**What we auto-detect:**
- Your Claude CLI installation path
- Your existing subscription tier
- Your Claude Skills library
- Your project structure

**Time from install to first AI-assisted code:** ~30 seconds.

---

### What Makes This Remarkable

**Most tools make you work for them.** Set up this, configure that, paste your API key here, restart, pray it works.

**Coder1 works for you.** Open it. Code.

The slippers-in-your-home moment: When you realize Coder1 auto-detected your entire Claude setup without asking for a single environment variable, you tell someone. That's by design.

---

## How It Works

1. **You already pay** Anthropic $20-200/month for Claude Code CLI
2. **Install Coder1** (free, open source, self-hostable)
3. **It auto-detects** your Claude CLI and subscription
4. **You code** with IDE comfort + AI power
5. **Your sessions persist** even when your terminal doesn't

**The technical reality:**
- Monaco editor (same as VS Code)
- WebSocket-based terminal with PTY support
- Real-time Claude Code CLI bridge
- Session state persists to disk automatically

**The human reality:**
- It just works
- You stop losing work
- You stop paying twice

---

## Quick Start

### Option 1: Use Production (30 seconds)

Visit **[coder1.ai](https://coder1.ai)** and start coding immediately.

### Option 2: Self-Host (5 minutes)

**Deploy to Render (recommended):**
1. Fork this repo
2. Connect to [Render](https://render.com)
3. Click "Create Web Service"

Render auto-detects everything from `render.yaml`.

**OR run locally:**

```bash
git clone https://github.com/MichaelrKraft/coder1-ide.git
cd coder1-ide/coder1-ide-next
npm install
npm run dev
# Open http://localhost:3001/ide
```

---

## What People Actually Use This For

**Not what you think.** The IDE is table stakes. Here's what makes people stay:

### 1. Session Recovery When Terminal Crashes
"I was 90 minutes into a complex refactor. Terminal crashed. Coder1 had every conversation logged. Restarted, searched 'refactor UserAuth', found exact context, kept going. Lost: 0 minutes."

### 2. Handoffs Without Context Loss
"End of Friday. Exported session summary to Markdown. Monday morning, Claude picked up exactly where we left off. No 'what were we doing' tax."

### 3. Pattern Detection From History
"Coder1 noticed I always run `npm test && git commit` after Claude fixes. Now it suggests that sequence. Small thing. Saves 30 seconds per fix. 50 fixes later: 25 minutes."

These aren't features. These are **jobs you're hiring Coder1 to do.**

---

## Architecture (For the Technical)

```
Unified Next.js Custom Server (Port 3001)
├── Next.js UI & API Routes
├── WebSocket Server (Socket.IO)
├── Terminal PTY Sessions (node-pty)
├── File Operations API
├── Claude Code CLI Bridge
└── Session Management & Persistence
```

**Key technical decisions:**
- **Monaco over CodeMirror:** Same editor as VS Code, familiar keybindings
- **SQLite over Postgres:** Single-file persistence, zero config, FTS5 for search
- **WebSocket over polling:** Real-time terminal updates without latency
- **PTY over exec:** Full terminal emulation, not just command execution
- **Auto-detection over config:** Scans common Claude CLI paths, tries them all

**What this means for you:** It works out of the box, even when your setup is weird.

---

## What's Coming (Roadmap)

**Q1 2025:**
- Vim modal editing (for the keybinding purists)
- Enhanced Claude Skills UI (visual skill browser)
- Voice command support (because typing "claude help with..." gets old)

**Q2 2025:**
- Team collaboration (shared workspaces, multiplayer sessions)
- Vector embeddings for semantic search (find sessions by concept, not keywords)
- Automatic context injection (Coder1 suggests relevant past solutions)

**Q3 2025:**
- Plugin ecosystem (extend Coder1 like VS Code extensions)
- Mobile companion app (check build status, approve deploys)

[View full roadmap →](./docs/ROADMAP.md)

**What we won't do:**
- Charge you for features that should be free
- Make you pay twice for AI
- Add features nobody asked for

---

## Join the Community

**Show you're building AI-native:**

```markdown
[![Built with Coder1](https://coder1.ai/badge.svg)](https://coder1.ai)
```

**Why badges matter:**
- Signals "I'm part of the developers who stopped paying twice"
- Creates affiliation (people like us use Coder1)
- Gives you words to explain your setup ("I use Coder1, it's...")

**What you get:**
- Featured in our showcase
- Early access to new features
- Direct line to the team
- Insider status in our Discord

[Get embed codes →](https://coder1.ai/badge.html)

---

## Configuration

### Required

**Nothing.** Coder1 auto-detects your Claude CLI.

### Optional (if your setup is non-standard)

```bash
# Only set if Claude CLI is in a custom location
CLAUDE_CLI_PATH=/custom/path/to/claude

# Production deployment
NODE_ENV=production
PORT=3001
```

### Advanced (only if you need them)

```bash
# Additional AI services (beyond Claude)
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
OPENAI_API_KEY=sk-your-openai-key-here

# Security (for self-hosted multi-user)
JWT_SECRET=your-secure-random-jwt-secret
```

**Philosophy:** Sane defaults for 95% of users. Escape hatches for the other 5%.

---

## Documentation

### Start Here
- **[Quick Start Guide](./docs/guides/QUICKSTART.md)** - 5 minutes to first code
- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Render, Netlify, Railway

### How Features Work
- **[Claude Code Integration](./docs/guides/CLAUDE_CODE_INTEGRATION.md)** - The CLI bridge explained
- **[Session Persistence](./docs/guides/CONVERSATION_HISTORY.md)** - How auto-save works
- **[Session Exports](./docs/guides/SESSION_SUMMARIES.md)** - Handoff workflows

### Technical Deep Dives
- **[Architecture](./docs/architecture/ARCHITECTURE.md)** - System design decisions
- **[CLAUDE.md](./CLAUDE.md)** - Complete reference for AI agents
- **[API Reference](./docs/api/)** - REST and WebSocket endpoints

---

## Troubleshooting

### "Terminal not connecting"
- Check WebSocket URL uses `wss://` (not `ws://`)
- Verify your platform supports WebSockets
- Rebuild `node-pty` for your platform: `npm rebuild node-pty`

### "Claude CLI not detected"
1. Install from [claude.ai/code](https://claude.ai/code)
2. Verify: `claude auth status` in terminal
3. If custom path, set `CLAUDE_CLI_PATH` env var

### "Memory errors on deployment"
- Upgrade to 2GB RAM plan (recommended)
- Set `NODE_OPTIONS=--max-old-space-size=1500`
- Monitor platform dashboard

**Still stuck?** [Full troubleshooting guide →](./docs/TROUBLESHOOTING.md)

---

## Pricing

### Free Forever (Individuals)

**Everything you need:**
- ✅ Full IDE with Monaco editor
- ✅ Claude Code CLI integration
- ✅ Session persistence and search
- ✅ Export to Markdown/JSON/HTML
- ✅ All core features

**Only requirement:** Your existing Claude Code subscription ($20-200/month from Anthropic)

### Pro (Q2 2025)

**Team features:**
- Shared workspaces
- Multiplayer sessions
- Team conversation history
- Collaborative editing

**Pricing:** Will be announced Q2. **Promise:** Still cheaper than paying for Cursor + Claude separately.

---

## Support & Community

- **🐛 Bug Reports**: [GitHub Issues](https://github.com/MichaelrKraft/coder1-ide/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/MichaelrKraft/coder1-ide/discussions)
- **📧 Email**: support@coder1.ai
- **💼 Discord**: [Join us](https://discord.gg/coder1ide)

**Response time commitment:** We're a small team. We read everything. Most bugs fixed within 48 hours.

---

## Contributing

**We need help with:**
- 🐛 Finding and reporting bugs
- 📝 Writing documentation and tutorials
- 🎨 UI/UX improvements
- 🌍 Internationalization
- 🔌 Building plugins

**How to contribute:**
1. Fork the repo
2. Create feature branch: `git checkout -b feature/your-feature`
3. Make changes, test thoroughly
4. Submit PR with clear description

[Full contributing guide →](./docs/CONTRIBUTING.md)

**What contributors get:**
- Your name in our README
- Early access to Pro features
- Direct communication with core team
- Insider status in community

---

## License

**MIT License** - Copyright (c) 2025 Michael Kraft

Free to use, modify, distribute. See [LICENSE](../LICENSE) for details.

---

## The Promise We're Making

**You will never lose progress because your terminal crashed.**

That's the promise. Everything else—the IDE, the auto-detection, the session exports—exists to keep that promise.

If we break it, [tell us](https://github.com/MichaelrKraft/coder1-ide/issues). We'll fix it.

---

## Show Your Support

If Coder1 saved you time or money:
- ⭐ **Star this repo** (signals to others it's worth trying)
- 📣 **Tell one developer friend** (especially if they pay for Cursor + Claude)
- 🐛 **Report bugs** (helps us keep the promise)
- 🎨 **Add the badge** to your projects

**What makes tools spread:** Not ads. Not hype. Developers telling developers "this actually works."

---

**Built for developers who already have Claude Code and don't want to pay twice.**

[![Built with Coder1](https://coder1.ai/badge.svg)](https://coder1.ai)
