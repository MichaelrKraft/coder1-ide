# 🚀 Coder1 Alpha Testing Guide

**Welcome Alpha Testers!** 🎉 You're about to experience the future of AI-powered development.

## 📍 Current Status

**Deployment URL**: https://coder1-ide.onrender.com (pending deployment)
**Local Testing**: Available NOW at http://localhost:3001

## 🎯 Two Ways to Test Coder1

### Option 1: Local Testing (Available NOW)

```bash
# 1. Clone the repository
git clone https://github.com/MichaelrKraft/coder1-ide.git
cd coder1-ide

# 2. Navigate to Next.js IDE
cd coder1-ide-next

# 3. Install dependencies
npm install

# 4. Start the IDE
npm run dev

# 5. Open your browser
open http://localhost:3001
```

### Option 2: Bridge Testing (Connect to Your Claude CLI)

The bridge system connects the web IDE to your local Claude CLI installation:

```bash
# 1. Install the bridge CLI globally
npm install -g coder1-bridge

# OR install from source
cd bridge-cli
npm install
npm link

# 2. Start the bridge
coder1-bridge start

# 3. Open the IDE (local or deployed)
# Visit http://localhost:3001 or https://coder1-ide.onrender.com

# 4. Click "Connect Bridge" in the IDE
# You'll see a 6-digit pairing code

# 5. Enter the pairing code in your terminal
# ✅ Connected! Your Claude CLI now works in the browser!
```

## 🎮 What You Can Test

### 1. **IDE Features**
- 📝 Monaco Editor (VSCode experience)
- 💻 Integrated Terminal with PTY
- 📁 File Explorer
- 🎨 Theme Support
- ⌨️ Keyboard Shortcuts

### 2. **Claude Integration** (with bridge)
```bash
# In the IDE terminal, try:
claude help
claude analyze main.js
claude explain "what does this code do"
claude fix "this error message"
```

### 3. **AI Team Features**
- Click "AI Team" button in status bar
- Watch multiple AI agents collaborate
- See real-time progress in agent terminals
- Export results when complete

### 4. **Session Management**
- Create multiple terminal sessions
- Save and restore checkpoints
- Generate session summaries
- Export your work

## 🧪 Test Scenarios

### Basic Workflow Test
1. Open the IDE
2. Create a new file (Ctrl+N)
3. Write some code
4. Open terminal (Ctrl+`)
5. Run commands

### Bridge Connection Test
1. Start bridge CLI locally
2. Connect from IDE
3. Run `claude help`
4. Verify output appears

### AI Team Test
1. Click "AI Team" button
2. Enter project requirements
3. Watch agents work
4. Review generated code

## 🐛 Known Limitations (Alpha)

- Bridge requires manual pairing each session
- Terminal may need refresh after errors
- Session summaries require API key
- Some features may be slower on first load

## 📊 Feedback We Need

Please report on:
1. **Setup Experience** - Was it easy to get started?
2. **Bridge Connection** - Did pairing work smoothly?
3. **Claude Commands** - Do they work as expected?
4. **Performance** - Any lag or slowness?
5. **Errors** - Screenshots of any errors
6. **Feature Requests** - What would make this better?

## 🚀 Quick Start Video

[Coming Soon] - 3-minute setup walkthrough

## 📞 Support

- **Issues**: https://github.com/MichaelrKraft/coder1-ide/issues
- **Discord**: [Join Alpha Testers Channel]
- **Email**: alpha@coder1.dev

## 🎉 What Makes Coder1 Special

- **Claude Native**: Built specifically for Claude Code CLI
- **Zero Config**: Works out of the box
- **Free Forever**: No API costs with bridge mode
- **Real Terminals**: Full PTY support, not simulated
- **AI Teams**: Multiple agents working together
- **Session Intelligence**: AI understands your entire context

## 🔥 Pro Tips

1. **Use shortcuts**: 
   - `Cmd+K` - Quick actions
   - `Cmd+P` - File search
   - `Cmd+Shift+P` - Command palette

2. **Terminal aliases work**:
   ```bash
   alias c='claude'
   c help  # Works!
   ```

3. **Session checkpoints**: Save your work anytime with the checkpoint button

4. **AI Team presets**: Try different team compositions for different tasks

## 📈 Metrics We're Tracking

- Connection success rate
- Command execution time
- Bridge stability
- User engagement time
- Feature usage patterns

## 🙏 Thank You!

Your feedback shapes Coder1's future. You're not just testing an IDE - you're pioneering a new way of coding with AI.

**Ready to start?** Follow Option 1 (local) or Option 2 (bridge) above!

---
*Alpha Version 1.0.0*
*Last Updated: January 20, 2025*