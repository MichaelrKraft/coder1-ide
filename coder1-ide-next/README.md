# 🚀 Coder1 IDE - The Claude Code Native Development Environment

> **The first IDE built specifically for Claude Code.** Zero API keys. Zero configuration. Just open and code.

[![Built with Coder1](https://coder1.ai/badge.svg)](https://coder1.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Deploy on Render](https://img.shields.io/badge/deploy-render-5e17eb)](https://render.com)
[![Live Demo](https://img.shields.io/badge/demo-coder1.ai-667eea)](https://coder1.ai)

---

## 🎯 Why Coder1?

**Already using Claude Code?** Coder1 is completely free.

Instead of paying $20/month for Cursor with limited AI features, **use your existing Claude Code subscription** ($20-200/month) in a purpose-built IDE designed specifically for Claude.

### The Economics

| Solution | Monthly Cost | What You Get |
|----------|--------------|--------------|
| **Cursor** | $20/month | AI coding in VS Code fork |
| **Coder1 + Claude Code Pro** | $20/month | Full IDE + native Claude integration |
| **Savings** | **$0 extra** | You're already paying for Claude! |

### How It Works

1. ✅ You subscribe to Claude Code ($20/month from Anthropic)
2. ✅ Coder1 IDE connects to your Claude Code CLI
3. ✅ No additional costs - just better interface
4. ✅ Zero configuration - it auto-detects everything

---

## ✨ What Makes Coder1 Special

### 🤝 Works with Claude Code CLI

**Zero-friction integration**:
- Auto-detects your Claude CLI installation
- Uses your existing Claude Code subscription
- No API keys required
- No additional configuration
- Compatible with all Claude Skills you've created

[Learn more about Claude Code →](https://claude.ai/code)

### 🧠 Eternal Memory - Evolutionary Learning System

**Intelligent contextual memory that learns from your development sessions**

**What Works Today**:
- **Conversation Logging**: All Claude Code sessions automatically saved to SQLite
- **Pattern Detection**: Recognizes command sequences, error→solution patterns, file change patterns
- **Session Summaries**: Export complete development sessions to Markdown/JSON/HTML
- **Smart Search**: FTS5 full-text search with BM25 ranking for finding past conversations
- **Context Retrieval**: Keyword-based matching to surface relevant past solutions

**How It Works**:
1. Captures terminal sessions in real-time as you code with Claude
2. Detects patterns using rule-based analysis of your workflows
3. Stores structured data in SQLite with optimized performance
4. Enables fast search across your complete conversation history
5. Provides session context for seamless handoffs between coding sessions

**Advanced Features** (Available via API):
- FTS5 full-text search with multi-factor relevance scoring
- Contextual retrieval based on current files and error patterns
- Sandbox experiment tracking with confidence scoring
- Memory graduation pipeline for proven patterns

**Coming Soon**:
- Vector embeddings for semantic similarity search
- AI-powered insight generation from historical patterns
- Automatic context injection during Claude sessions
- Skill-Weaver integration for accelerated learning
- Shared team memory (Pro tier)

**Technical Details**:
- SQLite with WAL mode for concurrent read performance
- FTS5 search engine with BM25 ranking algorithm
- Evolutionary memory manager for experiment tracking
- Pattern evolution tracking with confidence adjustments

### 🎯 Purpose-Built Features

- **💻 Monaco Editor**: Full VSCode editing experience with syntax highlighting
- **🖥️ Integrated Terminal**: WebSocket-based terminal with PTY support
- **📁 Smart File Explorer**: Browse and manage your project files
- **🎨 Session Summaries**: Export development sessions for perfect handoffs
- **🔍 Discovery Panel**: Quick access to AI tools and commands
- **🌈 Beautiful UI**: Dark theme optimized for extended coding sessions

---

## 🚀 Quick Start

### Option 1: Use Production (Instant)

Visit **[coder1.ai](https://coder1.ai)** and start coding immediately.

### Option 2: Deploy Your Own

**Deploy to Render in 3 clicks**:

1. Fork this repository
2. Connect to [Render](https://render.com)
3. Click "Create Web Service"

Render will auto-detect configuration from `render.yaml`.

**OR run locally**:

```bash
# 1. Clone the repository
git clone https://github.com/MichaelrKraft/coder1-ide.git
cd coder1-ide/coder1-ide-next

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open http://localhost:3001/ide
```

---

## 🏗️ Architecture

```
Unified Next.js Custom Server (Port 3001)
├── 🎨 Next.js UI & API Routes
├── 🔌 WebSocket Server (Socket.IO)
├── 💻 Terminal PTY Sessions (node-pty)
├── 📁 File Operations API
├── 🤖 Claude Code CLI Bridge
└── 📊 Session Management & Summaries
```

### Key Components

- **`/ide`** - Main IDE interface with Monaco editor
- **`/api/claude/*`** - Claude Code integration endpoints
- **`/api/terminal-rest/*`** - Terminal WebSocket handlers
- **`/api/sessions/*`** - Session management & summaries
- **`/components/editor`** - Monaco editor integration
- **`/components/terminal`** - XTerm.js terminal component
- **`/services/claude-code-bridge.ts`** - CLI integration service

---

## 🌟 Features

### ✅ Available Now

- **Claude Code CLI Integration** - Auto-detects and uses your existing Claude installation
- **Full Monaco Editor** - VSCode-quality editing with IntelliSense
- **Terminal PTY** - Real Linux terminal with full command support
- **Conversation History** - SQLite logging with basic pattern detection
- **Session Summaries** - Export to Markdown, JSON, or HTML
- **WebSocket Real-time** - Instant terminal updates via Socket.IO
- **Production Deployment** - Live at [coder1.ai](https://coder1.ai)
- **Smart PRD Handoff** - One-click transition from requirements to implementation

### 🚀 Coming Soon (Roadmap)

**Q1 2025**:
- Enhanced Claude Skills integration UI
- Visual debugging with AI assistance
- AI pair programming mode
- Voice command support

**Q2 2025**:
- Skill-Weaver (self-improving meta-skills)
- Vector embeddings for semantic search
- Automatic context injection from conversation history
- Team collaboration features

**Q3 2025**:
- Plugin ecosystem
- Mobile companion app
- Collaborative editing sessions
- Advanced AI-powered memory system

[View full roadmap →](./docs/ROADMAP.md)

---

## 🎨 Add the Badge to Your Project

Show you're building with Coder1:

```markdown
[![Built with Coder1](https://coder1.ai/badge.svg)](https://coder1.ai)
```

**Benefits**:
- Join the Coder1 community
- Get featured in our showcase
- Show support for AI-native development
- Help spread the word about cost-free AI coding

[Get embed codes →](https://coder1.ai/badge.html)

---

## 🔧 Configuration

### Environment Variables

#### Required for Claude Integration

```bash
# Claude CLI Path (optional - auto-detected)
# Only set if Claude CLI is in a custom location
CLAUDE_CLI_PATH=

# Production Mode
NODE_ENV=production
PORT=3001
```

#### Optional Features

```bash
# AI Services (for enhanced features beyond Claude)
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
OPENAI_API_KEY=sk-your-openai-key-here

# Security
JWT_SECRET=your-secure-random-jwt-secret
JWT_REFRESH_SECRET=your-secure-refresh-secret

# Feature Flags
NEXT_PUBLIC_ENABLE_AI_CONSULTATION=true
NEXT_PUBLIC_ENABLE_AGENT_DASHBOARD=true
NEXT_PUBLIC_MEMORY_CONTEXT_ENABLED=true
```

### Feature Flags

| Flag | Description | Default | Status |
|------|-------------|---------|--------|
| `NEXT_PUBLIC_ENABLE_AI_CONSULTATION` | AI consultation features | `true` | ✅ Stable |
| `NEXT_PUBLIC_ENABLE_AGENT_DASHBOARD` | Multi-agent orchestration | `true` | ✅ Stable |
| `NEXT_PUBLIC_MEMORY_CONTEXT_ENABLED` | Conversation history | `true` | ✅ Stable |
| `NEXT_PUBLIC_ENABLE_CONTAINERS` | Container mode | `false` | 🧪 Beta |
| `ENABLE_CLI_PUPPETEER` | Advanced CLI automation | `false` | 🧪 Experimental |

---

## 📚 Documentation

### Getting Started
- **[Quick Start Guide](./docs/guides/QUICKSTART.md)** - Get up and running in 5 minutes
- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Deploy to Render, Netlify, or Railway
- **[Configuration Guide](./docs/guides/CONFIGURATION.md)** - Environment variables and setup

### Features
- **[Claude Code Integration](./docs/guides/CLAUDE_CODE_INTEGRATION.md)** - How the CLI bridge works
- **[Conversation History](./docs/guides/CONVERSATION_HISTORY.md)** - Session logging and pattern detection
- **[Session Summaries](./docs/guides/SESSION_SUMMARIES.md)** - Export and handoff workflows
- **[PRD Handoff System](./PRD_HANDOFF_SYSTEM.md)** - Requirements to implementation flow

### Development
- **[Architecture Overview](./docs/architecture/ARCHITECTURE.md)** - System design and components
- **[Phase II: Terminal Enhancement](./PHASE_II_CLAUDE_TERMINAL_ENHANCEMENT.md)** - Planned Claude terminal improvements
- **[Contributing Guide](./docs/CONTRIBUTING.md)** - How to contribute to Coder1

### Technical Reference
- **[CLAUDE.md](./CLAUDE.md)** - Complete technical documentation for AI agents
- **[API Documentation](./docs/api/)** - REST and WebSocket API reference
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues and solutions

---

## 🎮 Usage

### Basic Workflow

1. **Open IDE**: Navigate to `/ide` or visit [coder1.ai/ide](https://coder1.ai/ide)
2. **Create Project**: Use File Explorer or terminal to set up your project
3. **Code with AI**: Type `claude` in terminal for AI assistance
4. **Session Summary**: Click status bar button to export session notes
5. **Handoff**: Share Markdown summary with teammates or future sessions

### Pro Tips

- **Terminal Shortcuts**: `Ctrl+\`` to toggle terminal
- **File Search**: `Ctrl+P` for quick file navigation
- **AI Assistance**: Type `claude help me with [task]` in terminal
- **Session Export**: Click "Session Summary" in status bar for instant handoff docs

---

## 🚀 Deployment Platforms

### Render (Recommended)

**Why Render?**
- ✅ Automatic builds from GitHub
- ✅ Native WebSocket support
- ✅ Environment variable management
- ✅ Free SSL certificates
- ✅ Zero configuration with `render.yaml`

**Deploy Steps**:
1. Fork repository
2. Connect GitHub to Render
3. Click "Create Web Service"
4. Set environment variables (optional)
5. Deploy!

[Full Render guide →](./DEPLOYMENT_GUIDE.md#render)

### Other Platforms

- **Netlify**: [Setup guide →](./docs/deployment/NETLIFY.md)
- **Railway**: [Setup guide →](./docs/deployment/RAILWAY.md)
- **Vercel**: [Setup guide →](./docs/deployment/VERCEL.md)
- **Self-hosted**: [Docker guide →](./docs/deployment/DOCKER.md)

---

## 🐛 Troubleshooting

### Common Issues

**Terminal not connecting**:
- Verify WebSocket URL uses `wss://` (not `ws://`)
- Check that your platform supports WebSockets
- Ensure `node-pty` rebuilt for your platform

**Claude CLI not detected**:
- Install Claude Code CLI from [claude.ai/code](https://claude.ai/code)
- Verify CLI is in PATH or set `CLAUDE_CLI_PATH`
- Check CLI authentication with `claude auth status`

**Build failures**:
- Clear cache: `rm -rf .next && npm run build`
- Check Node.js version (requires 18+)
- Verify all dependencies installed

**Memory errors on deployment**:
- Upgrade to Standard plan (2GB RAM recommended)
- Set `NODE_OPTIONS=--max-old-space-size=1500`
- Monitor memory usage in platform dashboard

[Full troubleshooting guide →](./docs/TROUBLESHOOTING.md)

---

## 💰 Pricing

### Free Forever (Individuals)

**Everything you need**:
- ✅ Full IDE with Monaco editor
- ✅ Claude Code CLI integration
- ✅ Conversation history logging
- ✅ Session summaries & exports
- ✅ WebSocket real-time updates
- ✅ All core features

**Requirements**: Claude Code subscription ($20-200/month from Anthropic)

### Pro (Planned - Q2 2025)

**Team collaboration**:
- Shared workspaces
- User management
- Team conversation history
- Collaborative editing

**Pricing**: To be announced

---

## 🤝 Contributing

We welcome contributions from developers of all skill levels!

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**: Follow our [coding standards](./docs/CONTRIBUTING.md)
4. **Test thoroughly**: Ensure all features work
5. **Submit a PR**: Include description and any relevant docs

### Areas We Need Help

- 🎨 UI/UX improvements
- 📝 Documentation and tutorials
- 🧪 Testing and bug reports
- 🌍 Internationalization
- 🔌 Plugin development

[Contributing guide →](./docs/CONTRIBUTING.md)

---

## 📞 Support & Community

- **🐛 Bug Reports**: [GitHub Issues](https://github.com/MichaelrKraft/coder1-ide/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/MichaelrKraft/coder1-ide/discussions)
- **📧 Email**: support@coder1.ai
- **🐦 Twitter**: [@Coder1IDE](https://twitter.com/Coder1IDE)
- **💼 Discord**: [Join our community](https://discord.gg/coder1ide)

---

## 📜 License

**MIT License** - Copyright (c) 2025 Michael Kraft

See [LICENSE](../LICENSE) for full details.

---

## 🎉 The Vision

**Coder1 is building the future of AI-native development.**

We believe:
- AI should amplify human creativity, not replace it
- Development tools should be accessible to everyone
- Claude Code deserves a native IDE experience
- Open source accelerates innovation

Join us in creating the IDE that developers deserve.

---

## 🌟 Show Your Support

If you find Coder1 useful:
- ⭐ Star this repository
- 🐛 Report bugs or suggest features
- 🤝 Contribute code or documentation
- 📣 Share with your developer community
- 🎨 Add the badge to your projects

---

**Built with ❤️ for the AI-powered development era**

[![Built with Coder1](https://coder1.ai/badge.svg)](https://coder1.ai)
