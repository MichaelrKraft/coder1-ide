# Coder1 Directory Cleanup Recommendations

## Summary of Current State

### ✅ Already Cleaned
- Archived test files (test-hivemind.js, test-hivemind-generation.js)
- Removed empty analytics directory
- Created directory structure documentation

### 🔍 Major Findings

#### 1. Duplicate Files Between Directories
Many files exist in multiple locations:
- `coder1-ide/clean-repo/src/static/` 
- `coder1-ide/src/static/`
- `CANONICAL/ide-build/`
- Root `src/static/`

#### 2. Key Duplicates Found
- **homepage.html** - 6 copies across different directories
- **ide-interface.html** - 5 copies
- **app.js** - 4 copies in different locations
- Many static assets duplicated between clean-repo and regular directories

#### 3. Directory Structure Issues
- Two parallel coder1-ide structures (clean-repo vs regular)
- Multiple src directories at different levels
- Static files scattered across multiple locations

## Recommended Cleanup Actions

### Priority 1: Consolidate coder1-ide directories
```bash
# The clean-repo appears to be the active one (has recent server.log)
# Archive the duplicate coder1-ide/src directory
mv /Users/michaelkraft/autonomous_vibe_interface/coder1-ide/src \
   /Users/michaelkraft/autonomous_vibe_interface/ARCHIVE/coder1-ide-src-backup
```

### Priority 2: Clean up root src directory
```bash
# Move root src to archive (appears to be old version)
mv /Users/michaelkraft/autonomous_vibe_interface/src \
   /Users/michaelkraft/autonomous_vibe_interface/ARCHIVE/root-src-backup
```

### Priority 3: Remove node_modules (can regenerate)
```bash
# Remove node_modules to save 199MB
rm -rf /Users/michaelkraft/autonomous_vibe_interface/node_modules
rm -rf /Users/michaelkraft/autonomous_vibe_interface/coder1-ide/clean-repo/node_modules
```

### Priority 4: Clean up duplicate static files
Keep only:
- CANONICAL versions (official)
- Active versions in coder1-ide/clean-repo

## Directory Structure After Cleanup

```
autonomous_vibe_interface/
├── CANONICAL/          # Official production files
├── ARCHIVE/           # Historical versions
├── coder1-ide/        # Main development
│   └── clean-repo/    # Active codebase
├── projects/          # User-generated content
└── [other project directories]
```

## Safety Notes
- All moves go to ARCHIVE, not deletion
- Can restore anything if needed
- Keep CANONICAL directory untouched
- Server is running from coder1-ide/clean-repo

## Next Steps
1. Review these recommendations
2. Create backup of entire directory first
3. Execute cleanup commands one by one
4. Test that everything still works