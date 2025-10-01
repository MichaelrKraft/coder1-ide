# Troubleshooting Documentation

This directory contains comprehensive troubleshooting guides for common Coder1 IDE issues.

## 📋 **Available Guides**

### 🚨 **Terminal Issues**

#### **[Terminal Scrolling Issue - Complete Guide](./TERMINAL_SCROLLING_ISSUE_COMPLETE_GUIDE.md)**
**Status**: ✅ RESOLVED  
**For**: Comprehensive understanding and historical context  
**Time to Read**: 15-20 minutes  

Complete documentation of the terminal scrolling issue that affected multiple agents for 1+ month. Includes root cause analysis, historical timeline of failed attempts, proven solution, and prevention strategies.

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

### **If Terminal is Broken RIGHT NOW**
1. Go to → **[Terminal Quick Fix](./TERMINAL_QUICK_FIX.md)**
2. Follow 3-step process (takes 2-3 minutes)
3. If that doesn't work, see complete guide

### **If You're Investigating Terminal Issues**
1. Start with → **[Complete Guide](./TERMINAL_SCROLLING_ISSUE_COMPLETE_GUIDE.md)**
2. Use → **[Diagnostic Procedure](./TERMINAL_SCROLLING_ISSUE_COMPLETE_GUIDE.md#-diagnostic-procedure)**
3. Document with → **[Handoff Template](./TERMINAL_ISSUE_HANDOFF_TEMPLATE.md)**

### **If You're a New Agent**
1. Read → **[Complete Guide - Future Agent Guidelines](./TERMINAL_SCROLLING_ISSUE_COMPLETE_GUIDE.md#-future-agent-guidelines)**
2. Bookmark → **[Quick Fix](./TERMINAL_QUICK_FIX.md)** for emergencies
3. Use → **[Handoff Template](./TERMINAL_ISSUE_HANDOFF_TEMPLATE.md)** for reporting

---

## 📊 **Issue Status Dashboard**

| Issue | Status | Last Updated | Success Rate |
|-------|--------|--------------|-------------|
| Terminal Scrolling | ✅ RESOLVED | Oct 1, 2025 | 90%+ with restart |
| Terminal Flickering | ✅ RESOLVED | Oct 1, 2025 | Fixed in beta |
| Memory Issues | ✅ RESOLVED | Oct 1, 2025 | NODE_OPTIONS fix |

---

## 🔧 **Common Solutions**

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