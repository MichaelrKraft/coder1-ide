# Debugging Guide Skill

This skill teaches systematic debugging methodologies and problem-solving techniques.

## The Debugging Mindset

**Core Principles:**
1. **Be Systematic**: Follow a process, don't randomly change things
2. **Understand Before Fixing**: Know the root cause, not just symptoms
3. **One Change at a Time**: Make isolated changes to identify the fix
4. **Document Your Process**: Track what you've tried
5. **Learn From Bugs**: Understand why the bug occurred

**The Scientific Method Applied to Debugging:**
```
1. Observe the problem
2. Form a hypothesis about the cause
3. Design an experiment to test the hypothesis
4. Analyze the results
5. If hypothesis confirmed → fix it
6. If hypothesis disproven → form new hypothesis
7. Repeat until resolved
```

## The Universal Debugging Process

### Step 1: Reproduce the Bug

**Make it happen consistently:**
```
1. What are the exact steps to trigger the bug?
2. Does it happen every time or intermittently?
3. What's the minimal reproduction case?
4. Can you reproduce in different environments?
```

**Create a minimal reproduction:**
```typescript
// ❌ Hard to debug: Full application
npm start → click 10 things → sometimes crashes

// ✅ Easy to debug: Minimal reproduction
function test() {
  const result = problematicFunction(testData);
  console.log(result); // undefined when it should be an object
}
test();
```

### Step 2: Isolate the Problem

**Binary search approach:**
```
1. Is the bug in the frontend or backend?
2. Is it in this file or that file?
3. Is it in this function or that function?
4. Is it in this line or that line?
```

**Add logging to narrow down:**
```typescript
function processData(data) {
  console.log('🔍 Step 1: Input received', data);
  
  const validated = validateData(data);
  console.log('🔍 Step 2: After validation', validated);
  
  const transformed = transformData(validated);
  console.log('🔍 Step 3: After transform', transformed);
  
  const result = saveData(transformed);
  console.log('🔍 Step 4: Final result', result);
  
  return result;
}
```

### Step 3: Form Hypotheses

**Ask "why" questions:**
```
Bug: User login fails silently

Possible hypotheses:
1. API call is failing (check network tab)
2. Token is not being saved (check localStorage)
3. Redirect logic is broken (check console for errors)
4. Form validation is blocking submission (check form state)
```

**Prioritize hypotheses:**
```
1. Check error messages first (quickest)
2. Check browser console (quick)
3. Check network requests (quick)
4. Add logging (medium)
5. Use debugger (medium)
6. Review recent changes (medium)
7. Check dependencies (slow)
```

### Step 4: Test Hypotheses

**Design experiments:**
```typescript
// Hypothesis: API call is failing

// Experiment 1: Check if API is reachable
fetch('/api/users/login')
  .then(r => console.log('API reachable:', r.status))
  .catch(e => console.error('API unreachable:', e));

// Experiment 2: Check if credentials are correct
console.log('Sending credentials:', { email, password });

// Experiment 3: Mock successful response
mockApi.onPost('/api/users/login').reply(200, { token: 'fake' });
// If this works, problem is in backend
```

### Step 5: Fix the Root Cause

**Identify root cause:**
```
Symptom: Page crashes when clicking button
Cause 1: Button handler throws error
Cause 2: Handler accesses undefined property
Root Cause: Data not loaded before component renders

Fix: Add loading state and null checks
```

**Implement minimal fix:**
```typescript
// ❌ Symptom fix (doesn't address root cause)
try {
  handleClick();
} catch {
  // Silently ignore error
}

// ✅ Root cause fix
if (!data) {
  return <Loading />;
}

return <Button onClick={() => handleClick(data)} />;
```

### Step 6: Verify and Prevent

**Verify fix works:**
```
1. Test original reproduction steps
2. Test edge cases
3. Test in different environments
4. Add regression test
```

**Prevent recurrence:**
```typescript
// Add type safety
function processUser(user: User | undefined) {
  if (!user) throw new Error('User is required');
  // ...
}

// Add validation
const schema = z.object({
  email: z.string().email(),
  age: z.number().positive()
});

// Add tests
it('should handle missing user gracefully', () => {
  expect(() => processUser(undefined)).toThrow('User is required');
});
```

## Debugging Techniques

### Technique 1: Console Logging

**Strategic logging:**
```typescript
// ✅ Good: Descriptive labels and context
console.log('🔍 [UserService] Fetching user:', userId);
console.log('🔍 [UserService] API response:', response);
console.log('🔍 [UserService] Transformed data:', userData);

// ❌ Bad: No context
console.log(userId);
console.log(response);
console.log(userData);
```

**Use different log levels:**
```typescript
console.log('Info:', data);       // General information
console.warn('Warning:', issue);  // Potential problems
console.error('Error:', error);   // Actual errors
console.debug('Debug:', detail);  // Detailed debugging info
```

**Log objects properly:**
```typescript
// ❌ Bad: Logs [Object object]
console.log('User:', user.toString());

// ✅ Good: Logs full object
console.log('User:', user);
console.log('User JSON:', JSON.stringify(user, null, 2));

// ✅ Good: Log specific properties
console.log('User:', { id: user.id, name: user.name, email: user.email });
```

### Technique 2: Debugger Breakpoints

**Using the debugger:**
```typescript
function calculateTotal(items) {
  debugger; // Execution pauses here
  
  const subtotal = items.reduce((sum, item) => {
    debugger; // Can add multiple breakpoints
    return sum + item.price * item.quantity;
  }, 0);
  
  return subtotal * 1.1;
}
```

**Conditional breakpoints:**
```typescript
// Only break when specific condition is true
items.forEach(item => {
  if (item.price < 0) {
    debugger; // Only pauses for negative prices
  }
  processItem(item);
});
```

**Browser DevTools tips:**
```
- F8: Resume execution
- F10: Step over (next line)
- F11: Step into (enter function)
- Shift+F11: Step out (exit function)
- Watch expressions: Monitor specific variables
- Call stack: See function call hierarchy
```

### Technique 3: Binary Search

**Comment out half the code:**
```typescript
function complexFunction() {
  stepA();
  stepB();
  stepC(); // Error happens somewhere here
  stepD();
  stepE();
  stepF();
  
  // Comment out first half
  // stepA();
  // stepB();
  // stepC();
  stepD();
  stepE();
  stepF();
  // Still errors? Problem is in second half
  
  // Comment out second half
  stepA();
  stepB();
  stepC();
  // stepD();
  // stepE();
  // stepF();
  // No error? Problem is in second half
}
```

### Technique 4: Rubber Duck Debugging

**Explain the problem out loud:**
```
1. "I'm trying to save user data to the database"
2. "First, I validate the input... oh wait, I forgot to validate email format!"
3. "Then I hash the password... hmm, am I using the right salt?"
4. "Then I call db.save()... but I'm not awaiting the promise!"

Often you'll realize the problem just by explaining it.
```

### Technique 5: Git Bisect

**Find the commit that introduced the bug:**
```bash
# Start bisect
git bisect start

# Mark current commit as bad
git bisect bad

# Mark last known good commit
git bisect good abc1234

# Git checks out middle commit
# Test if bug exists
git bisect bad   # if bug exists
git bisect good  # if bug doesn't exist

# Repeat until Git finds the problematic commit
git bisect reset # when done
```

## Common Bug Patterns

### Pattern 1: Async/Await Issues

**Problem: Not awaiting promises**
```typescript
// ❌ Bug: Returns promise, not data
async function getUser(id) {
  const user = db.users.findOne(id);  // Missing await!
  return user; // Returns Promise, not User
}

// ✅ Fix: Await the promise
async function getUser(id) {
  const user = await db.users.findOne(id);
  return user;
}
```

**Problem: Race conditions**
```typescript
// ❌ Bug: Second request overwrites first
async function loadUsers() {
  setLoading(true);
  const users1 = await api.getUsers(1);
  setUsers(users1);
  const users2 = await api.getUsers(2); // Takes longer
  setUsers(users2); // Overwrites users1
}

// ✅ Fix: Handle concurrent requests
async function loadUsers() {
  setLoading(true);
  const [users1, users2] = await Promise.all([
    api.getUsers(1),
    api.getUsers(2)
  ]);
  setUsers([...users1, ...users2]);
}
```

### Pattern 2: React State Issues

**Problem: Stale closures**
```typescript
// ❌ Bug: count is stale in setTimeout
function Counter() {
  const [count, setCount] = useState(0);
  
  const handleClick = () => {
    setCount(count + 1);
    setTimeout(() => {
      console.log('Count:', count); // Logs old value!
    }, 1000);
  };
  
  return <button onClick={handleClick}>Increment</button>;
}

// ✅ Fix: Use functional update or ref
function Counter() {
  const [count, setCount] = useState(0);
  const countRef = useRef(count);
  
  useEffect(() => {
    countRef.current = count;
  }, [count]);
  
  const handleClick = () => {
    setCount(c => c + 1);
    setTimeout(() => {
      console.log('Count:', countRef.current); // Logs current value
    }, 1000);
  };
  
  return <button onClick={handleClick}>Increment</button>;
}
```

**Problem: Infinite re-renders**
```typescript
// ❌ Bug: Creates new object every render
function UserProfile({ userId }) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetchUser(userId).then(setData);
  }, [{ userId }]); // New object every render!
  
  return <div>{data?.name}</div>;
}

// ✅ Fix: Use primitive dependencies
function UserProfile({ userId }) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetchUser(userId).then(setData);
  }, [userId]); // Primitive value
  
  return <div>{data?.name}</div>;
}
```

### Pattern 3: Type Errors

**Problem: Null/undefined access**
```typescript
// ❌ Bug: Crashes if user is null
function UserProfile({ user }) {
  return <div>{user.name}</div>;
}

// ✅ Fix: Add null checks
function UserProfile({ user }) {
  if (!user) return <div>No user</div>;
  return <div>{user.name}</div>;
}

// ✅ Better: Use optional chaining
function UserProfile({ user }) {
  return <div>{user?.name ?? 'No user'}</div>;
}
```

### Pattern 4: Logic Errors

**Problem: Off-by-one errors**
```typescript
// ❌ Bug: Skips last item
for (let i = 0; i < items.length - 1; i++) {
  process(items[i]);
}

// ✅ Fix: Include last item
for (let i = 0; i < items.length; i++) {
  process(items[i]);
}

// ✅ Better: Use forEach
items.forEach(item => process(item));
```

## Debugging Tools

### Browser DevTools

**Elements Tab:**
- Inspect DOM structure
- Edit HTML/CSS live
- View computed styles
- Check accessibility

**Console Tab:**
- View console.log output
- Execute JavaScript
- Check errors and warnings

**Network Tab:**
- Monitor API calls
- Check request/response
- View timing information
- Throttle network speed

**Sources Tab:**
- Set breakpoints
- Step through code
- Watch variables
- View call stack

**Performance Tab:**
- Record performance
- Identify bottlenecks
- Analyze flame graphs

### Node.js Debugging

```bash
# Start with inspector
node --inspect server.js

# Start with inspector and break at start
node --inspect-brk server.js

# Connect Chrome DevTools
# Open chrome://inspect
```

### React DevTools

```
- Component tree inspection
- Props and state viewing
- Performance profiling
- Hook inspection
```

## When You're Stuck

**Take a break:**
- Step away for 5-15 minutes
- Your subconscious will keep working
- Often the solution appears when you return

**Ask for help:**
```
Prepare:
1. What are you trying to do?
2. What did you expect to happen?
3. What actually happened?
4. What have you tried?
5. Minimal reproduction code
```

**Search effectively:**
```
Google: "[technology] [error message] [context]"
Example: "react useEffect dependency warning infinite loop"

Include:
- Exact error message
- Technology stack
- Version numbers
```

**Read the documentation:**
- Often the answer is in the docs
- Check API signatures
- Review examples

Remember: Every bug is an opportunity to learn. Understand the "why" behind each bug to become a better developer.
