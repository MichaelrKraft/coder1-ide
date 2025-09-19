# 🖥️ Coder1 Terminal Complete Guide

## 📖 Table of Contents
- [Overview](#overview)
- [Terminal Scrolling Issues](#terminal-scrolling-issues)
- [Display Fix Guide](#display-fix-guide)
- [Testing & Validation](#testing--validation)
- [Troubleshooting](#troubleshooting)
- [For Developers](#for-developers)

---

## Overview

The Coder1 IDE features an integrated terminal built on xterm.js with PTY support. This guide consolidates all terminal-related documentation and solutions.

---

## Terminal Scrolling Issues

### 🚨 CRITICAL: Terminal Scrolling Problem (January 21, 2025)

**Current Status**: TEMPORARILY FIXED with 200px padding workaround

#### Problem
- Terminal text gets cut off at bottom
- Cannot scroll to see all output
- Input prompt becomes invisible

#### Temporary Solution
Added `paddingBottom: '200px'` to terminal container (creates black buffer zone)
- **Location**: `/components/terminal/Terminal.tsx` lines 2222-2229
- **Why It's Complex**: Involves xterm.js internal scrolling, CSS conflicts, and layout constraints
- **Time Wasted by Previous Agents**: 10+ hours across multiple sessions since September 2025

#### Quick Test
Run `for i in {1..50}; do echo "Line $i"; done` - Can you see line 50?

---

## Display Fix Guide

### Problem History (September 2025)

The terminal was cutting off the prompt at the bottom, making it impossible to see what was being typed.

### Root Causes Identified
1. **Overflow management conflicts** between parent and child containers
2. **Status line positioning** taking up space in the document flow
3. **Incorrect padding calculations** not accounting for all UI elements
4. **CSS cascade issues** with terminal-content class interfering with xterm.js
5. **Dual scrolling conflict** between container `overflow-y-auto` and xterm.js viewport scrolling

### Complete Solution Implementation

#### 1. Black Box Fix (September 16th)
```tsx
// Before (Broken):
<div className="flex-1 overflow-y-auto">

// After (Fixed):
<div className="flex-1 overflow-hidden">
```

#### 2. Terminal Container Structure (Terminal.tsx)
```tsx
// Terminal content wrapper with proper spacing
<div 
  className="flex-1 relative"
  style={{
    paddingBottom: terminalSettings.statusLine.enabled ? '40px' : '0px',
    overflow: 'hidden'
  }}
>
  <div 
    className="absolute inset-0 p-3"
    style={{
      bottom: terminalSettings.statusLine.enabled ? '40px' : '0px'
    }}
  >
    <div ref={terminalRef} className="h-full" />
  </div>
</div>

// Status line with absolute positioning
{terminalSettings.statusLine.enabled && (
  <div style={{ 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    zIndex: 30, 
    height: '40px' 
  }}>
    {/* status line content */}
  </div>
)}
```

#### 3. Scrolling Fix (September 16th + CSS)
```css
/* Terminal.css - ensure xterm viewport handles scrolling */
.xterm-viewport {
  overflow-y: auto !important;
}

.xterm-screen {
  position: relative;
}
```

#### 4. CSS Fixes (globals.css)
```css
/* Ensure xterm viewport allows scrolling */
.xterm-viewport {
  overflow-y: auto !important;
}

/* Ensure xterm screen is visible */
.xterm-screen {
  position: relative;
}
```

### Layout Approach Evolution
**Attempted Solutions**:
1. **Absolute Positioning** (September 9th docs) - Created layout conflicts in constrained IDE layout
2. **Viewport Height Constraints** (`100vh`) - Conflicted with parent layout allocations
3. **Overflow Management** (September 16th) - ✅ **SUCCESSFUL APPROACH**

### Key Changes Made
1. **Removed problematic CSS** - Eliminated `terminal-content` class that was interfering with xterm
2. **Absolute positioning** for terminal content with proper bottom spacing
3. **Fixed status line height** at 40px with absolute positioning
4. **Parent container** with relative positioning for proper context
5. **Simplified terminal div** to just use `h-full` class
6. **Let xterm.js handle scrolling** - Changed container from `overflow-y-auto` to `overflow-hidden`

---

## Testing & Validation

### Testing Checklist
- ✅ Terminal accepts keyboard input
- ✅ Prompt is always visible at the bottom
- ✅ Long output scrolls properly
- ✅ Status line doesn't overlap content
- ✅ Terminal resizes correctly with window
- ✅ No visual glitches or jumps
- ✅ Manual scrolling works properly
- ✅ Black box no longer appears

### Resolution Status
- ✅ **Issue #1: Black Box Overlay** - RESOLVED
- ✅ **Issue #2: Manual Scrolling** - RESOLVED  
- ⚠️ **Issue #3: Viewport Overflow** - IMPROVED but may need ongoing work

---

## Troubleshooting

### Common Issues

#### Terminal Not Visible
1. Check if terminal container has proper height allocation
2. Verify xterm.js initialization in useEffect
3. Check for CSS conflicts with `.terminal-content` class

#### Scrolling Problems
1. Ensure xterm viewport has `overflow-y: auto !important`
2. Check that parent container uses `overflow: hidden`
3. Verify no dual scrolling conflicts

#### Input Issues  
1. Check terminal focus state
2. Verify PTY session is active
3. Check WebSocket connection status

#### Layout Problems
1. Verify absolute/relative positioning relationships
2. Check status line height calculations
3. Test with both status line enabled and disabled

### Emergency Fixes
If terminal is completely broken:
1. Revert to backup files from `/docs/archive/md-backup-*`
2. Check `Terminal.tsx` for recent changes
3. Verify `Terminal.css` hasn't been modified
4. Test in isolation outside IDE layout

---

## For Developers

### Architecture Notes
- **xterm.js**: Core terminal engine
- **PTY**: Pseudo-terminal backend via node-pty
- **WebSocket**: Real-time communication
- **CSS Integration**: Careful coordination between xterm and custom styling

### Critical Files
- `/components/terminal/Terminal.tsx` - Main component
- `/components/terminal/Terminal.css` - Terminal-specific styles
- `/app/globals.css` - Global xterm overrides
- `/lib/socket.ts` - WebSocket communication

### Development Guidelines
1. **Never modify xterm.js internal classes** unless absolutely necessary
2. **Test thoroughly** after any layout changes
3. **Preserve absolute positioning** for status line
4. **Always test keyboard input** after making changes
5. **Maintain overflow hierarchy** - parent hidden, xterm viewport auto

### Performance Considerations
- Terminal overflows viewport by ~117px in current layout
- Complex IDE layout hierarchy constrains terminal space
- Balance between functionality and layout constraints

---

## See Also
- [Architecture Overview](../architecture/)
- [Development Documentation](../development/)
- [API Reference](../api/)

---

*Last Updated: January 21, 2025*
*Consolidates: terminal-display-fix.md, TERMINAL_COMPLETE_SOLUTION_2025-09-16.md, and related documentation*