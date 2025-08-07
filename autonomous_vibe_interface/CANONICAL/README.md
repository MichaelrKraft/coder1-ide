# CANONICAL Files Directory

## ⚠️ CRITICAL: MODIFY ONLY THESE VERSIONS

This directory contains the **authoritative, production versions** of all major interface files. 

### Purpose
- **Single Source of Truth**: Eliminates confusion about which files to modify
- **AI Agent Guidance**: Clear headers help Claude agents identify correct versions
- **Version Control**: Old versions archived in ARCHIVE/ directory

### Files in this Directory

#### 1. `homepage.html`
- **Route**: `/` (root)
- **Purpose**: Main homepage - Smart PRD & Wireframe Generator with 7-step wizard
- **Features**: PRD generation, wireframes, expert consultation, version management, optimized spacing
- **Dependencies**: product-creation-hub.css, product-creation-hub.js, Font Awesome, Google Fonts

#### 2. `ide-react.html` 
- **Route**: `/ide` (development reference only - see ide-build/ for production)
- **Purpose**: Advanced React IDE with supervision controls and native terminal
- **Features**: Advanced React IDE, supervision button, infinite agent, native terminal with title bar
- **Dependencies**: React build main.ca49fa02.js (advanced build), voice-interface.js, Socket.IO

#### 3. `smart-prd-generator.html`
- **Route**: Served within React IDE
- **Purpose**: Complete Smart PRD & Wireframe Generator with 7-step wizard
- **Features**: PRD generation, wireframes, expert consultation, version management
- **Dependencies**: product-creation-hub.css, product-creation-hub.js, Font Awesome

#### 4. `ide-build/` (directory)
- **Route**: `/ide` (PRODUCTION - served by app-simple.js)
- **Purpose**: Production React IDE build with terminal header buttons
- **Features**: Terminal header with Sleep Mode, Supervision, Parallel Agents, Infinite Loop buttons
- **Current Build**: main.a1cfdcd5.js (verified to contain all 4 buttons)
- **Note**: This is the ACTUAL production IDE that gets deployed

### File Headers
All files contain AI-readable metadata headers:
```html
<!-- 
===============================================================================
CANONICAL FILE - MODIFY THIS VERSION ONLY
===============================================================================
File: [filename]
Purpose: [description]
Status: PRODUCTION - Last updated: [date]
Claude Agents: This is the OFFICIAL version - do not modify copies elsewhere
===============================================================================
-->
```

### Rules for Claude Agents
1. **ALWAYS** check for "CANONICAL FILE" header before editing
2. **NEVER** modify files outside this directory
3. **NEVER** modify archived versions
4. **VERIFY** you're working with the official version
5. **UPDATE** the "Last updated" date when making changes

### Directory Structure
```
/Users/michaelkraft/autonomous_vibe_interface/
├── CANONICAL/          ← MODIFY THESE FILES ONLY
│   ├── homepage.html
│   ├── ide-react.html (development reference)
│   ├── smart-prd-generator.html
│   └── ide-build/     ← PRODUCTION IDE BUILD
│       ├── README.md
│       ├── index.html
│       └── static/
│           ├── js/main.a1cfdcd5.js
│           └── css/main.5c128812.css
├── ARCHIVE/            ← DO NOT MODIFY (historical reference)
│   └── [timestamped old versions]
├── coder1-ide/
│   └── clean-repo/
│       └── ide-build/ ← Deploy by copying from CANONICAL/ide-build/
└── src/
    └── app.js         ← Routes point to CANONICAL files
```

### Routing
The main Express server (`src/app.js`) has been updated to serve files from this directory:
- `GET /` → `CANONICAL/homepage.html`
- `GET /ide` → `CANONICAL/ide-react.html`

### Deployment Notes
For IDE deployment:
1. Copy `CANONICAL/ide-build/*` to `coder1-ide/clean-repo/ide-build/`
2. Commit and push from clean-repo
3. Render will automatically deploy the new version

### Troubleshooting for Claude Agents

**If wireframes/personas aren't working:**

1. **Check server configuration**: Look at `src/app.js` line 47 - should point to `../CANONICAL` (correct) not `../public` (incorrect)
2. **Root cause**: Server serves from `/public/` which has broken/incomplete implementations
3. **Quick fix**: Change `express.static(path.join(__dirname, '../public'))` to `express.static(path.join(__dirname, '../CANONICAL'))`
4. **This is the #1 most common issue** - server configuration, not code logic
5. **Symptoms**: "Error generating wireframes", "Three buttons don't work" (persona consultation)

### Last Updated
- 2025-07-21 - Initial canonical file organization implemented
- 2025-07-21 - Added ide-build directory with correct terminal header buttons version
- 2025-08-05 - Added troubleshooting section for server configuration issue