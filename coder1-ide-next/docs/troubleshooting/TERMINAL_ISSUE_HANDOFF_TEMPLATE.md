# Terminal Issue - Agent Handoff Template

**Date**: [YYYY-MM-DD]  
**From Agent**: [Your identifier]  
**To Agent**: [Next agent or "Future Agents"]  
**Issue Status**: [UNRESOLVED | PARTIALLY RESOLVED | NEEDS INVESTIGATION]  

---

## 🎯 **Issue Summary**

**Primary Problem**: [One sentence description]  
**User Impact**: [Critical/High/Medium/Low]  
**Affects**: [Main Terminal | Beta Terminal | Both | Server]  
**Reproducible**: [Always | Sometimes | Once | Unknown]  

---

## 📋 **Symptoms Checklist**

Check all that apply:

### **Scrolling Issues**
- [ ] Cannot scroll down during Claude Code sessions
- [ ] Cannot access prompt input box
- [ ] Scroll gets "stuck" at current position
- [ ] Scrolling works but jumps/flickers
- [ ] Auto-scroll conflicts with manual scroll

### **Visual Issues**
- [ ] Black padding/boxes appearing
- [ ] Terminal height incorrect
- [ ] Prompt box flickering
- [ ] Visual artifacts during scroll
- [ ] Layout broken after scroll

### **Connection Issues**
- [ ] WebSocket disconnections
- [ ] Terminal commands delayed
- [ ] Server not responding
- [ ] Port conflicts
- [ ] PTY session errors

### **Performance Issues**
- [ ] High memory usage
- [ ] Server slow/unresponsive
- [ ] Browser freezing
- [ ] Memory warnings in logs
- [ ] Garbage collection issues

---

## 🔍 **Diagnostic Results**

### **Step 1: Quick Fix Attempted**
- [ ] ✅ Server restart attempted (`NODE_OPTIONS="--max-old-space-size=4096" npm run dev`)
- [ ] ✅ Result: [FIXED | NO CHANGE | PARTIALLY IMPROVED]
- [ ] ✅ Time spent: [X minutes]

### **Step 2: Environment Check**
- **Main Terminal URL**: `http://localhost:3001/ide`
- **Beta Terminal URL**: `http://localhost:3001/ide-beta`  
- **Server Status**: [Running | Stopped | Error]
- **Port 3001 Status**: [Free | Occupied | Conflict]

### **Step 3: Behavior Comparison**
| Test | Main Terminal | Beta Terminal | Expected |
|------|---------------|---------------|----------|
| Can open terminal | ✅/❌ | ✅/❌ | ✅ |
| Can type commands | ✅/❌ | ✅/❌ | ✅ |
| Can activate Claude (`claude`) | ✅/❌ | ✅/❌ | ✅ |
| Can scroll during Claude session | ✅/❌ | ✅/❌ | ✅ |
| Can access prompt box | ✅/❌ | ✅/❌ | ✅ |

---

## 🛠️ **Attempted Solutions**

List everything tried (most recent first):

### **Solution 1**: [Name/Description]
- **Method**: [What you did]
- **Files Modified**: [List files or "None"]
- **Result**: [Success/Failure/Partial]
- **Time Spent**: [X hours/minutes]
- **Side Effects**: [Any issues caused]
- **Reverted**: [Yes/No]

### **Solution 2**: [Name/Description]
- **Method**: [What you did]
- **Files Modified**: [List files or "None"]  
- **Result**: [Success/Failure/Partial]
- **Time Spent**: [X hours/minutes]
- **Side Effects**: [Any issues caused]
- **Reverted**: [Yes/No]

[Add more solutions as needed]

---

## 📊 **Current State**

### **What's Working**
- [List functional aspects]
- [What users can still do]

### **What's Broken**
- [List non-functional aspects]
- [What users cannot do]

### **Workarounds Available**
- [Temporary solutions users can use]
- [Alternative workflows]

---

## 🔬 **Investigation Notes**

### **Root Cause Hypothesis**
[Your best guess at what's causing the issue]

### **Evidence Supporting**
- [Data/logs/behavior that supports your hypothesis]

### **Evidence Against**
- [Data/logs/behavior that contradicts your hypothesis]

### **Code Areas of Interest**
- **Primary Suspects**: [Files/functions that might be causing issue]
- **Secondary Areas**: [Related code to investigate]
- **Ruled Out**: [Areas confirmed not related to issue]

---

## 📁 **Technical Details**

### **Environment Info**
- **Node Version**: [Get with `node --version`]
- **NPM Version**: [Get with `npm --version`]
- **OS**: [macOS/Linux/Windows + version]
- **Browser**: [Chrome/Firefox/Safari + version]
- **Memory Allocation**: [Current NODE_OPTIONS setting]

### **Error Messages**
```
[Paste any error messages from terminal, browser console, or server logs]
```

### **Server Logs** (Last 20 lines)
```
[Paste recent server log output]
```

### **Browser Console Errors**
```
[Paste any browser console errors]
```

---

## 🎯 **Recommended Next Steps**

### **Immediate Actions** (Next agent should try first)
1. [Step 1 with expected time]
2. [Step 2 with expected time]
3. [Step 3 with expected time]

### **Investigation Priorities** (If immediate actions don't work)
1. [Investigation area 1]
2. [Investigation area 2]
3. [Investigation area 3]

### **Code Areas to Examine**
1. [File/function 1 - reason why]
2. [File/function 2 - reason why]
3. [File/function 3 - reason why]

---

## ⚠️ **Important Notes**

### **Don't Waste Time On**
- [Things you've confirmed don't work]
- [Dead-end investigation paths]

### **Critical Dependencies**
- [Systems that must stay working]
- [Files that shouldn't be modified]

### **User Communication**
- [What you've told the user]
- [Expectations set]
- [Timeline promised]

---

## 📚 **Reference Materials**

- **Complete Guide**: `/docs/troubleshooting/TERMINAL_SCROLLING_ISSUE_COMPLETE_GUIDE.md`
- **Quick Fix**: `/docs/troubleshooting/TERMINAL_QUICK_FIX.md`
- **Related Issues**: [Link to any related problems]
- **External Resources**: [Relevant Stack Overflow, docs, etc.]

---

## ✅ **Handoff Checklist**

Before handing off, confirm:

- [ ] All attempted solutions documented above
- [ ] Current state clearly described  
- [ ] Working/broken functionality identified
- [ ] Next steps prioritized
- [ ] User expectations managed
- [ ] No broken code left in codebase
- [ ] All test cases documented

---

**💡 Quick Tip for Next Agent**: Try the server restart quick fix first before diving into code investigation!

---

*Template Version: 1.0 | Created: October 2025 | Based on real terminal scrolling issue resolution*