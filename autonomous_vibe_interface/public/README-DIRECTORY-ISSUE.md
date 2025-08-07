# ⚠️ DIRECTORY SERVING ISSUE

**This directory is currently being served by the Express server, but it contains broken/incomplete implementations.**

## The Problem

**Working versions are in `/CANONICAL/` directory.**

If you're debugging wireframe generation or persona consultation issues, the server needs to serve from `/CANONICAL/` instead of this directory.

## Symptoms of This Issue

- "Sorry, there was an error generating wireframes. Please try again."
- "Three buttons in the area with the agents doesn't work" (persona consultation)
- Features work in "original codebase, one directory" but not in current setup

## Quick Fix

In `src/app.js` line 47, change:

```javascript
// FROM (broken):
app.use(express.static(path.join(__dirname, '../public')));

// TO (working):
app.use(express.static(path.join(__dirname, '../CANONICAL')));
```

## Why This Happens

The CANONICAL directory contains the official, working versions of all files with proper:
- Mock persona generation functions
- Complete wireframe generation implementation  
- Proper error handling for consultation modal
- AI-readable file headers: "CANONICAL FILE - MODIFY THIS VERSION ONLY"

This `/public/` directory contains outdated/incomplete versions that are missing key functionality.

## For More Details

See `/Users/michaelkraft/CLAUDE.md` for complete fix instructions and background.

**This is the #1 most common issue - server configuration, not code logic.**