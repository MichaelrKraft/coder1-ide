# Chrome Extension API Endpoints

## Working Endpoints (Port 3001)

### Save Component
**Endpoint**: `POST http://localhost:3001/api/components-beta/save`
```json
{
  "title": "Component Name",
  "url": "https://source-website.com",
  "html": "<div>HTML content</div>",
  "css": ".class { styles }",
  "screenshot": "base64_image_data", // optional
  "tags": ["tag1", "tag2"],
  "category": "category-name"
}
```

### List Components
**Endpoint**: `GET http://localhost:3001/api/components-beta/list`

### Get Component by ID
**Endpoint**: `GET http://localhost:3001/api/components-beta/component/{id}`

### Generate Code for Component
**Endpoint**: `GET http://localhost:3001/api/components-beta/generate-code/{id}`

## Chrome Extension Configuration

If your Chrome extension is trying to use `/components-beta/api/save`, update it to use the full path:
- ❌ OLD: `/components-beta/api/save`
- ✅ NEW: `/api/components-beta/save`

## About the Error Message

The error "Failed to capture component child.last.name...error" is from the Chrome extension itself when it tries to access nested DOM properties that don't exist on certain elements. This is not related to our backend API.

## Testing

You can test the save endpoint with curl:
```bash
curl -X POST http://localhost:3001/api/components-beta/save \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Component",
    "url": "https://example.com",
    "html": "<div>Test</div>",
    "css": ".test { color: red; }",
    "tags": ["test"],
    "category": "test"
  }'
```

## Server Status
- Server running on port 3001
- CSS loading correctly
- All API endpoints functional