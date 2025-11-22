# 🔧 Alpha User Troubleshooting: Bridge Installation

**Issue**: Installation completed but `coder1-bridge` command not found

**Root Cause**: Installation succeeded, but PATH changes require shell reload or global installation for immediate use.

---

## ✅ **Solution Options (Choose ONE)**

### 🏆 **Option 1: Global Install (RECOMMENDED)**

This installs the bridge globally so it's immediately available:

```bash
sudo npm install -g https://coder1.ai/bridge-cli.tar.gz
```

**Then start the bridge**:
```bash
coder1-bridge start
```

**Why this works**: Installs to `/usr/local/bin` which is always in your PATH.

**Time**: 10 seconds  
**Confidence**: 95%

---

### ⚡ **Option 2: Activate Current Installation**

If you prefer not to use sudo, activate the local installation:

```bash
source ~/.zshrc
```

**Then start the bridge**:
```bash
coder1-bridge start
```

**Why this works**: Reloads your shell configuration to pick up the PATH changes.

**Alternative**: Close and reopen your terminal, then try `coder1-bridge start`

**Time**: 5 seconds  
**Confidence**: 85%

---

### 🎨 **Option 3: Use Pretty Installer**

Use our bash installer script (includes nice formatting):

```bash
curl -sL https://coder1.ai/install-bridge.sh -o /tmp/install.sh
sudo bash /tmp/install.sh
```

**Then start the bridge**:
```bash
coder1-bridge start
```

**Why this works**: Handles installation with better error messages and verification.

**Time**: 15 seconds  
**Confidence**: 95%

---

## 🎯 **What You Should See**

After running any solution above, `coder1-bridge start` should show:

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   ██████╗ ██████╗ ██████╗ ███████╗██████╗  ██╗         ║
║  ██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔══██╗███║         ║
║  ██║     ██║   ██║██║  ██║█████╗  ██████╔╝╚██║         ║
║  ██║     ██║   ██║██║  ██║██╔══╝  ██╔══██╗ ██║         ║
║  ╚██████╗╚██████╔╝██████╔╝███████╗██║  ██║ ██║         ║
║   ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═╝         ║
║                                                          ║
║             🌉 Bridge CLI - v1.0.0                       ║
║          Connect your local Claude to Coder1            ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

Enter your 6-digit pairing code:
```

---

## 🔍 **Still Having Issues?**

If none of the above work, run these diagnostic commands and send me the output:

```bash
# Check if bridge was installed
npm list -g coder1-bridge

# Check what PATH was added
cat ~/.zshrc | grep -i coder1

# Check npm configuration
npm config get prefix

# Search for the binary
find ~ -name "coder1-bridge" 2>/dev/null

# Check your current PATH
echo $PATH
```

---

## 📞 **Support**

Send diagnostics and any error messages to: [your support email]

Include:
- Screenshot of error
- Output of diagnostic commands above
- Your operating system version

---

**Last Updated**: January 2025  
**Platform**: macOS (zsh shell)
