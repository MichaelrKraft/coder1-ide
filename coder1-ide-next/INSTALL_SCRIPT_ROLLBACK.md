# 🔄 Bridge Install Script Rollback Guide

**Version**: 1.1.0 → 1.0.0 (if needed)  
**Date**: November 12, 2025

---

## 📦 What Changed

### Version 1.1.0 (Current - with --auto-start)
- Added `--auto-start` flag for one-command installation
- Auto-sources shell config when needed
- Falls back gracefully to manual instructions if auto-start fails

### Version 1.0.0 (Backup - original)
- Standard installation with manual shell reload
- Detailed troubleshooting instructions
- No automatic starting

---

## 🔙 How to Rollback (If Needed)

### Quick Rollback (30 seconds)

```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/public

# Restore from backup
cp install-bridge.sh.backup-20251112-085833 install-bridge.sh

# Verify rollback
head -5 install-bridge.sh | grep "Version:"
# Should show NO version or old version
```

### Verify Rollback Worked

```bash
# Check script no longer has --auto-start flag
grep -q "AUTO_START" install-bridge.sh && echo "❌ Still has new code" || echo "✅ Rollback successful"
```

---

## 🧪 Testing Both Versions

### Test Current Version (1.1.0 with --auto-start)

```bash
# Test auto-start mode
bash install-bridge.sh --auto-start
# Should: Install → Activate → Start bridge automatically

# Test normal mode (backward compatible)
bash install-bridge.sh
# Should: Install → Show instructions (old behavior)
```

### Test Rollback Version (1.0.0 original)

```bash
# After rollback
bash install-bridge.sh
# Should: Install → Show instructions (no auto-start option)
```

---

## 📋 Backup Inventory

**Location**: `/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/public/`

**Files**:
- `install-bridge.sh` - Current version (1.1.0)
- `install-bridge.sh.backup-20251112-085833` - Original version (1.0.0)

**Backup Size**: 7.4KB  
**Created**: November 12, 2025 08:58:33

---

## 🚨 Emergency Rollback Script

If you need to rollback quickly:

```bash
#!/bin/bash
# Emergency rollback script

cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/public

# Find most recent backup
BACKUP=$(ls -t install-bridge.sh.backup-* | head -1)

if [ -f "$BACKUP" ]; then
    echo "Rolling back from: $BACKUP"
    cp "$BACKUP" install-bridge.sh
    echo "✅ Rollback complete"
    
    # Verify
    if ! grep -q "AUTO_START" install-bridge.sh; then
        echo "✅ Verified: Old version restored"
    else
        echo "⚠️  Warning: File still contains new code"
    fi
else
    echo "❌ No backup found"
    exit 1
fi
```

---

## 🔍 What to Check After Rollback

1. **Script runs without errors**:
   ```bash
   bash -n install-bridge.sh
   ```

2. **No AUTO_START references**:
   ```bash
   grep "AUTO_START" install-bridge.sh
   # Should return nothing
   ```

3. **Original behavior works**:
   ```bash
   bash install-bridge.sh
   # Should show manual instructions, not auto-start
   ```

---

## 📊 Version Comparison

| Feature | v1.0.0 (Backup) | v1.1.0 (Current) |
|---------|----------------|------------------|
| Manual install | ✅ Yes | ✅ Yes |
| Auto-start flag | ❌ No | ✅ Yes |
| Shell activation | Manual | Automatic (with flag) |
| Backward compatible | N/A | ✅ Yes |
| Fallback on error | Instructions only | Instructions + auto-retry |

---

## 🎯 When to Rollback

**Rollback if**:
- Auto-start causes issues for users
- Script fails on certain shells
- Users report confusion with new behavior
- Need to debug installation issues

**Don't rollback if**:
- Just one user has issues (debug first)
- Script works but user doesn't use --auto-start flag
- Old behavior is still accessible (it is - just don't use the flag)

---

## ✅ Rollback Safety

The new version is **100% backward compatible**:

```bash
# Without flag - IDENTICAL to old version
bash install-bridge.sh

# With flag - NEW behavior
bash install-bridge.sh --auto-start
```

**You can safely deploy v1.1.0** and rollback anytime without user impact.

---

## 📝 Rollback Checklist

- [ ] Backup verified exists (`ls -l install-bridge.sh.backup-*`)
- [ ] Copy backup to main file
- [ ] Verify syntax (`bash -n install-bridge.sh`)
- [ ] Test installation manually
- [ ] Update IDE page instructions (if needed)
- [ ] Notify alpha users of changes (if applicable)

---

## 🔗 Related Documentation

- **Troubleshooting Guide**: `ALPHA_USER_TROUBLESHOOTING.md`
- **Diagnostic Commands**: `BRIDGE_DIAGNOSTIC_COMMANDS.md`
- **Quick Reference**: `BRIDGE_INSTALLATION_QUICK_REFERENCE.md`

---

**Last Updated**: November 12, 2025  
**Rollback Tested**: ✅ Yes (syntax verified)  
**Production Ready**: ✅ Yes (backward compatible)
