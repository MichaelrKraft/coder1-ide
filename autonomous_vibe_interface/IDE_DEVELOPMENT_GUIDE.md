# IDE Development Guide for Claude Agents

## 🎯 What Powers localhost:3000/ide

When you visit `localhost:3000/ide`, here's the **exact file flow**:

### 1. Server Route Handler
**File:** `/src/app.js` (lines 263-306)

```javascript
app.get(['/ide', '/ide/'], (req, res) => {
    // Reads /public/ide/index.html
    // Automatically injects <script src="/static/ai-navigation.js"></script>
    // Serves the modified HTML
});
```

### 2. HTML Template
**File:** `/public/ide/index.html`

Current content:
```html
<script defer="defer" src="/ide/static/js/main.d7cbb840.js"></script>
<link href="/ide/static/css/main.f1ad1a39.css" rel="stylesheet">
```

### 3. Static Files
**Location:** `/public/ide/static/`
- **JavaScript:** `main.d7cbb840.js` 
- **CSS:** `main.f1ad1a39.css`

### 4. AI Dash Button
**File:** `/public/static/ai-navigation.js`
- Automatically injected by server
- Creates "🧠 AI Dash" button
- Changes Docs button to orange

---

## 🔧 FOR OTHER AGENTS: How to Make Changes

### To Modify the IDE React App:

#### Step 1: Edit Source Files
```bash
# Navigate to React source
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide/coder1-ide-source

# Edit files in src/
src/App.tsx        # Main IDE component
src/App.css        # Main styles
src/components/    # Other components
```

#### Step 2: Build the App
```bash
# Inside coder1-ide-source directory
npm run build
```

#### Step 3: Deploy to Production
```bash
# Copy build files to public directory
cp -r build/* ../../public/ide/
```

### ⚠️ CRITICAL NOTES:

1. **Server Auto-Injection:** The server automatically injects `ai-navigation.js`, so you don't need to manually add it to index.html

2. **File Names Change:** When you rebuild, CSS/JS file hashes change (e.g., `main.abc123.css`). The server reads index.html dynamically, so it picks up new file names automatically.

3. **Don't Edit /public/ide/ Directly:** Always edit source files and rebuild. The `/public/ide/` directory gets overwritten on rebuild.

### 🔍 Directory Structure:

```
/Users/michaelkraft/autonomous_vibe_interface/
├── src/app.js                           # Server (handles /ide route)
├── public/
│   ├── ide/
│   │   ├── index.html                   # HTML template (gets auto-modified)
│   │   └── static/
│   │       ├── css/main.f1ad1a39.css   # Built CSS
│   │       └── js/main.d7cbb840.js     # Built JavaScript
│   └── static/ai-navigation.js          # AI Dash button (injected by server)
└── coder1-ide/
    └── coder1-ide-source/               # React source code
        ├── src/                         # ← EDIT THESE FILES
        │   ├── App.tsx
        │   ├── App.css
        │   └── components/
        └── build/                       # Build output (copy to /public/ide/)
```

---

## 🚨 Common Mistakes to Avoid:

1. **Don't edit `/public/ide/index.html` manually** - it gets overwritten
2. **Don't forget to rebuild** after source changes
3. **Don't forget to copy build files** to `/public/ide/`
4. **Don't manually add ai-navigation.js** - server injects it automatically

---

## ✅ Quick Verification:

After making changes, check:
```bash
# Verify build files exist
ls -la /Users/michaelkraft/autonomous_vibe_interface/public/ide/static/css/main*.css

# Check server is injecting AI navigation
curl -s localhost:3000/ide | grep "ai-navigation"
```

---

## 🎯 Summary for Other Agents:

**To modify the IDE at localhost:3000/ide:**

1. Edit source files in `/coder1-ide/coder1-ide-source/src/`
2. Run `npm run build` 
3. Copy `build/*` to `/public/ide/`
4. Server automatically handles AI Dash button injection
5. Visit `localhost:3000/ide` to see changes

**The server dynamically serves modified HTML with AI navigation injected - you just need to update the React source and rebuild!**