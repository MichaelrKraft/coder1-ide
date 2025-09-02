# Documentation Intelligence System - Testing Guide

## Quick Start Testing

### 1. Start the Server
```bash
cd /Users/michaelkraft/autonomous_vibe_interface
npm run dev
```

### 2. Test via Web Interface (Easiest)

Open your browser and go to: `http://localhost:3000/test-docs.html`

This test page provides:
- ✅ Add documentation from URLs
- ✅ Search stored documentation
- ✅ List all stored docs
- ✅ Delete documentation
- ✅ View search results with token counts

### 3. Test via IDE Interface

1. Open the IDE: `http://localhost:3000/ide`
2. Click the **📚 Docs** button in the terminal header
3. Test each tab:
   - **Search Tab**: Search for "useState" or "hooks"
   - **Add Tab**: Add a new documentation URL
   - **Manage Tab**: View and delete stored docs

## API Testing with curl

### Check System Health
```bash
curl http://localhost:3000/api/docs/health
```
Expected: `{"status":"healthy","docsCount":1,"storageDir":"...","timestamp":"..."}`

### List All Documentation
```bash
curl http://localhost:3000/api/docs/list
```

### Search Documentation
```bash
curl -X POST http://localhost:3000/api/docs/search \
  -H "Content-Type: application/json" \
  -d '{"query":"useState","maxResults":5,"maxTokens":2000}'
```

### Add New Documentation
```bash
# Add React useEffect documentation
curl -X POST http://localhost:3000/api/docs/add \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://react.dev/reference/react/useEffect",
    "name": "React useEffect Hook",
    "description": "Official React documentation for useEffect"
  }'

# Add Next.js documentation
curl -X POST http://localhost:3000/api/docs/add \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://nextjs.org/docs/app/building-your-application/routing",
    "name": "Next.js App Router",
    "description": "Next.js 14 routing documentation"
  }'
```

### Get Specific Documentation
```bash
# Get the test doc (replace ID with actual from list)
curl http://localhost:3000/api/docs/test_react_usestate

# Get with full content
curl "http://localhost:3000/api/docs/test_react_usestate?includeContent=true"
```

### Delete Documentation
```bash
# Delete by ID (get ID from list command)
curl -X DELETE http://localhost:3000/api/docs/test_react_usestate
```

## Testing Scenarios

### Scenario 1: Basic Documentation Flow
1. **Add** a documentation page
2. **Search** for keywords from that page
3. **View** the search results with token counts
4. **Inject** into Claude context (IDE only)
5. **Delete** the documentation

### Scenario 2: Token Optimization Testing
1. Add a large documentation page
2. Search with `maxTokens: 500` to see truncation
3. Verify the system respects token limits

### Scenario 3: Multi-Document Search
1. Add 3-5 different documentation pages
2. Search for common terms (e.g., "function", "component")
3. Verify relevance scoring (title matches rank higher)

## Sample Documentation URLs to Test

### React Documentation
- `https://react.dev/reference/react/useState`
- `https://react.dev/reference/react/useEffect`
- `https://react.dev/reference/react/useContext`
- `https://react.dev/learn/thinking-in-react`

### Next.js Documentation
- `https://nextjs.org/docs/app/building-your-application/routing`
- `https://nextjs.org/docs/app/building-your-application/data-fetching`
- `https://nextjs.org/docs/app/api-reference/functions/use-router`

### Node.js Documentation
- `https://nodejs.org/docs/latest/api/fs.html`
- `https://nodejs.org/docs/latest/api/http.html`
- `https://nodejs.org/docs/latest/api/stream.html`

### MDN Web Docs
- `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise`
- `https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API`

## Verify Storage

Check that documentation is being stored:
```bash
ls -la /Users/michaelkraft/autonomous_vibe_interface/data/documentation/
```

You should see JSON files for each stored documentation.

## Expected Behaviors

### ✅ Success Indicators
- Health check returns `"status": "healthy"`
- Search returns results with token counts
- Add documentation shows word count
- List shows all stored documentation
- IDE "Inject to Claude" adds content to terminal

### ⚠️ Common Issues & Solutions

**Issue**: "Failed to fetch URL"
- **Solution**: Check internet connection or try a different URL

**Issue**: "Extracted content too short"
- **Solution**: The page might be JavaScript-heavy. Try documentation sites with static content

**Issue**: Search returns no results
- **Solution**: Ensure documentation is added first, check spelling of search terms

**Issue**: IDE Docs button doesn't appear
- **Solution**: Hard refresh the page (Cmd+Shift+R) to clear cache

## Advanced Testing

### Test Content Extraction Quality
```bash
# View extracted content structure
cat /Users/michaelkraft/autonomous_vibe_interface/data/documentation/*.json | jq '.chunks[0]'
```

### Test Search Relevance
```bash
# Search for exact phrase
curl -X POST http://localhost:3000/api/docs/search \
  -H "Content-Type: application/json" \
  -d '{"query":"const [state, setState]","maxResults":1}'
```

### Test Token Limits
```bash
# Request minimal tokens
curl -X POST http://localhost:3000/api/docs/search \
  -H "Content-Type: application/json" \
  -d '{"query":"react","maxTokens":100}'
```

## Performance Metrics

Expected performance:
- **Add documentation**: 1-5 seconds (depends on page size)
- **Search**: < 100ms for 10 documents
- **List**: < 50ms
- **Delete**: < 50ms

## Integration with Claude

In the IDE Terminal:
1. Search for documentation
2. Click "💉 Inject to Claude"
3. The documentation appears in terminal with clear markers
4. Claude can now reference this documentation in responses

## Troubleshooting

### Reset Everything
```bash
# Remove all stored documentation
rm -rf /Users/michaelkraft/autonomous_vibe_interface/data/documentation/*

# Restart the server
npm run dev
```

### Check Logs
```bash
# Watch server logs for errors
tail -f /Users/michaelkraft/autonomous_vibe_interface/server.log
```

### Verify Routes
```bash
# Should return HTML (test page)
curl http://localhost:3000/test-docs.html

# Should return JSON (API)
curl http://localhost:3000/api/docs/health
```

## Next Steps After Testing

Once basic testing is complete, you can:
1. Add your frequently-used documentation
2. Build a documentation library for your tech stack
3. Use the search feature during development
4. Inject relevant docs when asking Claude questions

---

**Testing Checklist:**
- [ ] Server starts without errors
- [ ] Test page loads at `/test-docs.html`
- [ ] Can add documentation via API
- [ ] Search returns relevant results
- [ ] IDE Docs button appears and works
- [ ] Documentation injection to terminal works
- [ ] Can delete documentation
- [ ] Token limits are respected

This system is now ready for use! The file-based storage works well for alpha testing, and the architecture is ready for vector database upgrade when needed.