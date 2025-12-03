# Reddit DM Template for Alpha User

Copy and paste this message to send to your alpha user:

---

Hey Raphael!

Thanks so much for the bug report and screenshot - that was super helpful! I found and fixed the issue.

## The Problem
The `zmodload: command not found` error happened because the installation script tried to run Zsh commands from within Bash, which doesn't work. This was a bug in our installer, not your system.

## The Fix
I've updated the installation script to avoid this entirely. It now uses direct path execution instead of sourcing shell configs.

## Quick Solution for You

Try this fresh install:

```bash
# Clean previous installation
npm uninstall -g coder1-bridge 2>/dev/null
rm -rf ~/.coder1

# Install with fixed script
curl -sL https://coder1.ai/install-bridge.sh | bash -s -- --auto-start
```

**What you should see**: The bridge will install and immediately prompt you for your 6-digit pairing code (get this from the "Bridge" button at https://coder1.ai/ide).

## Alternative (If Above Doesn't Work)

```bash
# Direct npm install
sudo npm install -g https://coder1.ai/bridge-cli.tar.gz
coder1-bridge start
```

## What Changed
- ✅ No more shell compatibility issues
- ✅ Works with Zsh, Bash, and any shell
- ✅ Your Node v22.19.0 is perfect (no issues there)
- ✅ Auto-start now works correctly

Let me know if you hit any other issues! Your bug report really helps make Coder1 better for everyone.

- Mike

P.S. Full technical details are in the repo if you're curious: `/bridge-cli/ALPHA_USER_ZMODLOAD_FIX.md`

---

**Alternative Short Version** (if you prefer brevity):

---

Hey! Fixed the zmodload error - it was our installer trying to run Zsh commands from Bash.

Quick fix for you:
```bash
npm uninstall -g coder1-bridge 2>/dev/null
rm -rf ~/.coder1
curl -sL https://coder1.ai/install-bridge.sh | bash -s -- --auto-start
```

Should work perfectly now! Let me know if you hit any other issues.

- Mike

---
