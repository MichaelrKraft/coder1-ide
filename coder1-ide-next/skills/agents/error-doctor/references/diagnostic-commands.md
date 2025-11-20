# Diagnostic Commands

Essential terminal commands for error diagnosis and troubleshooting.

## Node.js & npm

### Check Installation

```bash
# Node version
node --version
node -v

# npm version
npm --version
npm -v

# Check if Node is installed
which node

# Check npm global location
npm root -g
```

### Package Investigation

```bash
# List installed packages
npm list
npm ls

# Check specific package version
npm list lodash
npm ls lodash

# Check for outdated packages
npm outdated

# View package info
npm view lodash
npm info lodash

# Check package installation location
npm list -g --depth=0
```

### Dependency Troubleshooting

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Install with legacy peer deps
npm install --legacy-peer-deps

# Force installation
npm install --force

# Audit dependencies for vulnerabilities
npm audit
npm audit fix

# Deduplicate dependencies
npm dedupe

# Prune unused packages
npm prune
```

## TypeScript

### Type Checking

```bash
# Check types without building
npx tsc --noEmit

# Check specific file
npx tsc --noEmit src/Component.tsx

# Show type info
npx tsc --showConfig

# List files that will be compiled
npx tsc --listFiles

# Trace module resolution
npx tsc --traceResolution
```

### Configuration

```bash
# Initialize tsconfig.json
npx tsc --init

# Validate tsconfig.json
npx tsc --showConfig

# Find tsconfig.json
find . -name "tsconfig.json"
```

## Build Tools

### Vite

```bash
# Check Vite version
npx vite --version

# Build with debug info
npx vite build --debug

# Preview production build
npx vite preview

# Clear cache
rm -rf node_modules/.vite
```

### Webpack

```bash
# Check Webpack version
npx webpack --version

# Build with stats
npx webpack --stats

# Analyze bundle
npx webpack-bundle-analyzer dist/stats.json
```

## Git

### Status and Diffs

```bash
# Current status
git status

# Show changes
git diff

# Show staged changes
git diff --staged

# Show file history
git log -- path/to/file

# Show last commit
git show HEAD

# Check remote branches
git branch -r
```

### Troubleshooting

```bash
# Discard local changes
git checkout -- path/to/file

# Unstage file
git reset HEAD path/to/file

# See what changed between commits
git diff commit1 commit2

# Find when bug was introduced
git bisect start
git bisect bad HEAD
git bisect good commit-hash
```

## File System

### Find Files

```bash
# Find file by name
find . -name "Component.tsx"

# Find files by extension
find . -name "*.tsx"

# Find in specific directory
find src/ -name "*.ts"

# Case-insensitive search
find . -iname "component.tsx"
```

### Search Content

```bash
# Search for text in files
grep -r "searchTerm" src/

# Search with line numbers
grep -rn "searchTerm" src/

# Search in specific file types
grep -r --include="*.tsx" "searchTerm" src/

# Case-insensitive search
grep -ri "searchterm" src/

# Show context around match
grep -rn -A 2 -B 2 "searchTerm" src/
```

### File Information

```bash
# File size and details
ls -lh path/to/file

# Disk usage
du -sh node_modules/

# Count lines in file
wc -l path/to/file

# Show file type
file path/to/file
```

## Process Management

### Port Usage

```bash
# Check what's using port 3000
lsof -i :3000

# Kill process on port
lsof -ti :3000 | xargs kill -9

# List all listening ports
lsof -i -P -n | grep LISTEN

# Check specific process
ps aux | grep node
```

### System Resources

```bash
# Memory usage
free -h  # Linux
vm_stat  # macOS

# CPU usage
top

# Disk space
df -h

# Process tree
pstree
```

## Network & API

### Test Endpoints

```bash
# GET request
curl http://localhost:3000/api/users

# POST request
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John"}'

# With authentication
curl -H "Authorization: Bearer token" \
  http://localhost:3000/api/protected

# Save response to file
curl http://localhost:3000/api/data > response.json

# Show response headers
curl -I http://localhost:3000

# Follow redirects
curl -L http://localhost:3000
```

### DNS and Connectivity

```bash
# Check DNS resolution
nslookup example.com

# Test connectivity
ping example.com

# Trace route
traceroute example.com

# Check open ports
nc -zv example.com 80 443
```

## Logs and Debugging

### View Logs

```bash
# Tail logs
tail -f log/development.log

# Last 100 lines
tail -n 100 log/development.log

# Follow logs with grep
tail -f log/development.log | grep ERROR

# View with timestamps
tail -f log/development.log | ts
```

### Process Debugging

```bash
# Node debug mode
node --inspect app.js

# Enable source maps
node --enable-source-maps app.js

# Increase memory limit
node --max-old-space-size=4096 app.js

# Show deprecation warnings
node --trace-deprecation app.js
```

## Environment

### Check Environment

```bash
# Show all env variables
env

# Check specific variable
echo $NODE_ENV
echo $PATH

# List .env files
find . -name ".env*"

# Show .env contents (be careful!)
cat .env
```

### Path Resolution

```bash
# Current directory
pwd

# Resolve symlink
readlink -f path/to/link

# Find executable location
which node
which npm
```

## Testing

### Jest

```bash
# Run all tests
npm test

# Run specific test file
npm test -- Component.test.tsx

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Update snapshots
npm test -- -u

# Show test names
npm test -- --verbose
```

### ESLint

```bash
# Lint all files
npx eslint .

# Lint specific file
npx eslint src/Component.tsx

# Auto-fix issues
npx eslint --fix src/

# Show rule names
npx eslint --debug src/
```

## Cache Management

### Clear All Caches

```bash
# npm cache
npm cache clean --force

# Vite cache
rm -rf node_modules/.vite

# Next.js cache
rm -rf .next

# TypeScript cache
rm -rf node_modules/.cache/ts-loader

# Jest cache
jest --clearCache

# Clear all
rm -rf node_modules package-lock.json .next .cache dist build
npm install
```

## Performance Analysis

### Bundle Analysis

```bash
# Webpack bundle analyzer
npx webpack-bundle-analyzer dist/stats.json

# Source map explorer
npx source-map-explorer dist/*.js

# Size limit check
npx size-limit
```

### Time Analysis

```bash
# Time command execution
time npm run build

# Detailed build timing
npm run build -- --profile

# TypeScript build info
npx tsc --diagnostics
```

## Quick Diagnostics Checklist

```bash
# 1. Check versions
node --version && npm --version

# 2. Check installation
npm list | head -n 20

# 3. Check TypeScript (if applicable)
npx tsc --noEmit

# 4. Check for running processes
lsof -i :3000

# 5. Check disk space
df -h

# 6. Check recent changes
git diff --name-only HEAD~1

# 7. Verify build
npm run build

# 8. Check logs
tail -n 50 log/development.log
```

These commands cover the majority of diagnostic needs when troubleshooting errors.
