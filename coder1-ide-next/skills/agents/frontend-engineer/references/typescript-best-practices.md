# TypeScript Best Practices for React

Essential TypeScript patterns and best practices for React development in Coder1 IDE.

## Type Safety Fundamentals

### Component Props

```typescript
// ✅ Good: Explicit interface
interface UserCardProps {
  user: User;
  onEdit?: (id: string) => void;
  isEditable?: boolean;
}

export function UserCard({ user, onEdit, isEditable = false }: UserCardProps) {
  // Implementation
}

// ❌ Bad: Inline types
export function UserCard({ user, onEdit }: { user: any; onEdit: Function }) {
  // Loses type safety
}
```

### State Types

```typescript
// ✅ Good: Explicit state types
interface FormState {
  email: string;
  password: string;
  isSubmitting: boolean;
  error: Error | null;
}

const [formState, setFormState] = useState<FormState>({
  email: '',
  password: '',
  isSubmitting: false,
  error: null
});

// ❌ Bad: Implicit any
const [formState, setFormState] = useState({
  email: '',
  // TypeScript infers everything as string, can't catch type errors
});
```

## Event Handling

### Form Events

```typescript
// ✅ Good: Specific event types
import { ChangeEvent, FormEvent } from 'react';

function handleChange(e: ChangeEvent<HTMLInputElement>) {
  const value = e.target.value;  // Type-safe
}

function handleSubmit(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();  // Type-safe
}

// ❌ Bad: Generic event
function handleChange(e: any) {
  const value = e.target.value;  // No type safety
}
```

### Click Events

```typescript
// ✅ Good: Specific button event
import { MouseEvent } from 'react';

function handleClick(e: MouseEvent<HTMLButtonElement>) {
  e.stopPropagation();
  const button = e.currentTarget;  // HTMLButtonElement
}

// ❌ Bad: Generic event
function handleClick(e: any) {
  // No type information
}
```

## Ref Typing

### Element Refs

```typescript
// ✅ Good: Typed refs
import { useRef } from 'react';

function Component() {
  const inputRef = useRef<HTMLInputElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  const focusInput = () => {
    inputRef.current?.focus();  // Type-safe with null check
  };

  return <input ref={inputRef} />;
}

// ❌ Bad: Untyped ref
const inputRef = useRef(null);  // Type is never, can't use properly
```

### Imperative Handle

```typescript
// ✅ Good: Typed imperative handle
import { useImperativeHandle, forwardRef } from 'react';

interface InputHandle {
  focus: () => void;
  clear: () => void;
}

const Input = forwardRef<InputHandle, InputProps>((props, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => {
      if (inputRef.current) inputRef.current.value = '';
    }
  }));

  return <input ref={inputRef} {...props} />;
});
```

## Generic Components

### List Component

```typescript
// ✅ Good: Generic component
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  keyExtractor: (item: T) => string;
}

export function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map(item => (
        <li key={keyExtractor(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

// Usage: Type is inferred
<List
  items={users}
  renderItem={user => <span>{user.name}</span>}
  keyExtractor={user => user.id}
/>
```

### Data Fetching Hook

```typescript
// ✅ Good: Generic hook
function useAPI<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch(url)
      .then(res => res.json() as Promise<T>)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);

  return { data, loading, error };
}

// Usage: Type is specified
const { data: users } = useAPI<User[]>('/api/users');
```

## Utility Types

### Extract Props

```typescript
// ✅ Good: Extract component props
import { ComponentProps } from 'react';

type ButtonProps = ComponentProps<'button'>;  // All native button props

type CustomButtonProps = ComponentProps<'button'> & {
  variant: 'primary' | 'secondary';
};
```

### Omit/Pick

```typescript
// ✅ Good: Create variations with Omit/Pick
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

// Public user (no password)
type PublicUser = Omit<User, 'password'>;

// User for display
type DisplayUser = Pick<User, 'id' | 'name'>;
```

### Partial/Required

```typescript
// ✅ Good: Make all fields optional
type PartialUser = Partial<User>;

// ✅ Good: Make all fields required
interface OptionalUser {
  id?: string;
  name?: string;
}
type RequiredUser = Required<OptionalUser>;
```

## Discriminated Unions

### API Response Types

```typescript
// ✅ Good: Discriminated union for state
type LoadingState = { status: 'loading' };
type SuccessState = { status: 'success'; data: User[] };
type ErrorState = { status: 'error'; error: Error };

type DataState = LoadingState | SuccessState | ErrorState;

function Component() {
  const [state, setState] = useState<DataState>({ status: 'loading' });

  // TypeScript narrows types based on status
  if (state.status === 'loading') {
    return <Spinner />;
  }
  
  if (state.status === 'error') {
    return <ErrorMessage error={state.error} />;  // error is available
  }
  
  return <UserList users={state.data} />;  // data is available
}
```

## Strict Mode Practices

### Non-Null Assertions

```typescript
// ⚠️ Use sparingly: Non-null assertion
const element = document.getElementById('root')!;  // Only if 100% sure

// ✅ Better: Null check
const element = document.getElementById('root');
if (!element) throw new Error('Root element not found');
```

### Type Assertions

```typescript
// ⚠️ Use carefully: Type assertion
const user = JSON.parse(data) as User;

// ✅ Better: Validate at runtime
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email()
});

const user = UserSchema.parse(JSON.parse(data));  // Throws if invalid
```

## Context Typing

### Typed Context

```typescript
// ✅ Good: Fully typed context
interface ThemeContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const value: ThemeContextValue = {
    theme,
    toggleTheme: () => setTheme(prev => prev === 'light' ? 'dark' : 'light')
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;  // Fully typed
}
```

## Children Props

### Flexible Children

```typescript
// ✅ Good: ReactNode for any React content
interface CardProps {
  children: ReactNode;
}

// ✅ Good: Specific function children
interface RenderProps {
  children: (data: User[]) => ReactNode;
}

// ✅ Good: Element for specific component types
interface LayoutProps {
  header: ReactElement<HeaderProps>;
  footer: ReactElement<FooterProps>;
}
```

## Common Patterns

### Optional Callbacks

```typescript
// ✅ Good: Optional callback with proper typing
interface ComponentProps {
  onSave?: (data: FormData) => void | Promise<void>;
}

function Component({ onSave }: ComponentProps) {
  const handleSave = async () => {
    const data = getFormData();
    await onSave?.(data);  // Safe to call, handles undefined
  };
}
```

### Conditional Props

```typescript
// ✅ Good: Mutually exclusive props
type ButtonProps = 
  | { variant: 'link'; href: string }
  | { variant: 'button'; onClick: () => void };

function Button(props: ButtonProps) {
  if (props.variant === 'link') {
    return <a href={props.href}>Link</a>;  // href is available
  }
  return <button onClick={props.onClick}>Button</button>;  // onClick is available
}
```

## TypeScript Config for React

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

These practices ensure maximum type safety and developer experience in React applications.
