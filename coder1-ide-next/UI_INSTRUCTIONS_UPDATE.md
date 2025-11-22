# ✅ UI Setup Instructions - Updated

**Date:** November 20, 2025  
**Component:** `SetupInstructionsModal.tsx`  
**Status:** ✅ Updated

---

## 📋 **Changes Made**

### **1. Updated Download Size**
- **Before:** "13KB download"
- **After:** "164KB download" 
- **Why:** New tarball includes dependencies (node-fetch, socket.io-client, etc.)

### **2. Enhanced Windows Instructions**
- Added link to Windows installation guide
- Recommends WSL2 for Windows users
- Points to: `https://coder1.ai/install-bridge-windows.md`

---

## ✅ **What's Already Correct**

The modal already shows the **correct** installation command:

```bash
curl -sL https://coder1.ai/install-bridge.sh | bash
```

This single command:
1. ✅ Downloads the install script
2. ✅ Executes it automatically
3. ✅ Install script handles all steps internally:
   - Downloads tarball
   - Extracts files
   - **Installs dependencies** (includes node-fetch verification)
   - Installs globally or to user directory
   - Adds to PATH if needed

**Users don't need to run multiple commands** - the install script does everything!

---

## 🔄 **What Happens Behind the Scenes**

When a user runs: `curl -sL https://coder1.ai/install-bridge.sh | bash`

The install script automatically:
1. Downloads `bridge-cli.tar.gz`
2. Extracts to temp directory
3. Runs `npm install --production`
4. **Verifies node-fetch is present** (NEW - we added this)
5. Installs globally with `npm install -g .`
6. Verifies `coder1-bridge` command is available

---

## 🎯 **User Experience**

### **Mac Users:**
```bash
# Open Terminal (Cmd+Space → "Terminal")
curl -sL https://coder1.ai/install-bridge.sh | bash
coder1-bridge start
# Enter 6-digit pairing code
```

### **Windows Users:**
```powershell
# Recommended: Use WSL2
# See: https://coder1.ai/install-bridge-windows.md

# Or PowerShell:
curl -sL https://coder1.ai/install-bridge.sh | bash
coder1-bridge start
```

### **Linux Users:**
```bash
# Same as Mac
curl -sL https://coder1.ai/install-bridge.sh | bash
coder1-bridge start
```

---

## 📊 **Summary**

| Item | Status |
|------|--------|
| UI shows correct command | ✅ Already correct |
| Download size updated | ✅ Fixed (13KB → 164KB) |
| Windows guidance added | ✅ Added link to guide |
| Install script has verification | ✅ Added node-fetch check |
| Tarball includes dependencies | ✅ Rebuilt correctly |

---

## 🚀 **No Action Required from Users**

The setup modal already displays the correct single-command installation. Users just:

1. Click "Get Pairing Code" button
2. Copy the one-line install command
3. Paste into their terminal
4. Wait ~30 seconds
5. Enter the pairing code
6. Done! ✅

The install script handles all the complexity internally, including the node-fetch dependency issue that was causing problems.

---

**Status:** ✅ UI instructions are correct and updated!
