# React Performance Optimization

Comprehensive performance optimization techniques for React applications in Coder1 IDE.

## Rendering Optimization

### React.memo

```typescript
// ✅ Good: Memoize expensive components
interface UserCardProps {
  user: User;
  onSelect: (id: string) => void;
}

export const UserCard = React.memo(({ user, onSelect }: UserCardProps) => {
  return (
    <div onClick={() => onSelect(user.id)}>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
});

// ✅ Good: Custom comparison function
export const UserCard = React.memo(
  ({ user, onSelect }: UserCardProps) => {
    return <div>{/* ... */}</div>;
  },
  (prevProps, nextProps) => {
    // Return true if props are equal (skip re-render)
    return prevProps.user.id === nextProps.user.id;
  }
);

// ❌ Bad: Memoizing everything
const TinyComponent = React.memo(() => <div>Hi</div>);  // Unnecessary overhead
```

### useMemo

```typescript
// ✅ Good: Memoize expensive calculations
function ProductList({ products, filters }: Props) {
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      return filters.every(filter => filter.test(product));
    });
  }, [products, filters]);

  return <>{filteredProducts.map(p => <ProductCard key={p.id} product={p} />)}</>;
}

// ✅ Good: Memoize derived values
const totalPrice = useMemo(() => {
  return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
}, [cartItems]);

// ❌ Bad: Memoizing simple operations
const doubled = useMemo(() => count * 2, [count]);  // Too simple
```

### useCallback

```typescript
// ✅ Good: Stable callback references
function TodoList({ todos }: Props) {
  const [filter, setFilter] = useState('all');

  const handleToggle = useCallback((id: string) => {
    // Toggle logic
  }, []);  // Stable reference

  return (
    <>
      {todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} onToggle={handleToggle} />
      ))}
    </>
  );
}

// ❌ Bad: Creating new functions every render
function TodoList({ todos }: Props) {
  return (
    <>
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={(id) => {/* ... */}}  // New function every render
        />
      ))}
    </>
  );
}
```

## Code Splitting

### React.lazy

```typescript
// ✅ Good: Lazy load heavy components
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./Dashboard'));
const Settings = lazy(() => import('./Settings'));
const Reports = lazy(() => import('./Reports'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Suspense>
  );
}
```

### Route-Based Splitting

```typescript
// ✅ Good: Split by route
const routes = [
  {
    path: '/admin',
    component: lazy(() => import('./pages/Admin'))
  },
  {
    path: '/analytics',
    component: lazy(() => import('./pages/Analytics'))
  }
];

function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {routes.map(route => (
          <Route
            key={route.path}
            path={route.path}
            element={<route.component />}
          />
        ))}
      </Routes>
    </Suspense>
  );
}
```

### Component-Based Splitting

```typescript
// ✅ Good: Split heavy components
function ProductPage() {
  const [showChart, setShowChart] = useState(false);

  const AnalyticsChart = lazy(() => import('./AnalyticsChart'));

  return (
    <div>
      <ProductInfo />
      <button onClick={() => setShowChart(true)}>Show Analytics</button>
      {showChart && (
        <Suspense fallback={<ChartSkeleton />}>
          <AnalyticsChart />
        </Suspense>
      )}
    </div>
  );
}
```

## List Virtualization

### react-window

```typescript
// ✅ Good: Virtualize long lists
import { FixedSizeList } from 'react-window';

function VirtualList({ items }: { items: any[] }) {
  const Row = ({ index, style }: { index: number; style: CSSProperties }) => (
    <div style={style}>
      <ItemComponent item={items[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}

// ❌ Bad: Rendering thousands of items
function NonVirtualList({ items }: { items: any[] }) {
  return (
    <div>
      {items.map(item => (  // All 10,000 items rendered
        <ItemComponent key={item.id} item={item} />
      ))}
    </div>
  );
}
```

### react-virtualized (variable sizes)

```typescript
// ✅ Good: Variable height items
import { List, AutoSizer, CellMeasurer, CellMeasurerCache } from 'react-virtualized';

const cache = new CellMeasurerCache({
  fixedWidth: true,
  defaultHeight: 100
});

function VariableList({ items }: { items: any[] }) {
  const rowRenderer = ({ index, key, parent, style }: any) => {
    const item = items[index];

    return (
      <CellMeasurer key={key} cache={cache} parent={parent} columnIndex={0} rowIndex={index}>
        <div style={style}>
          <ComplexItem item={item} />
        </div>
      </CellMeasurer>
    );
  };

  return (
    <AutoSizer>
      {({ width, height }) => (
        <List
          width={width}
          height={height}
          rowCount={items.length}
          rowHeight={cache.rowHeight}
          rowRenderer={rowRenderer}
          deferredMeasurementCache={cache}
        />
      )}
    </AutoSizer>
  );
}
```

## Image Optimization

### Lazy Loading Images

```typescript
// ✅ Good: Native lazy loading
<img
  src="large-image.jpg"
  alt="Description"
  loading="lazy"
  decoding="async"
/>

// ✅ Good: Intersection Observer for custom lazy loading
function LazyImage({ src, alt }: { src: string; alt: string }) {
  const [imageSrc, setImageSrc] = useState<string | undefined>();
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImageSrc(src);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return (
    <img
      ref={imgRef}
      src={imageSrc || 'placeholder.jpg'}
      alt={alt}
    />
  );
}
```

### Responsive Images

```typescript
// ✅ Good: Responsive images with srcset
<img
  srcSet="
    small.jpg 300w,
    medium.jpg 600w,
    large.jpg 1200w
  "
  sizes="
    (max-width: 640px) 300px,
    (max-width: 1024px) 600px,
    1200px
  "
  src="medium.jpg"
  alt="Responsive image"
/>

// ✅ Good: Next.js Image component
import Image from 'next/image';

<Image
  src="/photo.jpg"
  alt="Optimized image"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL="/photo-blur.jpg"
/>
```

## State Management Optimization

### Context Splitting

```typescript
// ✅ Good: Split contexts to reduce re-renders
const UserContext = createContext<User | null>(null);
const ThemeContext = createContext<Theme>('light');

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<Theme>('light');

  return (
    <UserContext.Provider value={user}>
      <ThemeContext.Provider value={theme}>
        {/* Children only re-render when their specific context changes */}
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}

// ❌ Bad: Single context with all state
const AppContext = createContext<AppState | null>(null);

function App() {
  const [state, setState] = useState<AppState>({
    user: null,
    theme: 'light',
    settings: {}
  });

  return (
    <AppContext.Provider value={state}>
      {/* All children re-render on ANY state change */}
    </AppContext.Provider>
  );
}
```

### Selector Optimization

```typescript
// ✅ Good: Memoized selectors
import { createSelector } from 'reselect';

const selectUsers = (state: State) => state.users;
const selectFilter = (state: State) => state.filter;

const selectFilteredUsers = createSelector(
  [selectUsers, selectFilter],
  (users, filter) => users.filter(u => u.name.includes(filter))
);

// Usage
const filteredUsers = selectFilteredUsers(state);
```

## Debouncing and Throttling

### Debounce Input

```typescript
// ✅ Good: Debounce expensive operations
import { useEffect, useState } from 'react';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Usage
function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (debouncedSearchTerm) {
      performSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  return <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />;
}
```

### Throttle Scroll

```typescript
// ✅ Good: Throttle frequent events
function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= delay) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, delay - (Date.now() - lastRan.current));

    return () => clearTimeout(handler);
  }, [value, delay]);

  return throttledValue;
}

// Usage
function ScrollComponent() {
  const [scrollY, setScrollY] = useState(0);
  const throttledScrollY = useThrottle(scrollY, 100);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Use throttledScrollY for expensive operations
}
```

## Bundle Size Optimization

### Tree Shaking

```typescript
// ✅ Good: Import only what you need
import { debounce } from 'lodash-es';

// ❌ Bad: Import entire library
import _ from 'lodash';
const debounce = _.debounce;
```

### Dynamic Imports

```typescript
// ✅ Good: Load libraries on demand
async function handleExport() {
  const { saveAs } = await import('file-saver');
  const blob = new Blob([data], { type: 'text/csv' });
  saveAs(blob, 'export.csv');
}
```

## Performance Monitoring

### React DevTools Profiler

```typescript
// ✅ Good: Wrap components to profile
import { Profiler } from 'react';

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}

<Profiler id="ProductList" onRender={onRenderCallback}>
  <ProductList products={products} />
</Profiler>
```

### Web Vitals

```typescript
// ✅ Good: Monitor core web vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  console.log(metric);
  // Send to analytics service
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

## Common Performance Anti-Patterns

### ❌ Inline Object/Array Creation

```typescript
// ❌ Bad: Creates new object every render
<Component style={{ marginTop: 10 }} />
<Component data={[1, 2, 3]} />

// ✅ Good: Define outside render
const style = { marginTop: 10 };
const data = [1, 2, 3];
<Component style={style} data={data} />
```

### ❌ Index as Key

```typescript
// ❌ Bad: Using index as key
{items.map((item, index) => (
  <Item key={index} item={item} />
))}

// ✅ Good: Use unique identifier
{items.map(item => (
  <Item key={item.id} item={item} />
))}
```

### ❌ Unnecessary Re-renders

```typescript
// ❌ Bad: Component always re-renders
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
      <ExpensiveChild />  {/* Re-renders on every count change */}
    </>
  );
}

// ✅ Good: Split state
function Parent() {
  return (
    <>
      <Counter />
      <ExpensiveChild />  {/* Doesn't re-render */}
    </>
  );
}

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Increment</button>;
}
```

These optimization techniques ensure React applications remain fast and responsive at scale.
