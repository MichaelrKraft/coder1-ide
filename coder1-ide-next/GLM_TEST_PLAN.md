# 🧪 GLM Integration - Testing Plan

**⚠️ PRIVACY NOTICE**: GLM API registration may require passport verification. **We recommend [Gemini 2.5 Flash-Lite](./GEMINI_QUICK_START.md) instead** - no passport required, Google account only, similar pricing, FREE tier available!

**Status**: ⚠️ API Key Not Yet Active  
**Date**: October 4, 2025

---

## 📋 Pre-Test Checklist

### ✅ Implementation Complete
- [x] GLM API client created
- [x] Model store updated with GLM models
- [x] Terminal context extraction implemented
- [x] Rate limit detection added
- [x] Toast notifications integrated
- [x] Cost tracking store created
- [x] Cost display UI built
- [x] Environment configuration documented

### ⚠️ API Key Status
- [x] API key added to `.env.local`
- [ ] **API key activated on GLM platform**

**Current Issue**: API returns "身份验证失败" (Authentication failed)

**Possible Causes**:
1. API key not yet activated (may take a few hours)
2. Need to verify email or complete registration
3. API key format issue
4. Regional restrictions

**Solution**: 
1. Check GLM dashboard: https://open.bigmodel.cn/
2. Verify account status and API key activation
3. May need to wait 1-24 hours for activation
4. Check if additional verification is needed

---

## 🎯 Test Plan (When API Key Active)

### Test 1: Manual Model Selection
**Objective**: Verify GLM models appear in dropdown and can be selected

**Steps**:
1. Open http://localhost:3001/ide
2. Click ⚙️ Settings in terminal header
3. Scroll to "Claude Model" section
4. Verify 6 models visible:
   - Claude Sonnet 4.5 ✅
   - Claude Opus 4.1 ✅
   - Claude Haiku 3.5 ✅
   - GLM 4 Flash ($0.10/M) ← NEW
   - GLM 4 Air ($1/M) ← NEW
   - GLM 4 Plus ($50/M) ← NEW
5. Click "GLM 4 Flash"
6. Verify model indicator updates to "GLM 4 Flash"

**Expected Result**: Model selection works, indicator updates

---

### Test 2: GLM Cost Display
**Objective**: Verify cost tracking UI appears when using GLM

**Steps**:
1. Select GLM 4 Flash (from Test 1)
2. Look at terminal header
3. Verify cost display appears:
   ```
   💰 GLM Usage | Session: $0.0000 (0) | Total: $0.0000 (0) [Reset]
   ```
4. Type a message in terminal
5. Verify costs update in real-time

**Expected Result**: 
- Cost display only visible with GLM models
- Updates after each API response
- Shows session and total costs

---

### Test 3: GLM API Response
**Objective**: Verify GLM actually responds to messages

**Steps**:
1. With GLM 4 Flash selected
2. Type in terminal: `echo "Hello GLM, how are you?"`
3. Wait for response
4. Verify:
   - Response appears in terminal
   - Cost display updates
   - Response is relevant to input

**Expected Result**: 
- GLM responds correctly
- Costs calculated accurately (~4 tokens input, ~20 tokens output)
- Total cost ~$0.000002 (24 tokens × $0.10/M)

---

### Test 4: Rate Limit Detection
**Objective**: Verify automatic detection and toast notification

**Steps**:
1. Switch back to Claude Sonnet 4.5
2. In terminal, type: `echo "rate limit exceeded"`
3. Press Enter
4. Wait 1-2 seconds
5. Verify toast appears:
   ```
   ⚠️ Rate limit detected. Switch to cost-effective GLM 4 Flash?
   
   [Switch to GLM]  [Wait 15 min]
   ```

**Expected Result**: 
- Toast notification appears
- Shows action buttons
- Stays visible for 15 seconds

---

### Test 5: Manual Switch to GLM (via Toast)
**Objective**: Verify context preservation when switching

**Steps**:
1. (Continuing from Test 4)
2. Click "Switch to GLM" button in toast
3. Verify terminal shows: "Switching to GLM API..."
4. Verify success message: "✅ Switched to GLM 4 Flash. Context preserved!"
5. Verify model indicator shows "GLM 4 Flash"
6. Verify cost display appears

**Expected Result**: 
- Smooth transition to GLM
- Context extracted from terminal
- Success notifications shown

---

### Test 6: Context Preservation
**Objective**: Verify conversation history is preserved

**Steps**:
1. While using Claude, have a conversation:
   ```
   You: What's 2+2?
   Claude: 4
   You: And what's 5+5?
   Claude: 10
   ```
2. Trigger rate limit: `echo "rate limit"`
3. Click "Switch to GLM"
4. Ask GLM: "What were the last two math problems?"
5. Verify GLM references previous conversation

**Expected Result**: 
- GLM knows about 2+2=4 and 5+5=10
- Context from last 200 lines preserved
- Conversation continuity maintained

---

### Test 7: Cost Tracking Persistence
**Objective**: Verify costs survive page refresh

**Steps**:
1. Use GLM to accumulate some cost (e.g., $0.001)
2. Note session and total costs
3. Refresh the page (Cmd+R or Ctrl+R)
4. Verify total cost persists
5. Verify session cost resets to $0

**Expected Result**: 
- Total costs stored in localStorage
- Session costs reset on page load
- Cross-tab sync works

---

### Test 8: Auto-Switch Back Cooldown
**Objective**: Verify cooldown timer and notification

**Steps**:
1. Trigger rate limit switch to GLM
2. Note the cooldown time (e.g., "15 min")
3. Wait for cooldown (or modify code to 30 seconds for testing)
4. Verify toast appears:
   ```
   ⏰ Claude cooldown complete (15 min). Ready to switch back?
   
   [Switch to Claude]
   ```
5. Click "Switch to Claude"
6. Verify return to Claude CLI

**Expected Result**: 
- Cooldown timer completes
- Notification appears automatically
- Switch back works correctly

---

### Test 9: Session Cost Reset
**Objective**: Verify reset button clears session costs

**Steps**:
1. Use GLM to accumulate session cost (e.g., $0.002)
2. Click [Reset] button in cost display
3. Confirm dialog
4. Verify session cost → $0.0000
5. Verify total cost unchanged

**Expected Result**: 
- Session costs reset to zero
- Total costs preserved
- Confirmation dialog shown

---

### Test 10: Cross-Tab Synchronization
**Objective**: Verify costs sync across browser tabs

**Steps**:
1. Open IDE in Tab 1
2. Use GLM, accumulate cost
3. Open IDE in Tab 2 (same browser)
4. Verify Tab 2 shows same total cost
5. Use GLM in Tab 2, add more cost
6. Switch to Tab 1
7. Verify Tab 1 updated with new cost

**Expected Result**: 
- Both tabs show same costs
- Updates sync in real-time
- No data loss between tabs

---

## 🐛 Troubleshooting Guide

### Issue: API Key Error
**Error**: "GLM_API_KEY not configured"
**Fix**: 
```bash
echo "GLM_API_KEY=your-key" >> .env.local
echo "NEXT_PUBLIC_GLM_API_KEY=your-key" >> .env.local
npm run dev  # Restart server
```

### Issue: Cost Display Not Showing
**Symptom**: No cost UI when GLM selected
**Debug**:
1. Check browser console for errors
2. Verify model is actually GLM (check model indicator)
3. Try hard refresh (Cmd+Shift+R)

### Issue: Rate Limit Toast Not Appearing
**Symptom**: Echo "rate limit" doesn't trigger toast
**Debug**:
1. Check browser console for RateLimitDetector logs
2. Verify addToast is defined (check useUIStore)
3. Try different patterns: "429", "too many requests"

### Issue: Context Not Preserved
**Symptom**: GLM doesn't remember previous conversation
**Debug**:
1. Check terminal has conversation history
2. Verify buffer extraction logs in console
3. Try with more explicit conversation (multiple exchanges)

### Issue: Costs Not Updating
**Symptom**: Cost display stays at $0
**Debug**:
1. Check GLM API response in network tab
2. Verify useGLMCostStore.addUsage() called
3. Check browser localStorage for 'glm-cost-tracking'

---

## 📊 Expected Results Summary

| Test | Feature | Expected Outcome |
|------|---------|-----------------|
| 1 | Model Selection | GLM models visible and selectable |
| 2 | Cost Display | UI appears with GLM, shows $0 initially |
| 3 | GLM Response | API responds, costs update |
| 4 | Rate Limit Detection | Toast appears on "rate limit" |
| 5 | Manual Switch | Context preserved, smooth transition |
| 6 | Context Preservation | GLM remembers last 200 lines |
| 7 | Cost Persistence | Total costs survive refresh |
| 8 | Auto-Switch Back | Cooldown notification works |
| 9 | Session Reset | Reset button clears session only |
| 10 | Cross-Tab Sync | Costs sync across tabs |

---

## 📝 Test Results Template

```markdown
## Test Results - [Date]

**Tester**: [Name]
**API Key Status**: [Active/Inactive]
**Browser**: [Chrome/Firefox/Safari]

### Test 1: Manual Model Selection
- [ ] PASS / [ ] FAIL
- Notes: 

### Test 2: GLM Cost Display
- [ ] PASS / [ ] FAIL
- Notes:

### Test 3: GLM API Response
- [ ] PASS / [ ] FAIL
- Notes:

### Test 4: Rate Limit Detection
- [ ] PASS / [ ] FAIL
- Notes:

### Test 5: Manual Switch to GLM
- [ ] PASS / [ ] FAIL
- Notes:

### Test 6: Context Preservation
- [ ] PASS / [ ] FAIL
- Notes:

### Test 7: Cost Tracking Persistence
- [ ] PASS / [ ] FAIL
- Notes:

### Test 8: Auto-Switch Back Cooldown
- [ ] PASS / [ ] FAIL
- Notes:

### Test 9: Session Cost Reset
- [ ] PASS / [ ] FAIL
- Notes:

### Test 10: Cross-Tab Synchronization
- [ ] PASS / [ ] FAIL
- Notes:

### Overall Status
- Tests Passed: __/10
- Critical Issues: 
- Minor Issues:
- Recommendations:
```

---

## 🚀 Next Steps

1. **Activate API Key**:
   - Visit https://open.bigmodel.cn/
   - Check account status
   - Verify API key activation
   - May take 1-24 hours

2. **Run Tests**:
   - Follow test plan above
   - Document results
   - Report any issues

3. **Optional Enhancements**:
   - Adjust cooldown timer (`.env.local`)
   - Customize rate limit patterns
   - Add more GLM models
   - Enhance cost display UI

---

**Current Status**: ✅ Implementation complete, ⏳ Waiting for API key activation

**When API key is active, testing will take approximately 30 minutes for complete validation.**
