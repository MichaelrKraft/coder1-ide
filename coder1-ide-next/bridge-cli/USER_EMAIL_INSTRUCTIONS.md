# 📧 Email/Message to Send to Alpha User

---

Subject: **Bridge Connection Fixed! - Simple Reinstall Required 🎉**

---

Hi [User Name],

Great news! I've identified and fixed the bridge connection issue. The problem was actually **two bugs in the bridge CLI** - not anything on your end.

## What Was Wrong:

1. **Wrong Server URL**: The CLI was trying to connect to `coder1-ide.onrender.com` (which doesn't exist anymore) instead of `coder1.ai`
2. **Node v22 Compatibility**: The bridge had a dependency (p-queue) that doesn't work with Node v22.3.0

I've fixed both issues and deployed a new version.

## Quick Fix (takes 1 minute):

```bash
# Step 1: Complete cleanup
npm uninstall -g coder1-bridge
npm cache clean --force

# Step 2: Install the fixed version
npm install -g https://coder1.ai/bridge-cli.tar.gz

# Step 3: Verify it's correct (optional)
cat $(npm root -g)/coder1-bridge/src/index.js | grep "coder1.ai"

# Step 4: Start the bridge
coder1-bridge start
```

When you run `coder1-bridge start`, you should see:
```
✅ Node.js v22.3.0 detected
✅ Claude CLI detected
🔄 Connecting to Coder1 IDE...
Enter the 6-digit pairing code from the IDE:
```

Then just enter your pairing code from the IDE and you should be connected!

## What Changed:

- ✅ Fixed server URL from `coder1-ide.onrender.com` → `coder1.ai`
- ✅ Fixed Node v22 compatibility issue
- ✅ No more "Not Found is not valid JSON" errors
- ✅ No more ESM module errors

## If You Still Have Issues:

Let me know and I'll help troubleshoot! But this should definitely work now - I've tested the fix thoroughly.

Thanks for your patience while we tracked this down! 🙏

Best,
Mike

---

P.S. - The issue was that the CLI entry point (`index.js`) had hardcoded the old server URL, which overrode the correct URL in the connection logic. Previous fixes updated the connection logic but missed updating the CLI entry point. That's why reinstalling didn't help before - you were getting the same broken version. This time it's truly fixed! 🎯
