# Artifacts Persistent Storage & Agent Integration

## Overview
Implement persistent storage for artifacts and connect them to real agent output so that when AI agents produce files, they automatically appear in the Artifacts inbox.

## Architecture

### Storage Design
- **Metadata**: `data/artifacts/artifacts.json` - stores artifact metadata with status
- **Content**: `data/artifacts/files/` - stores actual artifact files using unique IDs
- **Auto-save**: Changes persist to disk immediately
- **Load on startup**: Metadata loaded from JSON when service initializes

### Agent Integration Points
1. **ai-agent-orchestrator.ts** - When agents produce `GeneratedFile` objects
2. **parallel-exploration** - When exploration produces files
3. **Claude API responses** - When code blocks are extracted

## Todo Items

- [x] Read current artifacts-service.ts structure
- [x] Read ai-agent-orchestrator.ts for agent output flow
- [x] Read claude-api.ts for response handling
- [x] Design persistent storage architecture
- [x] Implement file-based artifact storage in artifacts-service.ts
  - [x] Add file I/O for metadata JSON
  - [x] Add directory management for artifact content
  - [x] Add auto-save on changes
  - [x] Add load-from-disk on init
- [x] Connect ai-agent-orchestrator to artifacts inbox
  - [x] Import artifacts service in orchestrator
  - [x] Call addToInbox() when files are generated
  - [x] Pass agent name and task context
- [x] Add API endpoint to retrieve artifact content
  - [x] GET /api/artifacts/[id]/content
  - [x] Serve actual file content from storage
- [x] Update ArtifactsInbox component for real content preview
- [ ] Test end-to-end flow with AI Team

## Key Files Modified
1. `services/artifacts-service.ts` - Added persistent storage with JSON metadata + file content storage
2. `services/ai-agent-orchestrator.ts` - Connected to artifacts inbox when files are generated
3. `app/api/artifacts/[id]/content/route.ts` - New endpoint to fetch artifact content
4. `components/mission-control/artifacts/ArtifactsInbox.tsx` - Added real content preview with code display

## Review Section

### Changes Summary

**1. Persistent Storage (artifacts-service.ts)**
- Added file system imports (fs, path)
- Created storage directories: `data/artifacts/` for metadata JSON, `data/artifacts/files/` for content
- Added `saveToDisk()` method that auto-saves on every change
- Added `initialize()` method that loads existing artifacts on startup
- Added `saveArtifactContent()` and `getArtifactContent()` methods for file content
- Updated `addToInbox()` to accept optional content parameter
- Removed demo/mock data - starts empty when using persistent storage

**2. Agent Integration (ai-agent-orchestrator.ts)**
- Imported `artifactsService` from artifacts-service
- Added `addFileToArtifactsInbox()` private method
- Added `mapToArtifactType()` helper to convert GeneratedFile types to ArtifactType
- Modified `processAgentResponse()` to call `addFileToArtifactsInbox()` for each generated file
- Artifacts include: agent name, task ID, workflow, MIME type, and file content

**3. Content API Endpoint (app/api/artifacts/[id]/content/route.ts)**
- New GET endpoint to fetch artifact content by ID
- Returns JSON with content for text/code files
- Includes artifact metadata (name, type, mimeType)

**4. UI Preview (ArtifactsInbox.tsx)**
- Added `artifactContent` and `isLoadingContent` state
- Added `fetchArtifactContent()` callback to load content on selection
- Added `handleSelectArtifact()` to fetch content when artifact is selected
- Updated preview panel to show actual code content with syntax highlighting hint
- Added "Copy" button for code content
- Shows loading state while fetching
- Shows appropriate message when no content is stored

### Data Flow
```
Agent generates file → processAgentResponse() → addFileToArtifactsInbox()
                                                        ↓
                                              artifactsService.addToInbox(artifact, content)
                                                        ↓
                                              - Saves metadata to artifacts.json
                                              - Saves content to files/[artifactId]
                                                        ↓
                                              User opens Artifacts in Mission Control
                                                        ↓
                                              - Fetches artifact list from /api/artifacts/inbox
                                              - Clicks artifact → fetches content from /api/artifacts/[id]/content
                                              - Content displayed in preview panel
```

### Storage Location
- Metadata: `/data/artifacts/artifacts.json`
- Files: `/data/artifacts/files/art-XXXXXX`
