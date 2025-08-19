# 🔧 Coder One StatusLine Configuration

## Overview

This directory contains the default statusLine template for all Coder One users, providing consistent branding and useful information across all sessions.

## Files

- **`default-statusline.json`** - The standard Coder One statusLine template
- **`../utils/statusline-manager.js`** - Utility for applying/managing statusLines

## Default StatusLine Format

```
🔧 Coder One | [project-name] | [git-branch] | [time] | [model]
```

### Example Output
```
🔧 Coder One | autonomous_vibe_interface | main | 14:32 | Claude
🔧 Coder One | n8n-simplifier | feature/upload | 09:15 | GPT-5
```

## Usage

### Quick Apply (for testing)
```bash
# Preview the statusLine
node src/utils/statusline-manager.js preview

# Apply Coder One statusLine
node src/utils/statusline-manager.js apply

# Check current status
node src/utils/statusline-manager.js status

# Restore original (if you had one)
node src/utils/statusline-manager.js restore
```

### Manual Application
1. Copy the statusLine value from `default-statusline.json`
2. Add it to your `~/.claude/settings.json`:
```json
{
  "statusLine": "🔧 Coder One | $(basename \"$(pwd)\") | $(git branch --show-current 2>/dev/null || echo 'no-git') | $(date +'%H:%M') | ${MODEL_NAME:-Claude}"
}
```

### Programmatic Usage
```javascript
const StatusLineManager = require('./utils/statusline-manager');
const manager = new StatusLineManager();

// Apply to current user
await manager.applyCoderOneStatusLine();

// Check status
const status = await manager.getStatusLineStatus();
console.log('Is Coder One branded:', status.isCoderOne);
```

## StatusLine Components

| Component | Description | Example |
|-----------|-------------|---------|
| `🔧 Coder One` | Branding with icon | Always shows |
| `$(basename "$(pwd)")` | Current project/directory | `n8n-simplifier` |
| `$(git branch --show-current)` | Current git branch | `main` or `feature/upload` |
| `$(date +'%H:%M')` | Current time | `14:32` |
| `${MODEL_NAME:-Claude}` | AI model name | `Claude` or `GPT-5` |

## Integration Points

### Future User Onboarding
This template will be automatically applied when users:
1. First access Coder One
2. Create new projects
3. Join Coder One teams

### API Endpoints (Planned)
- `GET /api/statusline/default` - Get default template
- `POST /api/user/statusline/apply` - Apply to user
- `GET /api/user/statusline/status` - Check user's status

## Customization

Users can customize while maintaining branding:

```json
{
  "statusLine": "🔧 Coder One | $(basename \"$(pwd)\") | $(git branch --show-current 2>/dev/null || echo 'no-git') | $(date +'%H:%M:%S') | ${MODEL_NAME:-Claude} | 💻 $(uname)"
}
```

This adds seconds to time and shows OS info while keeping Coder One branding.

## Benefits

- **Consistent Branding**: All Coder One users see unified interface
- **Context Awareness**: Know your project, branch, time at a glance
- **Professional Appearance**: Clean, informative display
- **Easy Updates**: Change template once, applies everywhere
- **User Friendly**: Non-technical users see helpful information

## Next Steps

1. **User Onboarding Integration**: Automatically apply during signup
2. **Project-Specific Overrides**: Different statusLines for different project types
3. **Team Templates**: Shared statusLines for team consistency
4. **Dynamic Content**: Show project-specific information (build status, test results)

## Notes

- StatusLine is applied to `~/.claude/settings.json`
- Original statusLine is backed up if it exists
- Falls back gracefully if git is not available
- Uses environment variables when available
- Compatible with all Claude Code features