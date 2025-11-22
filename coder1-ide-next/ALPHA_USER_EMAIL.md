# Email to Alpha User - Bridge Installation Fix

---

**Subject:** Bridge Installation Issue - Fixed + Workaround

---

Hi [Name],

Thanks for reporting the `node-fetch` installation issue! I've identified and fixed the root cause. Here's how to get up and running:

## Quick Fix (Choose One Option)

### Option 1: Fix Your Current Installation (Fastest)
Run these two commands:

```bash
cd /usr/local/lib/node_modules/coder1-bridge
sudo npm install --production
```

Then start the bridge:
```bash
coder1-bridge start
```

### Option 2: Clean Reinstall (If Option 1 Doesn't Work)
```bash
# Uninstall current version
sudo npm uninstall -g coder1-bridge

# Install the fixed version
sudo npm install -g https://coder1.ai/bridge-cli.tar.gz

# Start the bridge
coder1-bridge start
```

## What Happened

The issue was with how the bridge imports the `node-fetch` dependency. Global npm packages can have trouble with dynamic imports, causing the error you saw.

## What I Fixed

1. ✅ Changed to a more reliable import method (CommonJS `require()`)
2. ✅ Improved package configuration
3. ✅ Rebuilt and deployed the fix (as of today)

The new version is already live at https://coder1.ai/bridge-cli.tar.gz

## Next Steps

1. Try **Option 1** above (should take 30 seconds)
2. If that works, you're all set! 
3. If not, try **Option 2** (clean reinstall)

Let me know if you hit any issues - I'm standing by to help. And sorry for the inconvenience!

Best,
Mike

---

**P.S.** Once you're connected, feel free to report any other issues you find. Your feedback as an alpha tester is invaluable! 🙏

---

## If User Asks Technical Details

**Root Cause:**
- The bridge used dynamic ES module import: `await import('node-fetch')`
- This is unreliable for globally installed npm packages
- node-fetch v2.7.0 is CommonJS, not ESM

**Fix Applied:**
- Changed line 116 in bridge-client.js from:
  ```javascript
  const fetch = (await import('node-fetch')).default;
  ```
  To:
  ```javascript
  const fetch = require('node-fetch');
  ```

**Why This Works:**
- `require()` is the standard way to import CommonJS modules
- More reliable for global npm package installations
- Eliminates the import path resolution issues

**Deployed:** 
- GitHub: Committed as `b62c9011f`
- Production: Updated tarball at coder1.ai/bridge-cli.tar.gz
- Size: 41KB (compressed)
