#!/bin/bash

# Post-Edit Hook
# Runs after Claude Code edits a file
# Place in: .claude/hooks/post-edit.sh

set -e

# Receive file path and edit type from stdin
read -r file_path
read -r edit_type  # "single" or "multi"
read -r lines_changed

echo "✅ File edited: $file_path"
echo "   Type: $edit_type | Lines changed: $lines_changed"

# 1. Auto-format the edited file
echo "💅 Auto-formatting..."
extension="${file_path##*.}"

case "$extension" in
  "ts"|"tsx"|"js"|"jsx"|"json")
    if command -v npx &> /dev/null; then
      npx prettier --write "$file_path" 2>/dev/null || echo "⚠️  Prettier not available"
    fi
    ;;
  "sh")
    if command -v shfmt &> /dev/null; then
      shfmt -w "$file_path" 2>/dev/null || echo "⚠️  shfmt not available"
    fi
    ;;
esac

# 2. Run type checking for TypeScript files
if [[ "$extension" == "ts" ]] || [[ "$extension" == "tsx" ]]; then
  echo "📝 Checking types..."
  if command -v npx &> /dev/null; then
    if npx tsc --noEmit "$file_path" 2>&1 | grep -q "error TS"; then
      echo "⚠️  Type errors detected (will not block edit)"
      npx tsc --noEmit "$file_path" 2>&1 | grep "error TS" | head -5
    else
      echo "✅ No type errors"
    fi
  fi
fi

# 3. Run linter on edited file
echo "🧹 Linting..."
if command -v npx &> /dev/null; then
  if npx eslint "$file_path" --fix 2>/dev/null; then
    echo "✅ Linting passed"
  else
    echo "⚠️  Linting issues found (auto-fixed where possible)"
  fi
fi

# 4. Check if related test file should be updated
base_name="${file_path%.*}"
test_extensions=(".test.ts" ".test.tsx" ".spec.ts" ".spec.tsx")

for test_ext in "${test_extensions[@]}"; do
  test_file="${base_name}${test_ext}"
  if [ -f "$test_file" ]; then
    echo ""
    echo "🧪 Related test file exists: $test_file"
    echo "💡 Consider updating tests to cover new changes"
    break
  fi
done

# 5. Run quick tests if available (only for test files)
if [[ "$file_path" == *.test.* ]] || [[ "$file_path" == *.spec.* ]]; then
  echo "🧪 Running tests for edited file..."
  if command -v npm &> /dev/null; then
    if npm run test -- "$file_path" --passWithNoTests 2>/dev/null; then
      echo "✅ Tests passed"
    else
      echo "⚠️  Tests failed (see output above)"
    fi
  fi
fi

# 6. Check file size after edit
file_size=$(wc -c < "$file_path")
if [ "$file_size" -gt 500000 ]; then
  echo "⚠️  Warning: File is large (${file_size} bytes)"
  echo "💡 Consider splitting into smaller modules"
fi

# 7. Count total lines and suggest splitting for large files
line_count=$(wc -l < "$file_path")
if [ "$line_count" -gt 300 ]; then
  echo "⚠️  Warning: File has ${line_count} lines"
  echo "💡 Consider splitting into smaller components/modules (recommended: <200 lines)"
fi

# 8. Check for code smells
echo "🔍 Checking for potential issues..."

# Check for console.log
if grep -q "console\.log" "$file_path"; then
  console_count=$(grep -c "console\.log" "$file_path")
  echo "⚠️  Found $console_count console.log statement(s)"
  echo "💡 Remove debug logs before committing"
fi

# Check for TODO comments
if grep -q "TODO" "$file_path"; then
  todo_count=$(grep -c "TODO" "$file_path")
  echo "📝 Found $todo_count TODO comment(s)"
  grep -n "TODO" "$file_path" | head -3
fi

# Check for FIXME comments
if grep -q "FIXME" "$file_path"; then
  fixme_count=$(grep -c "FIXME" "$file_path")
  echo "🚨 Found $fixme_count FIXME comment(s)"
  grep -n "FIXME" "$file_path" | head -3
fi

# 9. Update file modification timestamp in tracking
edit_log=".claude/edit-history.log"
timestamp=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$timestamp] $file_path ($edit_type, ${lines_changed} lines)" >> "$edit_log"

# 10. Git status if in repository
if git rev-parse --git-dir > /dev/null 2>&1; then
  if git status "$file_path" 2>/dev/null | grep -q "modified"; then
    echo ""
    echo "📊 Git status:"
    git diff --stat "$file_path"
    
    echo ""
    echo "💡 Next steps:"
    echo "  git add $file_path"
    echo "  git commit -m 'Update: [description]'"
  fi
fi

# 11. Check if file is part of a larger refactoring
if [ "$edit_type" = "multi" ]; then
  echo ""
  echo "🔄 Multi-edit detected"
  echo "💡 Ensure all related files are updated consistently"
fi

# 12. Suggest running build if source file
if [[ "$file_path" == *"/src/"* ]] || [[ "$file_path" == *"/app/"* ]]; then
  echo ""
  echo "🔨 Source file modified"
  echo "💡 Consider running build to verify: npm run build"
fi

echo ""
echo "✅ Post-edit checks complete for: $file_path"
exit 0
