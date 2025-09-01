# IDE Version Marker

## Current Version: Menu Button Build
**Deployed**: August 29, 2025 - 5:57 PM PST
**Source Branch**: `stable-terminal-working-2025-01-27`
**Build Files**: 
- JavaScript: `main.17b4a14b.js`
- CSS: `main.954ba485.css`

## ✅ Correct Version Features
This is the **CORRECT** version with:

### Header Structure
- **Left**: File, Edit, View, Run, Help menu bar
- **Right**: **Menu** button (not "📚 Docs" button)

### Menu Button Dropdown (8 Navigation Options)
1. 🏠 Dashboard
2. 🧩 Components  
3. 📄 Templates
4. 🪝 Hooks
5. ✨ Features
6. 📚 Documentation
7. ⚙️ Settings
8. ℹ️ About

## 🚨 For Future Claude Agents

**BEFORE MODIFYING**: Check this file to confirm you're working with the correct version!

**If the IDE shows**:
- ❌ Single "📚 Docs" button on right → WRONG VERSION
- ✅ Single "Menu" button with 8 options → CORRECT VERSION

**Recovery Command** (if needed):
```bash
cd /Users/michaelkraft/autonomous_vibe_interface
git checkout stable-terminal-working-2025-01-27
cd coder1-ide/coder1-ide-source
npm run build
cp -r build/* ../../public/ide/
```

## Build Information
- **Git Branch**: stable-terminal-working-2025-01-27
- **Commit Message**: "STABLE BACKUP: Terminal Working + Claude Code Active + Dashboard Navigation Fixed"
- **Build Date**: August 29, 2025
- **Build Status**: ✅ Compiled successfully (with warnings)
- **Deployment Status**: ✅ Files deployed to /public/ide/

## File Hashes for Verification
- main.js: `main.17b4a14b.js`
- main.css: `main.954ba485.css`

If these files are missing or different, the wrong version is deployed.