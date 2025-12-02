#!/bin/bash

# Pre-Write Hook
# Runs before Claude Code writes to a file
# Place in: .claude/hooks/pre-write.sh

set -e

# Receive file path from stdin
read -r file_path
read -r operation  # "create" or "modify"

echo "📝 Pre-write check for: $file_path ($operation)"

# 1. Check if file is in protected directory
protected_dirs=("node_modules" ".git" "dist" "build" ".next")
for dir in "${protected_dirs[@]}"; do
  if [[ "$file_path" == *"/$dir/"* ]]; then
    echo "❌ Cannot write to protected directory: $dir"
    exit 1
  fi
done

# 2. Backup existing file if modifying
if [ "$operation" = "modify" ] && [ -f "$file_path" ]; then
  backup_dir=".claude/backups/$(date +%Y%m%d)"
  mkdir -p "$backup_dir"
  
  # Create backup with timestamp
  backup_path="$backup_dir/$(basename "$file_path").$(date +%H%M%S).bak"
  cp "$file_path" "$backup_path"
  echo "📦 Backup created: $backup_path"
fi

# 3. Check file size limits
if [ -f "$file_path" ]; then
  max_size=1000000  # 1MB
  size=$(wc -c < "$file_path")
  
  if [ "$size" -gt "$max_size" ]; then
    echo "⚠️  Warning: File is large ($size bytes). Consider splitting into smaller files."
    echo "Continue? (y/n)"
    read -r response
    if [[ "$response" != "y" ]]; then
      exit 1
    fi
  fi
fi

# 4. Check if file is currently open in editor
if command -v lsof &> /dev/null; then
  if lsof "$file_path" 2>/dev/null | grep -q "$file_path"; then
    echo "⚠️  Warning: File is currently open in another program"
    echo "Continue? (y/n)"
    read -r response
    if [[ "$response" != "y" ]]; then
      exit 1
    fi
  fi
fi

# 5. Validate file extension for project
valid_extensions=(".ts" ".tsx" ".js" ".jsx" ".json" ".md" ".css" ".html" ".sh")
extension="${file_path##*.}"
is_valid=false

for ext in "${valid_extensions[@]}"; do
  if [[ "$file_path" == *"$ext" ]]; then
    is_valid=true
    break
  fi
done

if [ "$is_valid" = false ]; then
  echo "⚠️  Warning: Unusual file extension: .$extension"
  echo "Continue? (y/n)"
  read -r response
  if [[ "$response" != "y" ]]; then
    exit 1
  fi
fi

# 6. Check if creating new file in appropriate location
if [ "$operation" = "create" ]; then
  # Suggest appropriate directories based on file type
  case "$extension" in
    "ts"|"tsx")
      if [[ "$file_path" != *"/components/"* ]] && \
         [[ "$file_path" != *"/lib/"* ]] && \
         [[ "$file_path" != *"/app/"* ]] && \
         [[ "$file_path" != *"/services/"* ]]; then
        echo "💡 Suggestion: TypeScript files typically go in:"
        echo "  - components/ (React components)"
        echo "  - lib/ (utilities and services)"
        echo "  - app/ (pages and routes)"
        echo "Continue with current location? (y/n)"
        read -r response
        if [[ "$response" != "y" ]]; then
          exit 1
        fi
      fi
      ;;
    "test.ts"|"test.tsx"|"spec.ts"|"spec.tsx")
      if [[ "$file_path" != *"/__tests__/"* ]] && \
         [[ "$(dirname "$file_path")" != *"/tests/"* ]]; then
        echo "💡 Suggestion: Test files typically go in:"
        echo "  - __tests__/ directory"
        echo "  - Same directory as the file being tested"
        echo "Continue with current location? (y/n)"
        read -r response
        if [[ "$response" != "y" ]]; then
          exit 1
        fi
      fi
      ;;
  esac
fi

# 7. Ensure parent directory exists
parent_dir=$(dirname "$file_path")
if [ ! -d "$parent_dir" ]; then
  echo "📁 Creating parent directory: $parent_dir"
  mkdir -p "$parent_dir"
fi

# 8. Check for naming conventions
filename=$(basename "$file_path")
case "$extension" in
  "tsx")
    # Component files should be PascalCase
    if [[ ! "$filename" =~ ^[A-Z][a-zA-Z0-9]*\.tsx$ ]] && \
       [[ "$filename" != "page.tsx" ]] && \
       [[ "$filename" != "layout.tsx" ]] && \
       [[ "$filename" != "error.tsx" ]] && \
       [[ "$filename" != "loading.tsx" ]]; then
      echo "⚠️  Warning: React component files should use PascalCase (e.g., MyComponent.tsx)"
      echo "Continue? (y/n)"
      read -r response
      if [[ "$response" != "y" ]]; then
        exit 1
      fi
    fi
    ;;
  "ts")
    # Non-component TS files should be kebab-case
    if [[ "$filename" =~ [A-Z] ]] && [[ "$filename" != "README.md" ]]; then
      echo "💡 Suggestion: Non-component TypeScript files typically use kebab-case"
      echo "Example: user-service.ts instead of UserService.ts"
    fi
    ;;
esac

# 9. Log the write operation
write_log=".claude/write-history.log"
timestamp=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$timestamp] $operation: $file_path" >> "$write_log"

echo "✅ Pre-write checks passed for: $file_path"
exit 0
