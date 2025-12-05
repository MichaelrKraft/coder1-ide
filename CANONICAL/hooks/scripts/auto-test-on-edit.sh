#!/bin/bash
# Auto-Test on Edit Hook
# Automatically runs relevant tests when files are edited
# Supports Jest, Vitest, Pytest, and Go test

# Get the file that was edited from tool input
FILE="$1"

# Skip if no file provided or file doesn't exist
[ -z "$FILE" ] && exit 0
[ ! -f "$FILE" ] && exit 0

# Skip non-source files
case "$FILE" in
    *.md|*.json|*.yaml|*.yml|*.txt|*.log|*.lock)
        exit 0
        ;;
esac

# Detect and run appropriate test framework
if [ -f "package.json" ]; then
    # JavaScript/TypeScript project
    if grep -q '"vitest"' package.json 2>/dev/null; then
        echo "Running Vitest for: $FILE"
        npx vitest run --reporter=basic --passWithNoTests "$FILE" 2>&1 | tail -30
    elif grep -q '"jest"' package.json 2>/dev/null; then
        echo "Running Jest for: $FILE"
        npx jest --findRelatedTests "$FILE" --passWithNoTests 2>&1 | tail -30
    elif grep -q '"mocha"' package.json 2>/dev/null; then
        echo "Running Mocha..."
        npx mocha --grep "$(basename "$FILE" | sed 's/\.[^.]*$//')" 2>&1 | tail -30
    fi
elif [ -f "pytest.ini" ] || [ -f "pyproject.toml" ] || [ -f "setup.py" ]; then
    # Python project
    echo "Running Pytest for: $FILE"
    python -m pytest "$FILE" -v --tb=short 2>&1 | tail -30
elif [ -f "go.mod" ]; then
    # Go project
    DIR=$(dirname "$FILE")
    echo "Running Go tests in: $DIR"
    go test -v "$DIR/..." 2>&1 | tail -30
fi

exit 0
