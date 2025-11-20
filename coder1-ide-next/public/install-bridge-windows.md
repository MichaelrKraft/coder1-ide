# 🪟 Coder1 Bridge - Windows Installation Guide

Connect your local Claude CLI to Coder1 IDE from Windows.

---

## ✅ **Prerequisites**

Before installing the bridge, ensure you have:

- ✅ **Node.js 18+** - [Download from nodejs.org](https://nodejs.org)
- ✅ **npm** - Comes with Node.js
- ✅ **Claude CLI** - [Download from claude.ai/download](https://claude.ai/download)

---

## 🎯 **Recommended: WSL2 Installation (Best Experience)**

Windows Subsystem for Linux 2 (WSL2) provides the best compatibility with the Coder1 Bridge.

### **Step 1: Install WSL2**

Open PowerShell as Administrator and run:

```powershell
wsl --install
```

Restart your computer when prompted.

### **Step 2: Install Ubuntu from Microsoft Store**

1. Open Microsoft Store
2. Search for "Ubuntu"
3. Click "Install"
4. Launch Ubuntu and create a username/password

### **Step 3: Install Node.js in WSL2**

In your Ubuntu terminal:

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v18.x or higher
npm --version
```

### **Step 4: Install Coder1 Bridge**

```bash
# Method 1: Using install script (recommended)
curl -sL https://coder1.ai/install-bridge.sh | bash

# Method 2: Direct npm install
sudo npm install -g https://coder1.ai/bridge-cli.tar.gz
```

### **Step 5: Start the Bridge**

```bash
coder1-bridge start
```

Enter your 6-digit pairing code from [coder1.ai/ide](https://coder1.ai/ide) and you're connected!

---

## 🔧 **Alternative: Native Windows Installation**

If you prefer not to use WSL2, you can install natively on Windows:

### **Step 1: Open PowerShell**

Press `Win + X` and select "Windows PowerShell" or "Windows Terminal"

### **Step 2: Install Coder1 Bridge**

```powershell
# Install globally via npm
npm install -g https://coder1.ai/bridge-cli.tar.gz
```

### **Step 3: Start the Bridge**

```powershell
coder1-bridge start
```

### **Known Issues with Native Windows:**

- ⚠️ Path separators may cause issues (Windows uses `\`, Unix uses `/`)
- ⚠️ PTY (pseudo-terminal) support is limited
- ⚠️ Some Claude CLI features may not work correctly
- ⚠️ File watching and live updates may be slower

**Recommendation:** Use WSL2 for the best experience.

---

## 🚨 **Troubleshooting**

### **"command not found: coder1-bridge"**

**Solution 1:** Reload your shell configuration:
```bash
# WSL2/Ubuntu
source ~/.bashrc

# PowerShell
refreshenv
```

**Solution 2:** Verify npm global install location:
```bash
npm config get prefix
```

Make sure this directory is in your PATH.

### **"Cannot find package 'node-fetch'"**

This means the tarball was incomplete. Try:

```bash
# Download and manually install dependencies
curl -sL https://coder1.ai/bridge-cli.tar.gz -o bridge.tar.gz
mkdir bridge-temp && cd bridge-temp
tar -xzf ../bridge.tar.gz
cd package
npm install --production
npm install -g .
```

### **"Node.js version too old"**

Update Node.js to version 18 or higher:

**WSL2:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Windows:**
Download and install from [nodejs.org](https://nodejs.org)

### **"Claude CLI not found"**

1. Install Claude CLI from [claude.ai/download](https://claude.ai/download)
2. Restart your terminal
3. Verify: `claude --version`

---

## 🎮 **Testing Your Installation**

### **Test Bridge Status**
```bash
coder1-bridge status
```
Should show: ✅ Bridge service is online

### **Test Claude CLI**
```bash
coder1-bridge test
```
Should show: ✅ Claude CLI is installed and working

### **Test Connection**
```bash
coder1-bridge start --verbose
```
Shows detailed logs for debugging connection issues

---

## 💡 **Tips for Windows Users**

### **Use Windows Terminal**
- Modern, fast terminal with tabs
- Better color support than Command Prompt
- Download from Microsoft Store

### **File Paths**
When working with files in the bridge:
- ✅ Use forward slashes: `/c/Users/YourName/project`
- ❌ Avoid backslashes: `C:\Users\YourName\project`

### **Environment Variables**
Set custom server URL:
```powershell
$env:CODER1_SERVER="https://coder1.ai"
coder1-bridge start
```

---

## 🔐 **Security Notes**

- The bridge runs locally on your machine
- All communication uses encrypted WebSocket (WSS)
- Pairing codes expire after 5 minutes
- No data is stored on Coder1 servers
- Claude CLI has access to your local files (same as running Claude locally)

---

## 📚 **Additional Resources**

- **GitHub Issues**: [Report problems](https://github.com/MichaelrKraft/coder1-ide/issues)
- **Documentation**: [Full bridge docs](https://github.com/MichaelrKraft/coder1-ide/tree/main/coder1-ide-next/bridge-cli)
- **Community**: [Discord support](https://discord.gg/coder1)

---

## 🆘 **Still Having Issues?**

If you're stuck, please:

1. Check Node.js version: `node --version` (must be 18+)
2. Check npm version: `npm --version`
3. Check Claude CLI: `claude --version`
4. Run verbose mode: `coder1-bridge start --verbose`
5. Report issue with logs: [GitHub Issues](https://github.com/MichaelrKraft/coder1-ide/issues)

---

**Happy coding with Coder1 on Windows! 🪟✨**
