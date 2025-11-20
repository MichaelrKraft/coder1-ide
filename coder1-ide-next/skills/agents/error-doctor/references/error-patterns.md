# Common Error Patterns and Solutions

Quick reference guide for diagnosing and fixing common development errors.

## JavaScript/TypeScript Errors

### Cannot read property 'X' of undefined

**Pattern**: `TypeError: Cannot read property 'name' of undefined`

**Common Causes**:
1. Variable not initialized
2. API response doesn't have expected structure  
3. Async timing issue (accessing before data loads)
4. Typo in property name

**Solutions**:
```typescript
// ❌ Problem
const user = getUser();
console.log(user.name);  // user might be undefined

// ✅ Solution 1: Optional chaining
console.log(user?.name);

// ✅ Solution 2: Null check
if (user) {
  console.log(user.name);
}

// ✅ Solution 3: Default value
const user = getUser() || { name: 'Guest' };

// ✅ Solution 4: Await async data
const user = await getUserAsync();
console.log(user.name);
```

---

### X is not a function

**Pattern**: `TypeError: X is not a function`

**Common Causes**:
1. Calling a non-function variable
2. Typo in function name
3. Function not imported
4. Wrong method on object

**Solutions**:
```typescript
// ❌ Problem
const data = { items: [] };
data.map();  // map is not a function (data is not an array)

// ✅ Solution 1: Use correct method
data.items.map();

// ❌ Problem  
import { myFunction } from './utils';
myFunktion();  // Typo

// ✅ Solution 2: Fix typo
myFunction();

// ❌ Problem
const obj = { value: 5 };
obj.filter();  // filter doesn't exist on plain objects

// ✅ Solution 3: Use correct type
const arr = [1, 2, 3];
arr.filter();
```

---

### Module not found

**Pattern**: `Error: Cannot find module 'lodash'`

**Common Causes**:
1. Package not installed
2. Typo in module name
3. Wrong import path
4. node_modules corruption

**Solutions**:
```bash
# ✅ Solution 1: Install package
npm install lodash

# ✅ Solution 2: Reinstall all packages
rm -rf node_modules package-lock.json
npm install

# ✅ Solution 3: Fix import path
# ❌ Wrong
import _ from 'lodahs';  # Typo
# ✅ Correct
import _ from 'lodash';

# ✅ Solution 4: Check relative paths
# ❌ Wrong
import { Button } from './components/Button';  # Missing extension
# ✅ Correct
import { Button } from './components/Button.tsx';
```

---

### SyntaxError: Unexpected token

**Pattern**: `SyntaxError: Unexpected token '}'`

**Common Causes**:
1. Missing or extra bracket
2. Missing semicolon (rare in modern JS)
3. Invalid JSX syntax
4. Unclosed string or template literal

**Solutions**:
```typescript
// ❌ Problem: Extra bracket
function test() {
  return { value: 1 };
}}  // Extra }

// ✅ Solution: Remove extra bracket
function test() {
  return { value: 1 };
}

// ❌ Problem: Unclosed JSX tag
<div>
  <span>Text
</div>

// ✅ Solution: Close tag
<div>
  <span>Text</span>
</div>

// ❌ Problem: Invalid template literal
const str = `Hello
  world;  // Missing closing backtick

// ✅ Solution: Close template literal
const str = `Hello
  world`;
```

---

## TypeScript Specific

### Type 'X' is not assignable to type 'Y'

**Pattern**: `Type 'string' is not assignable to type 'number'`

**Solutions**:
```typescript
// ❌ Problem
let age: number = '25';

// ✅ Solution 1: Fix type
let age: number = 25;

// ✅ Solution 2: Parse string
let age: number = parseInt('25');

// ✅ Solution 3: Union type (if both valid)
let age: string | number = '25';

// ❌ Problem: Object structure mismatch
interface User {
  name: string;
  age: number;
}
const user: User = { name: 'John' };  // Missing 'age'

// ✅ Solution: Make property optional or add it
interface User {
  name: string;
  age?: number;  // Optional
}
// OR
const user: User = { name: 'John', age: 30 };
```

---

### Property 'X' does not exist on type 'Y'

**Pattern**: `Property 'email' does not exist on type 'User'`

**Solutions**:
```typescript
// ❌ Problem
interface User {
  name: string;
}
const user: User = { name: 'John' };
console.log(user.email);  // email doesn't exist

// ✅ Solution 1: Add property to interface
interface User {
  name: string;
  email: string;
}

// ✅ Solution 2: Make property optional
interface User {
  name: string;
  email?: string;
}
console.log(user.email);  // OK (might be undefined)

// ✅ Solution 3: Use type assertion (if you're sure)
console.log((user as any).email);  // Not recommended

// ✅ Solution 4: Extend interface
interface ExtendedUser extends User {
  email: string;
}
const user: ExtendedUser = { name: 'John', email: 'john@example.com' };
```

---

## React Errors

### Too many re-renders

**Pattern**: `Error: Too many re-renders. React limits the number of renders to prevent an infinite loop.`

**Common Causes**:
1. setState in render body
2. useEffect without dependency array
3. Event handler called instead of passed

**Solutions**:
```typescript
// ❌ Problem: Infinite loop
function Component() {
  const [count, setCount] = useState(0);
  setCount(count + 1);  // Called every render
  return <div>{count}</div>;
}

// ✅ Solution: Call in event handler
function Component() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(count + 1)}>
      {count}
    </button>
  );
}

// ❌ Problem: useEffect loop
useEffect(() => {
  setState(newValue);
});  // Runs every render, causes new render

// ✅ Solution: Add dependency array
useEffect(() => {
  setState(newValue);
}, []);  // Only runs once

// ❌ Problem: Calling handler instead of passing
<button onClick={handleClick()}>Click</button>

// ✅ Solution: Pass handler function
<button onClick={handleClick}>Click</button>
```

---

### Objects are not valid as a React child

**Pattern**: `Error: Objects are not valid as a React child (found: object with keys {name, age})`

**Solutions**:
```typescript
// ❌ Problem: Rendering object
const user = { name: 'John', age: 30 };
return <div>{user}</div>;

// ✅ Solution: Render specific properties
return <div>{user.name}</div>;

// ✅ Solution: Convert to JSON (debugging)
return <div>{JSON.stringify(user)}</div>;

// ✅ Solution: Render object properties
return (
  <div>
    <p>Name: {user.name}</p>
    <p>Age: {user.age}</p>
  </div>
);
```

---

## Build Tool Errors

### Failed to resolve import

**Pattern**: `Failed to resolve import "./utils" from "src/App.tsx"`

**Solutions**:
```typescript
// ❌ Problem: Missing file extension
import { helper } from './utils';

// ✅ Solution: Add extension
import { helper } from './utils.ts';

// ❌ Problem: Wrong path
import { helper } from '../utils';  // File is in same directory

// ✅ Solution: Fix path
import { helper } from './utils';

// ❌ Problem: Case sensitivity (macOS vs Linux)
import { helper } from './Utils';  // File is utils.ts

// ✅ Solution: Match exact casing
import { helper } from './utils';
```

---

### CORS Error

**Pattern**: `Access to fetch at 'http://api.example.com' from origin 'http://localhost:3000' has been blocked by CORS policy`

**Solutions**:
```typescript
// ✅ Solution 1: Backend - Add CORS headers
// Express.js example
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// ✅ Solution 2: Frontend - Use proxy (development)
// vite.config.ts
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://api.example.com',
        changeOrigin: true
      }
    }
  }
};

// ✅ Solution 3: Backend - Manual headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
```

---

## Dependency Errors

### Peer dependency warnings

**Pattern**: `npm WARN ... requires a peer of react@^18.0.0 but none is installed`

**Solutions**:
```bash
# ✅ Solution 1: Install peer dependency
npm install react@^18.0.0

# ✅ Solution 2: Install all peer dependencies
npm install --legacy-peer-deps

# ✅ Solution 3: Force installation (use carefully)
npm install --force
```

---

### Version conflicts

**Pattern**: `npm ERR! Could not resolve dependency: peer react@"^17.0.0"`

**Solutions**:
```bash
# ✅ Solution 1: Check versions
npm ls react

# ✅ Solution 2: Update package
npm update react

# ✅ Solution 3: Use compatible versions
npm install react@17.0.0

# ✅ Solution 4: Override (package.json)
{
  "overrides": {
    "react": "^18.0.0"
  }
}
```

---

## Environment Errors

### Missing environment variables

**Pattern**: `process.env.API_KEY is undefined`

**Solutions**:
```typescript
// ✅ Solution 1: Create .env file
// .env
API_KEY=your-key-here

// ✅ Solution 2: Provide default
const apiKey = process.env.API_KEY || 'default-key';

// ✅ Solution 3: Validate at startup
if (!process.env.API_KEY) {
  throw new Error('API_KEY environment variable is required');
}

// ✅ Solution 4: Use dotenv package
import 'dotenv/config';
const apiKey = process.env.API_KEY;
```

These patterns cover 80% of common development errors and their solutions.
