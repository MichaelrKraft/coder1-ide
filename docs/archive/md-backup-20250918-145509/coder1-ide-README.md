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
- **Route**: `/ide`
- **Purpose**: Advanced React IDE with supervision controls and native terminal
- **Features**: Advanced React IDE, supervision button, infinite agent, native terminal with title bar
- **Dependencies**: React build main.ca49fa02.js (advanced build), voice-interface.js, Socket.IO

#### 3. `smart-prd-generator.html`
- **Route**: Served within React IDE
- **Purpose**: Complete Smart PRD & Wireframe Generator with 7-step wizard
- **Features**: PRD generation, wireframes, expert consultation, version management
- **Dependencies**: product-creation-hub.css, product-creation-hub.js, Font Awesome

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
│   ├── ide-react.html
│   └── smart-prd-generator.html
├── ARCHIVE/            ← DO NOT MODIFY (historical reference)
│   └── [timestamped old versions]
└── src/
    └── app.js         ← Routes point to CANONICAL files
```

### Routing
The main Express server (`src/app.js`) has been updated to serve files from this directory:
- `GET /` → `CANONICAL/homepage.html`
- `GET /ide` → `CANONICAL/ide-react.html`

### Last Updated
2025-07-21 - Initial canonical file organization implemented