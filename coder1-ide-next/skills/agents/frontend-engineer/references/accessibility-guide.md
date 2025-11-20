# Accessibility Guide (WCAG Compliance)

Comprehensive accessibility guidelines for building WCAG 2.1 Level AA compliant React components in Coder1 IDE.

## Fundamental Principles (POUR)

1. **Perceivable**: Information must be presentable to users in ways they can perceive
2. **Operable**: Interface components must be operable
3. **Understandable**: Information and operation must be understandable
4. **Robust**: Content must be robust enough for assistive technologies

## Semantic HTML

### Use Correct Elements

```tsx
// ✅ Good: Semantic HTML
<button onClick={handleClick}>Submit</button>
<nav><a href="/home">Home</a></nav>
<main>Main content</main>
<aside>Sidebar</aside>

// ❌ Bad: Divs for everything
<div onClick={handleClick}>Submit</div>  // Not keyboard accessible
<div><span>Home</span></div>  // Not semantic
```

### Headings Hierarchy

```tsx
// ✅ Good: Proper heading structure
<h1>Page Title</h1>
<h2>Section Title</h2>
<h3>Subsection Title</h3>
<h3>Another Subsection</h3>
<h2>Next Section</h2>

// ❌ Bad: Skipping levels
<h1>Page Title</h1>
<h4>Should be h2</h4>  // Skips h2 and h3
```

## ARIA Attributes

### Labels

```tsx
// ✅ Good: Descriptive labels
<button aria-label="Close dialog">
  <X />  {/* Icon */}
</button>

<input
  type="search"
  aria-label="Search products"
  placeholder="Search..."
/>

// Label with visible text and additional context
<button aria-label="Delete user John Doe">
  Delete
</button>
```

### Describedby

```tsx
// ✅ Good: Additional descriptions
<input
  id="password"
  type="password"
  aria-describedby="password-hint"
/>
<p id="password-hint" className="text-sm text-gray-500">
  Must be at least 8 characters
</p>
```

### Live Regions

```tsx
// ✅ Good: Announce dynamic content
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  {statusMessage}
</div>

// For urgent updates
<div
  role="alert"
  aria-live="assertive"
>
  {errorMessage}
</div>
```

### States

```tsx
// ✅ Good: Communicate state
<button
  aria-pressed={isActive}
  onClick={() => setIsActive(!isActive)}
>
  {isActive ? 'Active' : 'Inactive'}
</button>

<button
  aria-expanded={isOpen}
  onClick={() => setIsOpen(!isOpen)}
>
  Toggle Menu
</button>

<input
  type="checkbox"
  aria-checked={isChecked}
  onChange={(e) => setIsChecked(e.target.checked)}
/>
```

## Keyboard Navigation

### Focus Management

```tsx
// ✅ Good: Visible focus indicators
<button className="focus:outline-none focus:ring-2 focus:ring-blue-500">
  Click me
</button>

// Focus trap in modal
import { useEffect, useRef } from 'react';

function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (!focusable || focusable.length === 0) return;

      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div ref={modalRef} role="dialog" aria-modal="true">
      {children}
    </div>
  );
}
```

### Keyboard Shortcuts

```tsx
// ✅ Good: Standard keyboard patterns
function Component() {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'Escape':
        closeDialog();
        break;
      case 'Enter':
      case ' ':  // Space
        if (e.target === e.currentTarget) {
          e.preventDefault();
          activateItem();
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        focusNextItem();
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusPreviousItem();
        break;
    }
  };

  return (
    <div
      role="menu"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Menu items */}
    </div>
  );
}
```

## Color and Contrast

### WCAG AA Requirements

```tsx
// ✅ Good: 4.5:1 ratio for normal text
<p className="text-gray-700">  {/* #374151 on white = 10.6:1 */}
  Body text with good contrast
</p>

// ✅ Good: 3:1 ratio for large text (18pt+ or 14pt+ bold)
<h1 className="text-gray-600 text-3xl">  {/* #4B5563 on white = 7.6:1 */}
  Large heading
</h1>

// ❌ Bad: Insufficient contrast
<p className="text-gray-400">  {/* #9CA3AF on white = 2.8:1 - TOO LOW */}
  Hard to read text
</p>

// ✅ Good: Don't rely on color alone
<span className="text-red-600 font-semibold">Error</span>
// vs
<span className="text-red-600">Error</span>  // Color only
```

### Color Blindness

```tsx
// ✅ Good: Use patterns and icons, not just color
function Status({ type }: { type: 'success' | 'error' | 'warning' }) {
  const config = {
    success: { icon: '✓', color: 'text-green-600', text: 'Success' },
    error: { icon: '✕', color: 'text-red-600', text: 'Error' },
    warning: { icon: '⚠', color: 'text-yellow-600', text: 'Warning' }
  };

  const { icon, color, text } = config[type];

  return (
    <span className={color}>
      <span aria-hidden="true">{icon}</span>
      {' '}
      {text}
    </span>
  );
}
```

## Forms

### Labels

```tsx
// ✅ Good: Always label inputs
<label htmlFor="email" className="block">
  Email Address
</label>
<input id="email" type="email" />

// ✅ Good: Label wrapping (implicit)
<label className="block">
  Email Address
  <input type="email" />
</label>

// ❌ Bad: Placeholder as label
<input type="email" placeholder="Email" />  // Not accessible
```

### Error Messages

```tsx
// ✅ Good: Associated error messages
<label htmlFor="password">Password</label>
<input
  id="password"
  type="password"
  aria-invalid={hasError}
  aria-describedby={hasError ? 'password-error' : undefined}
/>
{hasError && (
  <p id="password-error" className="text-red-600" role="alert">
    Password must be at least 8 characters
  </p>
)}
```

### Required Fields

```tsx
// ✅ Good: Indicate required fields
<label htmlFor="name">
  Full Name
  <span className="text-red-500" aria-label="required">*</span>
</label>
<input id="name" type="text" required aria-required="true" />

// Or use text
<label htmlFor="email">
  Email Address (required)
</label>
<input id="email" type="email" required />
```

## Images

### Alt Text

```tsx
// ✅ Good: Descriptive alt text
<img src="chart.png" alt="Sales increased 25% in Q4 2024" />

// ✅ Good: Decorative images
<img src="divider.png" alt="" />  {/* Empty alt for decorative */}

// ✅ Good: Complex images
<figure>
  <img src="chart.png" alt="Bar chart showing quarterly sales" />
  <figcaption>
    Detailed sales data: Q1: $100k, Q2: $150k, Q3: $120k, Q4: $200k
  </figcaption>
</figure>

// ❌ Bad: Generic or missing alt
<img src="photo.jpg" alt="image" />
<img src="logo.png" />  {/* Missing alt */}
```

## Tables

### Accessible Tables

```tsx
// ✅ Good: Table with headers
<table>
  <caption>Monthly Sales Report</caption>
  <thead>
    <tr>
      <th scope="col">Month</th>
      <th scope="col">Sales</th>
      <th scope="col">Profit</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">January</th>
      <td>$10,000</td>
      <td>$2,000</td>
    </tr>
  </tbody>
</table>
```

## Skip Links

```tsx
// ✅ Good: Skip to main content
<a
  href="#main"
  className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white"
>
  Skip to main content
</a>

<main id="main">
  {/* Main content */}
</main>
```

## Landmarks

```tsx
// ✅ Good: Use semantic landmarks
<header>
  <nav aria-label="Main navigation">
    {/* Navigation links */}
  </nav>
</header>

<main>
  <section aria-labelledby="products-heading">
    <h2 id="products-heading">Products</h2>
    {/* Product list */}
  </section>
</main>

<aside aria-label="Related articles">
  {/* Sidebar content */}
</aside>

<footer>
  {/* Footer content */}
</footer>
```

## Testing Checklist

### Keyboard Testing
- [ ] All interactive elements reachable via Tab
- [ ] Tab order is logical
- [ ] Enter/Space activates buttons and links
- [ ] Escape closes modals/dropdowns
- [ ] Arrow keys work in menus and lists
- [ ] Focus is visible on all elements
- [ ] Focus trap works in modals

### Screen Reader Testing
- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] Headings are in proper order
- [ ] ARIA labels are descriptive
- [ ] Live regions announce updates
- [ ] Error messages are announced
- [ ] Loading states are announced

### Color and Contrast
- [ ] Text contrast meets 4.5:1 (normal text)
- [ ] Large text contrast meets 3:1
- [ ] UI components contrast meets 3:1
- [ ] Don't rely on color alone for meaning
- [ ] Links are distinguishable from text

### Responsive and Zoom
- [ ] Content reflows at 320px width
- [ ] Text is readable at 200% zoom
- [ ] No horizontal scrolling at 200% zoom
- [ ] Touch targets are at least 44×44px

## Tools for Testing

- **Chrome DevTools**: Lighthouse accessibility audit
- **axe DevTools**: Browser extension for automated testing
- **NVDA/JAWS**: Screen reader testing (Windows)
- **VoiceOver**: Screen reader testing (macOS/iOS)
- **Keyboard**: Unplug mouse and test with keyboard only
- **Color Contrast Analyzer**: Check contrast ratios

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project](https://www.a11yproject.com/)
- [WebAIM](https://webaim.org/)
