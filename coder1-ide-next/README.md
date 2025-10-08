# 🚀 Coder1 IDE - Next.js Version

The first IDE built specifically for Claude Code and AI-powered development.

## 🎯 Quick Deploy to Production

### 1. Deploy to Render (Recommended)

**Live Demo**: [coder1.ai](https://coder1.ai)

**Deploy Your Own**:
1. Fork this repository
2. Connect your GitHub to [Render](https://render.com)
3. Create a new Web Service
4. Deploy with build command: `npm install && npm run build`
5. Start command: `npm start`

**OR manually:**

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/coder1-ide-next.git
cd coder1-ide-next

# 2. Install dependencies
npm install

# 3. Deploy to Render
# Follow Render deployment guide at render.com
```

### 2. Required Environment Variables

Set these in your deployment platform:

```bash
# REQUIRED: Your Claude Code API Key (Claude Code subscribers only)
CLAUDE_API_KEY=your-claude-code-api-key

# Optional: Custom backend URLs (defaults to current domain)
# NEXT_PUBLIC_EXPRESS_BACKEND_URL=https://your-backend.com
# NEXT_PUBLIC_WEBSOCKET_URL=wss://your-backend.com

# Feature flags (defaults shown)
NEXT_PUBLIC_ENABLE_AI_CONSULTATION=true
NEXT_PUBLIC_ENABLE_AGENT_DASHBOARD=true
NEXT_PUBLIC_ENABLE_TWEAKCC=true
```

## ✨ Features

- **🤖 AI-Powered IDE**: Native Claude Code integration
- **💻 Monaco Editor**: Full VSCode editing experience
- **🖥️ Integrated Terminal**: WebSocket-based terminal with AI supervision
- **📁 File Explorer**: Browse and manage your project files
- **🎯 Agent Dashboard**: Multi-agent AI orchestration
- **📊 Session Summaries**: AI-generated development session reports
- **🔍 Smart Discovery**: AI tools and command palette
- **🔗 Smart PRD Handoff**: One-click transition from requirements to implementation with intelligent prompt formatting

## 📚 Documentation

### Development Plans
- **[Phase II: Claude Terminal Enhancement](./PHASE_II_CLAUDE_TERMINAL_ENHANCEMENT.md)** - Planned enhancements to the Claude Code terminal experience, including auto slash commands, activity visibility, and context intelligence

### Technical Documentation  
- **[CLAUDE.md](./CLAUDE.md)** - Complete technical documentation and configuration guide
- **[PRD Handoff System](./PRD_HANDOFF_SYSTEM.md)** - One-click PRD-to-IDE handoff with intelligent prompt formatting

## 🏗️ Architecture

```
Next.js App Router
├── /ide                    # Main IDE interface
├── /api/*                  # Backend API routes
│   ├── /claude/*          # AI integration endpoints
│   ├── /terminal-rest/*   # Terminal WebSocket handlers
│   └── /agents/*          # Agent orchestration
└── /components            # React components
    ├── /editor            # Monaco editor integration
    ├── /terminal          # XTerm terminal component
    └── /status-bar        # IDE status bar
```

## 🛠️ Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.local.example .env.local

# 3. Add your Claude Code API key to .env.local  
CLAUDE_API_KEY=your-claude-code-api-key

# 4. Start development server
npm run dev

# 5. Open http://localhost:3001/ide
```

## 🚨 Security Notes

- **Never commit API keys** to version control
- Set `ANTHROPIC_API_KEY` in your deployment platform's environment variables
- The `.env.local` file is ignored by git for security

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `CLAUDE_API_KEY` | Claude Code API key (subscribers only) | Yes | - |
| `NEXT_PUBLIC_API_URL` | API base URL | No | Current domain |
| `NEXT_PUBLIC_EXPRESS_BACKEND_URL` | Backend URL | No | Current domain |
| `NEXT_PUBLIC_WEBSOCKET_URL` | WebSocket URL | No | Current domain (wss) |

### Feature Flags

| Flag | Description | Default |
|------|-------------|---------|
| `NEXT_PUBLIC_ENABLE_AI_CONSULTATION` | AI consultation features | `true` |
| `NEXT_PUBLIC_ENABLE_AGENT_DASHBOARD` | Multi-agent dashboard | `true` |
| `NEXT_PUBLIC_ENABLE_TWEAKCC` | Advanced tweaking features | `true` |
| `NEXT_PUBLIC_ENABLE_CONTAINERS` | Container mode (beta) | `false` |

## 📱 Usage

1. **Open IDE**: Navigate to `/ide` route
2. **Create Files**: Use File Explorer or Ctrl+N
3. **Terminal**: Built-in terminal with AI supervision
4. **AI Help**: Type "claude" in terminal for AI assistance
5. **Agents**: Deploy specialized AI agents via Agent Dashboard

## 🚀 Deployment Platforms

### Render (Recommended)
- Automatic builds from GitHub
- Environment variable management
- Native Node.js support
- Zero configuration needed
- Production-ready infrastructure

### Netlify
```bash
# Add to netlify.toml
[build]
  command = "npm run build"
  publish = ".next"
```

### Railway
```bash
# Railway will auto-detect Next.js
railway up
```

## 🐛 Troubleshooting

### Common Issues

**404 on IDE route:**
- Check that all dependencies are installed
- Verify build completed successfully

**WebSocket connection failed:**
- Check `NEXT_PUBLIC_WEBSOCKET_URL` environment variable
- Ensure your deployment platform supports WebSockets

**API key errors:**
- Verify `CLAUDE_API_KEY` is set in deployment environment
- Check you're using a Claude Code API key (not Anthropic Console key)

**Build errors:**
- Clear Next.js cache: `rm -rf .next && npm run build`
- Check all environment variables are set

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/coder1-ide-next/issues)
- **Documentation**: See `/docs` folder
- **Community**: [Discord](https://discord.gg/coder1ide)

## 🎉 What's Next

This is an alpha release. Upcoming features:
- Enhanced AI agent orchestration
- Collaborative editing
- Plugin system
- Mobile support

---

**Built for the AI-powered development era** 🤖✨