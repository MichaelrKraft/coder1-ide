# Session Rescue - User Guide

**For Coder1 IDE Users**

---

## What is Session Rescue?

Session Rescue is Coder1's automatic crash recovery system. It saves your work every few minutes, so if your IDE crashes, your browser closes, or your computer restarts unexpectedly, you can pick up exactly where you left off.

**What gets saved**:
- Open files (including unsaved changes)
- Terminal history
- Claude conversation context
- Your workspace layout
- Cursor positions

**No setup required** - it works automatically in the background.

---

## How It Works

### Automatic Saving

Coder1 automatically saves your session:
- Every 5 minutes
- After you save a file
- After Claude finishes responding
- After terminal commands complete
- Before crashes (emergency save)

**You don't need to do anything** - it's completely automatic.

### Recovery Detection

When you open Coder1, it checks if your last session ended unexpectedly. If so, you'll see a recovery prompt:

```
╔═══════════════════════════════════════════╗
║  🛟 Session Recovery Available             ║
╠═══════════════════════════════════════════╣
║  Your session was interrupted 3 minutes   ║
║  ago. We can restore your work.           ║
║                                           ║
║  Will restore:                            ║
║  ✅ 5 open files (2 with unsaved changes) ║
║  ✅ Terminal history                       ║
║  ✅ Claude conversation                    ║
║  ✅ Workspace layout                       ║
║                                           ║
║  Recovery Confidence: 92/100              ║
║                                           ║
║  [Recover Session] [Start Fresh]          ║
╚═══════════════════════════════════════════╝
```

---

## Using Session Rescue

### When You See the Recovery Prompt

You have two choices:

#### 1. Recover Session (Recommended)

Click **"Recover Session"** to restore everything. This will:
- Reopen all files you had open
- Restore your unsaved changes
- Show your terminal history
- Restore your Claude conversation
- Set your layout back to how it was

**This usually takes 5-10 seconds.**

#### 2. Start Fresh

Click **"Start Fresh"** if you want to begin a new session. This will:
- Clear the recovery data
- Start with a clean slate
- You won't lose any saved files (only unsaved changes)

**Use this if**: You meant to close the IDE, or you want a fresh start.

---

### Recovery Confidence Score

The recovery prompt shows a confidence score (0-100):

- **90-100**: Excellent - Everything should restore perfectly
- **80-89**: Good - Will restore with high confidence
- **70-79**: Fair - Should work, may have minor issues
- **60-69**: Moderate - Will try to restore what it can
- **Below 60**: Low - Partial recovery only

**What affects the score**:
- How recent the save is
- Whether files still exist on disk
- Whether git state has changed
- How much data was captured

---

### What Gets Restored

#### Files
- All files you had open
- Exact cursor position in each file
- Scroll position
- **Unsaved changes** (this is the important part!)
- Multi-cursor selections

#### Terminal
- Command history
- Current working directory
- Last command executed
- Terminal output (filtered for readability)

#### Claude Context
- Your conversation with Claude
- Files Claude was working on
- Active task (if any)

**Note**: Claude may need to reconnect to the bridge after recovery.

#### Workspace
- Panel widths
- Which tabs were active
- Terminal height
- Panel collapse state

---

## Advanced Features

### Manual Snapshots (Coming Soon)

Create named recovery points anytime:

1. Click the **"Create Snapshot"** button
2. Give it a name: "Before Refactor", "Working Auth", etc.
3. Add optional tags

**Manual snapshots are never deleted automatically.**

Use this before:
- Major refactoring
- Risky changes
- Deploying to production
- Switching approaches

---

### Recovery Browser (Coming Soon)

View all your recovery points:

1. Go to **Settings → Recovery Browser**
2. See list of all saved sessions
3. Click any session to restore it
4. Delete old sessions to free space

**Features**:
- Sort by date, score, or type
- Search by name or tags
- Preview what will be restored
- See storage usage

---

## Common Questions

### Will Session Rescue slow down my IDE?

No. Saving happens in the background and takes less than 200ms. You won't notice it.

### How much disk space does it use?

Each recovery point is typically 2-5 MB (compressed). Coder1 keeps the last 10 automatic saves, so around 20-50 MB total. Old saves are automatically deleted.

### Can I disable Session Rescue?

Yes. Set `ENABLE_SESSION_RESCUE=false` in your `.env.local` file. But we recommend keeping it on - it's there to save you!

### Does it work offline?

Yes! Everything is stored locally on your computer. No internet required.

### What if the recovery fails?

Session Rescue will tell you what went wrong and try to recover what it can. Common issues:
- Files were deleted or moved
- Git branch changed
- Project path changed

You'll see warnings in the recovery prompt about any issues.

### Can I manually trigger a save?

Not in the MVP. It saves automatically. Future versions will have a "Create Snapshot" button for manual saves.

### Where are recovery files stored?

```
~/.coder1/recovery/
├── sessions/    # Automatic saves
├── snapshots/   # Manual snapshots (future)
└── emergency/   # Crash dumps
```

You can view or backup these files manually if needed.

### Can I recover work from yesterday?

In the MVP, automatic saves are kept for 7 days. Future versions will let you access older saves through the Recovery Browser.

### Will it save my API keys or passwords?

Recovery files contain everything in your workspace, which may include sensitive data. Files are stored locally with restrictive permissions (owner read/write only). Never commit the recovery directory to git!

**Future versions** will have options to exclude sensitive patterns.

### What if I'm working on multiple projects?

Each project has its own recovery points. When you open Coder1 in a project folder, it only checks for recoveries from that project.

### Can I share recovery points with teammates?

Not in the MVP. This is a future feature for team collaboration.

---

## Troubleshooting

### Recovery Prompt Doesn't Appear

**If your session crashed but you don't see the recovery prompt**:

1. Check if feature is enabled: `ENABLE_SESSION_RESCUE=true` in `.env.local`
2. The crash might have been too fast to save
3. Recovery score might be below 60 (threshold)
4. Check `~/.coder1/recovery/sessions/` for recovery files

### "Some Files Could Not Be Restored"

This usually means:
- Files were deleted or moved
- Project folder was moved
- Permission issues

**Solution**: The recovery prompt will tell you which files are missing. You can still recover the other files.

### Recovery Takes Forever

Recovery should take 5-10 seconds. If it's stuck:
- Check if you have many large files open
- Check disk speed (slow drive?)
- Check if files are on network drive

**Solution**: Try "Start Fresh" and manually reopen files.

### "Git State Has Changed" Warning

This means you recovered a session from a different git branch.

**It's safe to proceed**, but be aware:
- Your files may not match the current branch
- You may have uncommitted changes

**Solution**: Check git status after recovery and adjust as needed.

### Recovery Fails Completely

If recovery fails:
1. Check the error message
2. Check `~/.coder1/recovery/sessions/` for recovery files
3. You can try to manually restore by looking at the JSON files

**Get help**: Open an issue on GitHub with the error message.

---

## Privacy & Security

### What data is collected?

Session Rescue stores:
- File paths and content
- Terminal history
- Claude conversation
- UI state

**Everything stays on your computer.** Nothing is sent to the cloud (unless you enable Eternal Memory sync in future versions).

### File Permissions

Recovery files have restrictive permissions:
- Directory: 700 (owner read/write/execute only)
- Files: 600 (owner read/write only)

**Only you can access your recovery files.**

### Sensitive Data

Recovery files may contain:
- API keys in environment variables
- Passwords in terminal history
- Proprietary code

**Keep your recovery directory secure.** Don't share these files or commit them to git.

**Future versions** will have options to scrub sensitive data.

---

## Tips & Best Practices

### For Maximum Protection

1. **Keep Session Rescue enabled** - It's there to save you
2. **Don't dismiss recovery prompts hastily** - Check what will be restored
3. **Create manual snapshots before risky changes** (when feature available)
4. **Backup your recovery directory** - Copy `~/.coder1/recovery/` to Dropbox/cloud

### For Better Recovery Scores

- Save files frequently (triggers recovery saves)
- Let Claude finish responding before closing
- Avoid force-quitting Coder1
- Keep project files in same location

### For Storage Management

- Recovery files are small (~2-5 MB each)
- Old auto-saves are deleted after 7 days
- Manual snapshots are kept forever (future)
- Check storage with Recovery Browser (future)

---

## What's Next?

**Coming in future versions**:

- ✨ Manual snapshot creation
- 📊 Recovery Browser
- ☁️ Cloud sync with Eternal Memory
- 🔐 Sensitive data scrubbing
- 👥 Team session sharing
- 📈 Session analytics

---

## Support

### Get Help

- **GitHub Issues**: Report bugs or request features
- **Discord**: Ask questions in the community
- **Documentation**: Check `/docs/` for technical details

### Feedback

We'd love to hear from you!
- Did Session Rescue save you? Share your story!
- Found a bug? Let us know!
- Have ideas? Suggest improvements!

---

**Session Rescue is here to make sure you never lose work again. Focus on building - we've got your back. 🛟**

---

*User Guide Version: 1.0.0*  
*Last Updated: January 2025*  
*For Coder1 IDE v1.0.0+*
