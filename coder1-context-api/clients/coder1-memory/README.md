# 🧠 Coder1 Memory - Eternal Memory for VS Code

**Never forget a decision, insight, or breakthrough again.**

Coder1 Memory brings the power of Eternal Memory to VS Code, allowing you to save and search your development insights, decisions, and learnings across all your projects.

---

## ✨ Features

### 💾 Save Memories (Quick Insights)
Press **Cmd/Ctrl+Shift+M** to instantly save:
- Decisions you make
- Insights you discover
- Code patterns that work
- Solutions to tricky problems

### 🎬 Save Session (Full Context Capture)
Press **Cmd/Ctrl+Shift+S** to capture your entire development session:
- **All open files** with complete content
- **Git context**: Branch, recent commits, changes
- **Terminal activity**: Active terminals and commands
- **Workspace statistics**: Files edited, lines changed
- **Project metadata**: Workspace name, file paths, languages

**Perfect for:**
- End of work session summaries
- Before switching branches or projects
- Documenting complex multi-file changes
- Creating detailed context for future reference

### 🔍 Enhanced Search
Press **Cmd/Ctrl+Shift+F** to search with intelligent ranking:
- Searches across **all file contents** (not just snippets)
- Finds terminal commands you ran
- Searches Git commit messages
- Discovers code in any saved session
- **Ranked results** - most relevant matches first
- Shows **where** matches were found (title, file, terminal, etc.)

### 📊 Status Bar
See your memory count at a glance in the status bar:
- Click to search memories
- Know your knowledge base is growing
- Track both quick memories and full sessions

---

## 🚀 Quick Start

### Prerequisites

1. **Context API must be running**:
   ```bash
   cd /path/to/coder1-context-api
   npm run dev
   ```

   This starts the Coder1 Context API on `http://localhost:3005`

### Installation

1. **Download the extension** (.vsix file)
2. **Install**:
   ```bash
   code --install-extension coder1-memory-0.0.1.vsix
   ```

3. **Reload VS Code**

### First Use

1. Open any code file
2. Press **Cmd/Ctrl+Shift+M**
3. Enter what you learned
4. That's it! Memory saved.

---

## 🎯 Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| **Save Memory** | `Cmd/Ctrl+Shift+M` | Quick insight capture with optional code snippet |
| **Save Session** | `Cmd/Ctrl+Shift+S` | Full context capture (all files, git, terminal) |
| **Search Memories** | `Cmd/Ctrl+Shift+F` | Enhanced search with intelligent ranking |
| **View All** | Command Palette | Browse all memories and sessions |
| **Check Status** | Command Palette | Check if Context API is running |

---

## 💡 Use Cases

### Quick Insights (Cmd+Shift+M)
```
Title: "Switched from Redux to Context API"
Description: "Redux was overkill for 3 state variables"
Tags: react, state-management
```

```
Title: "async/await is cleaner than promises"
Description: "Error handling with try/catch vs .catch()"
Code: [Your selected code]
```

### Full Session Capture (Cmd+Shift+S)
```
Title: "Implemented user authentication system"
Description: "Added JWT auth with refresh tokens and password reset"

Captures:
- auth-service.ts (245 lines)
- auth-controller.ts (180 lines)  
- user-model.ts (95 lines)
- auth.test.ts (320 lines)

Git: feature/auth-system branch, 8 commits
Terminal: 12 commands (npm test, npm run dev, etc.)
```

**Search Example:**
Search for "JWT" finds:
- 📝 Title match: "Implemented JWT authentication"
- 📁 File matches: auth-service.ts (lines 45, 78, 102)
- 💻 Terminal: "npm install jsonwebtoken"
- 🔀 Git commit: "Add JWT token generation"

---

## 🛠️ Development

### Build from Source

```bash
cd coder1-context-api/clients/coder1-memory

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package extension
npm install -g @vscode/vsce
vsce package

# Install locally
code --install-extension coder1-memory-0.0.1.vsix
```

### Debug Extension

1. Open `coder1-memory` folder in VS Code
2. Press **F5** to launch Extension Development Host
3. Test commands in the new window

---

## 🔧 Configuration

Currently, the extension connects to `http://localhost:3005` by default.

**Future**: Configuration options for custom API URLs

---

## 🐛 Troubleshooting

### "Context API not running"

**Solution**: Start the Context API server:
```bash
cd /path/to/coder1-context-api
npm run dev
```

### "Failed to save memory"

**Check**:
1. Is Context API running? (`curl http://localhost:3005/health`)
2. Check VS Code Developer Tools (Help → Toggle Developer Tools)

### Commands not appearing

**Solution**: Reload VS Code:
1. Cmd/Ctrl+Shift+P
2. Type "Reload Window"

---

## 🎯 Roadmap

- [ ] Custom API URL configuration
- [ ] Rich memory viewer (sidebar panel)
- [ ] Memory tags autocomplete
- [ ] Export memories to Markdown
- [ ] Team memory sharing
- [ ] Semantic search (AI-powered)

---

## 💎 Why Coder1 Memory?

### The Problem
You solve a problem today. Three months later, you face the same problem. You can't remember how you solved it. You waste hours rediscovering the solution.

### The Solution
Save your insights as you go. Search them instantly when you need them. Build your personal knowledge base that grows with every project.

### The Result
- **Save time**: Never solve the same problem twice
- **Build knowledge**: Your wisdom compounds over time
- **Share insights**: Help your team learn from your experience

---

## 📚 Learn More

- **Coder1 Context API**: See `/coder1-context-api/README.md`
- **Infrastructure Vision**: See `/coder1-ide-next/INFRASTRUCTURE_VISION_THE_NEXT_GOOGLE.md`

---

## 🤝 Feedback

This is an experimental extension to validate the infrastructure play.

**We want to know**:
1. Does it work for you?
2. How often do you use it?
3. Would you pay $9/month for this?

**Contact**: [Your email/Twitter/Discord]

---

## 📄 License

MIT

---

**Built with ❤️ for developers who value their insights**

*Part of the Coder1 Eternal Memory ecosystem*
