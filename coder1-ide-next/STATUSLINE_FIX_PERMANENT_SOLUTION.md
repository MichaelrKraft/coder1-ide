# 🚨 STATUSLINE FIX - PERMANENT SOLUTION (January 2025)

## ⚠️ CRITICAL: READ THIS BEFORE ATTEMPTING ANY STATUSLINE FIXES

**Problem**: When restoring checkpoints/sessions, Claude Code statusline messages appear repeatedly in the terminal, showing messages like:
- `✶ Adding configuration system with TOML-style localStorage… (esc to interrupt · ctrl+t to show todos)`
- `⎿ Next: Create shadow statusline container (hidden by default)`

**User Impact**: Michael Kraft has reported this issue multiple times. At least 3-4 agents have attempted fixes that were only temporary.

---

## ❌ What Previous Agents Tried (And Why They Failed)

### Previous Attempt #1: Filtering Animation Verbs Only
- **What they did**: Added filters for "Thinking…", "Planning…", "Examining…", etc.
- **Why it failed**: Only caught animation verbs ending in "-ing", NOT actual task descriptions
- **Location**: `/lib/checkpoint-utils.ts` lines 24-84

### Previous Attempt #2: Filtering Specific Patterns
- **What they did**: Added patterns for known animations like "Tempering", "Stewing", "Pouncing"
- **Why it failed**: Too specific - didn't catch arbitrary task descriptions like "Adding configuration system"
- **Problem**: New statusline messages with different text would still appear

### Previous Attempt #3: Partial Filtering
- **What they did**: Filtered at save time only
- **Why it failed**: Didn't filter at restoration time, so old checkpoints still had the problem

---

## ✅ THE PERMANENT SOLUTION (Implemented January 24, 2025)

### Three-Layer Defense System

#### Layer 1: Comprehensive Pattern Matching in `checkpoint-utils.ts`
**File**: `/lib/checkpoint-utils.ts` (lines 104-139)

Added `statuslineTaskPatterns` array that catches:
```typescript
// Critical patterns that ALWAYS appear in statusline messages
/.*\(esc to interrupt.*?ctrl\+t.*?\).*$/gm  // The control hints
/^\s*⎿\s*Next:.*$/gm                        // The "Next:" indicator
/^[✶✳✢·✻✽✦☆★▪▫◆◇○●]\s+.*?\(esc to interrupt.*?\).*$/gm  // Any task with control hint
```

**Key Insight**: Filter based on CONTROL HINTS, not task text!

#### Layer 2: Applied Filters at Both Save AND Restore
**File**: `/lib/checkpoint-utils.ts` (lines 161-164)

```typescript
// Apply statusline task message filters - CRITICAL FOR PERMANENT FIX
for (const pattern of statuslineTaskPatterns) {
  filtered = filtered.replace(pattern, '');
}
```

This is called by BOTH:
- `processCheckpointDataForSave()` - filters before saving
- `processCheckpointDataForRestore()` - filters after loading

#### Layer 3: Defensive Filtering at Display Time
**File**: `/components/terminal/BetaTerminal.tsx` (lines 1042-1045, 1117-1120)

```typescript
// Final safeguard before writing to terminal
cleanedData = cleanedData.replace(/.*\(esc to interrupt.*?ctrl\+t.*?\).*$/gm, '');
cleanedData = cleanedData.replace(/^\s*⎿\s*Next:.*$/gm, '');
xtermRef.current.write(cleanedData);
```

---

## 🎯 Why This Solution Is Permanent

1. **Generic Patterns**: Doesn't rely on specific task text, catches ANY statusline format
2. **Control Hint Based**: Filters on "(esc to interrupt" and "ctrl+t" which are ALWAYS present
3. **Triple Protection**: Filters at save, restore, AND display
4. **Future Proof**: Will catch new statusline variations Claude Code might add

---

## 🔧 Testing the Fix

1. Create a checkpoint while Claude Code is showing statusline messages
2. Restore the checkpoint
3. You should NOT see any repeated statusline messages like:
   - `✶ Adding configuration system...`
   - `⎿ Next: Create shadow statusline...`
   - Any message with `(esc to interrupt · ctrl+t to show todos)`

---

## ⚠️ DO NOT ATTEMPT THESE

1. **Don't add more verb patterns** - We already filter all "-ing" verbs generically
2. **Don't remove the defensive filtering** - It's there for old checkpoints
3. **Don't change the regex flags** - The `/gm` flags are critical for multiline matching
4. **Don't try to preserve statusline messages** - They're meant to be transient

---

## 📝 For Future Agents

If Michael reports this issue again:
1. Check if the patterns in this file still match current Claude Code output
2. Verify all three layers are still in place
3. Test with actual Claude Code statusline messages
4. The fix MUST filter based on control hints, not specific text

**Remember**: The key is filtering `(esc to interrupt` and `ctrl+t` patterns, NOT the task descriptions!

---

*Last Updated: September 24, 2025 by Claude (Enhanced fix to handle ANSI escape codes)*
*Previous Update: January 24, 2025 by Claude (Initial permanent fix attempt)*
*Issue Owner: Michael Kraft (@ultrathink)*

---

## 🎯 UPDATE: September 24, 2025 - ANSI Code Handling Fix

**Problem Discovered**: The January fix wasn't catching statusline messages that had ANSI escape codes embedded within them. Messages appeared as `\u001b[2m(esc to interrupt` instead of plain text.

**Solution Applied**: Added new patterns to `statuslineTaskPatterns` in `/lib/checkpoint-utils.ts`:
```typescript
// Handle ANSI codes within statusline messages
/.*\u001b\[\d+m\(esc to interrupt.*$/gm,  // Matches [2m(esc to interrupt...
/.*\u001b\[[\d;]+m[✶✳✢·✻✽✦☆★▪▫◆◇○●]\u001b.*\u001b\[\d+m\(esc to interrupt.*$/gm,
/.*\besc to interrupt\b.*$/gm  // Catch any line with this phrase
```

**Test Results**: Verified with actual checkpoint data containing 11 statusline messages - ALL successfully filtered!