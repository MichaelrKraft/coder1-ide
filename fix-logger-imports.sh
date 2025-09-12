#!/bin/bash

# Files that need logger import
files=(
  "app/api/codebase/suggest/route.ts"
  "app/api/agent/enhanced-context-demo/route.ts"
  "app/api/agents/[agentId]/stop/route.ts"
  "app/api/agents/analyze/route.ts"
)

cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    # Check if file already has logger import
    if ! grep -q "import.*logger" "$file"; then
      # Add logger import after first import line
      sed -i '' "1s/^/import { logger } from '@\/lib\/logger';\n/" "$file"
      echo "Fixed: $file"
    fi
  fi
done