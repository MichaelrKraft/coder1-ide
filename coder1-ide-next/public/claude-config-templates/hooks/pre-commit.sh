#!/bin/bash

# Pre-Commit Hook
# Runs before every git commit to ensure code quality
# Place in: .claude/hooks/pre-commit.sh

set -e  # Exit on any error

echo "🔍 Running pre-commit checks..."

# 1. Check for TypeScript errors
echo "📝 Checking TypeScript..."
npx tsc --noEmit || {
  echo "❌ TypeScript errors found. Fix them before committing."
  exit 1
}

# 2. Run linter
echo "🧹 Running linter..."
npm run lint || {
  echo "❌ Linting errors found. Run 'npm run lint --fix' to auto-fix."
  exit 1
}

# 3. Run formatter check
echo "💅 Checking code formatting..."
npx prettier --check "**/*.{ts,tsx,js,jsx,json,md}" || {
  echo "❌ Formatting issues found. Run 'npm run format' to fix."
  exit 1
}

# 4. Run unit tests
echo "🧪 Running unit tests..."
npm run test -- --onlyChanged || {
  echo "❌ Tests failed. Fix failing tests before committing."
  exit 1
}

# 5. Check for console.log statements (except in specific files)
echo "🔍 Checking for console.log statements..."
if git diff --cached --name-only | grep -E '\.(ts|tsx|js|jsx)$' | xargs grep -n "console\.log" | grep -v "// keep-console"; then
  echo "⚠️  Warning: console.log statements found. Remove or add '// keep-console' comment if intentional."
  echo "Continue anyway? (y/n)"
  read -r response
  if [[ "$response" != "y" ]]; then
    exit 1
  fi
fi

# 6. Check for large files
echo "📦 Checking file sizes..."
max_size=500000  # 500KB
for file in $(git diff --cached --name-only); do
  if [ -f "$file" ]; then
    size=$(wc -c < "$file")
    if [ "$size" -gt "$max_size" ]; then
      echo "❌ File $file is too large ($size bytes). Maximum is $max_size bytes."
      exit 1
    fi
  fi
done

# 7. Check for sensitive data
echo "🔐 Checking for sensitive data..."
if git diff --cached | grep -iE "(api[_-]?key|password|secret|token|private[_-]?key)" | grep -v "example\|placeholder\|test"; then
  echo "⚠️  Warning: Potential sensitive data found in commit. Review carefully."
  echo "Continue anyway? (y/n)"
  read -r response
  if [[ "$response" != "y" ]]; then
    exit 1
  fi
fi

echo "✅ All pre-commit checks passed!"
exit 0
