# 🧪 Gemini Integration - User Testing Guide

**Purpose**: Step-by-step guide for Mike to test the Gemini integration  
**Time Required**: ~5 minutes  
**Difficulty**: Beginner-friendly

---

## 📋 Pre-Test Checklist

### ✅ Verify API Key is Configured
```bash
# Check that Gemini API key exists in .env.local
cat /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/.env.local | grep GEMINI_API_KEY

# Should show:
# GEMINI_API_KEY=AIzaSyCsbChkI9Le9Rf-GjZN1GD-h6wywuXPoKk
# NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyCsbChkI9Le9Rf-GjZN1GD-h6wywuXPoKk
```

### ✅ Ensure Server is Running
```bash
# If not already running:
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npm run dev

# Should see:
# ▲ Next.js 15.0.0
# - Local: http://localhost:3001
```

---

## 🧪 Test Plan (5 Tests)

### Test 1: Verify Gemini Models Appear in Dropdown ✨

**Steps:**
1. Open browser to http://localhost:3001/ide
2. Wait for IDE to fully load (~5 seconds)
3. Click the **⚙️ gear icon** in the terminal header (Terminal Settings)
4. Look at the model dropdown

**Expected Result:**
```
✅ Should see these Gemini models:
- "Gemini 2.5 Flash 🚀 Ultra-Cheap ($0.15/M)"
- "Gemini 2.5 Flash-Lite ⚡ Cheapest ($0.10/M)"
```

**Screenshot Location:** Top of settings modal, in dropdown list

---

### Test 2: Verify Model Selection Persists ✨

**Steps:**
1. In Terminal Settings, click **"Gemini 2.5 Flash-Lite"**
2. Click anywhere outside the modal to close it
3. Press **Cmd+R** to refresh the page
4. Wait for page to reload
5. Click ⚙️ again to open Terminal Settings

**Expected Result:**
```
✅ Gemini 2.5 Flash-Lite should still be selected
✅ Cost display should show "Gemini Usage" label
```

---

### Test 3: Verify Mode Switching Logs ✨

**Steps:**
1. Open browser **Developer Console** (Cmd+Option+I)
2. Click the **Console** tab
3. In the filter box, type: `Switching`
4. Refresh the page (Cmd+R)
5. Wait ~3 seconds after page loads

**Expected Result:**
```
✅ Should see in console:
   "🔄 Switching from Claude CLI → Gemini API"

✅ Should also see:
   "✅ Gemini API client initialized successfully"
```

**Screenshot:** Console logs showing mode switching

---

### Test 4: Send a Test Message to Gemini ✨

**Steps:**
1. Make sure Gemini 2.5 Flash-Lite is selected (Test 2)
2. Click in the terminal area
3. Type: `Write a hello world function in Python`
4. Press **Enter**
5. Wait 2-3 seconds for response

**Expected Result:**
```
✅ Should see in browser console:
   "📤 Sending to Gemini/GLM API: Write a hello world function in Python"

✅ Should see Gemini's response appear in terminal with Python code

✅ Cost display should update from $0.0000 to actual cost (e.g., $0.0001)

✅ Token count should update from (0) to actual tokens
```

**What Response Looks Like:**
```python
def hello_world():
    print("Hello, World!")

hello_world()
```

---

### Test 5: Verify Cost Tracking Updates ✨

**Steps:**
1. After sending message in Test 4, look at terminal header
2. Find the "Gemini Usage" section
3. Check both Session and Total costs

**Expected Result:**
```
✅ Session cost should show: $0.0001 - $0.0005 (varies by message length)
✅ Total cost should match session cost (first message)
✅ Token count should show: (100-500) depending on response length
```

**Cost Breakdown:**
- Flash-Lite pricing: $0.10/M input, $0.40/M output
- Typical message: ~100-500 tokens total
- Expected cost range: $0.0001 - $0.0005 per message

---

## 🐛 Troubleshooting

### Issue: No Gemini models in dropdown
**Solution:**
```bash
# Check model store configuration
grep -n "gemini-2.5" /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/stores/useModelStore.ts

# Should show lines with Gemini models defined
```

### Issue: "Gemini API key not configured" error
**Solution:**
```bash
# Verify API key in .env.local
cat .env.local | grep GEMINI

# If missing, add:
echo 'GEMINI_API_KEY=AIzaSyCsbChkI9Le9Rf-GjZN1GD-h6wywuXPoKk' >> .env.local
echo 'NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyCsbChkI9Le9Rf-GjZN1GD-h6wywuXPoKk' >> .env.local

# Restart server
npm run dev
```

### Issue: Mode switching logs don't appear
**Solution:**
```bash
# Check terminal-mode-manager.ts logs
# In browser console, type:
localStorage.getItem('coder1-model-selection')

# Should show: {"state":{"selectedModel":"gemini-2.5-flash-lite"},"version":1}

# If wrong, clear and reselect:
localStorage.removeItem('coder1-model-selection')
# Then refresh page and select Gemini again
```

### Issue: Message sends but no response
**Solution:**
```bash
# Check server logs in terminal running npm run dev
# Look for:
# "📤 Sending message via Gemini API"
# "✅ Gemini response received: X tokens, $Y"

# If not seeing these, check browser console for errors
# Common error: "Failed to switch to Gemini: API key not configured"
```

### Issue: Cost shows $0.00 after message
**Possible Causes:**
1. Still in PTY mode (not Gemini mode)
2. API key invalid or missing
3. Network error

**Debug Steps:**
```javascript
// In browser console, check current mode:
// (This will show undefined but that's ok, check server logs instead)

// Server logs should show:
// "📤 Sending message via Gemini API"
// "✅ Gemini response received: 150 tokens, $0.000055"
```

---

## 📊 Success Criteria Checklist

After completing all 5 tests, verify:

- [ ] ✅ Gemini models visible in dropdown
- [ ] ✅ Model selection persists after refresh
- [ ] ✅ Mode switching logs appear in console
- [ ] ✅ Messages successfully send to Gemini API
- [ ] ✅ Responses appear in terminal
- [ ] ✅ Cost tracking updates correctly
- [ ] ✅ Token counts display accurately
- [ ] ✅ "Gemini Usage" label shows (not "GLM Usage")

---

## 🎬 Quick Test (1 Minute)

**If short on time, do this minimal test:**

1. Open http://localhost:3001/ide
2. Click ⚙️ → Select "Gemini 2.5 Flash-Lite"
3. Open browser console (Cmd+Option+I)
4. Type in terminal: `hello`
5. Press Enter

**Expected:**
- Console shows: "📤 Sending to Gemini/GLM API: hello"
- Terminal shows Gemini's response
- Cost updates to ~$0.0001

---

## 🎥 Screen Recording Tips

**To capture evidence of working integration:**

1. **Start Recording** (Cmd+Shift+5 → Record)
2. **Show full workflow:**
   - Open IDE
   - Open Terminal Settings
   - Select Gemini model
   - Open console to show mode switching logs
   - Type and send message
   - Show response and cost update
3. **Save as:** `gemini-integration-test-YYYY-MM-DD.mov`

---

## 📝 Test Report Template

After testing, create a quick summary:

```markdown
# Gemini Integration Test Results

**Date**: [Today's date]
**Tester**: Mike
**Time Spent**: X minutes

## Results
- Test 1 (Models in Dropdown): ✅ PASS / ❌ FAIL
- Test 2 (Selection Persists): ✅ PASS / ❌ FAIL  
- Test 3 (Mode Switching Logs): ✅ PASS / ❌ FAIL
- Test 4 (Send Message): ✅ PASS / ❌ FAIL
- Test 5 (Cost Tracking): ✅ PASS / ❌ FAIL

## Notes
[Any observations, issues, or feedback]

## Screenshots
[Paste or link to screenshots]
```

---

## 🚀 Next Steps After Testing

### If All Tests Pass ✅
1. Start using Gemini for development work
2. Monitor cost savings vs Claude
3. Report any issues or unexpected behavior
4. Consider making Gemini the default model

### If Any Tests Fail ❌
1. Note which test failed and error messages
2. Check troubleshooting section above
3. Share error logs/screenshots with Claude for debugging
4. Don't worry - we can fix any issues quickly!

---

## 💡 Pro Tips

1. **Compare Responses**: Try same prompt with Claude and Gemini to compare quality
2. **Track Savings**: Use a spreadsheet to log costs and calculate savings
3. **Use Flash-Lite First**: Start with Flash-Lite ($0.10/M) - cheapest option
4. **Upgrade if Needed**: Switch to Flash ($0.15/M) if quality isn't sufficient
5. **Monitor Free Tier**: Gemini gives 15 requests/minute free - plenty for development!

---

**Ready to test? Start with Test 1 above! 🚀**

**Questions or Issues?** Just ask Claude - I'm here to help debug anything that comes up.
