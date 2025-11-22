# Fix: Repeated "Bash(claude) Running…" Messages on Page Refresh

## Problem

After refreshing the IDE page, users were seeing repeated status messages before typing anything:

```
Bash(claude)
⎿  Running…
   ctrl+b to run in background

Bash(claude)
⎿  Running…
   ctrl+b to run in background

(repeated multiple times)
```

## Root Cause

### The Issue Chain:

1. **Claude Code CLI Status Messages**: When Claude Code CLI (`claude` command) is running, it displays these status lines
2. **Terminal History Saved WITHOUT Filtering**: Terminal history is saved to localStorage (line 168 of `/app/ide/page.tsx`)
3. **Status Messages Included**: The statuslines were in the terminal when history was saved
4. **Auto-Restoration on Every Load**: On page refresh, the terminal history is restored from localStorage
5. **Messages Replay**: The old status messages appear before any user input

### Key Finding:

The `checkpoint-utils.ts` file had extensive filters for Claude Code animations and statuslines, but was missing patterns for:
- `Bash(claude)` - The command execution indicator
- `⎿  Running…` - The running status line with tree character
- `ctrl+b to run in background` - The control hint

## Solution Implemented

### 1. Added Filter Patterns (`/lib/checkpoint-utils.ts` lines 199-216)

```typescript
// CRITICAL FIX: Bash(claude) running status messages (January 2025)
// These appear when Claude Code CLI is active and were being restored on every page load
/^\s*Bash\(claude\)\s*$/gm,
/.*Bash\(claude\).*\r?\n/g,

// Match "Running…" status lines with the tree drawing character
/^\s*⎿\s*Running…\s*$/gm,
/.*⎿\s*Running….*\r?\n/g,

// Match "ctrl+b to run in background" hints
/^\s*ctrl\+b to run in background\s*$/gm,
/.*ctrl\+b to run in background.*\r?\n/g,

// Catch complete sequences of all three lines together
/(?:.*Bash\(claude\).*\r?\n)?(?:.*⎿\s*Running….*\r?\n)?(?:.*ctrl\+b to run in background.*\r?\n?)/g,

// Generic catch-all for any claude command status
/.*Bash\([^)]+\).*\r?\n/g
```

### 2. Applied Filter to localStorage Save (`/app/ide/page.tsx` lines 166-173)

**Before:**
```typescript
useEffect(() => {
  if (typeof window === 'undefined') return;
  if (terminalHistory) {
    localStorage.setItem('terminalHistory', terminalHistory);
  }
}, [terminalHistory]);
```

**After:**
```typescript
useEffect(() => {
  if (typeof window === 'undefined') return;
  if (terminalHistory) {
    // Filter out Claude Code statuslines and animations before saving
    const filteredHistory = filterThinkingAnimations(terminalHistory);
    localStorage.setItem('terminalHistory', filteredHistory);
  }
}, [terminalHistory]);
```

### 3. Added Import (`/app/ide/page.tsx` line 13)

```typescript
import { filterThinkingAnimations } from '@/lib/checkpoint-utils';
```

## How It Works Now

### Terminal History Save Flow:
```
1. Terminal data arrives → terminalHistory state updates
2. useEffect triggers on terminalHistory change
3. filterThinkingAnimations() removes statuslines
4. Filtered history saved to localStorage
5. Future page loads restore clean history only
```

### Filter Coverage:
The `filterThinkingAnimations` function now removes:
- ✅ Thinking animations (✶ Thinking…)
- ✅ Validation loop messages
- ✅ Plan mode animations
- ✅ Statusline task messages
- ✅ MCP tool call records
- ✅ **Bash(claude) running status** (NEW)
- ✅ Warning messages
- ✅ ANSI escape sequences

## Testing Instructions

### Test 1: Clear and Verify
```bash
# In browser DevTools console:
localStorage.clear()
# Refresh page (Cmd+R)
# Expected: Empty terminal, no repeated messages
```

### Test 2: Run Claude and Refresh
```bash
# In IDE terminal:
claude help me with something
# Wait for status messages to appear
# Refresh page (Cmd+R)
# Expected: No "Bash(claude) Running…" messages
# Expected: Regular command history should remain
```

### Test 3: Check localStorage Contents
```javascript
// In browser console:
console.log(localStorage.getItem('terminalHistory'))
// Should NOT contain "Bash(claude)" or "Running…"
```

## Expected Behavior

### ✅ Should See:
- Clean terminal on page refresh
- Your actual commands (ls, pwd, etc.)
- Command output
- Empty terminal if no commands run

### ❌ Should NOT See:
- Repeated "Bash(claude)" lines
- "⎿  Running…" status messages
- "ctrl+b to run in background" hints
- Any Claude Code thinking animations
- Statusline task descriptions

## Side Effects

### Positive:
- ✅ Cleaner checkpoint snapshots
- ✅ Faster terminal restoration (less data)
- ✅ Reduced localStorage usage
- ✅ Better user experience on page refresh

### None Expected:
- Terminal functionality remains the same
- Live statuslines still appear during active sessions
- Only affects saved/restored history

## Files Modified

1. `/lib/checkpoint-utils.ts` - Added 8 new filter patterns (lines 199-216)
2. `/app/ide/page.tsx` - 
   - Added import (line 13)
   - Applied filter before save (line 170)

## Related Issues

This fix also prevents:
- Checkpoint restoration including old statuslines
- localStorage quota issues (statuslines add ~50-100 chars each)
- Visual clutter in timeline checkpoint previews

## Technical Details

### Why filterThinkingAnimations?

Despite the name, this function filters ALL Claude Code transient UI elements:
- Animations
- Status indicators
- Control hints
- Validation messages
- MCP tool records

It's the centralized filtering function used throughout the codebase for checkpoint cleanup.

### Pattern Matching Strategy

Used multiple patterns for redundancy:
1. **Exact match**: `^\s*Bash\(claude\)\s*$/gm` - Catches standalone lines
2. **Line-based**: `.*Bash\(claude\).*\r?\n/g` - Catches with surrounding content
3. **Sequence match**: Combined pattern for all three lines together
4. **Generic fallback**: `.*Bash\([^)]+\).*\r?\n/g` - Catches any bash command status

This ensures coverage regardless of terminal state or ANSI code variations.

## Verification

To confirm the fix is working:

1. **Check localStorage**: Should not contain statuslines
2. **Check page refresh**: Should show clean terminal
3. **Check checkpoint restore**: Should not include old statuslines
4. **Check terminal function**: Live statuslines should still appear when Claude runs

## Date
January 29, 2025

## Agent
Claude Code Session - Terminal Session Persistence Work
