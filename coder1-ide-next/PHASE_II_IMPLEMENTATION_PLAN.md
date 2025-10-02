# Memory Detection System - Phase II Implementation Plan

## Overview
Phase II focuses on user control, persistence, and management of memories. This phase transforms the detection system into a fully-featured memory management platform.

## Architecture Design

```
┌─────────────────────────────────────────────────┐
│           User Preference Layer                  │
│     (Settings Modal with Memory Tab)             │
└────────────────┬────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────┐
│         Memory Persistence Layer                 │
│        (SQLite Database + API Routes)            │
└────────────────┬────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────┐
│        Memory Management Interface               │
│    (Browse, Search, Edit, Delete, Export)        │
└────────────────┬────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────┐
│          Memory Timeline View                    │
│      (Visual History of All Memories)            │
└─────────────────────────────────────────────────┘
```

## Phase II Components

### 1. User Preference System
**Location**: `/components/modals/SettingsModal.tsx` (Memory Tab)
- Detection threshold slider (0-100%)
- Event type toggles (bug-fix, feature, breakthrough, etc.)
- Auto-generation toggle
- Memory template customization
- Notification preferences
- Export format preferences

### 2. SQLite Persistence Layer
**Database**: `/db/memories.db`
**Schema**:
```sql
CREATE TABLE memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  confidence REAL,
  tags TEXT, -- JSON array
  context TEXT, -- JSON object
  checkpoint_id TEXT,
  session_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME -- Soft delete
);

CREATE TABLE memory_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_id INTEGER,
  event_type TEXT,
  event_data TEXT, -- JSON
  confidence REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (memory_id) REFERENCES memories(id)
);

CREATE TABLE user_preferences (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Memory Management Interface
**Location**: `/app/memories/page.tsx`
- Grid/List view toggle
- Search bar with filters
- Sort options (date, confidence, type)
- Bulk operations
- Memory cards with preview
- Quick actions (edit, delete, export)

### 4. Memory Timeline
**Location**: `/components/memory/MemoryTimeline.tsx`
- Chronological visualization
- Interactive timeline
- Zoom and pan controls
- Event clustering
- Detailed view on click

## Implementation Steps

### Step 1: User Preferences (4 hours)
1. Add Memory tab to Settings modal
2. Create preference controls UI
3. Implement preference storage
4. Connect to detection service
5. Add preference validation

### Step 2: Database Setup (3 hours)
1. Install better-sqlite3
2. Create database schema
3. Build migration system
4. Create database service
5. Add connection pooling

### Step 3: API Routes (4 hours)
1. `/api/memories` - CRUD operations
2. `/api/memories/search` - Advanced search
3. `/api/memories/export` - Export functionality
4. `/api/memories/stats` - Analytics
5. `/api/preferences` - User settings

### Step 4: Management UI (6 hours)
1. Create memories page layout
2. Build memory card component
3. Implement search/filter UI
4. Add edit modal
5. Create export dialog
6. Build import functionality

### Step 5: Timeline View (4 hours)
1. Design timeline component
2. Implement D3.js visualization
3. Add interaction handlers
4. Create detail popover
5. Add zoom controls

### Step 6: Integration (3 hours)
1. Connect UI to database
2. Update checkpoint flow
3. Modify detection service
4. Update Discover panel
5. Add navigation links

### Step 7: Testing (2 hours)
1. Unit tests for database
2. API endpoint tests
3. UI component tests
4. Integration tests
5. Performance testing

## Technical Specifications

### Database Service
```typescript
interface MemoryService {
  create(memory: MemoryInput): Promise<Memory>
  update(id: number, updates: Partial<Memory>): Promise<Memory>
  delete(id: number): Promise<void>
  get(id: number): Promise<Memory | null>
  list(options: ListOptions): Promise<PaginatedResult<Memory>>
  search(query: SearchQuery): Promise<Memory[]>
  getStats(): Promise<MemoryStats>
}
```

### Preference Service
```typescript
interface PreferenceService {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  getAll(): Promise<Record<string, any>>
  reset(): Promise<void>
}
```

### Memory Model
```typescript
interface Memory {
  id: number
  title: string
  description: string
  type: MemoryEventType
  confidence: number
  tags: string[]
  context: {
    files: string[]
    commands: string[]
    errors?: string[]
    breakthroughs?: string[]
  }
  checkpointId?: string
  sessionId?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}
```

## Success Criteria
- [ ] Users can customize detection thresholds
- [ ] Memories persist in SQLite database
- [ ] Search returns relevant results
- [ ] Export creates valid JSON/Markdown
- [ ] Timeline renders all memories
- [ ] Edit/delete operations work
- [ ] Performance under 100ms for queries
- [ ] No memory leaks
- [ ] Full test coverage

## Risk Mitigation
- **Database Corruption**: Implement backup/restore
- **Performance**: Add indexes, use pagination
- **Memory Leaks**: Proper cleanup, connection pooling
- **Data Loss**: Soft deletes, version history
- **Migration Issues**: Reversible migrations

## Timeline
- Day 1: User Preferences + Database Setup (7 hours)
- Day 2: API Routes + Management UI (10 hours)
- Day 3: Timeline + Integration + Testing (9 hours)
- Total: 26 hours of focused development

---
*Plan Created: October 2, 2024*
*Target Completion: Phase II in 3 days*
*Methodology: Test-Driven Development with Continuous Integration*