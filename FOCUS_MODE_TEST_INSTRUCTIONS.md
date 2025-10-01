# Focus Mode Feature - Testing Instructions

## 🎯 Feature Overview
The Focus Mode feature allows users to hide left and right panels with one click, giving the center panel (editor + terminal) 100% screen width for distraction-free coding.

## 🧪 How to Enable for Testing

1. **Enable Feature Flag**:
   ```typescript
   // File: coder1-ide-next/app/ide/page.tsx (line 59)
   const FOCUS_MODE_ENABLED = true; // Change from false to true
   ```

2. **Restart Server**:
   ```bash
   cd coder1-ide-next
   npm run dev
   ```

3. **Access IDE**: http://localhost:3001/ide

## ✅ Testing Checklist

### Basic Functionality
- [ ] **View Menu Access**: View > Focus Mode option appears
- [ ] **Keyboard Shortcut**: Ctrl+Shift+F works
- [ ] **Panel Hiding**: Left (Explorer) and Right (Preview) panels disappear
- [ ] **Panel Restoration**: Panels reappear when toggling off
- [ ] **Center Expansion**: Editor/Terminal area expands to full width

### Integration Testing  
- [ ] **Console Logging**: Check browser console for focus mode messages
- [ ] **State Persistence**: Focus mode state maintained during session
- [ ] **No Side Effects**: Other IDE functions work normally
- [ ] **Responsive Behavior**: Works on different screen sizes
- [ ] **Panel Interactions**: Individual panel toggles still work

### Error Scenarios
- [ ] **Feature Flag Disabled**: Graceful fallback when flag is false
- [ ] **Console Errors**: No JavaScript errors in browser console
- [ ] **Layout Integrity**: No visual glitches or broken layouts

## 🔍 What to Look For

### Success Indicators
1. **Immediate Response**: Focus mode toggles instantly
2. **Smooth Transitions**: No jarring layout jumps
3. **Full Width Usage**: Center panel uses entire screen width
4. **Visual Feedback**: Clear indication when focus mode is active

### Potential Issues
1. **Monaco Editor Sizing**: Editor should resize properly
2. **Terminal Fit**: Terminal should expand without rendering issues
3. **Panel Memory**: Panels should remember their previous state
4. **Keyboard Conflicts**: Shortcut shouldn't interfere with other functions

## 📊 Expected Results

### Before Focus Mode (Normal View)
```
[Explorer 15%] [Editor/Terminal 65%] [Preview 20%]
```

### After Focus Mode (Distraction-Free)
```
[Editor/Terminal 100%]
```

## 🐛 Common Issues & Solutions

### Issue: Feature doesn't activate
- **Check**: Feature flag is enabled
- **Check**: Console for "Focus mode is disabled by feature flag" message

### Issue: Panels don't hide
- **Check**: Browser console for errors
- **Check**: Panel visibility logic in ThreePanelLayout

### Issue: Layout breaks
- **Check**: CSS conflicts or missing dependencies
- **Check**: react-resizable-panels compatibility

## 🚀 Ready for Production?

Before enabling in production:
- [ ] All testing checklist items pass
- [ ] No console errors during normal usage
- [ ] Performance impact is minimal
- [ ] Feature enhances user experience

## 📞 Support

If issues are found:
1. Check browser console for errors
2. Test with feature flag disabled to confirm isolation
3. Review git commits for easy rollback if needed

---

**Implementation Date**: October 1, 2025  
**Feature Status**: Ready for Testing  
**Rollback Command**: `git checkout master` (if needed)