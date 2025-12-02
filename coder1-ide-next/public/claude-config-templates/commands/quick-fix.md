# /quick-fix Command

Quickly diagnose and fix common coding issues with minimal context.

## Usage

```
/quick-fix <description of the problem>
```

## What This Command Does

When you run `/quick-fix`, Claude will:
1. Analyze the error or issue description
2. Identify the most likely cause
3. Propose a targeted fix
4. Explain why the issue occurred
5. Suggest prevention strategies

## Common Use Cases

### Fixing Type Errors

```
/quick-fix TypeScript error: Property 'name' does not exist on type 'User'

Response:
The error suggests you're accessing a property that TypeScript doesn't recognize.

Likely cause: Type definition is incomplete or incorrect

Quick fix:
// Update the User interface
interface User {
  id: string;
  email: string;
  name: string;  // ← Add missing property
}

Prevention: Keep type definitions in sync with actual data structures
```

### Fixing React Errors

```
/quick-fix React warning: Can't perform state update on unmounted component

Response:
This warning occurs when an async operation completes after component unmounts.

Likely cause: Missing cleanup in useEffect

Quick fix:
useEffect(() => {
  let cancelled = false;
  
  fetchData().then(data => {
    if (!cancelled) {  // ← Check if still mounted
      setData(data);
    }
  });
  
  return () => {
    cancelled = true;  // ← Cleanup function
  };
}, []);

Prevention: Always add cleanup for async operations in useEffect
```

### Fixing API Errors

```
/quick-fix API returns 401 Unauthorized but token exists

Response:
Getting 401 despite having token suggests token format or expiration issue.

Likely causes:
1. Token not included in Authorization header
2. Token expired
3. Token format incorrect

Quick fixes:

1. Check header format:
fetch('/api/data', {
  headers: {
    'Authorization': `Bearer ${token}`  // ← Ensure "Bearer " prefix
  }
});

2. Check token expiration:
const decoded = jwtDecode(token);
if (decoded.exp * 1000 < Date.now()) {
  // Token expired, refresh it
}

3. Verify token in network tab:
Open DevTools → Network → Click request → Check Headers

Prevention: Implement automatic token refresh before expiration
```

### Fixing Import Errors

```
/quick-fix Module not found: Can't resolve 'lodash'

Response:
Import error indicates missing package dependency.

Quick fix:
npm install lodash
# or
yarn add lodash

If error persists:
1. Clear node_modules and reinstall:
   rm -rf node_modules package-lock.json
   npm install

2. Check import path is correct:
   import _ from 'lodash';  // ← Default import
   // not: import _ from 'lodash/';

Prevention: Add to package.json and commit lock file
```

## When to Use /quick-fix

✅ **Use when:**
- You have a specific error message
- You need a fast solution to continue working
- The problem is isolated and well-defined
- You want to understand a common error pattern

❌ **Don't use when:**
- Problem requires architecture changes
- You need comprehensive refactoring
- Issue spans multiple files/systems
- You want to explore multiple solutions

## Quick Fix Categories

### 1. Syntax Errors
- Missing brackets, parentheses, semicolons
- Typos in keywords
- Incorrect operator usage

### 2. Type Errors
- Type mismatches
- Missing properties
- Incorrect generic types
- Null/undefined handling

### 3. Runtime Errors
- Reference errors (undefined variables)
- Type errors (accessing properties on null)
- Network errors (API failures)
- State update errors (React)

### 4. Logic Errors
- Off-by-one errors
- Incorrect conditionals
- Wrong calculations
- Unexpected behavior

### 5. Performance Issues
- Unnecessary re-renders
- Memory leaks
- Slow database queries
- Inefficient algorithms

## Response Format

Every `/quick-fix` response includes:

1. **Problem Identification**: What the error means
2. **Likely Cause**: Why it's happening
3. **Quick Fix**: Code solution with comments
4. **Prevention**: How to avoid in the future
5. **Related Issues**: Similar problems to watch for

## Advanced Usage

### Include Context

```
/quick-fix Button onClick not working
Context: React component, TypeScript, handler is async
```

### Include Error Message

```
/quick-fix 
Error: Cannot read property 'map' of undefined
File: components/UserList.tsx
Line: 42
```

### Include What You've Tried

```
/quick-fix Login form not submitting
Tried:
- Added console.log, sees button click
- Form has onSubmit handler
- No errors in console
```

## Examples of Great Quick Fixes

### Example 1: State Update Not Reflecting

**Problem:**
```typescript
const [count, setCount] = useState(0);

const increment = () => {
  setCount(count + 1);
  console.log(count); // Still shows old value!
};
```

**Quick Fix:**
```typescript
// State updates are asynchronous!
// Use useEffect to see updated value:

const increment = () => {
  setCount(count + 1);
};

useEffect(() => {
  console.log('Count updated:', count); // ← See new value here
}, [count]);

// Or use functional update to get current value:
const increment = () => {
  setCount(prevCount => {
    console.log('New count:', prevCount + 1);
    return prevCount + 1;
  });
};
```

### Example 2: Async/Await Error

**Problem:**
```typescript
// Error: await is only valid in async functions
function fetchData() {
  const response = await fetch('/api/data');
  return response.json();
}
```

**Quick Fix:**
```typescript
// Add 'async' keyword to function declaration:
async function fetchData() {  // ← Add async
  const response = await fetch('/api/data');
  return response.json();
}
```

### Example 3: Dependency Warning

**Problem:**
```
React Hook useEffect has a missing dependency: 'userId'
```

**Quick Fix:**
```typescript
// ❌ Before
useEffect(() => {
  fetchUser(userId);
}, []); // Missing userId dependency

// ✅ After
useEffect(() => {
  fetchUser(userId);
}, [userId]); // ← Add userId to dependency array
```

## Pro Tips

1. **Copy exact error messages** - Helps identify issue faster
2. **Include file names and line numbers** - Provides context
3. **Mention what you've tried** - Avoids repeated suggestions
4. **Specify your stack** - React vs Vue, Node vs Deno, etc.
5. **Keep it focused** - One issue per /quick-fix

## Keyboard Shortcut

Set up a shortcut in your IDE:
```
Cmd+K, Cmd+Q → /quick-fix 
```

Remember: Quick fixes are for speed. For complex issues, use `/debug` or `/implement` commands instead.
