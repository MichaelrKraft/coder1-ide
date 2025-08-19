# Project Requirements

## Overview
Help me build a modern web application with best practices

## Requirements


## Project Details
- **Type**: webapp
- **Framework**: JavaScript
- **Working Directory**: /Users/michaelkraft/autonomous_vibe_interface

## 🎯 CRITICAL: Correct File Structure for Future Agents

### **CORRECT SETUP** (Updated August 8, 2025)

**localhost:3000** → PRD Generator (Clean, No Supervision)
- **Source**: `/CANONICAL/index.html` (correct, updated PRD generator)
- **Server**: `src/app.js` line 165 serves from `/CANONICAL/` directory
- **Purpose**: Smart PRD & Wireframe Generator only

**localhost:3000/ide** → React IDE with Terminal Supervision
- **Source**: `/coder1-ide/coder1-ide-source/src/App.tsx` (React source)
- **Build**: `/coder1-ide/coder1-ide-source/build/` (npm run build output)
- **Deploy**: `/public/ide/` (server serves this)
- **Supervision**: Built into Terminal component (`isSupervisionOn` state)

### **AI Supervision System Location**
- ✅ **CORRECT**: Supervision controls in IDE Terminal component
- ❌ **WRONG**: Supervision elements on PRD generator page

### **For Future Agents - File Editing Workflow**

**To modify PRD Generator:**
- Edit: `/CANONICAL/index.html`
- Server automatically serves from `/CANONICAL/`

**To modify IDE with supervision:**
1. Edit: `/coder1-ide/coder1-ide-source/src/App.tsx`
2. Build: `cd coder1-ide-source && npm run build`
3. Deploy: `cp -r build/* ../../public/ide/`

### **Supervision Context**
The supervision system monitors Claude Code CLI in terminal sessions and provides intelligent responses. It works automatically in the background when users run `claude` in the IDE terminal.

### **File Cleanup Completed**
**August 8, 2025**: Archived all old PRD generator files to `/ARCHIVE/prd-cleanup-20250808/` to prevent future confusion. Only the correct orange-themed "Coder One" PRD generator remains:
- **Active**: `/CANONICAL/index.html` (serves on localhost:3000)
- **Source**: `/CANONICAL/prd-generator-v2-test.html` (master copy)

**⚠️ For Future Agents**: If you find multiple PRD generator files, they are likely old versions that should be archived. The correct version has the orange theme with "Smart Docs Generator" title.

Last Updated: 2025-08-08 (Completed supervision cleanup + PRD file consolidation)
