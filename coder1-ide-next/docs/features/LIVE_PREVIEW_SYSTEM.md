# Live Preview System (Emergent-Style) - December 5, 2025

## Overview

The Live Preview System provides automatic preview updates in Coder1 IDE's right panel. When Claude Code creates files or starts dev servers, the preview panel automatically switches to show the content - similar to how Emergent.sh works.

**Implemented**: December 4-5, 2025

## Two Preview Modes

### 1. LIVE Mode (Dev Server Detection)
When a dev server starts (e.g., `npm run dev`), the preview switches to show the running application.

- **Trigger**: Terminal output contains patterns like `Local: http://localhost:3000`
- **Indicator**: Green "LIVE" badge with pulsing dot
- **Behavior**: iframe points to localhost URL instead of file preview
- **Disconnect**: Click X button to return to file-based preview

### 2. AUTO Mode (File Creation Detection)
When Claude Code creates an HTML file, the preview automatically shows that file.

- **Trigger**: Terminal output contains patterns like `Wrote /path/to/file.html` or `Created file.html`
- **Indicator**: Cyan "AUTO" badge with pulsing dot
- **Behavior**: iframe loads the created HTML file via `/api/preview`
- **Dismiss**: Click X button to return to default preview

## Files Modified

| File | Purpose |
|------|---------|
| `components/terminal/Terminal.tsx` | Dispatches `terminalOutput` CustomEvent |
| `components/preview/PreviewPanel.tsx` | Listens for events, detects patterns, updates UI |
| `app/api/preview/route.ts` | Handles absolute paths and `/tmp/` directory access |

## Technical Implementation

### Terminal Output Event Dispatch (Terminal.tsx)

Location: Around line 4060 in the data handler

```typescript
// Dispatch event for preview panel to detect dev server or file creation
window.dispatchEvent(new CustomEvent('terminalOutput', {
  detail: { output: data }
}));
```

### Dev Server Detection Patterns (PreviewPanel.tsx)

```typescript
const DEV_SERVER_PATTERNS = [
  /Local:\s+http:\/\/localhost:(\d+)/,
  /ready\s+-\s+started\s+server\s+on\s+.*?localhost:(\d+)/i,
  /url:\s*http:\/\/localhost:(\d+)/i,
  /VITE\s+v[\d.]+\s+ready.*?localhost:(\d+)/i,
  /webpack.*compiled.*http:\/\/localhost:(\d+)/i,
  /Server\s+running\s+(?:at|on)\s+http:\/\/localhost:(\d+)/i,
  /Listening\s+on\s+(?:port\s+)?(\d+)/i,
  /Started\s+(?:server\s+)?on\s+(?:port\s+)?(\d+)/i,
];
```

### File Creation Detection Patterns (PreviewPanel.tsx)

```typescript
const FILE_CREATION_PATTERNS = [
  // Full paths (highest priority)
  /Wrote\s+(?:to\s+)?[`"']?(\/[^\s`"'\n]+\.html)[`"']?/i,
  /Created?\s+(?:file\s+)?[`"']?(\/[^\s`"'\n]+\.html)[`"']?/i,
  /Generated\s+[`"']?(\/[^\s`"'\n]+\.html)[`"']?/i,
  // Claude's Write tool pattern
  /Write\s+tool[^`]*`([^`]+\.html)`/i,
  // Shell redirect patterns
  />\s*(\/[^\s\n]+\.html)/,
  /echo\s+['"][^'"]*['"]\s*>\s*(\/[^\s\n]+\.html)/i,
  // Relative paths (lower priority)
  /Wrote\s+(?:to\s+)?[`"']?([^\s`"'\n]+\.html)[`"']?/i,
  /Created?\s+(?:file\s+)?[`"']?([^\s`"'\n]+\.html)[`"']?/i,
  // Additional patterns
  /touch\s+(\/[^\s\n]+\.html)/i,
  /git\s+checkout.*\s+(\/[^\s\n]+\.html)/i,
  /cp\s+[^\s]+\s+(\/[^\s\n]+\.html)/i,
];
```

### Preview API Security (route.ts)

The preview API was updated to allow files from `/tmp/` for auto-preview demos:

```typescript
// Handle absolute paths for auto-preview
const fullPath = filePath.startsWith('/')
  ? filePath
  : path.resolve(projectRoot, filePath);

// Security check - allow files in project OR in /tmp/
const isInProject = fullPath.startsWith(projectRoot);
const isInTmp = fullPath.startsWith('/tmp/') || fullPath.startsWith('/private/tmp/');

if (!isInProject && !isInTmp) {
  return NextResponse.json({
    success: false,
    error: 'Access denied - file outside allowed directories'
  }, { status: 403 });
}
```

## Status Bar States

The preview panel status bar shows 4 different states:

1. **Live Server** (green): `isLiveMode && devServerUrl` - Shows "Live Server" + URL
2. **Auto-Preview** (cyan): `autoPreviewFile` - Shows "Auto-Preview" + filename
3. **File Active** (default): `activeFile && isPreviewable` - Shows file type + filename
4. **Waiting** (gray): No active preview - Shows "Waiting for file"

## User Workflow

### For Novice Developers (HTML Only)
1. Open http://localhost:3001/ide
2. Type `claude` in terminal to start Claude Code
3. Voice code: "Create a simple landing page HTML file"
4. Claude Code creates file and outputs `Wrote /path/to/file.html`
5. AUTO badge appears, preview shows the landing page

### For Advanced Users (Dev Server)
1. Open http://localhost:3001/ide
2. Run `npm run dev` in terminal
3. Dev server outputs `Local: http://localhost:3000`
4. LIVE badge appears, preview shows the running app
5. Click disconnect to return to file-based preview

## Testing

### Quick Test (Without Claude Code)
```bash
echo "Wrote to /tmp/test-landing.html" && echo '<!DOCTYPE html><html><head><title>Test</title></head><body style="background:#1a1a2e;color:white;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif"><h1 style="background:linear-gradient(90deg,#00d9ff,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Auto-Preview Works!</h1></body></html>' > /tmp/test-landing.html
```

### Real Workflow Test
1. Open http://localhost:3001/ide
2. Type `claude` in terminal
3. Say: "Create a simple landing page HTML file at public/landing.html"
4. Expected: AUTO badge appears, preview shows the page

## Design Decisions

1. **HTML Only for Auto-Preview**: User requested simplicity for novice developers - no build step required. React/TSX files would need compilation.

2. **Security with Usability**: `/tmp/` is allowed for auto-preview because it's temporary and commonly used for demo files, while sensitive directories remain blocked.

3. **Pattern Priority**: Full paths are checked before relative paths to ensure accurate file location detection.

4. **Event-Based Architecture**: Uses CustomEvent for loose coupling between Terminal and PreviewPanel components.

## Future Enhancements

1. **Share button** - Generate ngrok/tunnel URL for sharing
2. **Build status** - Show compilation progress and errors
3. **Error overlay** - Display build errors with clickable file links
4. **Port management** - Handle port conflicts gracefully
5. **Multiple servers** - Support running multiple dev servers

## Related Files

- Plan file: `~/.claude/plans/ticklish-dazzling-flute.md`
- Terminal component: `components/terminal/Terminal.tsx`
- Preview component: `components/preview/PreviewPanel.tsx`
- Preview API: `app/api/preview/route.ts`
