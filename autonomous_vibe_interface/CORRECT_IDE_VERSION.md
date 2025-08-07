# CORRECT IDE VERSION DOCUMENTATION

## ⚠️ IMPORTANT: Use These Files for the IDE

The correct version of the Coder1 IDE that displays the terminal with control buttons in the header bar uses:

### JavaScript File:
```
main.d626f6eb.js
```

### CSS File:
```
main.57baf0f8.css
```

### Location in CANONICAL:
- JS: `/Users/michaelkraft/autonomous_vibe_interface/CANONICAL/ide-build/static/js/main.d626f6eb.js`
- CSS: `/Users/michaelkraft/autonomous_vibe_interface/CANONICAL/ide-build/static/css/main.57baf0f8.css`

### Features of This Version:
- ✅ Terminal with integrated header controls
- ✅ Sleep Mode button
- ✅ Supervision button
- ✅ Parallel Agents button
- ✅ Infinite Loop button
- ✅ Proper styling and layout
- ✅ Terminal title bar contains the control buttons (not floating above)

### Configuration in ide-react.html:
```html
<script defer="defer" src="/ide/static/js/main.d626f6eb.js"></script>
<link href="/ide/static/css/main.57baf0f8.css" rel="stylesheet">
```

### Note for Future Agents:
- DO NOT use main.537f3087.js - it causes layout issues
- DO NOT use main.a0df5d05.js - it's an older version without buttons in terminal header
- DO NOT rebuild the React app without preserving these specific files
- The CANONICAL directory contains the authoritative versions

### Last Verified:
- Date: July 22, 2025
- Verified Working on: http://localhost:3000/ide
- Configuration File: /Users/michaelkraft/autonomous_vibe_interface/CANONICAL/ide-react.html

## Adding New Features:
When adding features like Hivemind, ensure compatibility with these specific build files or create a JavaScript injection approach that doesn't require rebuilding the React app.

## ⚠️ CRITICAL: Static File Serving Configuration

**For Future Claude Code Agents:**
- Static files must be placed in `/src/static/` directory (NOT `/static/`)
- The Express.js server serves static files from `path.join(__dirname, 'static')` where `__dirname` is `/src/`
- Therefore: `/src/static/hivemind-injection.js` → served at `http://localhost:3000/hivemind-injection.js`
- IDE scripts reference files relative to root: `<script src="hivemind-injection.js"></script>`

**Correct Static File Paths:**
- Source: `/Users/michaelkraft/autonomous_vibe_interface/src/static/filename.js`
- URL: `http://localhost:3000/filename.js`

**Common Mistake:**
- ❌ Placing files in `/static/` (root level) - these won't be served
- ✅ Place files in `/src/static/` - these will be served correctly