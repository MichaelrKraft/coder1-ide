#!/bin/bash

echo "Testing ParaThinker API endpoints..."
echo ""

# Test 1: Start a parallel reasoning session
echo "1. Starting ParaThinker session..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/beta/parallel-reasoning/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "problem": "How do I center a div in CSS?",
    "strategies": ["analytical", "pattern_matching", "first_principles"]
  }')

SESSION_ID=$(echo $RESPONSE | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
  echo "❌ Failed to start session"
  echo "Response: $RESPONSE"
  exit 1
else
  echo "✅ Session started: $SESSION_ID"
fi

echo ""
echo "2. Checking session status..."
sleep 2

STATUS=$(curl -s http://localhost:3001/api/beta/parallel-reasoning/status/$SESSION_ID)
echo "Status response: $STATUS"

echo ""
echo "3. Waiting for completion (max 10 seconds)..."
for i in {1..10}; do
  sleep 1
  STATUS=$(curl -s http://localhost:3001/api/beta/parallel-reasoning/status/$SESSION_ID | grep -o '"status":"[^"]*' | cut -d'"' -f4)
  echo -n "."
  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    break
  fi
done

echo ""
echo ""
echo "4. Getting results..."
RESULTS=$(curl -s http://localhost:3001/api/beta/parallel-reasoning/results/$SESSION_ID)
echo "Results: $RESULTS" | head -c 500
echo "..."

echo ""
echo "✅ API test complete!"