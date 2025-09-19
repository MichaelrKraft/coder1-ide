# Coder1 Local Testing Guide

## Quick Start

Your Anthropic API key has been configured! Here's how to test everything:

### Option 1: Using the startup script (Easiest)
```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide
./start-local.sh
```

### Option 2: Manual start
```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide
npm install  # Only needed first time
npm run dev
```

## What to Test

### 1. Main Interface (http://localhost:3000)
- Click "Enter Coder1 IDE" button
- Test the PRD Generator:
  - Type a project idea (e.g., "I want to build a task management app")
  - Answer the 5 questions
  - Watch the PRD generate with your real Claude API

### 2. Terminal Interface (http://localhost:3000/terminal-interface.html)
- Direct terminal access
- Try typing `claude` to initialize Claude Code
- Test slash commands like `/help`

### 3. IDE Features
- Generate a PRD first
- Click "Enter IDE" to transfer your project
- The terminal will have your project context

## Features Enabled with Your API Key

✅ **Working Now:**
- Real PRD generation (not demo mode)
- Claude API calls for intelligent questions
- Multi-persona consultations
- Project intelligence
- Wireframe generation

🚀 **Premium Features to Test:**
- Parallel agents (when implemented)
- Infinite loop generation
- Autonomous supervision

## Troubleshooting

### If the server doesn't start:
```bash
# Check Node version (needs 18.x)
node --version

# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### If API calls fail:
- Check `.env` file has your API key
- Verify key starts with `api03-`
- Check console for error messages

### Port already in use:
```bash
# Find process using port 3000
lsof -i :3000
# Kill the process
kill -9 [PID]
```

## Next Steps

1. Test PRD generation with a real project idea
2. Explore the multi-persona consultation
3. Try the wireframe generator
4. Test Claude Code in the terminal

Your API key is configured and ready to use!