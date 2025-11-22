# Bridge Connection Fix - November 22, 2025

## 🎯 Issue Identified

Your bridge CLI was getting a 404 error because the tarball you installed had **corrupted nested directories** with old server URLs mixed in.

## ✅ Fix Deployed

I've just pushed a clean rebuild of the bridge CLI to production. The corrupted tarball has been replaced with a clean version.

**What changed**:
- **Old tarball**: 339KB with 3 nested `package/` directories (some pointing to old URL)
- **New tarball**: 136KB with clean single directory (all pointing to `coder1.ai`)

## 🚀 Installation Instructions (Updated)

**Wait 10-15 minutes** for Render to deploy the new tarball, then run:

```bash
# 1. Uninstall current version
sudo npm uninstall -g coder1-bridge

# 2. Clear npm cache (important!)
sudo npm cache clean --force

# 3. Install fresh clean version
sudo npm install -g https://coder1.ai/bridge-cli.tar.gz

# 4. Verify correct URL is installed
cat $(npm root -g)/coder1-bridge/src/bridge-client.js | grep "coder1.ai"

# Should show: https://coder1.ai (NOT coder1-ide.onrender.com!)

# 5. Start bridge
coder1-bridge start
```

## ⏰ Timeline

- **Now**: Clean tarball committed and pushed to GitHub
- **+5 min**: Render starts building
- **+15 min**: New tarball should be live at https://coder1.ai/bridge-cli.tar.gz
- **+17 min**: You can reinstall and connect!

## 🔍 How to Verify It's Ready

Before reinstalling, check that the new tarball is deployed:

```bash
# Download the tarball
curl -L https://coder1.ai/bridge-cli.tar.gz -o test.tar.gz

# Check size (should be ~136KB, NOT 339KB)
ls -lh test.tar.gz

# If it's 136KB → ✅ New clean version is deployed, proceed with install
# If it's 339KB → ⏳ Still old version, wait a few more minutes
```

## 🎉 Expected Result

After following the installation steps above:
- ✅ Connection will succeed
- ✅ Pairing code will work
- ✅ No more 404 errors!

## 📝 What Went Wrong?

The tarball you installed yesterday had a packaging bug where multiple versions of the code were bundled together (nested `package/package/package/` directories). When npm installed it, it used one of the inner directories that still had the old server URL `coder1-ide.onrender.com`, which doesn't serve the bridge API endpoints.

## 🔧 Technical Details

**Testing I did to confirm**:
- ✅ Downloaded your tarball → Found 3 nested package dirs
- ✅ Checked URLs in each → 2 had old URL, 1 had new URL
- ✅ Tested old URL → Returns 404 on `/api/bridge/pair`
- ✅ Tested new URL → Returns proper error "Invalid pairing code"
- ✅ Rebuilt clean tarball → Only 1 package dir, correct URL
- ✅ Verified size reduction → 339KB → 136KB

---

Let me know if you still see any issues after the new tarball is deployed!

**Estimated time until ready**: ~15 minutes from now (Render deployment)
