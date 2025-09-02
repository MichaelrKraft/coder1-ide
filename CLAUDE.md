# 🚀 Coder1 IDE - The Claude Code Native Development Environment

## 🚨 CRITICAL GITHUB REPOSITORY INFORMATION FOR ALL AI AGENTS

**PRIMARY REPOSITORY**: 
- **Local Path**: `/Users/michaelkraft/autonomous_vibe_interface/`
- **GitHub**: `git@github.com:MichaelrKraft/coder1-ide.git`
- **Branch**: `master` 
- **Status**: ✅ ACTIVE - This is the ONLY repository to use
- **Last Cleanup**: September 1, 2025 - Repository completely cleaned and pushed

**⚠️ DO NOT USE**:
- Home directory git (~/): Legacy setup, DO NOT COMMIT HERE
- Any other coder1-ide repositories or branches
- Any backup directories or old clones
- The old 3.6GB home directory repository (cleaned up)

**Commit Process for All Agents**:
```bash
# 1. Always work from the correct directory
cd /Users/michaelkraft/autonomous_vibe_interface

# 2. Make your changes
[edit files]

# 3. Stage and commit
git add [files]
git commit -m "[message]"

# 4. Push to GitHub
git push origin master
```

**Repository History**:
- September 1, 2025: Major cleanup - Removed 3.6GB of large files, created fresh repository
- All Phase 1 refactoring completed and successfully pushed to GitHub
- Repository now clean, fast, and ready for collaborative development

**Recent Updates**:
- **September 2, 2025**: Added animated canvas background effect to HeroSection
  - Integrated `CanvasRevealEffect` with animated dot matrix using Three.js and @react-three/fiber
  - Cyan and purple color scheme matching Coder1 branding
  - Background animates from center outward with WebGL rendering
  - All existing HeroSection content (logo, text, buttons) preserved with proper z-index layering
  - Created `/lib/utils.ts` and `/components/ui/canvas-reveal-effect.tsx`
  - **Troubleshooting Note**: If CSS/JS 404 errors occur, run `rm -rf .next && npm run dev` to clear cache

---

## 📖 **ESSENTIAL READING FOR ALL AI AGENTS**

**🚨 CRITICAL NAMING CONVENTION: The platform name is "Coder1" (with number 1), NOT "CoderOne" or "Coder One"**

**🚨 FIRST PRIORITY: Before ANY IDE work, check `/CURRENT_IDE_STATUS.md` for correct IDE location**

**🚨 CRITICAL: Before working on this project, read `/MASTER_CONTEXT.md` completely**

**🆕 NEW (Jan 29, 2025)**: Claude Conductor features added - see `CLAUDE_CONDUCTOR_FEATURES.md` for:
- Template System for cross-agent workflows
- Journal Export (JSON → Markdown conversion)
- Auto-Archiving memory management
- New API endpoints at `/api/agent/*`

This document contains:
- Complete YouTube video foundation that inspired the entire system
- Evolution from tmux orchestrator concept to current AI Team implementation
- Technical architecture and design decisions
- What works vs what needs completion
- Emergency procedures and common issues

**Why this matters**: Multiple agents have worked on this project with different understandings. The MASTER_CONTEXT.md provides the complete picture to ensure continuity and prevent conflicting approaches.

---

## 🎯 Vision & Mission

**Coder1 is the first IDE built specifically for Claude Code and the new generation of vibe coders.**

We're building an IDE that bridges the gap between AI capabilities and human creativity, making programming accessible to newcomers while providing power features for experienced developers. This isn't just another code editor - it's a collaborative workspace where humans and AI work together seamlessly.

### Core Philosophy
- **AI-First, Human-Centered**: Every feature is designed to amplify Claude Code's capabilities
- **Vibe Coding**: Programming should feel intuitive, creative, and fun
- **Zero to Hero**: Beginners can start coding immediately with AI guidance
- **Power When Needed**: Advanced features are there but don't overwhelm

---

## 🌟 What Makes Coder1 Special

### For Claude Code Users
- **Native Integration**: Built from the ground up to work perfectly with Claude Code CLI
- **Session Intelligence**: AI understands your entire development context
- **Smart Handoffs**: Seamlessly transition between human and AI coding sessions
- **Supervision Mode**: Claude watches and assists as you code in real-time

### For Vibe Coders & Beginners
- **Friendly UI**: Dark theme with intuitive controls - no intimidating interfaces
- **AI Explanations**: Hover over any code for instant AI-powered explanations
- **Smart PRD Generator**: Describe what you want, AI handles the technical details
- **One-Click Everything**: Deploy, test, commit - all simplified to single buttons
- **Learning Mode**: AI teaches as you code, explaining concepts in real-time

### For Power Users
- **Monaco Editor**: Full VSCode editing experience
- **Integrated Terminal**: Full PTY support with AI supervision
- **Session Summaries**: Comprehensive development reports for handoffs
- **Multi-Format Exports**: Markdown, JSON, HTML for any workflow

---

## 🚀 CURRENT DEPLOYMENT STATUS (August 29, 2025)

### ✅ IDE Menu Button Version - DEPLOYED

**IMPORTANT FOR ALL CLAUDE AGENTS**: The correct Menu button version is now deployed!

**What you should see at `http://localhost:3000/ide`**:
- **Left**: File, Edit, View, Run, Help menu bar
- **Right**: **"Menu"** button with 8 navigation options

**Menu Dropdown Options**:
1. 🏠 Dashboard  
2. 🧩 Components
3. 📄 Templates  
4. 🪝 Hooks
5. ✨ Features
6. 📚 Documentation
7. ⚙️ Settings  
8. ℹ️ About

**Current Build Files**:
- JavaScript: `main.17b4a14b.js`
- CSS: `main.954ba485.css`
- Source Branch: `stable-terminal-working-2025-01-27`

**❌ If you see a "📚 Docs" button instead of "Menu"**: Wrong version is deployed!

**Recovery Commands**:
```bash
cd /Users/michaelkraft/autonomous_vibe_interface
git checkout stable-terminal-working-2025-01-27
cd coder1-ide/coder1-ide-source && npm run build
cp -r build/* ../../public/ide/
```

**Version Verification**: Check `/public/ide/VERSION.md` for detailed information.

---

## 🎮 Quick Start Guide

### First Time Setup (Beginners Welcome!)
```bash
# 1. Clone the project
git clone https://github.com/yourusername/coder1-ide.git
cd coder1-ide

# 2. Install everything with one command
npm run setup

# 3. Start the magic
npm start

# 4. Open your browser
# Visit http://localhost:3000 🎉
```

### Two Modes, One Platform

#### 🎨 **Creative Mode** (http://localhost:3000)
Perfect for planning and ideation:
- AI-powered PRD generator
- Wireframe creation
- Requirements gathering
- Project planning

#### 💻 **Code Mode** (http://localhost:3000/ide)
Where the magic happens:
- Full code editor
- Integrated terminal
- AI supervision
- Real-time assistance

---

## 🏗️ Architecture Overview

```
Coder1 Platform
├── 🎨 PRD Generator (Creative Mode)
│   ├── 5-Question Intelligent Flow
│   ├── AI Brief Enhancement
│   └── Wireframe Generation
│
├── 💻 IDE Interface (Code Mode)
│   ├── Monaco Editor (VSCode engine)
│   ├── Terminal with PTY
│   ├── File Explorer
│   └── Status Bar with AI Controls
│
├── 🤖 AI Integration Layer
│   ├── Claude Code CLI Bridge
│   ├── Supervision System
│   ├── Session Intelligence
│   └── Context Management
│
└── 🔧 Backend Services
    ├── Express Server
    ├── WebSocket Layer
    ├── File System API
    └── Session Management
```

---

## 🌈 Key Features Explained

### 🧠 Session Summary Button (Game Changer!)
Located in the bottom status bar, this feature creates comprehensive handoff documents:
- **What It Does**: Analyzes your entire coding session
- **Why It's Special**: Creates perfect handoffs between human and AI sessions
- **Export Options**: Markdown, JSON, or HTML formats
- **Use Case**: "Claude, continue where I left off" becomes actually possible

### 👁️ AI Supervision System
Revolutionary real-time coding assistance:
- **Auto-Activates**: When you type `claude` in the terminal
- **Watches Everything**: Understands context from files, terminal, and edits
- **Suggests Proactively**: Offers help before you ask
- **Privacy First**: All processing happens locally

### 🎯 Smart PRD Generator
Turn ideas into specifications:
- **5 Strategic Questions**: AI asks exactly what it needs
- **Enhanced Briefs**: Transforms basic ideas into detailed specs
- **Wireframe Creation**: Visual mockups generated automatically
- **Developer Ready**: Output includes technical requirements

### 📝 Vibe Coder Features
Making coding accessible:
- **Plain English Commands**: Type what you want, AI translates to code
- **Error Explanations**: Errors explained in human terms
- **Code Comments**: AI adds helpful comments automatically
- **Learning Tooltips**: Hover for explanations of any code

### 📚 Documentation Intelligence System
Advanced documentation management for enhanced AI context:
- **Smart Content Extraction**: Fetches and intelligently parses documentation from URLs
  - Removes navigation, ads, and irrelevant elements
  - Extracts title, headings, code blocks, and main content
  - Uses intelligent selectors optimized for documentation sites
- **Intelligent Chunking**: Breaks content into AI-optimal chunks
  - Natural break points based on document structure
  - Sliding window fallback for unstructured content
  - Token-aware optimization (default 800 words per chunk)
- **Advanced Search & Ranking**: Multi-level relevance scoring
  - Title matching (highest weight)
  - Heading and code block analysis
  - Context-aware snippet extraction
  - Category-based filtering support
- **Caching & Storage**: Efficient documentation management
  - 24-hour intelligent cache to avoid re-fetching
  - MD5-based document IDs for deduplication
  - Stored in `/data/documentation/` with search index
  - EventEmitter-based for progress tracking

**API Endpoints**:
- `POST /api/docs/add` - Add documentation from any URL
- `POST /api/docs/search` - Search with token optimization
- `GET /api/docs/list` - List all stored documentation
- `GET /api/docs/:id` - Retrieve specific documentation
- `DELETE /api/docs/:id` - Remove documentation
- `GET /api/docs/health` - System health check

**Why This Matters for AI Agents**: The Documentation Intelligence System allows Claude Code and other AI agents to access relevant, up-to-date documentation during development sessions. This dramatically improves code quality by providing contextual references, API documentation, and best practices directly within the development workflow.

---

## 💻 Development Workflow

### For Modifying the IDE
```bash
# 1. Make your changes
code coder1-ide/coder1-ide-source/src/

# 2. Test locally
npm run dev

# 3. Build for production
cd coder1-ide/coder1-ide-source
npm run build

# 4. Deploy
cp -r build/* ../../public/ide/

# 5. Verify
open http://localhost:3000/ide
```

### For Adding Features
1. **Plan**: Use PRD generator to spec out the feature
2. **Implement**: Code with AI supervision active
3. **Test**: Use integrated testing tools
4. **Document**: Session summary captures everything
5. **Share**: Export and share with team

---

## 🔧 Configuration

### Environment Variables
```env
# Required for AI Features
ANTHROPIC_API_KEY=your-claude-api-key
OPENAI_API_KEY=your-gpt-api-key     # Optional, for fallback

# Server Configuration
PORT=3000                            # Default port
NODE_ENV=development                 # or 'production'

# Feature Flags
ENABLE_SUPERVISION=true              # AI supervision in terminal
ENABLE_SESSION_SUMMARY=true          # Session summary feature
ENABLE_PRD_GENERATOR=true            # PRD generator interface

# Vibe Coder Settings
BEGINNER_MODE=false                  # Extra helpful UI hints
AUTO_EXPLAIN=true                    # Automatic code explanations
SIMPLIFY_ERRORS=true                 # Human-friendly error messages
```

### User Preferences (Stored in Browser)
```javascript
{
  "theme": "tokyo-night",           // UI theme
  "fontSize": 14,                    // Editor font size
  "aiAssistanceLevel": "proactive", // passive|active|proactive
  "showBeginnerTips": true,         // Tutorial hints
  "autoSave": true,                 // Auto-save files
  "sessionTracking": true           // Track for summaries
}
```

---

## 📚 API Reference

### Core Endpoints
```javascript
// Session Management
POST /api/claude/session-summary    // Generate session summary
GET  /api/session/current           // Get current session data

// AI Supervision
POST /api/claude/supervision/start  // Start supervision mode
POST /api/claude/supervision/stop   // Stop supervision
GET  /api/claude/supervision/status // Check supervision status

// PRD Generator
POST /api/agent/analyze-requirements // Process requirements
POST /api/agent/generate-brief      // Create enhanced brief
POST /api/agent/generate-wireframe  // Create wireframes

// Documentation Intelligence
POST /api/docs/add                  // Add documentation from URL
POST /api/docs/search               // Search stored documentation
GET  /api/docs/list                 // List all documentation
GET  /api/docs/:id                  // Get specific documentation
DELETE /api/docs/:id                // Delete documentation

// File Operations
GET  /api/files/tree                // Get file tree
POST /api/files/read                // Read file content
POST /api/files/write               // Write file content
```

---

## 🎓 For Beginners (Start Here!)

### Your First Session
1. **Open the IDE**: http://localhost:3000/ide
2. **Click "New Project"**: Choose a template
3. **Type in Terminal**: `claude help me build a website`
4. **Watch the Magic**: Claude creates files and explains everything
5. **Make Changes**: Edit code with real-time AI help
6. **Save Progress**: Click "Session Summary" to save your work

### Common Commands for New Coders
```bash
# Ask Claude anything
claude how do I center a div?
claude explain this error
claude make this code better

# Quick actions
npm start          # Start your project
npm test          # Test your code
git save          # Save your work (simplified git)
```

### Learning Resources Built-In
- **Hover Help**: Hover over any code for explanations
- **Error Coach**: Errors include fix suggestions
- **Code Templates**: Start from working examples
- **AI Mentor**: Claude explains as you code

---

## 🚨 Troubleshooting

### Common Issues & Solutions

#### Terminal Not Working
```bash
# Check PTY support
npm run check-pty

# Restart terminal service
npm run reset-terminal
```

#### AI Features Not Working
```bash
# Verify API keys
npm run check-api-keys

# Test Claude connection
claude ping
```

#### Build Failures
```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

#### Session Summary Empty
- Ensure you have terminal history
- Check that files are open in editor
- Verify API keys are set

---

## 🚀 PROJECT MODERNIZATION PLAN - DEPLOYMENT AUTOMATION ✅ COMPLETED

**IMPORTANT FOR ALL CLAUDE AGENTS:**

~~This project currently has deployment complexity that confuses agents.~~ **SOLVED!** 

### ✅ DEPLOYMENT AUTOMATION - "EASY BUTTON" IMPLEMENTED

**The Problem (SOLVED):**
- **Manual Deployment**: Build → Copy → Update server → Restart (4 manual steps taking ~5 minutes)
- **Error-Prone Process**: Easy to forget steps, break deployments
- **Agent Confusion**: Complex manual process that frustrated AI agents

**The Solution - One-Click Deployment:**
```bash
# The Easy Button - Everything in one command:
npm run deploy
```

**What the "Easy Button" Does:**
1. ✅ **Automatic Backup**: Creates timestamped backup before deployment
2. ✅ **Smart Build**: Builds Next.js app with dependency checking
3. ✅ **File Copying**: Copies build files to correct locations automatically
4. ✅ **Server Restart**: Restarts PM2 process or provides manual instructions
5. ✅ **Verification**: Confirms deployment success
6. ✅ **Cleanup**: Removes old backups (keeps last 3)
7. ✅ **Rollback**: One-command rollback if anything goes wrong

**Available Commands:**
```bash
npm run deploy           # 🚀 Full deployment (30 seconds)
npm run build:all        # 📦 Build only (no deploy)
npm run verify:deployment # 🔍 Check if deployment worked
npm run rollback         # ↩️ Undo last deployment
```

**Emergency Features:**
- **Automatic Rollback**: If deployment fails, auto-restores previous version
- **Error Handling**: Stops on first error with clear messages
- **Backup System**: Keeps 3 most recent backups automatically
- **Progress Feedback**: Colored output shows exactly what's happening

**Before vs After:**
- **Before**: ~5 minutes, 4 manual steps, error-prone
- **After**: ~30 seconds, 1 command, bulletproof with rollback

**Complete Documentation:** See `DEPLOYMENT_GUIDE.md` for full details.

### 🛠️ TERMINAL SYSTEM HARDENING - JANUARY 2025

**CRITICAL ISSUE RESOLVED**: Fixed infinite terminal session creation that caused system failure.

**Root Cause**: Terminal component had flawed session creation logic causing infinite loops
- Sessions created before async completion
- File descriptor exhaustion (EMFILE errors)
- Complete terminal UI breakdown

**Solution Implemented**:
1. **Fixed Session Logic**: `sessionCreatedRef` now set AFTER successful session creation
2. **Emergency Recovery**: Script to detect and kill runaway processes
3. **Monitoring System**: Comprehensive health checks and alerts
4. **Recovery Scripts**: One-command cleanup and restart procedures

**New Monitoring Commands**:
```bash
npm run monitor:terminal  # Check terminal system health
npm run monitor:recovery  # Emergency cleanup and restart
npm run monitor:report    # Generate detailed health report  
npm run monitor:watch     # Continuous monitoring mode
```

**What Monitoring Detects**:
- Duplicate terminal session creation
- High file descriptor usage
- Zombie Node.js processes
- System resource exhaustion

### Next.js Modernization Options (Future Consideration)

#### Option A: Next.js Conversion (RECOMMENDED for long-term - 2-3 days)
**Benefits**: 
- One app instead of two
- `npm run build` + `vercel deploy` = done
- No manual steps ever again
- Professional deployment process

**Risk Areas**: Terminal/PTY integration, WebSockets, file system operations
**Status**: Not needed now that deployment is automated

#### Option B: Keep Current Architecture ✅ CHOSEN
- ✅ Automated all manual deployment steps
- ✅ Added comprehensive error handling and rollback
- ✅ Fixed terminal system reliability issues
- ✅ Added monitoring and recovery tools

**Benefits**: Zero risk, familiar architecture, professional deployment
**Result**: Achieved 90% of Next.js benefits with 10% of the risk

### Current Status: PRODUCTION READY ✅

**All Critical Issues Resolved:**
1. ✅ Deployment automation implemented and tested
2. ✅ Terminal session creation fixed 
3. ✅ Monitoring and recovery systems in place
4. ✅ Comprehensive documentation created
5. ✅ Emergency procedures established

**System is now:**
- **Deployable**: One-command deployment with rollback
- **Reliable**: Terminal system hardened against failures
- **Monitorable**: Health checks and automated recovery
- **Maintainable**: Clear processes and documentation

---

## 🗺️ Roadmap & Vision

### Phase 1: Foundation (Complete) ✅
- Basic IDE interface
- Claude Code integration
- Terminal with supervision
- Session summaries

### Phase 2: Vibe Coder Features (In Progress) 🚧
- Visual debugging
- AI pair programming
- Voice commands
- Collaborative sessions

### Phase 3: Learning Platform (Planned) 📅
- Interactive tutorials
- Coding challenges
- Progress tracking
- Community features

### Phase 4: Enterprise (Future) 🔮
- Team collaboration
- Private AI models
- Custom workflows
- Analytics dashboard

---

## 🤝 Contributing

We welcome contributions, especially from:
- **Beginners**: Help us make the IDE more accessible
- **Educators**: Design learning features
- **AI Enthusiasts**: Improve Claude integration
- **Designers**: Make it more beautiful

### How to Contribute
1. Fork the repository
2. Create a feature branch
3. Use the PRD generator to plan
4. Code with supervision enabled
5. Generate session summary
6. Submit PR with summary attached

---

## 🚀 Hybrid Hook System (Revolutionary Performance)

### Overview
The Hybrid Hook System combines lightweight bash triggers with intelligent AI delegation, inspired by Paul Duvall's Claude Code architecture. This revolutionary approach provides the best of both worlds: instant response times with bash scripts and powerful AI analysis when complexity demands it.

### Architecture
```
Hybrid Hook Flow:
1. Bash Trigger (~30-60ms) → Quick analysis
2. Complexity Check → Threshold evaluation  
3. Simple Case → Instant bash response
4. Complex Case → AI Delegation (~2-4s)
5. Result → Unified response
```

### Key Features

#### ⚡ Lightning-Fast Bash Triggers
- **30-150 lines** of optimized bash code
- **~50ms average** execution time
- Instant pattern matching and basic analysis
- Zero overhead for simple operations

#### 🧠 Intelligent AI Delegation
- **25 Specialized AI Agents** for different domains
- Delegates only when complexity threshold met (~25-30% of cases)
- Persistent context between delegations
- Research-only agents that never implement directly

#### 📊 Performance Metrics
- Real-time execution tracking
- Delegation rate monitoring
- Performance impact analysis
- ROI calculations for time saved

### Available Hybrid Hooks

1. **Smart Commit** (`hybrid-smart-commit`)
   - Bash: Quick diff analysis (~50ms)
   - AI: Complex commit messages for 5+ files or 100+ lines
   - Delegate: @commit-specialist

2. **Security Check** (`hybrid-security-check`)
   - Bash: Pattern scanning (~30ms)
   - AI: Deep vulnerability analysis when threats detected
   - Delegate: @security-auditor

3. **Test Runner** (`hybrid-test-runner`)
   - Bash: File change detection (~40ms)
   - AI: Test strategy for complex scenarios
   - Delegate: @test-engineer

4. **Performance Monitor** (`hybrid-performance-check`)
   - Bash: Basic metrics collection (~60ms)
   - AI: Optimization strategies when issues found
   - Delegate: @performance-optimizer

5. **Error Debugger** (`hybrid-error-debug`)
   - Bash: Error categorization (~35ms)
   - AI: Root cause analysis for complex bugs
   - Delegate: @debugger

### Configuration

#### Enable Hybrid Hooks
```javascript
// API endpoint
POST /api/hooks/hybrid/execute
{
  "hookName": "hybrid-smart-commit",
  "context": { /* optional context */ }
}

// Or via UI
http://localhost:3000/hooks.html
// Look for "Hybrid Hooks" section with ⚡ icon
```

#### Delegation Thresholds
```javascript
PUT /api/hooks/hybrid/thresholds
{
  "filesChanged": 5,      // Delegate if > 5 files
  "linesChanged": 100,    // Delegate if > 100 lines
  "complexityScore": 0.7, // Delegate if complexity > 0.7
  "errorCount": 3         // Delegate if > 3 errors
}
```

### Directory Structure
```
hooks/
├── triggers/          # Bash trigger scripts
│   ├── smart-commit.sh
│   ├── pre-write-security.sh
│   ├── smart-test-runner.sh
│   ├── performance-check.sh
│   └── on-error-debug.sh
├── lib/              # Shared utilities
│   ├── context.sh    # Context gathering
│   ├── delegate.sh   # AI delegation helpers
│   ├── validate.sh   # Input validation
│   └── logger.sh     # Logging utilities
└── ai-delegates/     # AI agent configs
```

### Performance Benefits
- **90% reduction** in unnecessary AI calls
- **~150ms average** overhead for simple operations
- **Intelligent scaling** - uses AI only when needed
- **No breaking changes** - works alongside existing hooks

### 25 Specialized AI Agents
The system includes 25 domain-specific agents:

**Core Agents**: architect, frontend-specialist, backend-specialist, optimizer, debugger, implementer

**Specialized Agents**: @commit-specialist, @security-auditor, @test-engineer, @performance-optimizer, @code-reviewer, @documentation-writer, @refactoring-expert, @database-specialist, @devops-engineer, @ui-ux-designer, @api-designer, @cloud-architect, @mobile-developer, @accessibility-expert, @i18n-specialist, @data-engineer, @ml-engineer, @blockchain-developer, @quality-analyst

### Why Hybrid Hooks?
1. **Performance**: Instant response for 70% of operations
2. **Intelligence**: AI power when complexity demands it
3. **Cost-Effective**: Reduces API calls and costs
4. **Scalable**: Handles both simple and complex scenarios
5. **Non-Breaking**: Integrates seamlessly with existing workflow

---

## 📖 Additional Documentation

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)**: Technical deep dive
- **[API.md](./docs/API.md)**: Complete API reference
- **[TUTORIALS.md](./docs/TUTORIALS.md)**: Step-by-step guides
- **[VIBE-CODING.md](./docs/VIBE-CODING.md)**: Philosophy and principles

---

## 🔧 Error Doctor Service Configuration

The Error Doctor Service provides AI-powered error analysis and automatic fix suggestions for terminal errors, code errors, and runtime issues.

### API Key Setup
- **Configuration Location**: `.env.local` (takes priority over `.env`)
- **Required Key**: `ANTHROPIC_API_KEY` (standard API key format: `sk-ant-api03-...`)
- **Important Note**: OAuth tokens (`sk-ant-oat01-...`) are for Claude CLI only and will NOT work with the Anthropic SDK

### Key Format Requirements
- ✅ **Correct**: `ANTHROPIC_API_KEY=sk-ant-api03-...` (Standard API key)
- ❌ **Wrong**: `ANTHROPIC_API_KEY=sk-ant-oat01-...` (OAuth token - CLI only)

### Troubleshooting Error Doctor
1. **"invalid x-api-key" errors**: You're using an OAuth token instead of an API key
2. **404 errors**: The route is disabled - check `src/app.js` line ~337
3. **Service not working**: Verify API key in `.env.local` starts with `sk-ant-api03-`

### How It Works
- The service monitors terminal output for errors
- When errors are detected, it sends them to Claude for analysis
- Returns intelligent fix suggestions and explanations
- Integrates with VibeCoach for learning insights

---

## 🎭 The Vibe

Coder1 isn't just about writing code - it's about making coding feel like creative expression. Whether you're a complete beginner taking your first steps or an experienced developer looking for AI amplification, Coder1 meets you where you are.

**Remember**: Every expert was once a beginner. Coder1 makes that journey shorter, more fun, and less intimidating.

---

## 📞 Support & Community

- **Discord**: [Join our community](https://discord.gg/coderone)
- **Issues**: [GitHub Issues](https://github.com/yourusername/coderone/issues)
- **Twitter**: [@CoderOneIDE](https://twitter.com/CoderOneIDE)
- **Email**: support@coderone.dev

---

*Last Updated: January 20, 2025*
*Version: 1.0.0-alpha*
*Built with ❤️ for the next generation of coders*