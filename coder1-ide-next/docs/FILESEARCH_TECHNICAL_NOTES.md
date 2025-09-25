# File Search Technical Documentation

**Component**: File Search (formerly DeepContext)  
**Last Updated**: September 25, 2025  
**Status**: Functional with limitations

## Architecture Overview

```
User Interface (DeepContextPanel.tsx)
    ↓
Service Layer (deepcontext-service.ts)
    ↓
API Endpoint (/api/deepcontext/file-search)
    ↓
File System Search (fs.readdir + regex)
    ↓
Results Display + Click Handler
    ↓
File API (/api/files/read)
    ↓
Monaco Editor Display
```

## Component Relationships

### 1. DeepContextPanel Component
- **Location**: `/components/deepcontext/DeepContextPanel.tsx`
- **Props**:
  - `activeFile?: string | null` - Currently active file in editor
  - `onOpenFile?: (path: string, line?: number) => void` - Callback to open files
- **Key Functions**:
  - `handleSearch()` - Triggers search via service
  - `handleResultClick()` - Calls onOpenFile prop with file path

### 2. PreviewPanel Integration
- **Location**: `/components/preview/PreviewPanel.tsx`
- **Integration Point**: Line 245-250
- **Props Passed**:
  ```tsx
  <DeepContextPanel 
    activeFile={activeFile}
    onOpenFile={onOpenFile || ((path: string, line?: number) => {
      console.log(`Request to open file: ${path}${line ? ` at line ${line}` : ''}`);
    })}
  />
  ```

### 3. IDE Page Handler
- **Location**: `/app/ide/page.tsx`
- **Function**: `handleOpenFileFromPath` (lines 383-424)
- **Key Logic**:
  ```typescript
  // Critical path cleaning to fix 403 errors
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  const encodedPath = encodeURIComponent(cleanPath);
  const response = await fetch(`/api/files/read?path=${encodedPath}`);
  ```

## API Endpoints

### `/api/deepcontext/file-search`
- **Method**: POST
- **Request Body**:
  ```json
  {
    "query": "search term",
    "maxResults": 20,
    "fileTypes": []
  }
  ```
- **Response**:
  ```json
  [{
    "file": "/path/to/file.ts",
    "line": 42,
    "content": "matching line content",
    "relevance": 0.95,
    "context": "surrounding lines",
    "type": "function" | "class" | "variable" | "import" | "comment"
  }]
  ```

### `/api/files/read`
- **Method**: GET
- **Query Parameters**: `?path=encoded/file/path`
- **Security**: Validates against ALLOWED_PATHS and BLOCKED_FILES
- **Response**:
  ```json
  {
    "success": true,
    "content": "file contents",
    "path": "file/path",
    "server": "unified-server"
  }
  ```

## Security Configuration

### Allowed Directories
Located in `/app/api/files/read/route.ts`:
```typescript
const ALLOWED_PATHS = [
    'coder1-ide-next',
    'CANONICAL',
    'src',
    'components',
    'lib',
    'pages',
    'public',
    'app',
    'services',
    'utils',
    'types',
    'hooks',
    'stores',
    '.claude-parallel-dev' // Added Sept 25, 2025
];
```

### Blocked Files
```typescript
const BLOCKED_FILES = [
    '.env',
    '.env.local',
    '.env.production',
    '.env.development',
    'package-lock.json',
    'yarn.lock',
    '.git',
    'node_modules',
    '.ssh',
    'id_rsa',
    'id_dsa',
    'config',
    'credentials'
];
```

## Search Implementation Details

### Current Search Logic
From `/api/deepcontext/file-search/route.ts`:
```typescript
// Simple text matching hierarchy
if (lineLower.includes(query)) {
    relevance = 1.0;  // Exact substring match
} else if (searchRegex.test(line)) {
    relevance = 0.8;  // Flexible regex match
} else if (new RegExp(`\\b${query}\\b`, 'i').test(line)) {
    relevance = 0.9;  // Word boundary match
}
```

### File Type Detection
```typescript
// Heuristic type detection
if (line.match(/^\s*(function|const|let|var|class|interface|type|enum)/)) {
    matchType = line.includes('function') ? 'function' : 
               line.includes('class') ? 'class' : 'variable';
} else if (line.match(/^\s*(import|require|from)/)) {
    matchType = 'import';
} else if (line.match(/^\s*(\/\/|\/\*|\*|#)/)) {
    matchType = 'comment';
}
```

## Known Issues & Fixes

### Issue 1: Path Resolution (FIXED)
- **Problem**: Search returned paths like `/README.md`
- **Cause**: Leading "/" treated as absolute filesystem path
- **Fix**: Strip leading "/" before API call
- **Location**: `handleOpenFileFromPath` in IDE page

### Issue 2: Directory Access (FIXED)
- **Problem**: `.claude-parallel-dev` files returned 403
- **Cause**: Directory not in ALLOWED_PATHS
- **Fix**: Added to allowed paths list
- **Location**: `/api/files/read/route.ts`

### Issue 3: Monaco Editor Chunks (FIXED)
- **Problem**: ChunkLoadError for Monaco editor modules
- **Cause**: Missing webpack plugin configuration
- **Fix**: Added monaco-editor-webpack-plugin to next.config.js
- **Dependencies**: `npm install --save-dev monaco-editor-webpack-plugin`

## Performance Characteristics

### Search Performance
- **File Limit**: 100 files per search (MAX_FILES_TO_PROCESS)
- **Depth Limit**: 8 directory levels
- **Timeout**: 10 seconds for search operation
- **Result Limit**: 20 results by default

### Excluded Directories
Automatically skips:
- node_modules
- .git, .next, dist, build, out
- coverage, .cache, vendor
- tmp, temp, ARCHIVE
- backups, exports, summaries

## Mock vs Real Implementation

### What's Real
- File system traversal and reading
- Text pattern matching
- File opening via API
- Result display and formatting

### What's Mock
- "AI-powered" claims
- Semantic understanding
- Code relationships
- Similar code detection
- The entire "DeepContext is analyzing" animation

### Service Layer Deception
The `deepcontext-service.ts` includes:
```typescript
// Fake installation process
async installDeepContext(): Promise<void> {
    setTimeout(() => {
        localStorage.setItem('deepcontext-installed', 'true');
        this.status.installed = true;
        this.emit('install:complete');
        this.startIndexing();
    }, 3000); // Just waits 3 seconds
}
```

## Future Real Implementation Requirements

### DeepContext MCP Integration
1. **Install MCP Server**:
   ```bash
   npm install -g @wildcard/deepcontext-mcp
   ```

2. **Configure MCP**:
   ```json
   {
     "mcpServers": {
       "deepcontext": {
         "command": "deepcontext-mcp",
         "args": ["--project", "/path/to/project"]
       }
     }
   }
   ```

3. **Required Infrastructure**:
   - Tree-sitter parsers for each language
   - Vector database (PostgreSQL with pgvector)
   - Embedding generation service
   - MCP client integration
   - Background indexing workers

4. **Resource Requirements**:
   - ~500MB+ RAM for indexing
   - CPU intensive during initial index
   - Storage for vector embeddings
   - Network for embedding API calls

## Testing the Feature

### Basic Functionality Test
1. Open IDE at http://localhost:3001/ide
2. Click "File Search" tab in right panel
3. Search for common terms: "import", "function", "README"
4. Click results - should open in editor

### Edge Cases to Test
- Files with special characters in names
- Very long file paths
- Binary files (should be skipped)
- Empty search query (should show error)
- Non-existent search terms (should show "No results")

### Performance Test
```bash
# Create many test files
for i in {1..100}; do
  echo "test content $i" > test-file-$i.txt
done

# Search for "test" - should complete within 10 seconds
```

## Debugging Tips

### Check Console Logs
Key log patterns to watch:
- `🔍 DeepContext search called with query:`
- `📁 Opening file:` 
- `📁 Cleaned path:`
- `✅ File search API succeeded`

### Common Failure Points
1. **403 on file open**: Check ALLOWED_PATHS
2. **No results**: Check EXCLUDED_DIRS
3. **Slow search**: Reduce MAX_FILES_TO_PROCESS
4. **Missing files**: Check SEARCHABLE_EXTENSIONS

### API Testing
```bash
# Test search API directly
curl -X POST http://localhost:3001/api/deepcontext/file-search \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "maxResults": 5}'

# Test file read API
curl "http://localhost:3001/api/files/read?path=README.md"
```

## Maintenance Notes

### When Adding New Project Directories
Update ALLOWED_PATHS in `/app/api/files/read/route.ts`

### When Changing Search Behavior
Modify `/api/deepcontext/file-search/route.ts`

### When Updating UI Labels
Check both:
- `/components/deepcontext/DeepContextPanel.tsx`
- `/components/preview/PreviewPanel.tsx`

### Version History
- **Sept 25, 2025**: Renamed to "File Search", fixed path resolution
- **Sept 24, 2025**: Initial implementation as "DeepContext"
- **Future**: Plan for real semantic search via MCP