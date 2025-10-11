# Coder1 IDE - The AI-Native Development Environment

<div align="center">

![Coder1 Logo](https://img.shields.io/badge/Coder1-AI--Native%20IDE-blueviolet?style=for-the-badge)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)
![Monaco](https://img.shields.io/badge/Monaco-VSCode%20Engine-007ACC?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=flat-square&logo=postgresql)
![Stripe](https://img.shields.io/badge/Stripe-Payments-008CDD?style=flat-square&logo=stripe)
![Claude](https://img.shields.io/badge/Claude-AI%20Powered-7C3AED?style=flat-square)

[![GitHub Stars](https://img.shields.io/github/stars/michaelrkraft/coder1-ide?style=flat-square)](https://github.com/michaelrkraft/coder1-ide/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/michaelrkraft/coder1-ide?style=flat-square)](https://github.com/michaelrkraft/coder1-ide/network)
[![GitHub Issues](https://img.shields.io/github/issues/michaelrkraft/coder1-ide?style=flat-square)](https://github.com/michaelrkraft/coder1-ide/issues)
[![Open Core](https://img.shields.io/badge/Model-Open%20Core-success?style=flat-square)](https://en.wikipedia.org/wiki/Open-core_model)

**The first IDE built specifically for the AI-assisted coding era**

[Try It Now](http://localhost:3001/ide) • [Documentation](#documentation) • [Community](#community) • [Pro Features](#pro-features)

</div>

---

## ✨ What is Coder1?

Coder1 is a modern, AI-native IDE that bridges the gap between human creativity and AI capabilities. Whether you're a complete beginner or an experienced developer, Coder1 provides an intuitive workspace where you and AI work together seamlessly.

### 🎯 Perfect For

- **Beginners**: Start coding with zero setup - AI guidance at every step
- **Indie Developers**: Build products faster with AI-powered assistance  
- **Teams**: Collaborate with consistent AI-assisted workflows
- **Educators**: Teach coding with built-in AI mentorship

---

## 🚀 Key Features

### Free & Open Source

✅ **Full IDE Experience**
- Monaco Editor (VSCode engine) with syntax highlighting
- Integrated terminal with PTY support
- Smart file explorer and management
- Real-time collaboration tools

✅ **AI-Powered Tools**
- PRD Generator - Turn ideas into specifications
- Smart Requirements Gathering - 5-question intelligent flow
- Wireframe Generation - Visual mockups automatically
- Code Explanations - Hover for AI-powered insights

✅ **Developer Workflow**
- Git integration
- npm/yarn support
- Hot reload and live preview
- Debugging tools

### 💎 Pro Features (Optional)

🧠 **Eternal Memory** ($29/month)
- Perfect context across unlimited sessions
- Never lose your place in development
- Automatic session restoration
- 30-day memory preservation after trial

👁️ **AI Supervision** ($29/month)
- Real-time code guidance and error prevention
- Intelligent suggestions as you type
- Best practices enforcement
- Security vulnerability detection

**🎉 Start with a 7-day free trial!**

---

## 📦 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL (for Pro features only)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/coder1-ide.git
cd coder1-ide

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

The IDE will be available at `http://localhost:3001/ide`

---

## 🎮 Usage

### Basic Workflow

1. **Open the IDE**: Navigate to `http://localhost:3001/ide`
2. **Create a Project**: Click "New Project" or open existing files
3. **Start Coding**: Use Monaco editor with full VSCode features
4. **Get AI Help**: Ask questions, generate code, debug issues
5. **Save & Deploy**: Integrated Git and deployment tools

### Using AI Features

```bash
# In the terminal, activate AI assistance
claude help me build a React component

# Use PRD Generator for planning
# Navigate to the dashboard → PRD Generator
# Answer 5 strategic questions
# Get a comprehensive project specification
```

### Keyboard Shortcuts

- `Ctrl/Cmd + S`: Save file
- `Ctrl/Cmd + P`: Quick file open
- `Ctrl/Cmd + Shift + P`: Command palette
- `Ctrl/Cmd + `: Toggle terminal
- `Ctrl/Cmd + B`: Toggle sidebar

---

## 🏗️ Architecture

Coder1 follows an **Open Core** model:

```
┌─────────────────────────────────────┐
│     FREE & OPEN SOURCE (MIT)        │
│  ────────────────────────────────   │
│  • Monaco Editor                    │
│  • Terminal Integration             │
│  • File Management                  │
│  • AI PRD Generator                 │
│  • Basic AI Assistance              │
└─────────────────────────────────────┘
              ⬇️
┌─────────────────────────────────────┐
│    PRO FEATURES (Closed Source)     │
│  ────────────────────────────────   │
│  • Eternal Memory                   │
│  • AI Supervision                   │
│  • Advanced Analytics               │
│  • Priority Support                 │
└─────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: Next.js 14, React 18, TailwindCSS, TypeScript
- **Editor**: Monaco Editor (VSCode engine)
- **Terminal**: xterm.js with node-pty
- **AI Integration**: Claude Code CLI (free tier) + Premium API (Pro)
- **State Management**: React Context + Zustand
- **Real-time**: Socket.IO for live updates

---

## 💻 Development

### Project Structure

```
coder1-ide/
├── app/                    # Next.js pages and API routes
├── components/             # React components
│   ├── editor/            # Monaco editor wrapper
│   ├── terminal/          # Terminal component
│   ├── premium/           # Pro feature components
│   └── ...
├── lib/                   # Shared utilities
│   ├── premium-client.ts  # Pro API integration
│   └── ...
├── stores/                # Zustand state management
└── public/                # Static assets
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- components/editor

# Watch mode
npm test -- --watch
```

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

---

## 🌟 Pro Features Deep Dive

### Eternal Memory

Never lose context between sessions. Coder1 Pro remembers:
- All open files and their state
- Terminal history and commands
- Editor cursor positions and selections
- Project-specific settings
- AI conversation context

**How it works**: Your session data is securely stored and automatically restored when you return, even days or weeks later.

### AI Supervision

Real-time coding assistance that:
- Analyzes code as you type
- Suggests improvements and best practices
- Catches errors before they become bugs
- Explains complex code sections
- Recommends refactoring opportunities

**Powered by**: Claude Code CLI (zero API costs!)

### 7-Day Free Trial

Try Pro features risk-free:
1. ✅ One-click activation
2. ✅ Full access to Eternal Memory + AI Supervision
3. ✅ No credit card required
4. ✅ Cancel anytime
5. ✅ Memory preserved for 30 days after trial

[Start Your Free Trial →](http://localhost:3001/trial)

---

## 🤝 Contributing

We love contributions! Coder1 is open source and community-driven.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Run tests**: `npm test`
5. **Commit**: `git commit -m 'Add amazing feature'`
6. **Push**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Development Guidelines

- Write tests for new features
- Follow the existing code style (ESLint + Prettier)
- Update documentation for significant changes
- Keep PRs focused and atomic

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 📚 Documentation

- [User Guide](docs/user-guide.md) - Complete user documentation
- [API Reference](docs/api-reference.md) - API documentation
- [Architecture](docs/architecture.md) - Technical architecture
- [Plugin Development](docs/plugins.md) - Build extensions
- [Deployment Guide](docs/deployment.md) - Production deployment

---

## 🐛 Bug Reports & Feature Requests

Found a bug? Have an idea? We want to hear from you!

- **Bug Reports**: [Create an issue](https://github.com/yourusername/coder1-ide/issues/new?template=bug_report.md)
- **Feature Requests**: [Create an issue](https://github.com/yourusername/coder1-ide/issues/new?template=feature_request.md)
- **Security Issues**: Email security@coder1.ai (do not create public issues)

---

## 💬 Community

Join the Coder1 community:

- **Discord**: [Join our server](https://discord.gg/coder1)
- **Twitter**: [@Coder1IDE](https://twitter.com/Coder1IDE)
- **Blog**: [coder1.ai/blog](https://coder1.ai/blog)
- **YouTube**: [Coder1 Tutorials](https://youtube.com/@coder1ide)

---

## 📊 Stats

<div align="center">

![GitHub Stars](https://img.shields.io/github/stars/yourusername/coder1-ide?style=social)
![GitHub Forks](https://img.shields.io/github/forks/yourusername/coder1-ide?style=social)
![GitHub Issues](https://img.shields.io/github/issues/yourusername/coder1-ide)
![GitHub Pull Requests](https://img.shields.io/github/issues-pr/yourusername/coder1-ide)

</div>

---

## 🎯 Roadmap

### Q1 2025
- [x] Open Core architecture
- [x] Eternal Memory launch
- [x] AI Supervision launch
- [ ] Mobile companion app
- [ ] VS Code extension

### Q2 2025
- [ ] Team collaboration features
- [ ] Self-hosted enterprise version
- [ ] Advanced analytics dashboard
- [ ] Plugin marketplace

### Q3 2025
- [ ] Voice coding support
- [ ] Multi-language support
- [ ] Cloud workspaces
- [ ] AI pair programming mode

[View Full Roadmap →](ROADMAP.md)

---

## 🙏 Acknowledgments

Coder1 is built with amazing open source technologies:

- [Next.js](https://nextjs.org/) - React framework
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - VSCode editor
- [xterm.js](https://xtermjs.org/) - Terminal emulator
- [Socket.IO](https://socket.io/) - Real-time communication
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS
- [Anthropic Claude](https://www.anthropic.com/claude) - AI foundation

Special thanks to all our [contributors](https://github.com/yourusername/coder1-ide/graphs/contributors)!

---

## 📄 License

Coder1 IDE is [MIT licensed](LICENSE).

The core IDE features are free and open source. Pro features (Eternal Memory + AI Supervision) are closed source and available via subscription.

---

## 💼 Enterprise

Need Coder1 for your team?

- **Team Plans**: Up to 50 developers
- **Enterprise**: Unlimited users, self-hosted option
- **White-Label**: Custom branding available
- **Priority Support**: 24/7 dedicated support team

[Contact Sales →](mailto:sales@coder1.ai)

---

<div align="center">

**Made with ❤️ by developers, for developers**

[Website](https://coder1.ai) • [Documentation](https://docs.coder1.ai) • [Support](mailto:support@coder1.ai)

</div>
