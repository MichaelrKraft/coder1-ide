# 🚀 Bridge Installation - Quick Reference

**Cross-Platform Support**: Windows, macOS, Linux

---

## 🪟 Windows (Simplest!)

### Prerequisites
- Node.js 18+ installed
- PowerShell (comes with Windows)

### Installation
```powershell
# Open PowerShell as Administrator
# (Right-click Start → Windows PowerShell (Admin))

npm install -g https://coder1.ai/bridge-cli.tar.gz
```

### Start Bridge
```powershell
coder1-bridge start
```

### Verify Installation
```powershell
coder1-bridge --version
npm list -g coder1-bridge
```

---

## 🍎 macOS

### Prerequisites
- Node.js 18+ installed
- Terminal access
- Admin/sudo password

### Installation (Pretty version)
```bash
curl -sL https://coder1.ai/install-bridge.sh -o /tmp/install.sh
sudo bash /tmp/install.sh
```

### Installation (Simple version)
```bash
sudo npm install -g https://coder1.ai/bridge-cli.tar.gz
```

### Start Bridge
```bash
coder1-bridge start
```

### Verify Installation
```bash
coder1-bridge --version
ls -la /usr/local/bin/coder1-bridge
```

---

## 🐧 Linux

### Prerequisites
- Node.js 18+ installed
- Terminal access
- sudo access

### Installation (Pretty version)
```bash
curl -sL https://coder1.ai/install-bridge.sh -o /tmp/install.sh
sudo bash /tmp/install.sh
```

### Installation (Simple version)
```bash
sudo npm install -g https://coder1.ai/bridge-cli.tar.gz
```

### Start Bridge
```bash
coder1-bridge start
```

### Verify Installation
```bash
coder1-bridge --version
which coder1-bridge
```

---

## 🔧 Common Commands (All Platforms)

### Check Version
```bash
coder1-bridge --version
```

### Start Bridge (Production)
```bash
coder1-bridge start
```

### Start Bridge (Local Development)
```bash
coder1-bridge start --dev
```

### Check Status
```bash
coder1-bridge status
```

### Test Claude CLI
```bash
coder1-bridge test
```

---

## 🆘 Troubleshooting

### Windows
```powershell
# Uninstall
npm uninstall -g coder1-bridge

# Reinstall
npm install -g https://coder1.ai/bridge-cli.tar.gz

# Check npm global location
npm config get prefix
```

### macOS/Linux
```bash
# Uninstall
sudo npm uninstall -g coder1-bridge
sudo rm -f /usr/local/bin/coder1-bridge

# Reinstall
sudo npm install -g https://coder1.ai/bridge-cli.tar.gz

# Check PATH
echo $PATH
```

---

## ❓ FAQ

**Q: Do I need Claude CLI installed?**  
A: Yes! The bridge requires Claude CLI to execute commands. Get it from https://claude.ai/download

**Q: Why do I need admin/sudo access?**  
A: To install the bridge globally so it's available from any directory.

**Q: Can I use this on multiple computers?**  
A: Yes! Install the bridge on each computer and connect with a new pairing code.

**Q: Does the bridge work with VPNs/firewalls?**  
A: Usually yes, but some corporate firewalls may block WebSocket connections.

**Q: Can I update the bridge?**  
A: Yes, just run the install command again to get the latest version.

---

## 📊 Quick Comparison

| Feature | Windows | macOS | Linux |
|---------|---------|-------|-------|
| Installation | `npm install -g URL` | Bash script or npm | Bash script or npm |
| Requires sudo | ❌ No | ✅ Yes | ✅ Yes |
| Setup time | 10 seconds | 15 seconds | 15 seconds |
| Commands | Same | Same | Same |

---

## 🎯 Next Steps

After installing:
1. Visit https://coder1.ai/ide
2. Click "Bridge" button to get pairing code
3. Run `coder1-bridge start`
4. Enter 6-digit code when prompted
5. Start coding with Claude!

---

**Need Help?** Visit https://coder1.ai/docs or open an issue at https://github.com/MichaelrKraft/coder1-ide/issues
