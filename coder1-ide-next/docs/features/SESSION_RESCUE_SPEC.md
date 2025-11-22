# Session Rescue - Technical Specification

**Version**: 1.0.0  
**Status**: Design Phase  
**Author**: Claude Code Agent  
**Date**: January 2025  

---

## Executive Summary

Session Rescue is an automatic crash recovery system that saves and restores complete IDE sessions, including:
- Open files with unsaved changes
- Terminal history and state
- Claude Bridge conversation context
- UI layout and cursor positions
- Git state and project context

**Value Proposition**: "The only IDE that never loses your work or Claude conversation context."

**Implementation Time**: 2-3 days (post-alpha)  
**Risk Level**: Very Low (feature-flagged, isolated)  
**Novelty**: High (no local IDE does this)

---

## Architecture Overview

### Storage Architecture (Local-First)

```
Local Machine Storage
├── ~/.coder1/recovery/
│   ├── sessions/              # Auto-save recovery points
│   │   ├── session_1234567890_abc.json
│   │   ├── session_1234567900_def.json
│   │   └── ... (keep last 10)
│   ├── snapshots/             # User-created snapshots (permanent)
│   │   ├── before-refactor_20250114.json
│   │   └── working-auth_20250115.json
│   ├── emergency/             # Crash dumps (keep last 5)
│   │   └── crash_1234567890.json
│   └── last_exit.json         # Clean exit tracker
└── Optional: Eternal Memory Cloud Backup (future)
```

### System Components

```typescript
┌─────────────────────────────────────────────────────┐
│                 Coder1 IDE                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Auto-Save Manager                          │  │
│  │  - Event monitoring                         │  │
│  │  - Smart trigger detection                  │  │
│  │  - Rate limiting                            │  │
│  └──────────────────────────────────────────────┘  │
│                       ↓                             │
│  ┌──────────────────────────────────────────────┐  │
│  │  Local Recovery Service                     │  │
│  │  - State collection                         │  │
│  │  - Health checking                          │  │
│  │  - File system operations                   │  │
│  │  - Recovery execution                       │  │
│  └──────────────────────────────────────────────┘  │
│                       ↓                             │
│  ┌──────────────────────────────────────────────┐  │
│  │  File System Storage                        │  │
│  │  ~/.coder1/recovery/                        │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Recovery UI                                │  │
│  │  - Detection modal                          │  │
│  │  - Recovery browser                         │  │
│  │  - Manual snapshot UI                       │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Data Structures

### RecoveryFile Interface

```typescript
interface RecoveryFile {
  // Metadata
  meta: {
    sessionId: string;              // "session_1705267200_a3f2b1"
    timestamp: number;              // Unix timestamp in ms
    projectPath: string;            // Absolute path: "/Users/mike/my-project"
    projectName: string;            // Derived from path: "my-project"
    machineId: string;              // Hash of machine for multi-device
    coder1Version: string;          // "1.0.0"
    recoveryVersion: string;        // "1.0.0"
    saveReason: SaveReason;         // "auto" | "manual" | "crash"
    name?: string;                  // User-provided name for snapshots
    tags?: string[];                // ["before-refactor", "working-auth"]
  };
  
  // Session State
  state: {
    // Editor State
    openFiles: Array<{
      absolutePath: string;         // "/Users/mike/project/src/app.ts"
      relativeToProject: string;    // "src/app.ts"
      content: string;              // Full file content
      isDirty: boolean;             // Has unsaved changes
      language: string;             // "typescript"
      
      // Cursor and viewport
      cursorPosition: {
        line: number;               // 0-indexed
        column: number;             // 0-indexed
      };
      scrollTop: number;            // Pixels from top
      selections: Array<{           // Multi-cursor support
        start: { line: number; column: number };
        end: { line: number; column: number };
      }>;
    }>;
    
    // Terminal State
    terminals: Array<{
      id: string;                   // "terminal-1"
      cwd: string;                  // Current working directory
      history: string;              // Full terminal output (filtered)
      lastCommand: string;          // Most recent command
      exitCode?: number;            // Exit code of last command
      env?: Record<string, string>; // Environment variables
    }>;
    
    // Claude Bridge State
    claudeBridge: {
      isConnected: boolean;
      bridgeVersion: string;
      pairingCode?: string;         // If in pairing mode
      lastActivity: number;         // Timestamp
      
      // Conversation context
      conversationHistory: Array<{
        role: "user" | "assistant";
        content: string;
        timestamp: number;
        fileContext?: string[];     // Files referenced in message
        toolUse?: any;              // MCP tool calls if any
      }>;
      
      // Active task tracking
      activeTask?: {
        description: string;
        startedAt: number;
        filesInvolved: string[];
        commandsRun: string[];
        status: "in_progress" | "completed" | "failed";
      };
    };
    
    // Git State (read-only snapshot)
    git: {
      branch: string;
      hasUncommitted: boolean;
      uncommittedFiles: string[];
      lastCommit: string;           // SHA
      remoteUrl?: string;
    };
    
    // UI Layout
    layout: {
      leftPanelWidth: number;       // Pixels
      rightPanelWidth: number;      // Pixels
      terminalHeight: number;       // Pixels
      activeLeftTab: string;        // Tab ID
      activeRightTab: string;       // Tab ID
      leftPanelCollapsed: boolean;
      rightPanelCollapsed: boolean;
    };
  };
  
  // Health Assessment
  health: {
    recoveryScore: number;          // 0-100 confidence
    canFullyRestore: boolean;       // Score >= 80
    warnings: string[];             // Issues detected
    filesVerified: boolean;         // All files still exist?
    gitStateSynced: boolean;        // Git state matches?
  };
  
  // Statistics
  stats: {
    fileCount: number;
    dirtyFileCount: number;
    totalFileSize: number;          // Bytes
    terminalCommandCount: number;
    conversationMessageCount: number;
    compressionRatio: number;       // How much compressed
  };
}

type SaveReason = "auto" | "manual" | "crash" | "periodic" | "event";
```

### CleanExit Tracker

```typescript
interface CleanExitTracker {
  wasClean: boolean;
  timestamp: number;
  sessionId?: string;
  reason?: string; // "user_closed" | "shutdown" | "update"
}
```

---

## Recovery Score Algorithm

The recovery score (0-100) determines confidence in successful restoration:

```typescript
function calculateRecoveryScore(state: RecoveryState): number {
  let score = 0;
  
  // File Verification (40 points max)
  const filesExist = verifyFilesExist(state.openFiles);
  const fileScore = (filesExist / state.openFiles.length) * 30;
  score += fileScore;
  
  // Bonus for dirty files (user has unsaved work)
  const dirtyCount = state.openFiles.filter(f => f.isDirty).length;
  score += Math.min(10, dirtyCount * 2);
  
  // Terminal History (20 points max)
  if (state.terminals.length > 0) {
    score += 10; // Has terminal
    const commandCount = countCommands(state.terminals);
    score += Math.min(10, commandCount / 5);
  }
  
  // Claude Context (20 points max)
  if (state.claudeBridge.conversationHistory.length > 0) {
    score += 10; // Has conversation
    const messageCount = state.claudeBridge.conversationHistory.length;
    score += Math.min(10, messageCount / 3);
  }
  
  // Git State Sync (10 points max)
  if (gitStateSynced(state.git)) {
    score += 10;
  } else {
    score += 5; // Partial credit
  }
  
  // Recency (10 points max)
  const ageMinutes = (Date.now() - state.meta.timestamp) / 60000;
  if (ageMinutes < 5) score += 10;
  else if (ageMinutes < 15) score += 7;
  else if (ageMinutes < 30) score += 4;
  else score += 1;
  
  return Math.min(100, Math.round(score));
}
```

### Score Interpretation

- **90-100**: Excellent - Full recovery likely
- **80-89**: Good - High confidence recovery
- **70-79**: Fair - Recovery should work with minor issues
- **60-69**: Moderate - Recovery may have warnings
- **50-59**: Poor - Partial recovery possible
- **0-49**: Critical - Recovery uncertain, show warnings

---

## Auto-Save Strategy

### Event-Driven Triggers

```typescript
interface SaveTrigger {
  event: string;
  priority: "critical" | "important" | "minor";
  debounce: number; // milliseconds
  minInterval: number; // minimum time between saves
}

const SAVE_TRIGGERS: SaveTrigger[] = [
  // Critical events - save immediately
  { event: "claude:response:complete", priority: "critical", debounce: 0, minInterval: 30000 },
  { event: "file:save", priority: "critical", debounce: 0, minInterval: 60000 },
  { event: "git:commit", priority: "critical", debounce: 0, minInterval: 0 },
  { event: "supervision:activated", priority: "critical", debounce: 0, minInterval: 60000 },
  
  // Important events - save after quiet period
  { event: "terminal:command:complete", priority: "important", debounce: 30000, minInterval: 120000 },
  { event: "file:modified", priority: "important", debounce: 30000, minInterval: 120000 },
  { event: "layout:changed", priority: "important", debounce: 30000, minInterval: 180000 },
  
  // Minor events - contribute to periodic save
  { event: "cursor:moved", priority: "minor", debounce: 300000, minInterval: 300000 },
  { event: "scroll:changed", priority: "minor", debounce: 300000, minInterval: 300000 },
];
```

### Periodic Fallback

Even without events, save every 5 minutes as a safety net.

### Emergency Saves

Capture on process signals:
- `SIGTERM` - Graceful shutdown
- `SIGINT` - Ctrl+C
- `uncaughtException` - Crashes
- `unhandledRejection` - Promise failures

---

## Storage Management

### Pruning Strategy

```typescript
interface PruningPolicy {
  autoSaves: {
    keep: number;           // Keep last N auto-saves
    maxAge: number;         // Delete older than N days
    prioritize: "score";    // Keep high-score sessions
  };
  
  snapshots: {
    keep: "forever";        // Never auto-delete
    allowUserDelete: true;
  };
  
  emergencySaves: {
    keep: number;           // Keep last N crashes
    maxAge: number;         // Delete old crashes
  };
  
  maxTotalSize: number;     // Total storage limit (bytes)
}

const DEFAULT_POLICY: PruningPolicy = {
  autoSaves: {
    keep: 10,
    maxAge: 7, // days
    prioritize: "score"
  },
  snapshots: {
    keep: "forever",
    allowUserDelete: true
  },
  emergencySaves: {
    keep: 5,
    maxAge: 30 // days
  },
  maxTotalSize: 100 * 1024 * 1024 // 100 MB
};
```

### Compression

Use `zlib` to compress file content:
- Target: 60-80% compression ratio
- Fast compression (level 6)
- Async in Web Worker (future enhancement)

---

## Recovery Detection Flow

```
┌─────────────────────────────────────┐
│   IDE Startup                       │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│   Check last_exit.json              │
│   Was last exit clean?              │
└────────────┬────────────────────────┘
             ↓
        [Decision]
        /         \
    Clean      Unclean
      ↓            ↓
   Normal    ┌─────────────────────────┐
   Start     │ Find Recovery Points    │
             │ - Score >= 60           │
             │ - Age < 30 minutes      │
             │ - Verify file existence │
             └─────────┬───────────────┘
                       ↓
                  [Found Point?]
                  /           \
                No            Yes
                ↓              ↓
             Normal      ┌──────────────────┐
             Start       │ Show Recovery UI │
                         │ - Score display  │
                         │ - File preview   │
                         │ - Warnings       │
                         └──────┬───────────┘
                                ↓
                           [User Choice]
                           /          \
                      Recover     Start Fresh
                         ↓              ↓
                   Restore Session   Clear Data
                   Update UI         Normal Start
```

---

## Feature Flags

### Environment Variables

```bash
# Feature Control
ENABLE_SESSION_RESCUE=false           # Master switch (OFF by default)

# Storage Configuration
SESSION_RESCUE_DIR=~/.coder1/recovery # Custom location
SESSION_RESCUE_MAX_AUTO_SAVES=10      # Keep last N auto-saves
SESSION_RESCUE_MAX_AGE_DAYS=7         # Delete older than N days

# Behavior Configuration
SESSION_RESCUE_AUTO_SAVE_INTERVAL=300000    # 5 minutes in ms
SESSION_RESCUE_MIN_SCORE=60                  # Minimum recovery score
SESSION_RESCUE_ENABLE_COMPRESSION=true       # Compress recovery files

# Advanced
SESSION_RESCUE_DEBUG=false            # Debug logging
SESSION_RESCUE_SYNC_ETERNAL=false     # Sync to Eternal Memory (future)
```

### Runtime Checks

Every recovery function checks the feature flag:

```typescript
function isRecoveryEnabled(): boolean {
  return process.env.ENABLE_SESSION_RESCUE === 'true';
}

// Usage
async function someRecoveryFunction() {
  if (!isRecoveryEnabled()) {
    return; // Feature disabled, do nothing
  }
  // ... recovery logic
}
```

---

## API Endpoints

### Check for Recovery

```typescript
GET /api/recovery/check

Response: {
  hasRecovery: boolean;
  recovery?: RecoveryFile;
  message?: string;
}
```

### Save Recovery Point

```typescript
POST /api/recovery/save
Body: {
  type: "auto" | "manual" | "crash";
  name?: string;  // For manual snapshots
  tags?: string[];
}

Response: {
  success: boolean;
  sessionId: string;
  recoveryScore: number;
}
```

### Restore Session

```typescript
POST /api/recovery/restore/:sessionId

Response: {
  success: boolean;
  restoredFiles: number;
  restoredTerminals: number;
  restoredConversation: boolean;
  warnings: string[];
}
```

### List Recovery Points

```typescript
GET /api/recovery/list?type=all|auto|snapshots|emergency

Response: {
  recoveryPoints: RecoveryFile[];
  totalCount: number;
  totalSize: number; // bytes
}
```

### Delete Recovery Point

```typescript
DELETE /api/recovery/:sessionId

Response: {
  success: boolean;
  deletedSize: number; // bytes
}
```

---

## UI Components

### RecoveryModal

Shows when recoverable session detected on startup.

**Features**:
- Recovery score with visual indicator
- File count and preview
- Terminal command count
- Claude conversation indicator
- Warning messages
- "Recover" and "Start Fresh" buttons
- "View Details" expandable section

### RecoveryBrowser

Accessible from menu: Settings → Recovery Browser

**Features**:
- Table of all recovery points
- Sort by date, score, type
- Filter by type (auto/manual/emergency)
- Search by name/tags
- Preview recovery point contents
- Restore or delete actions
- Storage usage indicator

### Manual Snapshot UI

Button in status bar or menu.

**Features**:
- Name input
- Tag input (comma-separated)
- Current state preview
- Estimated size
- Create button

---

## Edge Cases

### 1. Files Deleted/Moved

**Problem**: Recovered file path doesn't exist  
**Solution**: 
- Show warning in recovery modal
- Offer to skip missing files
- Log paths for user reference

### 2. Git Branch Changed

**Problem**: Recovery from different branch  
**Solution**:
- Detect branch mismatch
- Warn user in modal
- Offer to continue anyway
- Don't restore git state

### 3. Corrupted Recovery File

**Problem**: JSON parse error or incomplete data  
**Solution**:
- Try to salvage partial data
- Show "Partial Recovery Available" modal
- List what can be recovered
- Offer to attempt partial restore

### 4. Storage Quota Exceeded

**Problem**: Disk full or quota reached  
**Solution**:
- Prune old auto-saves aggressively
- Keep only snapshots + last emergency save
- Show storage warning
- Offer to clear old saves

### 5. Multiple Devices

**Problem**: User opens IDE on different machine  
**Solution**:
- Recovery files are machine-local
- Optional: Eternal Memory sync (future)
- For now: Each device has own recovery

### 6. Project Moved

**Problem**: Project path changed  
**Solution**:
- Detect if files exist at relative paths
- Offer to update project path
- Or skip recovery

---

## Testing Strategy

### Unit Tests

```typescript
// tests/LocalRecoveryService.test.ts
describe("LocalRecoveryService", () => {
  test("saves recovery point to file system");
  test("calculates recovery score correctly");
  test("detects recoverable sessions");
  test("prunes old auto-saves");
  test("preserves snapshots");
  test("handles corrupted files gracefully");
  test("verifies file existence");
  test("compresses data effectively");
});

// tests/AutoSaveManager.test.ts
describe("AutoSaveManager", () => {
  test("triggers on critical events");
  test("debounces minor events");
  test("respects minimum intervals");
  test("handles emergency saves");
  test("disables when feature flag off");
});
```

### Integration Tests

```typescript
describe("Session Rescue Integration", () => {
  test("full save and restore cycle");
  test("recovery modal appears on crash");
  test("restores files with content");
  test("restores terminal history");
  test("restores Claude conversation");
  test("updates UI layout");
  test("handles start fresh correctly");
});
```

### Manual Testing Checklist

- [ ] Create recovery point manually
- [ ] Auto-save triggers after 5 minutes
- [ ] Recovery modal appears after crash
- [ ] Recover button restores session
- [ ] Start fresh clears recovery
- [ ] Recovery browser lists points
- [ ] Delete recovery point works
- [ ] File content matches original
- [ ] Terminal history is correct
- [ ] Claude context restored
- [ ] UI layout preserved
- [ ] Warnings shown for issues
- [ ] Storage pruning works
- [ ] Feature flag disables completely

---

## Performance Considerations

### Save Performance

- **Target**: < 200ms for auto-save
- **Strategy**: Async file operations
- **Optimization**: Compress in background
- **Monitoring**: Log save times

### Restore Performance

- **Target**: < 5 seconds for typical session
- **Strategy**: Progressive restoration
  1. UI layout (instant)
  2. File tree (fast)
  3. File content (parallel)
  4. Terminal state (async)
  5. Claude context (last)
- **UX**: Show progress indicator

### Storage Size

- **Target**: < 5 MB per recovery point (compressed)
- **Typical**: 2-3 MB for average session
- **Large**: 10-20 MB for many open files
- **Strategy**: Compress file content, limit history

---

## Security Considerations

### Sensitive Data

Recovery files may contain:
- API keys in environment variables
- Passwords in terminal history
- Proprietary code

**Mitigations**:
- Store locally only (user's machine)
- File permissions: 600 (owner read/write only)
- Optional: Exclude specific file patterns
- Optional: Scrub sensitive patterns from terminal

### File Permissions

```bash
# Recovery directory
~/.coder1/recovery/ - drwx------ (700)

# Recovery files
*.json - -rw------- (600)
```

### Eternal Memory Sync

If implementing cloud sync:
- Encrypt before upload
- Use user's Eternal Memory credentials
- User controls sync (opt-in)
- Respect data retention policies

---

## Monitoring & Metrics

### Technical Metrics

```typescript
interface RecoveryMetrics {
  saves: {
    total: number;
    auto: number;
    manual: number;
    crash: number;
    failed: number;
    avgDuration: number; // ms
  };
  
  recoveries: {
    prompted: number;
    recovered: number;
    startedFresh: number;
    failed: number;
    avgScore: number;
    avgDuration: number; // ms
  };
  
  storage: {
    totalSize: number;   // bytes
    pointCount: number;
    autoSaveCount: number;
    snapshotCount: number;
    avgPointSize: number; // bytes
  };
}
```

### User Behavior Metrics

- Recovery prompt shown
- Recovery accepted vs declined
- Time to recovery (how old was session)
- Recovery success rate
- Manual snapshot usage
- Recovery browser usage

### Performance Metrics

- Save duration (p50, p95, p99)
- Restore duration (p50, p95, p99)
- File verification time
- Compression ratio achieved

---

## Future Enhancements

### Phase 3: Cloud Sync (Future)

```typescript
interface CloudSyncFeature {
  provider: "Eternal Memory";
  enabled: boolean;
  
  sync: {
    automatic: boolean;
    interval: number;     // minutes
    selective: boolean;   // sync snapshots only
  };
  
  multiDevice: {
    enabled: boolean;
    conflictResolution: "latest" | "manual" | "merge";
  };
}
```

### Phase 4: Team Features (Future)

```typescript
interface TeamFeature {
  sharing: {
    enabled: boolean;
    shareUrl: string;     // Link to recovery point
    expiresIn: number;    // hours
  };
  
  handoff: {
    enabled: boolean;
    message: string;      // Note to team member
    reviewRequired: boolean;
  };
}
```

### Phase 5: Analytics (Future)

- Session productivity metrics
- Time tracking per file
- Command usage patterns
- Collaboration insights

---

## Conclusion

Session Rescue provides:
- ✅ **Reliability**: Never lose work again
- ✅ **Trust**: IDE has user's back
- ✅ **Differentiation**: Unique feature in market
- ✅ **Low Risk**: Feature-flagged, isolated
- ✅ **Fast Implementation**: 2-3 days post-alpha

**Ready for implementation when alpha is stable.**

---

*Document Version: 1.0.0*  
*Last Updated: January 2025*  
*Status: Design Complete - Awaiting Implementation*
