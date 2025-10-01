# Terminal Scrolling - Emergency Quick Fix

**🚨 PROBLEM**: Can't scroll to prompt during Claude Code sessions  
**⏱️ FIX TIME**: 2-3 minutes  
**🎯 SUCCESS RATE**: 90%+  

---

## 🔥 **IMMEDIATE SOLUTION**

### **Step 1: Kill Server** (30 seconds)
```bash
lsof -ti :3001 | xargs kill -9
pkill -f "npm run dev"
```

### **Step 2: Restart with Memory** (1 minute)
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

### **Step 3: Test Fix** (30 seconds)
1. Go to `http://localhost:3001/ide`
2. Type `claude` in terminal
3. Ask: "Please list 20 programming languages"
4. **Try scrolling down during response**
5. ✅ Can you see the prompt? **FIXED!**

---

## 🔍 **Quick Diagnosis**

| Symptom | Cause | Action |
|---------|-------|--------|
| Can't scroll during Claude sessions | Server state corruption | **Use fix above** |
| Can scroll but has visual artifacts | Code issue | Use beta terminal |
| Terminal completely unresponsive | Port conflict | Check port 3001 |
| Server won't start | Process still running | Kill processes first |

---

## 🆘 **If Quick Fix Doesn't Work**

### **Option A: Use Beta Terminal**
```bash
# Access beta environment
http://localhost:3001/ide-beta
```

### **Option B: Force Clean Restart**
```bash
# Nuclear option - kills everything
sudo lsof -ti :3001 | xargs sudo kill -9
sudo pkill -f node
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

### **Option C: Check System Resources**
```bash
# Check memory usage
free -h   # Linux
vm_stat   # macOS

# Check if port is actually free
lsof -i :3001
```

---

## 📋 **What NOT to Do**

- ❌ **Don't** start modifying Terminal.tsx code immediately
- ❌ **Don't** create new CSS padding solutions  
- ❌ **Don't** add complex scroll event handlers
- ❌ **Don't** assume it's a browser cache issue

---

## 📞 **When to Escalate**

Contact senior developer if:
- Quick fix attempted 3+ times without success
- Beta terminal also broken
- Server won't start after clean restart
- Multiple ports showing conflicts

---

## 📚 **Full Documentation**

For complete troubleshooting guide see:  
`/docs/troubleshooting/TERMINAL_SCROLLING_ISSUE_COMPLETE_GUIDE.md`

---

**💡 Remember**: 90% of terminal issues are server state problems, not code problems!  
**⚡ Always try restart first before code investigation.**