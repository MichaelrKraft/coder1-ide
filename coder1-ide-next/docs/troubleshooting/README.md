# Troubleshooting Documentation

This directory contains comprehensive troubleshooting guides for common Coder1 IDE issues.

## 📋 **Available Guides**

### 🚨 **Terminal Issues**

#### **[Terminal Scrolling Issue - Complete Guide](./TERMINAL_SCROLLING_ISSUE_COMPLETE_GUIDE.md)**
**Status**: ✅ RESOLVED  
**For**: Comprehensive understanding and historical context  
**Time to Read**: 15-20 minutes  

Complete documentation of the terminal scrolling issue that affected multiple agents for 1+ month. Includes root cause analysis, historical timeline of failed attempts, proven solution, and prevention strategies.

### 🔄 **Checkpoint Issues**

#### **[Checkpoint Content Bleeding - Quick Fix](./CHECKPOINT_CONTENT_BLEEDING_QUICK_FIX.md)**
**Status**: 🔥 EMERGENCY REFERENCE  
**For**: Immediate problem resolution  
**Time to Read**: 2 minutes  

Emergency fix for when checkpoint content appears in main terminal after closing sandbox tab. 100% success rate with event listener filtering.

#### **[Checkpoint Content Bleeding - Complete Guide](./CHECKPOINT_CONTENT_BLEEDING_COMPLETE_GUIDE.md)**
**Status**: ✅ RESOLVED  
**For**: Comprehensive understanding and root cause analysis  
**Time to Read**: 10-15 minutes  

Complete technical documentation of the checkpoint terminal isolation bug. Includes dual root cause analysis (global event listeners + localStorage), 4 failed attempts, and successful two-part solution.

#### **[Checkpoint Content Bleeding - Session Summary](./CHECKPOINT_CONTENT_BLEEDING_SESSION_SUMMARY.md)**
**Status**: 📖 LEARNING RESOURCE  
**For**: Understanding debugging methodology  
**Time to Read**: 15-20 minutes  

Chronological debugging session narrative showing the evolution from localStorage hypothesis to event listener discovery. Valuable for agent training and debugging methodology.

#### **[Terminal Quick Fix](./TERMINAL_QUICK_FIX.md)**
**Status**: 🔥 EMERGENCY REFERENCE  
**For**: Immediate problem resolution  
**Time to Read**: 2 minutes  

One-page emergency fix guide for when terminal scrolling breaks. 90%+ success rate with simple server restart.

#### **[Terminal Issue Handoff Template](./TERMINAL_ISSUE_HANDOFF_TEMPLATE.md)**
**Status**: 📝 TEMPLATE  
**For**: Standardized issue reporting between agents  
**Time to Use**: 10-15 minutes to complete  

Structured template for documenting terminal issues when handing off between AI agents. Ensures all critical information is captured.

---

## 🚀 **Quick Start**

### **If Checkpoint Content Appears in Main Terminal**
1. Go to → **[Checkpoint Content Bleeding Quick Fix](./CHECKPOINT_CONTENT_BLEEDING_QUICK_FIX.md)**
2. Add `!sandboxMode` check to event handlers (2 minutes)
3. Restart server and test

### **If Terminal is Broken RIGHT NOW**
1. Go to → **[Terminal Quick Fix](./TERMINAL_QUICK_FIX.md)**
2. Follow 3-step process (takes 2-3 minutes)
3. If that doesn't work, see complete guide

### **If You're Investigating Checkpoint Issues**
1. Start with → **[Quick Fix](./CHECKPOINT_CONTENT_BLEEDING_QUICK_FIX.md)**
2. Read → **[Complete Guide](./CHECKPOINT_CONTENT_BLEEDING_COMPLETE_GUIDE.md)** for root cause
3. Learn from → **[Session Summary](./CHECKPOINT_CONTENT_BLEEDING_SESSION_SUMMARY.md)**

### **If You're Investigating Terminal Issues**
1. Start with → **[Complete Guide](./TERMINAL_SCROLLING_ISSUE_COMPLETE_GUIDE.md)**
2. Use → **[Diagnostic Procedure](./TERMINAL_SCROLLING_ISSUE_COMPLETE_GUIDE.md#-diagnostic-procedure)**
3. Document with → **[Handoff Template](./TERMINAL_ISSUE_HANDOFF_TEMPLATE.md)**

### **If You're a New Agent**
1. Read → **[Checkpoint Session Summary](./CHECKPOINT_CONTENT_BLEEDING_SESSION_SUMMARY.md)** (learn debugging methodology)
2. Read → **[Terminal Complete Guide - Future Agent Guidelines](./TERMINAL_SCROLLING_ISSUE_COMPLETE_GUIDE.md#-future-agent-guidelines)**
3. Bookmark → **[Quick Fixes](./CHECKPOINT_CONTENT_BLEEDING_QUICK_FIX.md)** for emergencies
4. Use → **[Handoff Template](./TERMINAL_ISSUE_HANDOFF_TEMPLATE.md)** for reporting

---

## 📊 **Issue Status Dashboard**

| Issue | Status | Last Updated | Success Rate |
|-------|--------|--------------|-------------|
| Checkpoint Content Bleeding | ✅ RESOLVED | Oct 3, 2025 | 100% with event filtering |
| Terminal Scrolling | ✅ RESOLVED | Oct 1, 2025 | 90%+ with restart |
| Terminal Flickering | ✅ RESOLVED | Oct 1, 2025 | Fixed in beta |
| Memory Issues | ✅ RESOLVED | Oct 1, 2025 | NODE_OPTIONS fix |

---

## 🔧 **Common Solutions**

### **Checkpoint Content Bleeding**
```typescript
// Add to Terminal.tsx event handlers (100% fix rate)
if (!sandboxMode) {
  console.log('🚫 Main terminal: Ignoring checkpoint event');
  return;
}
```

### **Terminal Issues** 
```bash
# 90% fix rate
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

### **Connection Issues**
```bash
# Clear all processes
lsof -ti :3001 | xargs kill -9
```

### **Testing Environment**
```bash
# Beta terminal for safe testing
http://localhost:3001/ide-beta
```

---

## 📚 **Related Documentation**

- **[Main CLAUDE.md](../../CLAUDE.md)** - Complete IDE documentation
- **[Terminal Complete Guide](../guides/terminal-complete-guide.md)** - Technical terminal documentation
- **[Architecture Docs](../architecture/)** - System design and structure

---

## 🤝 **Contributing**

When you encounter and resolve a new issue:

1. **Document Immediately**: Don't wait, memory fades quickly
2. **Use Templates**: Follow the handoff template format for consistency
3. **Update This Index**: Add your new guide to the list above
4. **Test Your Solution**: Verify it works before documenting
5. **Think Future Agents**: Write for someone who has never seen this issue

---

## 📞 **Emergency Contacts**

If troubleshooting guides don't resolve critical issues:

- **Check Server Status**: Look for server logs and error messages
- **Verify Environment**: Ensure Node.js and dependencies are correct
- **Use Beta Environment**: `http://localhost:3001/ide-beta` as fallback
- **Document Everything**: Use handoff template to capture details

---

**💡 Remember**: Most issues are simpler than they appear. Try the basic fixes first!

*Last Updated: October 1, 2025 | Documentation Version: 1.0*