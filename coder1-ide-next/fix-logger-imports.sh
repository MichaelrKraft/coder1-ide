#!/bin/bash

# Find all TypeScript files in app/api that use logger but don't import it
echo "Finding files that use logger without importing it..."

files_to_fix=()

for file in $(find /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/app/api -name "*.ts" -type f); do
  # Check if file uses logger
  if grep -q "logger\?*\." "$file" 2>/dev/null; then
    # Check if it doesn't import logger
    if ! grep -q "import.*logger" "$file" 2>/dev/null; then
      files_to_fix+=("$file")
    fi
  fi
done

echo "Found ${#files_to_fix[@]} files to fix"

# Fix each file
for file in "${files_to_fix[@]}"; do
  echo "Fixing: $file"
  
  # Add import at the beginning of the file (after the first import if exists)
  if grep -q "^import" "$file"; then
    # Find the line number of the first import statement
    first_import_line=$(grep -n "^import" "$file" | head -1 | cut -d: -f1)
    
    # Insert the logger import after the first import
    sed -i '' "${first_import_line}a\\
import { logger } from '@/lib/logger';
" "$file"
  else
    # No imports exist, add at the beginning
    sed -i '' "1i\\
import { logger } from '@/lib/logger';\\
" "$file"
  fi
done

echo "Done! Fixed ${#files_to_fix[@]} files"