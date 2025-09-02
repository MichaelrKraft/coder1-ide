# 🚀 Coder1 IDE Deployment Guide

## One-Click Deployment (The Easy Way)

### Quick Deploy
```bash
npm run deploy
```

That's it! Your IDE will be automatically:
1. ✅ Built
2. ✅ Deployed  
3. ✅ Server restarted
4. ✅ Available at http://localhost:3000/ide

---

## Available Commands

| Command | What It Does |
|---------|-------------|
| `npm run deploy` | 🚀 Full deployment (recommended) |
| `npm run build:all` | 📦 Build only (no deploy) |
| `npm run verify:deployment` | 🔍 Check if deployment worked |
| `npm run rollback` | ↩️ Undo last deployment |

---

## Features

### ✅ Smart Backup System
- Automatic backup before each deployment
- One-command rollback if issues occur
- Keeps last 3 backups, cleans up automatically

### ✅ Error Handling
- Stops on first error
- Automatic rollback on failure
- Clear error messages

### ✅ Progress Feedback
- Colored output for easy reading
- Step-by-step progress
- Success/error confirmations

### ✅ Verification
- Confirms build success
- Verifies file copying
- Tests server restart

---

## Troubleshooting

### If Deploy Fails
```bash
npm run rollback
```

### If Server Won't Start
```bash
# Check if server is running
pm2 list

# Restart manually
pm2 restart coder1-server
# OR
npm start
```

### If Files Are Missing
```bash
# Force rebuild
npm run build:all
npm run deploy
```

---

## What Happens Under The Hood

1. **Backup**: Current version saved to `backup_TIMESTAMP/`
2. **Build**: Next.js app compiled (`.next/` folder)
3. **Copy**: Build files moved to `public/ide/`
4. **Restart**: PM2 restarts server (or manual restart needed)
5. **Verify**: Checks deployment success
6. **Cleanup**: Old backups removed (keeps 3)

---

## Before/After Comparison

### Before (Manual Process)
```bash
cd coder1-ide-next
npm run build                    # 2 minutes
cd ..
cp -r coder1-ide-next/.next/static public/ide/
cp -r coder1-ide-next/.next/server public/ide/
pm2 restart coder1-server
# Wait and pray it worked...
```
**Total: ~5 minutes, error-prone**

### After (Automated)
```bash
npm run deploy
```
**Total: ~30 seconds, bulletproof**

---

## Pro Tips

1. **Always deploy from clean state**: Commit your changes first
2. **Test locally**: Make sure `npm run dev` works in coder1-ide-next
3. **Monitor logs**: Use `pm2 logs` to watch server output
4. **Keep backups**: Don't delete backup folders until you're sure

---

*Created with the Coder1 deployment automation system*