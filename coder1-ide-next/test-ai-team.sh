#!/bin/bash

echo "Testing AI Team API..."
curl -X POST http://localhost:3001/api/claude-bridge/spawn \
  -H "Content-Type: application/json" \
  -d '{"requirement": "Build a test component", "sessionId": "test-123"}' \
  | python3 -m json.tool

echo ""
echo "Test complete. If you see JSON output above, the API is working."