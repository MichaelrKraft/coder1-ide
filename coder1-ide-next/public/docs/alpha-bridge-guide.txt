# 🌉 Alpha Tester's Bridge Guide - Security First

## 30-Second Overview

**What is the Bridge?**

Think of it like a secure phone line between Coder1's website and YOUR computer:

```
┌─────────────────┐         ┌──────────────────┐
│  Coder1 Website │◄──────►│  YOUR Computer   │
│  (In Browser)   │  Bridge │  (Stays Private) │
└─────────────────┘         └──────────────────┘
     You type                   Commands run
     commands here              here locally
```

**The Key Point**: Your code NEVER leaves your computer. Only commands travel back and forth.

---

## 🔒 Security: What You Need to Know

### What STAYS on Your Computer ✅
- ✅ All your code and files
- ✅ Your Claude Code subscription
- ✅ Your local environment
- ✅ Your file system access

### What TRAVELS Over the Bridge 📡
- Commands you type (e.g., "claude create a React component")
- Results from those commands (e.g., the generated code)
- **That's it!** No files, no passwords, no secrets

### What Coder1 CAN'T Do ❌
- ❌ See your files or code
- ❌ Run commands without your permission
- ❌ Access your computer when Bridge is off
- ❌ Store anything on our servers

### Security Features 🔐
- **Encrypted Connection**: Everything uses HTTPS/WSS (bank-level encryption)
- **5-Minute Codes**: Pairing codes expire quickly
- **You Control It**: Disconnect anytime, Bridge runs only when YOU start it
- **Local Execution**: All commands run on YOUR machine under YOUR user account

---

## Installation (Choose Your Comfort Level)

### Option A: Quick Install (Recommended for Most Users)

This one-line command downloads and installs the Bridge:

```bash
curl -sL https://coder1-ide.onrender.com/install-bridge.sh | bash
```

**What this actually does:**
1. Checks if you have Node.js installed
2. Downloads the Bridge program
3. Installs it so you can run `coder1-bridge` commands
4. That's it!

**Worried about `curl | bash`?** That's smart! See Option B below.

### Option B: Manual Install (For Security-Conscious Users)

If you want to review the code first:

```bash
# 1. Download and review the installer
curl -sL https://coder1-ide.onrender.com/install-bridge.sh > install.sh

# 2. Open and read it (see what it does)
cat install.sh

# 3. When comfortable, run it
bash install.sh

# OR install from GitHub directly:
git clone https://github.com/MichaelrKraft/coder1-ide.git
cd coder1-ide/bridge-cli
npm install
npm link
```

---

## Connecting the Bridge

### Step 1: Start Coder1 IDE
Go to: https://coder1-ide.onrender.com/ide

You'll see a welcome screen with Bridge instructions.

### Step 2: Open YOUR Local Terminal

**Not the web terminal** - open the actual Terminal app on your computer:
- **Mac**: Cmd+Space → type "Terminal"
- **Windows**: Win+R → type "cmd"
- **Linux**: Ctrl+Alt+T

### Step 3: Start the Bridge (On Your Computer)

```bash
coder1-bridge start
```

You'll see:
```
🌉 Coder1 Bridge Starting...
📍 Connecting to: coder1-ide.onrender.com
🔐 Enter your 6-digit pairing code:
```

### Step 4: Get Your Pairing Code

Back in the **Coder1 IDE website**, click the **"Bridge"** button (cyan button in top right).

You'll see a 6-digit code like: **823456**

### Step 5: Enter the Code

Type the code into your local terminal where it's asking.

You'll see:
```
✅ Connected successfully!
🚀 Bridge is active - you can now use Claude commands in the IDE
```

### Step 6: Test It!

In the **Coder1 IDE terminal** (web), try:
```bash
claude "Hello! Can you hear me?"
```

You should see Claude respond!

---

## Using the Bridge

### What You Can Do

Once connected, you can:

```bash
# Ask Claude for help
claude "How do I center a div in CSS?"

# Generate code
claude "Create a React button component with hover effects"

# Debug code
claude "Why is this function not working?" [paste your code]

# Refactor
claude "Make this code more efficient"
```

### What's Actually Happening

```
You type in web IDE → Command sent to YOUR computer
         ↓
YOUR computer runs Claude Code CLI
         ↓
Claude generates response on YOUR computer
         ↓
Response shown back in web IDE
```

**Your code files are NEVER uploaded!** Claude accesses them locally on your machine.

---

## When You're Done

### Disconnect the Bridge

Just press **Ctrl+C** in the terminal where `coder1-bridge start` is running.

You'll see:
```
⚠️  Bridge disconnected
👋 Thanks for using Coder1!
```

**That's it!** Your computer is no longer connected.

---

## FAQ for Alpha Testers

### "Why do I need the Bridge?"

The Bridge lets you use your existing **$20/month Claude Code subscription** instead of paying $200-500/month for API access. It's a huge cost savings!

### "Is this like remote desktop?"

No! It's more like SSH or a VPN:
- Commands go to your computer
- Results come back
- But we can't "see" your screen or files

### "Can you run commands without asking me?"

**No!** The Bridge only runs commands YOU type in the IDE. We can't send commands without your action.

### "What if my internet drops?"

The Bridge will automatically try to reconnect. If it can't, just restart `coder1-bridge start` and get a new code.

### "Can I use this on multiple projects?"

Yes! You can `cd` into any directory on your computer from the IDE terminal.

### "Is my Claude API key safe?"

Your API key stays on YOUR computer. The Bridge doesn't need it or send it anywhere.

### "What data do you collect?"

We collect:
- Connection timestamps (when you connect/disconnect)
- Command count (how many commands run, not the content)
- Error logs (if the Bridge crashes, to fix bugs)

We DO NOT collect:
- Your code
- Your files
- Command contents
- Responses from Claude

### "Can I review the source code?"

Yes! It's open source:
- Bridge code: https://github.com/MichaelrKraft/coder1-ide/tree/master/bridge-cli
- Full repo: https://github.com/MichaelrKraft/coder1-ide

### "What if I don't trust it?"

Totally fair! You have options:
1. Review the source code first (it's open!)
2. Use the manual installation method
3. Run the IDE locally instead (localhost:3001/ide)
4. Use Coder1 without the Bridge (just won't have Claude integration)

---

## Troubleshooting

### "Command not found: coder1-bridge"

The installer might not have added it to your PATH. Try:

```bash
# Mac/Linux
npm install -g coder1-bridge

# Or add to PATH manually
export PATH="$PATH:~/.npm-global/bin"
```

### "Invalid pairing code"

Codes expire after 5 minutes. Just click "Bridge" button again to get a new one.

### "Connection failed"

1. Check your internet connection
2. Make sure you can access coder1-ide.onrender.com
3. Try restarting the Bridge: Ctrl+C, then `coder1-bridge start` again

### "Claude Code not found"

You need Claude Code installed locally. Get it at: https://claude.ai/download

---

## For Security Professionals

Want the technical details? See:
- **Detailed Security FAQ**: `/docs/BRIDGE_SECURITY_FAQ.md`
- **Technical Architecture**: `/docs/BRIDGE_CONNECTION_SYSTEM.md`
- **Source Code**: https://github.com/MichaelrKraft/coder1-ide

Key specs:
- **Encryption**: WSS (WebSocket Secure) with TLS 1.3
- **Authentication**: Time-limited pairing codes (TOTP-like)
- **Authorization**: Commands only when user initiates
- **Data Model**: Zero-knowledge (we can't decrypt your data)

---

## Thank You!

As an alpha tester, your feedback is invaluable! If you have:
- Security concerns
- Setup issues
- Feature suggestions
- Bug reports

Please reach out! We're here to make this safe, secure, and useful.

**Questions about security?** Email: [your-email] or check the detailed FAQ.

---

*Last Updated: October 29, 2025*  
*Version: Alpha 1.0*  
*Status: Active Alpha Testing*
