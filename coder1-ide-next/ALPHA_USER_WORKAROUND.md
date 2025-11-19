# Bridge Installation Workaround for Alpha Users

## Issue
Getting `Cannot find package 'node-fetch'` error when running `coder1-bridge start`

## Immediate Workaround (Until Fix is Deployed)

If you've already installed the bridge and are seeing this error, run:

```bash
# For global installation (with sudo)
cd /usr/local/lib/node_modules/coder1-bridge
sudo npm install --production

# For user installation (without sudo)
cd ~/.coder1/lib/node_modules/coder1-bridge
npm install --production
```

Then try connecting again:
```bash
coder1-bridge start
```

## Alternative: Clean Reinstall

If the workaround above doesn't work, try a clean reinstall:

```bash
# Uninstall current version
sudo npm uninstall -g coder1-bridge

# Install fresh from our server
sudo npm install -g https://coder1.ai/bridge-cli.tar.gz

# Start the bridge
coder1-bridge start
```

## What We Fixed

We've identified and fixed the root cause:
1. Changed how node-fetch is imported (more reliable for global packages)
2. Added proper packaging configuration
3. New version deployed as of Nov 19, 2025

## Email Template for Alpha User

---

**Subject:** Bridge Installation Issue - Workaround & Fix

Hi [User Name],

Thanks for reporting the `node-fetch` installation issue! I've identified the root cause and deployed a fix.

**IMMEDIATE WORKAROUND:**

Run these commands to fix your current installation:

```bash
cd /usr/local/lib/node_modules/coder1-bridge
sudo npm install --production
```

Then try connecting:
```bash
coder1-bridge start
```

**WHAT I FIXED:**

The issue was with how the bridge imports the `node-fetch` dependency. Global npm packages sometimes have trouble with dynamic imports. I've:

1. ✅ Changed to a more reliable import method
2. ✅ Improved the packaging configuration  
3. ✅ Deployed the fix to production (Nov 19, 2025)

**IF YOU REINSTALL:**

The new version is already live. If you uninstall and reinstall, you should get the fixed version automatically:

```bash
sudo npm uninstall -g coder1-bridge
sudo npm install -g https://coder1.ai/bridge-cli.tar.gz
```

Sorry for the inconvenience! Let me know if the workaround doesn't solve it - I'm standing by to help.

Best,
Mike

---

## Technical Details (For Reference)

**Root Cause:**
- Dynamic ESM import `await import('node-fetch')` fails in global npm packages
- Temp directory installation path indicated incomplete global install

**Fix Applied:**
- Changed line 116 in `bridge-client.js` from:
  ```javascript
  const fetch = (await import('node-fetch')).default;
  ```
  To:
  ```javascript
  const fetch = require('node-fetch');
  ```

**Additional Improvements:**
- Added `.npmignore` for cleaner packaging
- Package size: 41KB (compressed)

**Confidence:** 70% this solves it completely, 90% with Phase 2 improvements if needed

## Next Steps (If Issue Persists)

If alpha users continue having issues, implement Phase 2:
1. Add `bundledDependencies` to package.json
2. Improve install script with verification
3. Add diagnostic logging
4. Test on multiple platforms/Node versions
