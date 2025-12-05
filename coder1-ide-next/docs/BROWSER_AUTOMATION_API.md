# Browser Automation API - Mission Control

Complete browser automation service for Coder1 IDE Mission Control with natural language support and Playwright integration.

## Files Created

### Service Layer
- `/services/browser-automation-service.ts` - Core automation service

### API Routes
- `/app/api/browser-automation/execute/route.ts` - Execute tests
- `/app/api/browser-automation/record/route.ts` - Recording functionality
- `/app/api/browser-automation/history/route.ts` - Test history

## Quick Start

### Execute a Test (Natural Language)

```typescript
// POST /api/browser-automation/execute
const response = await fetch('/api/browser-automation/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    command: "Go to google.com and click the search button",
    mode: 'natural-language'
  })
});

const { testId, status, results } = await response.json();
```

### Start Recording

```typescript
// POST /api/browser-automation/record
const response = await fetch('/api/browser-automation/record', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'my-session' // optional
  })
});

const { sessionId, status } = await response.json();
```

### Stop Recording

```typescript
// DELETE /api/browser-automation/record?sessionId=xxx
const response = await fetch(`/api/browser-automation/record?sessionId=${sessionId}`, {
  method: 'DELETE'
});

const { actions, playwrightCode } = await response.json();
```

### Get Test History

```typescript
// GET /api/browser-automation/history?limit=10
const response = await fetch('/api/browser-automation/history?limit=10');
const { history, stats } = await response.json();
```

## Natural Language Commands Supported

### Navigation
- "Go to google.com"
- "Navigate to https://example.com"
- "Visit github.com"
- "Open twitter.com"

### Clicking
- "Click the login button"
- "Press submit"
- "Tap on search"

### Filling Forms
- "Fill email with test@example.com"
- "Type 'John Doe' as name"
- "Enter 'password123' in password"

### Screenshots
- "Take a screenshot"
- "Capture the page"
- "Snap a picture"

### Waiting
- "Wait 5 seconds"
- "Pause for 2000 milliseconds"

### Hovering
- "Hover over menu"
- "Mouseover settings"

### Selecting
- "Select 'Option 1' from dropdown"
- "Choose 'USA' from country"

## API Reference

### POST /api/browser-automation/execute

Execute a browser automation test.

**Request Body:**
```typescript
{
  command: string;              // Natural language or Playwright code
  mode: 'natural-language' | 'playwright-code';
  sessionId?: string;           // Optional: for recording
}
```

**Response:**
```typescript
{
  testId: string;
  status: 'success' | 'failed' | 'running';
  results: {
    duration: number;
    actions: PlaywrightAction[];
    screenshots: string[];
    playwrightCode: string;
  };
  recording?: {
    sessionId: string;
    actionsRecorded: number;
  };
}
```

### GET /api/browser-automation/execute?testId=xxx

Get status of a running or completed test.

**Response:**
```typescript
{
  testId: string;
  status: 'success' | 'failed' | 'running';
  results: {
    duration: number;
    actions: PlaywrightAction[];
    screenshots: string[];
    error?: string;
    playwrightCode: string;
  };
}
```

### POST /api/browser-automation/record

Start recording browser actions.

**Request Body:**
```typescript
{
  sessionId?: string;  // Optional: auto-generated if not provided
}
```

**Response:**
```typescript
{
  sessionId: string;
  status: 'recording';
  startTime: Date;
  message: string;
}
```

### DELETE /api/browser-automation/record?sessionId=xxx

Stop recording and get recorded actions.

**Response:**
```typescript
{
  sessionId: string;
  status: 'stopped';
  actionsRecorded: number;
  actions: PlaywrightAction[];
  playwrightCode: string;
  message: string;
}
```

### GET /api/browser-automation/history

Get test execution history.

**Query Parameters:**
- `limit` (number) - Max results to return (default: 50)
- `status` (string) - Filter by status: 'success' | 'failed' | 'running'

**Response:**
```typescript
{
  history: Array<{
    testId: string;
    status: string;
    duration: number;
    actionsCount: number;
    screenshotsCount: number;
    error?: string;
    preview: {
      type: string;
      description: string;
    } | null;
  }>;
  stats: {
    total: number;
    success: number;
    failed: number;
    running: number;
    averageDuration: number;
  };
  meta: {
    returned: number;
    limit: number;
    filter: string;
  };
}
```

### DELETE /api/browser-automation/history?confirm=true

Clear all test history.

**Response:**
```typescript
{
  message: string;
  cleared: boolean;
}
```

## Integration with Playwright MCP

The service is designed to work with Playwright MCP tools. To actually execute browser actions, integrate the MCP tools in your API route:

```typescript
// Example: In execute/route.ts
import { mcp__playwright__playwright_navigate } from '@/mcp-tools';

// Execute navigate action
await mcp__playwright__playwright_navigate({
  url: action.url,
  headless: false,
  width: 1920,
  height: 1080
});
```

## Type Definitions

All types are imported from `/types/mission-control.ts`:

```typescript
interface PlaywrightAction {
  type: 'navigate' | 'click' | 'fill' | 'screenshot' | 'hover' | 'select' | 'wait' | 'evaluate';
  selector?: string;
  value?: string;
  url?: string;
  timeout?: number;
  code?: string;
}

interface BrowserSession {
  id: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  lastScreenshot?: string;
  history: BrowserCommand[];
}

interface BrowserCommand {
  id: string;
  type: 'navigate' | 'click' | 'fill' | 'screenshot' | 'custom';
  input: string;
  result?: CommandResult;
  timestamp: Date;
}

interface CommandResult {
  success: boolean;
  screenshot?: string;
  error?: string;
  playwrightCode?: string;
}
```

## Error Handling

All endpoints return proper HTTP status codes:

- `200` - Success
- `400` - Bad request (missing parameters, invalid input)
- `404` - Not found (test/session doesn't exist)
- `500` - Server error

Error responses follow this format:
```typescript
{
  error: string;
  details?: string;
  suggestions?: string[];
}
```

## Next Steps

1. **Frontend Integration**: Create UI components in Mission Control to use these APIs
2. **MCP Integration**: Connect actual Playwright MCP tools for real browser automation
3. **Screenshots**: Implement screenshot capture and storage
4. **Test Persistence**: Add database storage for long-term test history

## Example Usage Flow

```typescript
// 1. Start recording
const recordResp = await fetch('/api/browser-automation/record', {
  method: 'POST',
  body: JSON.stringify({})
});
const { sessionId } = await recordResp.json();

// 2. Execute commands (they get recorded)
await fetch('/api/browser-automation/execute', {
  method: 'POST',
  body: JSON.stringify({
    command: 'Go to example.com',
    mode: 'natural-language',
    sessionId
  })
});

await fetch('/api/browser-automation/execute', {
  method: 'POST',
  body: JSON.stringify({
    command: 'Click the login button',
    mode: 'natural-language',
    sessionId
  })
});

// 3. Stop recording and get Playwright code
const stopResp = await fetch(`/api/browser-automation/record?sessionId=${sessionId}`, {
  method: 'DELETE'
});
const { playwrightCode } = await stopResp.json();

// Now you have reusable Playwright code!
console.log(playwrightCode);
```

---

*Created: December 3, 2025*
*Version: 1.0.0*
