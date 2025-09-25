# 🔍 DIAGNOSTIC TEST GUIDE - Plan Mode Issue

## Overview

I've implemented a comprehensive diagnostic system to permanently fix the repetitive "plan mode on (shift+tab to cycle)" issue. This guide shows you how to test it and understand the diagnostic output.

## What I've Added

### ✅ Comprehensive Logging System
- **SessionsPanel**: Tracks checkpoint restoration pipeline with detailed diagnostics
- **Terminal Component**: Monitors terminal data processing and connection events
- **Multiple Check Points**: Raw data → filtering → localStorage → events → terminal writing

### ✅ Test Checkpoint Created
- **Location**: `data/sessions/test_session_diagnostic/`
- **Contains**: 120 repetitions of "⏸ plan mode on (shift+tab to cycle)"
- **Purpose**: Reproduce the exact issue with full diagnostic visibility

## How to Test

### 1. Start the IDE
```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npm run dev
```

### 2. Open Browser Console
- **Chrome**: F12 → Console tab
- **Firefox**: F12 → Console tab
- **Safari**: Develop menu → Show JavaScript Console

### 3. Access the IDE
- Navigate to: `http://localhost:3001/ide`
- Open the Sessions panel (Explorer menu → Sessions)

### 4. Trigger the Diagnostic Test
- Look for session: **"🔍 DIAGNOSTIC TEST - Plan Mode Issue"**
- Click on the checkpoint: **"Diagnostic Test - Plan Mode Issue"**
- Watch the console output carefully

## 📊 What to Look For in Console

The diagnostic system will show you **exactly where** the repetitive text comes from:

### Phase 1: SessionsPanel Diagnostics
```
🔍 DIAGNOSTIC: Raw terminal data length: [number]
🔍 DIAGNOSTIC: "plan mode on" occurrences in raw data: [count]
🧽 DIAGNOSTIC: Filter Results:
  📝 "plan mode on": [before] → [after] ([removed] instances removed)
```

### Phase 2: Terminal Component Diagnostics  
```
🔍 TERMINAL DIAGNOSTIC: Raw terminal data analysis:
  📝 "plan mode on" occurrences: [count]
🧽 TERMINAL DIAGNOSTIC: Filtering results:
  📝 "plan mode on": [before] → [after] ([removed] instances removed)
💻 TERMINAL DIAGNOSTIC: Writing [number] characters to terminal
```

### Phase 3: Connection Diagnostics
```
📡 TERMINAL DIAGNOSTIC: Creating fresh session for restored checkpoint...
⚠️  TERMINAL DIAGNOSTIC: CRITICAL - This is where live Claude Code might be triggered!
🔌 TERMINAL DIAGNOSTIC: About to connect to backend with fresh session...
```

## 🎯 Critical Questions the Diagnostics Will Answer

### Question 1: Is the repetitive text in stored checkpoint data?
**Look for**: 
- `🚨 DIAGNOSTIC: FOUND HIGH REPETITION in raw checkpoint data!`
- If YES: The issue is in **stored data** (previous fixes missed this)
- If NO: The issue is **generated live** during restoration

### Question 2: Is the filtering working?
**Look for**:
- `🚨 DIAGNOSTIC: FILTERING FAILED - "plan mode on" still present after filtering!`
- If YES: The **regex patterns are insufficient** 
- If NO: The filtering works but text is coming from elsewhere

### Question 3: Is the terminal restoration triggering live statusline?
**Look for**:
- `⚠️  TERMINAL DIAGNOSTIC: CRITICAL - connectToBackend() might trigger Claude Code statusline!`
- Any console messages **after** `connectToBackend completed`
- If repetitive text appears **after** this point, it's **live generation**

### Question 4: Is the issue in the restoration events?
**Look for**:
- Messages appearing **after** `📢 DIAGNOSTIC: checkpointRestored event dispatched`
- Messages appearing **after** `📢 DIAGNOSTIC: ideStateChanged event dispatched`

## 🔧 What Happens Next

Based on your test results, I'll implement the **multi-layer permanent fix**:

### If Issue is in Stored Data:
- Add missing regex patterns for "plan mode on" variations
- Run cleanup on existing corrupted checkpoints
- Prevent future corruption at checkpoint save time

### If Issue is Live Generation:
- Identify and stop the statusline triggering events
- Add prevention logic in terminal connection process
- Implement state management to prevent loops

### If Issue is in Restoration Events:
- Modify event dispatch order and timing
- Add event deduplication and throttling
- Prevent cascade effects that trigger statusline

## 📈 Success Metrics

**Before Fix**: 
- Console shows hundreds of "plan mode on" detections
- Terminal displays repetitive text endlessly

**After Fix**:
- Console shows: `✅ DIAGNOSTIC: Filtering successful - all "plan mode on" removed`
- Terminal displays clean, restored session without repetition
- Zero "plan mode on" text in final output

## 🚨 Emergency Stop

If the diagnostic test causes system issues:
1. **Close browser tab** immediately
2. **Restart development server**: `npm run dev`
3. **Delete test files**:
   ```bash
   rm -rf data/sessions/test_session_diagnostic/
   ```

## 📞 What to Report Back

After running the test, please share:

1. **Primary Pattern**: Which diagnostic phase shows the most "plan mode on" detections?
2. **Filtering Results**: Do you see filtering success or failure messages?
3. **Timing**: Does repetitive text appear before or after `connectToBackend completed`?
4. **Console Count**: How many total console messages appear during restoration?
5. **Terminal Behavior**: Does the terminal show the repetitive text or is it clean?

This diagnostic data will tell us **exactly** where to implement the permanent fix and ensure it never returns.

---

**Created**: January 25, 2025  
**Purpose**: Permanent solution for repetitive "plan mode on" text in checkpoint restoration  
**Status**: Ready for testing