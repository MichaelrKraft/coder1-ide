# 📦 Coder1 Bridge - macOS Installer

**Professional .pkg installer for easy distribution**

---

## 🎯 What This Is

A downloadable macOS installer package (.pkg) that:
- ✅ Double-click to install (no terminal required)
- ✅ Installs to `/usr/local/bin` (always in PATH)
- ✅ Shows professional welcome/conclusion screens
- ✅ Works immediately after installation
- ✅ No PATH configuration needed

---

## 🏗️ Building the Installer

### One Command
```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/installer
./build-installer.sh
```

### What It Does
1. Downloads latest bridge tarball from coder1.ai
2. Extracts and prepares files
3. Creates payload directory structure
4. Builds component package
5. Creates distribution package with welcome/conclusion screens
6. Outputs: `dist/Coder1Bridge-Installer.pkg`

### Build Time
~15-20 seconds (downloads 13KB + dependencies)

---

## 🧪 Testing the Installer

### Install on Your Mac
```bash
sudo installer -pkg dist/Coder1Bridge-Installer.pkg -target /
```

### Verify Installation
```bash
# Check binary exists
ls -la /usr/local/bin/coder1-bridge

# Check version
coder1-bridge --version

# Test start (Ctrl+C to exit)
coder1-bridge start
```

### Uninstall (for testing)
```bash
sudo rm -rf /usr/local/bin/coder1-bridge
sudo rm -rf /usr/local/lib/coder1-bridge
```

---

## 🚀 Deployment

### Step 1: Build Installer
```bash
./build-installer.sh
```

### Step 2: Copy to Public Directory
```bash
mkdir -p ../public/downloads
cp dist/Coder1Bridge-Installer.pkg ../public/downloads/
```

### Step 3: Update IDE Page

Add download button:
```html
<a href="/downloads/Coder1Bridge-Installer.pkg" download>
  <button>Download Coder1 Bridge (macOS)</button>
</a>
```

---

## 📋 User Experience Flow

### 1. User Clicks Download
Browser downloads: `Coder1Bridge-Installer.pkg`

### 2. User Double-Clicks .pkg
macOS opens Installer app showing:
- Welcome screen (what they'll get, requirements)
- Installation progress bar
- Admin password prompt
- Conclusion screen (next steps)

### 3. User Opens Terminal
```bash
coder1-bridge start
```

### 4. Bridge Connects
- Prompts for 6-digit pairing code
- Connects to IDE
- Ready to use!

---

## 📊 Installer Details

### File Structure
```
installer/
├── build-installer.sh          # Main build script
├── scripts/
│   └── postinstall            # Runs after installation
├── payload/                   # Created during build
│   └── usr/local/
│       ├── bin/
│       │   └── coder1-bridge  # Binary
│       └── lib/
│           └── coder1-bridge/ # Source + dependencies
└── dist/                      # Build output
    └── Coder1Bridge-Installer.pkg
```

### Package Contents
- Binary: `/usr/local/bin/coder1-bridge`
- Source: `/usr/local/lib/coder1-bridge/`
- Dependencies: Bundled in node_modules

### Installation Location
All files go to `/usr/local` (standard for user-installed tools):
- **Binary**: `/usr/local/bin/` (in PATH by default)
- **Library**: `/usr/local/lib/coder1-bridge/`

### Package Size
~2-3 MB (includes bridge + dependencies)

---

## 🔧 Customization

### Change Version
Edit `build-installer.sh`:
```bash
VERSION="1.0.0"  # Change this
```

### Customize Welcome Screen
Edit welcome.html generation in `build-installer.sh`

### Customize Conclusion Screen
Edit conclusion.html generation in `build-installer.sh`

### Change Download URL
Edit tarball URL in `build-installer.sh`:
```bash
curl -sL https://coder1.ai/bridge-cli.tar.gz  # Change URL here
```

---

## 🛡️ Security & Signing

### Current State
- ❌ Not signed (users see "unidentified developer" warning)
- Users must right-click → Open to bypass Gatekeeper

### To Add Code Signing
Need:
1. Apple Developer account ($99/year)
2. Developer ID certificate
3. Add to build script:
   ```bash
   productsign --sign "Developer ID Installer: Your Name" \
       input.pkg output-signed.pkg
   ```

### To Notarize (Recommended for Production)
1. Sign the package
2. Submit for notarization:
   ```bash
   xcrun notarytool submit package.pkg \
       --apple-id "your@email.com" \
       --password "app-specific-password" \
       --team-id "TEAM_ID"
   ```
3. Staple notarization ticket:
   ```bash
   xcrun stapler staple package.pkg
   ```

---

## 📈 Advantages Over curl | bash

| Feature | curl \| bash | .pkg Installer |
|---------|-------------|----------------|
| User trust | Low (scary command) | High (familiar macOS UI) |
| Steps | Copy/paste command | Download + double-click |
| PATH setup | Manual | Automatic |
| Visual feedback | Terminal only | macOS Installer UI |
| Instructions | Inline | Welcome/conclusion screens |
| Professional appearance | No | Yes |
| Works without Terminal | No | Yes (until running bridge) |

---

## 🐛 Troubleshooting Build Issues

### "pkgbuild: command not found"
Install Xcode Command Line Tools:
```bash
xcode-select --install
```

### "Failed to download bridge package"
Check internet connection and coder1.ai availability

### "Permission denied" during build
Ensure scripts have execute permission:
```bash
chmod +x build-installer.sh
chmod +x scripts/postinstall
```

### Package won't install
Test component package directly:
```bash
sudo installer -pkg dist/Coder1Bridge-Component.pkg -target /
```

---

## 🎯 Next Steps

### For Alpha Testing
1. Build installer: `./build-installer.sh`
2. Send .pkg file to alpha user
3. Ask them to: Download → Double-click → Follow prompts

### For Production
1. Get Apple Developer account
2. Sign the package
3. Notarize with Apple
4. Host on coder1.ai/downloads/
5. Update IDE page with download button

---

## 📞 Support

**Build Issues**: Check troubleshooting section above  
**Installation Issues**: Check logs at `/var/log/install.log`  
**Runtime Issues**: Run `coder1-bridge --version` to verify installation

---

**Last Updated**: November 12, 2025  
**Installer Version**: 1.0.0  
**Platform**: macOS 10.15+
