# AI Team Sub-Agents Testing Guide

## Date: November 17, 2025

## Overview

This guide provides step-by-step instructions for testing the AI Team feature after implementing the PTY architecture fix and useEffect race condition fix.

---

## 🎯 **What We're Testing**

After the two fixes:
1. **PTY Architecture Fix**: Agents spawn without error-prone PTY processes
2. **useEffect Race Condition Fix**: Agent terminals stay connected after spawning

**Expected Result**: 5 specialized agents spawn, connect successfully, and execute tasks with live output visible in their terminals.

---

## 📋 **Pre-Test Checklist**

### 1. Server Status Check

**Verify server is running**:
```bash
# Check if server is running on port 3001
lsof -i :3001
```

**If NOT running**:
```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npm run dev
```

**Wait for**:
```
🚀 Coder1 IDE - Unified Server Started
📍 Server: http://localhost:3001
```

### 2. Environment Variables Check

**Verify Claude CLI OAuth token is set**:
```bash
echo $CLAUDE_CODE_OAUTH_TOKEN
```

**Should see**: `sk-ant-oat01-...` (OAuth token format)

**If NOT set**:
```bash
export CLAUDE_CODE_OAUTH_TOKEN=your-oauth-token-here
# Then restart server
```

### 3. Hot-Reload Status

**IMPORTANT**: If you made the fixes during this session and haven't restarted:

**Option A - Wait for Hot-Reload** (if using nodemon):
- Changes to `.js` files auto-reload
- Changes to `.tsx` files require Next.js rebuild

**Option B - Manual Restart** (safest for testing):
```bash
# Stop server (Ctrl+C)
# Start again
npm run dev
```

---

## 🧪 **Step-by-Step Testing Instructions**

### Step 1: Open the IDE

**1.1 Open browser**:
```
http://localhost:3001/ide
```

**1.2 Verify IDE loads**:
- ✅ Monaco editor visible
- ✅ Terminal panel at bottom
- ✅ File tree on left
- ✅ Status bar at bottom with "AI Team" button

---

### Step 2: Prepare Detailed Requirement

**2.1 Open main terminal** (not an agent terminal)

**2.2 Type a detailed project requirement**:

**IMPORTANT**: The requirement extraction system needs:
- ✅ **8+ specific features** (numbered or bulleted)
- ✅ **Technical stack** mentioned
- ✅ **Design requirements** (colors, fonts, layout)
- ✅ **At least 200 characters** total

**Example Template** (copy this):
```
I want to build a fitness landing page with the following features:

1. Hero section with motivational headline and call-to-action button
2. Features section showcasing workout programs, nutrition plans, and coaching
3. Pricing table with 3 membership tiers (Basic, Pro, Elite)
4. Testimonials carousel with before/after photos
5. Trainer profiles section with bio cards
6. Contact form with name, email, phone, and message fields
7. FAQ accordion section answering common questions
8. Footer with social media links and newsletter signup

Technical requirements:
- HTML5, CSS3, vanilla JavaScript
- Mobile-first responsive design
- Smooth scroll navigation
- Form validation
- Lazy loading for images

Design specifications:
- Primary color: Blue (#3B82F6)
- Secondary color: Green (#10B981)
- Font: Inter for body, Poppins for headings
- Clean, modern aesthetic with gradient backgrounds
- Card-based layout with subtle shadows
```

**2.3 Press Enter** to complete the command

**2.4 Wait 2 seconds** for terminal buffer to populate

---

### Step 3: Click AI Team Button

**3.1 Locate AI Team button**:
- Bottom status bar
- Right side
- Between "Discover" and settings icon
- Label: "AI Team"

**3.2 Click the button**

**3.3 Watch the extraction process**:

**Expected Output in Terminal**:
```
🔍 Extracting requirement from terminal history...

✅ Requirement extracted (high confidence):
   "build a fitness landing page with hero section, features, pricing, testimonials..."

📊 Context Quality Score: 85% (3/4 aspects detected)
   ✅ Project description present
   ✅ Technical details present  
   ✅ Scope information present
   ⚠️ User stories could be more detailed

✅ Context quality is sufficient for AI Team spawning.
Quality score: 85% meets threshold (50%)

⚡ Spawning AI Team with 5 specialized agents...
```

**If you see instead**:
```
⚠️ Could not extract clear requirement from conversation.
💡 Please describe your project in the terminal first
```

**→ Problem**: Requirement extraction failed
**→ Solution**: Go back to Step 2.2 and use the full template with all features

---

### Step 4: Monitor Agent Spawning

**4.1 Watch for new terminal tabs**:

**Expected**: 5 new tabs appear at bottom:
- 🏗️ `architect`
- 🎨 `frontend`  
- ⚙️ `backend`
- 🧪 `qa`
- 🚀 `devops`

**4.2 Check server logs** (in terminal where you ran `npm run dev`):

**Should see** (NEW - from our fixes):
```
🎭 Spawning agent session_xxx-architect in --print mode (PTY-less)
✅ Agent session_xxx-architect added to agents Map (PTY-less mode)
⏭️ Skipping PTY event handlers for session_xxx-architect (PTY-less mode)
🎯 Agent session_xxx-architect ready for task execution via stdin

🎭 Spawning agent session_xxx-frontend in --print mode (PTY-less)
✅ Agent session_xxx-frontend added to agents Map (PTY-less mode)
⏭️ Skipping PTY event handlers for session_xxx-frontend (PTY-less mode)
🎯 Agent session_xxx-frontend ready for task execution via stdin

[... same for backend, qa, devops ...]
```

**Should NOT see** (old broken behavior):
```
❌ 🔌 Agent PTY exited with code 1
❌ Error: Input must be provided either through stdin or as a prompt argument
```

---

### Step 5: Verify Agent Terminal Connections

**5.1 Click on `architect` tab**

**Expected Initial Content**:
```
────────────────────────────────────────────────────────────────────────────────
Role: architect
Team: session_xxx_yyy
Current Task: Initializing workspace...
────────────────────────────────────────────────────────────────────────────────
Agent initialized: architect
Role: architect
Team: session_xxx_yyy

🤖 AGENT TERMINAL - Interactive AI workspace
──────────────────────────────────────────────
```

**5.2 Check connection status**:

**✅ GOOD - Should see**:
- Terminal content stable
- No error messages
- Cursor blinking (ready state)

**❌ BAD - Should NOT see** (old broken behavior):
```
⚠️ Connection lost: io client disconnect (Manual disconnect)
```

**If you see disconnect**:
- Problem: useEffect fix didn't apply (needs hot-reload or restart)
- Solution: Restart server with `npm run dev`

---

### Step 6: Monitor Task Execution

**6.1 Wait 5-10 seconds** for coordinator to assign tasks

**6.2 Check server logs for task assignment**:

**Should see**:
```
🎯 Spawning new Claude CLI for task in /path/to/workdir
📝 Task prompt length: 2058 characters
🔍 [DEBUG] Using stdin pipe approach
✅ Wrote 2058 bytes to stdin and closed
✅ Claude CLI spawned with stdin prompt for session_xxx-architect
```

**6.3 Monitor agent terminal for output**:

**Expected** (after 10-30 seconds):
```
Creating project architecture for fitness landing page...

📁 Project Structure:
/fitness-landing-page
├── index.html
├── css/
│   ├── styles.css
│   └── responsive.css
├── js/
│   ├── main.js
│   └── form-validation.js
├── images/
│   └── .gitkeep
└── README.md

✅ Created 6 files
```

**6.4 Repeat for other agent tabs**:

**`frontend` tab should show**:
```
Building HTML structure for fitness landing page...

Creating hero section with:
- Motivational headline
- Call-to-action button
- Background image placeholder

[HTML/CSS code generation...]
```

**`backend` tab should show**:
```
Setting up contact form API endpoint...

Creating server-side validation for:
- Email format
- Phone number format  
- Required fields

[Backend code generation...]
```

---

### Step 7: Verify Output Routing

**7.1 Check that output appears in correct terminals**:

**Each agent terminal should show**:
- ✅ Output specific to its role
- ✅ Real-time streaming (not all at once)
- ✅ No cross-contamination (frontend output in frontend tab only)

**7.2 Check server logs for output routing**:

**Should see**:
```
📺 Routing output from session_xxx-architect to terminal manager
📺 Routing output from session_xxx-frontend to terminal manager
```

---

## 🎯 **Success Criteria Checklist**

After completing all steps, verify:

- [ ] **Extraction**: Requirement extracted with high confidence
- [ ] **Quality Gate**: Context quality score ≥ 50% (displayed)
- [ ] **Spawning**: 5 agent tabs created (architect, frontend, backend, qa, devops)
- [ ] **No PTY Errors**: Server logs show "PTY-less mode", NOT "PTY exited code 1"
- [ ] **No Disconnects**: Agent terminals stay connected, NO "Connection lost" messages
- [ ] **Task Assignment**: Server logs show "Spawning new Claude CLI for task"
- [ ] **Stdin Delivery**: Logs show "Wrote XXXX bytes to stdin and closed"
- [ ] **Output Appears**: Agent terminals show task execution output (file creation, code generation)
- [ ] **Correct Routing**: Each agent's output appears in its own terminal tab

---

## ❌ **Troubleshooting Common Issues**

### Issue 1: "Could not extract clear requirement"

**Symptoms**:
```
⚠️ Could not extract clear requirement from conversation.
💡 Please describe your project in the terminal first
```

**Causes**:
1. Requirement too short (< 200 characters)
2. Missing technical details
3. Terminal command not buffered yet

**Solutions**:
1. Use the full template from Step 2.2 (with all 8 features)
2. Wait 2 seconds after pressing Enter
3. Check server logs for:
   ```
   [Terminal] Command completed: i want to build a fitness landing page...
   🔒 Buffering terminal_input for context: "i want to build a fitness landing page..."
   ```

---

### Issue 2: "Context quality too low"

**Symptoms**:
```
📊 Context Quality Score: 35%
❌ Context quality is too low for AI Team spawning.
💡 Please provide more details about:
   - Technical stack
   - Specific features
```

**Causes**:
Quality score < 50% threshold

**Solutions**:
1. Add more specific features (numbered list of 8+)
2. Specify technical stack (HTML/CSS/JS, React, etc.)
3. Add design requirements (colors, fonts, layout)
4. Mention user interactions or workflows

**Good example**:
```
Tech stack: HTML, CSS, vanilla JavaScript
Features: 8 numbered items with specific details
Design: Colors (#3B82F6), fonts (Inter, Poppins)
Layout: Mobile-first responsive, card-based
```

---

### Issue 3: Agents spawn but terminals show "Connection lost"

**Symptoms**:
```
⚠️ Connection lost: io client disconnect (Manual disconnect)
```

**Causes**:
useEffect race condition fix not applied (hot-reload issue)

**Solutions**:
1. **Restart server**:
   ```bash
   # Stop with Ctrl+C
   npm run dev
   ```

2. **Clear browser cache** and reload page

3. **Verify fix applied**:
   ```bash
   grep -A 3 "}, \[sessionId, terminalReady," /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/components/terminal/Terminal.tsx
   ```
   
   Should show:
   ```typescript
   }, [sessionId, terminalReady, sandboxMode, agentMode]); // Should NOT include isConnected
   ```

---

### Issue 4: Server logs show "PTY exited with code 1"

**Symptoms**:
```
❌ 🔌 Agent session_xxx-architect PTY exited with code 1
❌ Error: Input must be provided either through stdin...
```

**Causes**:
PTY architecture fix not applied (hot-reload issue)

**Solutions**:
1. **Restart server** (nodemon may not detect .js changes)

2. **Verify fix applied**:
   ```bash
   grep -A 5 "Skip PTY creation" /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/services/claude-cli-puppeteer.js
   ```
   
   Should show:
   ```javascript
   // Skip PTY creation - tasks will use child_process with stdin instead
   agentSession.pty = null;
   ```

3. **Check logs for**:
   ```
   🎭 Spawning agent in --print mode (PTY-less)
   ```

---

### Issue 5: No task execution output after 60+ seconds

**Symptoms**:
- Agents spawn successfully
- No disconnects
- But terminals remain at "Initializing workspace..."
- No file creation or code generation appears

**Causes**:
1. OAuth token invalid or missing
2. Claude CLI not installed
3. Coordinator not assigning tasks
4. Network/API issues

**Solutions**:

**Check OAuth Token**:
```bash
echo $CLAUDE_CODE_OAUTH_TOKEN
# Should output: sk-ant-oat01-...
```

**Check Claude CLI installed**:
```bash
claude --version
# Should output version number
```

**Check server logs for**:
```
🎯 Spawning new Claude CLI for task in /workdir
📝 Task prompt length: 2058 characters
```

**If missing**:
- Coordinator may not be assigning tasks
- Check for errors in server logs
- Verify `agent-coordinator.js` is loaded

**Check for API errors**:
```bash
# Look for Claude API errors in server logs
grep -i "api error\|401\|403\|rate limit" server-output.log
```

---

### Issue 6: Output appears in wrong terminal tabs

**Symptoms**:
- Frontend output appears in backend terminal
- Multiple agents' output mixed together

**Causes**:
Agent ID mismatch or WebSocket routing issue

**Solutions**:

**Check server logs for routing**:
```
📺 Routing output from session_xxx-architect to terminal manager
```

**Verify agent IDs match**:
```bash
# In server logs, look for:
Agent session_xxx-architect initialized
📺 Routing output from session_xxx-architect
```

**IDs should match exactly**

---

## 📊 **Detailed Log Analysis**

### What Successful Spawning Looks Like

**Complete log sequence** (what you should see):

```
[1. Requirement Extraction]
[Extract Requirement] Processing 5 buffer chunks for session_zzz
[Extractor] Found 1 terminal_input chunks out of 5 total
[Extractor] After filtering: 1 user inputs
[Extract Requirement] Extraction result: {
  requirement: 'build a fitness landing page with hero section...',
  confidence: 'high'
}

[2. Quality Gate]
[Quality Gate] Context quality score: 85%
[Quality Gate] PASSED - Score 85% meets threshold 50%

[3. Agent Spawning - NEW FIX LOGS]
🎭 Spawning agent session_xxx-architect in --print mode (PTY-less)
✅ Agent session_xxx-architect added to agents Map (PTY-less mode)
⏭️ Skipping PTY event handlers for session_xxx-architect (PTY-less mode)
🎯 Agent session_xxx-architect ready for task execution via stdin

[Repeat for all 5 agents]

[4. WebSocket Connection - NEW FIX BEHAVIOR]
🤖 Creating agent terminal: session_xxx-architect (architect)
🔌 Agent terminal manager connected to coordinator

[NO "Connection lost" messages should appear]

[5. Task Assignment]
🎯 Spawning new Claude CLI for task in /workdir/session_xxx-architect
📝 Task prompt length: 2058 characters
🔍 [DEBUG] Using stdin pipe approach
✅ Wrote 2058 bytes to stdin and closed
✅ Claude CLI spawned with stdin prompt for session_xxx-architect

[6. Output Routing]
📺 Routing output from session_xxx-architect to terminal manager

[7. Task Completion]
✅ Agent session_xxx-architect task completed (code: 0)
📥 Response length: 1234 chars
```

---

## 🎓 **Understanding the Fixes**

### Fix 1: PTY Architecture (Backend)

**Problem**: Spawning `node-pty` process with `--print` flag but no stdin → immediate exit with error

**Solution**: Skip PTY creation entirely in `--print` mode
- Set `agentSession.pty = null`
- Tasks use separate `child_process` instances with stdin pipe
- Eliminates 70 lines of error-prone event handlers

**Evidence of fix working**:
```
🎭 Spawning agent in --print mode (PTY-less)  ← NEW
⏭️ Skipping PTY event handlers (PTY-less mode)  ← NEW
```

**Evidence of fix NOT working**:
```
🔌 Agent PTY exited with code 1  ← OLD (bad)
```

---

### Fix 2: useEffect Race Condition (Frontend)

**Problem**: `isConnected` in dependency array → useEffect re-runs when connection succeeds → cleanup disconnects socket

**Solution**: Remove `isConnected` from dependencies
- Effect only runs on session/terminal changes
- Connection state changes don't trigger re-runs
- Cleanup doesn't fire prematurely

**Evidence of fix working**:
- Agent terminals stay connected
- No "Connection lost" messages
- Output streams continuously

**Evidence of fix NOT working**:
```
⚠️ Connection lost: io client disconnect (Manual disconnect)  ← OLD (bad)
```

---

## 📝 **Test Report Template**

After completing the test, document your results:

```markdown
# AI Team Test Report - [Date]

## Environment
- Server: [Running/Not Running]
- Server Restarted: [Yes/No]
- OAuth Token: [Set/Not Set]
- Browser: [Chrome/Firefox/Safari]

## Test Results

### ✅ Passed
- [ ] Requirement extraction (high confidence)
- [ ] Quality gate (score ≥ 50%)
- [ ] 5 agents spawned
- [ ] No PTY errors in logs
- [ ] No connection lost messages
- [ ] Tasks assigned to agents
- [ ] Output appeared in terminals
- [ ] Correct output routing

### ❌ Failed
- [ ] [Issue description]
- [ ] [Issue description]

## Server Logs (Key Sections)

```
[Paste relevant logs here]
```

## Screenshots
[Attach screenshots of agent terminals with output]

## Notes
[Any additional observations]
```

---

## 🚀 **Next Steps After Successful Test**

Once all agents spawn and execute successfully:

1. **Test with different project types**:
   - API backend
   - React dashboard
   - Full-stack application

2. **Test error handling**:
   - Invalid OAuth token
   - Network issues
   - Incomplete requirements

3. **Performance testing**:
   - Multiple teams in parallel
   - Large file generation
   - Extended workflows

4. **Integration testing**:
   - File system verification
   - Git operations
   - Deployment workflows

---

## 📞 **Support & Documentation**

**Complete Fix Documentation**: 
`/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/AI_TEAM_PTY_FIX_COMPLETE.md`

**Extraction Fix Documentation**:
`/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/AI_TEAM_EXTRACTION_FIX_COMPLETE.md`

**Server Location**:
`/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/server.js`

**Agent Services**:
- `/services/claude-cli-puppeteer.js` (PTY-less spawn)
- `/services/agent-coordinator.js` (task assignment)
- `/services/agent-terminal-manager.js` (output routing)

**Frontend Component**:
- `/components/terminal/Terminal.tsx` (useEffect fix at line 2090)

---

*Testing Guide Created: November 17, 2025*  
*Covers: PTY Architecture Fix + useEffect Race Condition Fix*  
*Expected Success Rate: 95%+ with both fixes applied*
