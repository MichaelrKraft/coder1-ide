# /code-explain Command

Get clear, concise explanations of code snippets, patterns, or concepts.

## Usage

```
/code-explain <code snippet or file path>
```

## What This Command Does

When you run `/code-explain`, Claude will:
1. Analyze the code structure and patterns
2. Explain what the code does in plain English
3. Break down complex parts step-by-step
4. Highlight important concepts or patterns
5. Suggest improvements or alternatives (when relevant)

## Common Use Cases

### Explaining Unfamiliar Code

```
/code-explain

const debounced = useMemo(
  () => debounce(handleSearch, 300),
  []
);
```

**Response:**

This code creates a **debounced search function** using React hooks.

**Line-by-line breakdown:**

```typescript
const debounced = useMemo(
  // useMemo memorizes the debounced function so it's not recreated every render
  
  () => debounce(handleSearch, 300),
  // debounce wraps handleSearch to delay execution by 300ms
  // If called again within 300ms, the timer resets
  
  []
  // Empty dependency array means this only runs once on mount
);
```

**What it does:**
- User types in search box
- Instead of searching on every keystroke, waits 300ms after typing stops
- Reduces API calls from potentially hundreds to just one

**Use case:** Optimize search performance and reduce server load

**Alternative pattern:**
```typescript
// Can also use useCallback with debounce
const debounced = useCallback(
  debounce(handleSearch, 300),
  []
);
```

### Explaining Complex Patterns

```
/code-explain

async function* asyncGenerator() {
  yield await fetch('/api/1');
  yield await fetch('/api/2');
  yield await fetch('/api/3');
}
```

**Response:**

This is an **async generator function** - a combination of async/await and generator patterns.

**Key concepts:**

**1. Generator Function (`function*`)**
- Can pause and resume execution
- Uses `yield` to return values
- Returns an iterator

**2. Async (`async`)**
- Can use `await` for promises
- Returns promises

**3. Combined (`async function*`)**
- Yields promises that can be awaited
- Processes items one at a time
- Useful for streaming data

**How to use:**
```typescript
for await (const response of asyncGenerator()) {
  const data = await response.json();
  console.log('Received:', data);
  // Processes each API response as it arrives
}
```

**When to use:**
- Streaming large datasets
- Processing items one at a time
- Handling backpressure in data pipelines

**Real-world example:**
```typescript
async function* paginatedFetch(url) {
  let page = 1;
  while (true) {
    const response = await fetch(`${url}?page=${page}`);
    const data = await response.json();
    if (data.length === 0) break;
    yield data;
    page++;
  }
}
```

### Explaining React Patterns

```
/code-explain

export function Counter() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(c => c + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  return <div>{count}</div>;
}
```

**Response:**

This is a **React component with a timer** that increments every second.

**Pattern breakdown:**

**1. useState Hook**
```typescript
const [count, setCount] = useState(0);
// Creates state variable 'count' starting at 0
// setCount updates the state and triggers re-render
```

**2. useEffect Hook**
```typescript
useEffect(() => {
  // Effect runs after component mounts
  const timer = setInterval(() => {
    setCount(c => c + 1);  // ← Functional update
  }, 1000);
  
  return () => clearInterval(timer);  // ← Cleanup function
}, []);  // ← Empty dependencies = run once
```

**Key concepts:**

**Functional Update: `setCount(c => c + 1)`**
- Why not `setCount(count + 1)`?
- Functional form ensures you have latest value
- Important when state updates are frequent

**Cleanup Function**
- Runs when component unmounts
- Prevents memory leaks
- Clears the interval

**Empty Dependency Array `[]`**
- Effect runs only once (on mount)
- Cleanup runs only once (on unmount)
- If omitted, runs on every render

**What happens:**
1. Component mounts → setInterval starts
2. Every 1 second → count increases by 1
3. Component re-renders with new count
4. Component unmounts → clearInterval prevents memory leak

**Common mistake:**
```typescript
// ❌ This causes issues
useEffect(() => {
  setInterval(() => {
    setCount(count + 1);  // 'count' is stale!
  }, 1000);
}, []);

// ✅ Use functional update
setCount(c => c + 1);
```

### Explaining TypeScript Types

```
/code-explain

type Awaited<T> = T extends Promise<infer U> ? U : T;
```

**Response:**

This is a **conditional type** that extracts the resolved value from a Promise.

**Template breakdown:**

```typescript
type Awaited<T> =
  // Generic type that accepts any type T
  
  T extends Promise<infer U>
  // Check if T is a Promise
  // If yes, infer (extract) the type U from Promise<U>
  
  ? U
  // If T is a Promise, return the unwrapped type U
  
  : T;
  // If T is not a Promise, return T as-is
```

**Examples:**

```typescript
type A = Awaited<Promise<string>>;
// Result: string (unwraps Promise)

type B = Awaited<string>;
// Result: string (already not a Promise)

type C = Awaited<Promise<number>>;
// Result: number

type D = Awaited<Promise<Promise<boolean>>>;
// Result: Promise<boolean> (only unwraps one level)
```

**Use case:**

```typescript
async function fetchUser() {
  return { id: 1, name: 'John' };
}

type User = Awaited<ReturnType<typeof fetchUser>>;
// Result: { id: number, name: string }
// Without Awaited, would be Promise<{ id: number, name: string }>
```

**Built-in utility:** TypeScript includes this as a standard utility type in TS 4.5+

### Explaining Algorithms

```
/code-explain

function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  
  return -1;
}
```

**Response:**

This is a **binary search algorithm** - efficiently finds an element in a sorted array.

**How it works:**

**Step-by-step:**
```
Array: [1, 3, 5, 7, 9, 11, 13]
Target: 7

Iteration 1:
  left = 0, right = 6
  mid = 3 (value: 7)
  arr[mid] === target → Found! Return 3

If target was 11:

Iteration 1:
  left = 0, right = 6
  mid = 3 (value: 7)
  arr[mid] < target → search right half
  left = 4

Iteration 2:
  left = 4, right = 6
  mid = 5 (value: 11)
  arr[mid] === target → Found! Return 5
```

**Time complexity:**
- Best case: O(1) - found immediately
- Average/Worst case: O(log n) - halves search space each iteration

**Space complexity:** O(1) - uses constant space

**Why it's efficient:**
```
Linear search: [1,2,3,4,5,6,7,8,9,10] → up to 10 comparisons
Binary search: [1,2,3,4,5,6,7,8,9,10] → up to 4 comparisons

For 1 million items:
Linear: up to 1,000,000 comparisons
Binary: up to 20 comparisons
```

**Requirements:**
- Array MUST be sorted
- Random access (arrays, not linked lists)

**Comparison:**
```typescript
// Linear search - works on unsorted arrays
function linearSearch(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) return i;
  }
  return -1;
}
// O(n) time
```

## Response Format

Every `/code-explain` response includes:

1. **Pattern Name**: What the code pattern is called
2. **Line-by-Line Breakdown**: Detailed explanation with comments
3. **What It Does**: High-level summary
4. **Key Concepts**: Important ideas to understand
5. **Examples**: Usage examples
6. **When to Use**: Appropriate use cases
7. **Alternatives** (when relevant): Other ways to solve the problem

## Advanced Usage

### Explain with Context

```
/code-explain
Context: React component for form validation
Explain this hook pattern:

const [errors, setErrors] = useState({});
```

### Explain Performance Impact

```
/code-explain
Focus on performance implications:

const result = data.filter(x => x.active).map(x => x.name);
```

### Explain Design Pattern

```
/code-explain
What design pattern is this?

class Singleton {
  static instance;
  
  static getInstance() {
    if (!Singleton.instance) {
      Singleton.instance = new Singleton();
    }
    return Singleton.instance;
  }
}
```

## Tips for Best Results

1. **Include context** - Mention the framework, language version, use case
2. **Ask specific questions** - "Why use useCallback here?" vs "Explain this"
3. **Provide surrounding code** - Full function or component for better context
4. **Mention your level** - "Explain like I'm new to React" or "Advanced explanation"

## What Gets Explained

✅ **Code patterns and idioms**
✅ **Algorithm logic and efficiency**
✅ **React/TypeScript patterns**
✅ **Design patterns**
✅ **Syntax and language features**
✅ **Performance implications**
✅ **Type system usage**

❌ **Not for:**
- Debugging (use `/quick-fix`)
- Generating new code (use `/implement`)
- Refactoring (use `/refactor`)

## Keyboard Shortcut

Set up in your IDE:
```
Cmd+K, Cmd+E → /code-explain
```

Remember: Understanding code is the first step to mastering it. Don't hesitate to ask for explanations!
