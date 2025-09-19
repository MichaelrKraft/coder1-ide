# Terminal Scrolling Fix - September 16, 2025

## Issue
When ClaudeCode outputs lots of text, the bottom content gets cut off with no way to scroll and see it.

## Root Cause
The terminal container had `overflow: hidden` (line 1631 in Terminal.tsx) which prevented the scrollbar from appearing when content exceeded the viewport height.

## Solution Applied
Changed the overflow property from `hidden` to `auto` on line 1631 of Terminal.tsx:

```tsx
// Before:
overflow: 'hidden'

// After:
overflow: 'auto'
```

## Why This Works
- The parent container was blocking scrolling with `overflow: hidden`
- Even though xterm-viewport had `overflow-y: auto !important` in CSS, the parent container prevented it from working
- Changing to `overflow: auto` allows scrollbars to appear when content exceeds the container height
- Users can now scroll to see all terminal output

## Testing Verified
✅ Terminal connects properly with unified server
✅ Long output can be scrolled
✅ No visual glitches or layout breaks
✅ Existing functionality preserved

## Files Modified
- `/components/terminal/Terminal.tsx` - Line 1631 only

## Related Documentation
- `/docs/guides/terminal-display-fix.md` - Previous terminal display fixes
- This issue has been encountered before (September 9, 2025) and the documentation helped identify the solution

## For Future Agents
If terminal scrolling issues occur again:
1. Check the overflow properties on parent containers
2. Ensure no parent has `overflow: hidden` that blocks child scrolling
3. The xterm-viewport already has proper CSS, usually the issue is with parent containers
4. This is a simple one-line fix that solves the problem

---
*Fixed: September 16, 2025*
*Single line change: overflow property from 'hidden' to 'auto'*