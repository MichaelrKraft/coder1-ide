# 🚀 Coder1 IDE - AI-Native Development Environment

**The world's first IDE built specifically for Claude Code and AI-assisted development**

[![Status](https://img.shields.io/badge/Status-Alpha-yellow)](https://github.com/yourusername/coder1-ide)
[![Server](https://img.shields.io/badge/Server-Next.js-blue)](https://nextjs.org)
[![Port](https://img.shields.io/badge/Port-3001-green)](http://localhost:3001)

---

## 🎯 What is Coder1?

Coder1 is a revolutionary AI-first IDE that features:
- **🧠 Persistent Memory**: Claude never forgets your context across sessions
- **💻 Integrated Terminal**: Full PTY support with AI supervision
- **👁️ Live Preview**: See your code changes in real-time
- **🤖 AI Integration**: Native Claude Code CLI integration
- **📝 Session Summaries**: Comprehensive handoff documents between coding sessions

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Alpha access code (see below)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/coder1-ide.git
cd autonomous_vibe_interface

# 2. Navigate to the IDE directory
cd coder1-ide-next

# 3. Install dependencies
npm install

# 4. Configure environment
cp .env.local.example .env.local
# Edit .env.local and add your API keys and alpha token

# 5. Start the IDE
npm run dev

# 6. Open in browser
open http://localhost:3001
```

---

## 🔑 Alpha Access

The IDE is currently in alpha. You'll need an access code to use it:

**Valid Alpha Codes:**
- `coder1-alpha-2025`
- `early-adopter`
- `claude-code-user`

To get your personalized access code, contact the team.

---

## 🗺️ Navigation

### Main URLs
- **Homepage**: http://localhost:3001 - Memory persistence demo
- **IDE**: http://localhost:3001/ide - Main development environment
- **API Docs**: http://localhost:3001/api-docs - API documentation

### IDE Interface
- **Left Panel**: File explorer and sessions
- **Center**: Monaco editor (VSCode engine)
- **Right Panel**: Preview and agent dashboard
- **Bottom**: Integrated terminal
- **Status Bar**: Memory stats and quick actions

---

## 🎮 Key Features

### Memory Persistence
The IDE remembers everything across sessions. Your context, files, and conversation history are preserved.

### AI Supervision
Type `claude` in the terminal to activate AI assistance. Claude will watch your work and offer proactive help.

### Session Summaries
Click "Session Summary" in the status bar to generate a comprehensive handoff document of your work.

### Live Preview
HTML, CSS, JavaScript, React, and more are rendered live as you code.

---

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file in `coder1-ide-next/` with:

```env
# Required
ANTHROPIC_API_KEY=your-claude-api-key
CODER1_ALPHA_TOKEN=your-secure-token

# Optional
OPENAI_API_KEY=your-openai-key
ENABLE_SUPERVISION=true
ENABLE_SESSION_SUMMARY=true
```

### API Keys
- **Anthropic API Key**: Required for Claude integration
- **OpenAI API Key**: Optional, for fallback AI features
- **Alpha Token**: Required for authentication

---

## 📁 Project Structure

```
autonomous_vibe_interface/
├── coder1-ide-next/        # Main IDE application (Next.js)
│   ├── app/               # Next.js app router pages
│   ├── components/        # React components
│   ├── lib/              # Utilities and middleware
│   ├── services/         # Backend services
│   └── server.js         # Unified custom server
├── CANONICAL/            # Reference HTML templates
├── public/              # Static assets
└── ARCHIVE/             # Deprecated code (do not use)
```

---

## 🚨 Important Notes

### Current Architecture
- **Single unified server** on port 3001
- **Next.js custom server** with integrated terminal
- **WebSocket support** via Socket.IO
- **No separate Express server** (legacy code archived)

### Security
All file APIs require authentication. The platform includes:
- Bearer token authentication
- Path traversal protection
- Rate limiting
- Session management

### Known Issues
- High memory usage in development mode (normal)
- Some cosmetic 404s for static assets
- File API currently restrictive (being fixed)

---

## 🧪 Development

### Running Tests
```bash
cd coder1-ide-next
npm test
```

### Security Testing
```bash
node test-security.js
```

### Building for Production
```bash
cd coder1-ide-next
npm run build
npm start
```

---

## 🤝 Contributing

We welcome contributions! Please read our contributing guidelines before submitting PRs.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes in `coder1-ide-next/`
4. Test thoroughly
5. Submit a pull request

### Code Style
- Use TypeScript where possible
- Follow existing patterns
- Add comments for complex logic
- Write tests for new features

---

## 📚 Documentation

- [Architecture Overview](./docs/architecture/REAL_ARCHITECTURE_FINDINGS.md)
- [Security Documentation](./docs/phase-reports/SECURITY_FIXES_SUMMARY.md)
- [Phase 1 Summary](./docs/phase-reports/PHASE1_COMPLETION_SUMMARY.md)
- [Phase 2 Plan](./docs/phase-reports/PHASE2_ACTION_PLAN.md)

---

## 🆘 Troubleshooting

### Server Won't Start
```bash
# Kill any existing processes
lsof -ti :3001 | xargs kill -9

# Restart
cd coder1-ide-next && npm run dev
```

### Authentication Issues
- Ensure `.env.local` has valid `CODER1_ALPHA_TOKEN`
- Check alpha access code is correct
- Clear browser cookies and try again

### High Memory Usage
- This is normal in development mode
- Restart server if it becomes unresponsive
- Production build uses less memory

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/coder1-ide/issues)
- **Discord**: [Join our community](https://discord.gg/coder1)
- **Email**: support@coder1.dev

---

## 📜 License

MIT License - See [LICENSE](./LICENSE) file for details

---

## 🙏 Acknowledgments

Built with ❤️ for the next generation of AI-assisted developers.

Special thanks to the Claude Code team and all alpha testers.

---

*Last Updated: January 10, 2025*  
*Version: 1.0.0-alpha*