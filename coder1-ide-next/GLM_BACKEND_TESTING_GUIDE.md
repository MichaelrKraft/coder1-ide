# 🧪 GLM Backend Testing Guide

**Status**: ✅ Implementation Complete - Ready for Testing  
**Date**: October 7, 2025

---

## 🎯 Quick Test (5 Minutes)

### Step 1: Verify Configuration ✅
```bash
# Already done - confirmed:
cat .env.local | grep -E "USE_GLM_BACKEND|ZAI_"
# ✅ USE_GLM_BACKEND=true
# ✅ ZAI_API_KEY=f8156197f7fb447e941922c6348327a9.p8fq891uoHbPTocD
# ✅ ZAI_BASE_URL=https://api.z.ai/api/anthropic
```

### Step 2: Open IDE and Create NEW Terminal Session
```
1. Open browser: http://localhost:3001/ide
2. In the IDE, create a NEW terminal tab/session
   (The old terminal was created before GLM backend was enabled)
3. Look for this message in server logs:
   🚀 [Terminal] GLM Backend enabled for session XYZ via Z.AI (90% tool use success rate)
```

### Step 3: Test Claude CLI with GLM Backend
```bash
# In the NEW terminal, run:
claude hello, please introduce yourself

# Expected: GLM 4.6 responds (not Anthropic Claude)
# Response should mention it's using GLM or Z.AI
```

### Step 4: Test Tool Use (File Access)
```bash
# Critical test - does GLM backend support tool use?
claude please read the file README.md and tell me what this project is about

# Expected: GLM successfully reads and summarizes README.md
# If you see "I don't have access to files" - tool use is broken
```

### Step 5: Test Command Execution
```bash
# Test if GLM can execute commands via Claude CLI
claude please run 'ls -la' and tell me what files are in this directory

# Expected: GLM executes command and provides commentary
```

---

## 📊 What You Should See

### Server Logs (IMPORTANT)
When you create a NEW terminal in the IDE, check the server console for:
```
🚀 [Terminal] GLM Backend enabled for session session_xyz_123 via Z.AI (90% tool use success rate)
🎯 PTY SPAWN TEST: ✅ SUCCESS for session session_xyz_123
[Terminal] PTY session session_xyz_123 created successfully with PID: 12345
```

If you DON'T see the "GLM Backend enabled" message:
- The terminal session is OLD (created before USE_GLM_BACKEND=true)
- You need to create a NEW terminal session

### Terminal Output
```bash
# Test 1: Basic response
$ claude hello
[GLM 4.6 introduces itself - may mention Z.AI or GLM]

# Test 2: File reading (CRITICAL)
$ claude read README.md
[GLM summarizes the README - proves tool use works]

# Test 3: Command execution
$ claude run ls
[GLM shows directory contents - proves command execution works]
```

---

## 🔍 Troubleshooting

### Issue: "Nothing happens after typing claude"

**Cause**: Terminal session was created BEFORE GLM backend was enabled

**Solution**:
1. Close/delete the old terminal session
2. Create a NEW terminal session in the IDE
3. Check server logs for "GLM Backend enabled" message
4. Try `claude` command in NEW terminal

### Issue: "Authentication failed" from Z.AI

**Cause**: API key format issue (unlikely - we tested this successfully)

**Solution**:
```bash
# Test API key directly
node test-glm-backend.js

# Should show: ✅ API KEY WORKS! GLM backend is ready to use.
```

### Issue: "I don't have access to files"

**Cause**: Tool use not working with GLM backend

**Solution**: This would indicate Z.AI Anthropic compatibility issue
1. Check if environment variables are actually set in terminal:
```bash
echo $ANTHROPIC_BASE_URL  # Should show: https://api.z.ai/api/anthropic
echo $ANTHROPIC_AUTH_TOKEN  # Should show: your API key (first 20 chars)
```
2. If variables are NOT set, terminal wasn't spawned with GLM backend config

---

## ✅ Success Criteria

After completing these tests, you should have:

- [x] New terminal session created with GLM backend enabled
- [x] Server logs showing "GLM Backend enabled" message  
- [x] Claude CLI responds to commands (using GLM, not Anthropic)
- [x] File access tool use works (claude can read files)
- [x] Command execution tool use works (claude can run commands)

---

## 💡 Key Insights

### Why Create a NEW Terminal?
The terminal session stores environment variables when it's created. The old terminal was created before `USE_GLM_BACKEND=true` was set in `.env.local`, so it doesn't have the Z.AI configuration.

Creating a NEW terminal session after enabling the backend ensures it gets the correct environment variables:
```javascript
// These are only set when terminal is created:
ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
ANTHROPIC_AUTH_TOKEN=your-zai-api-key
ANTHROPIC_DEFAULT_SONNET_MODEL=glm-4.6
```

### How to Verify It's Working
The **definitive proof** is the server log message:
```
🚀 [Terminal] GLM Backend enabled for session XYZ via Z.AI (90% tool use success rate)
```

If you see this message when creating a terminal, the backend is configured correctly.

---

## 📞 Next Steps After Testing

Once you confirm tool use works:
1. Update `ZAI_GLM_BACKEND_IMPLEMENTATION.md` with test results
2. Mark testing checkboxes as complete
3. Document any issues or limitations discovered
4. Consider creating a video demo of the working system

---

**Remember**: The key is creating a **NEW** terminal session after enabling the backend. Old sessions won't have the GLM configuration.
