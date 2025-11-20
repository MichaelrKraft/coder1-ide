# Tailwind CSS Patterns

Common Tailwind CSS utility patterns used in Coder1 IDE for responsive, accessible, and beautiful interfaces.

## Layout Patterns

### Flexbox Patterns

```html
<!-- Center content horizontally and vertically -->
<div class="flex items-center justify-center h-screen">
  <div>Centered Content</div>
</div>

<!-- Space between items -->
<div class="flex items-center justify-between">
  <div>Left</div>
  <div>Right</div>
</div>

<!-- Vertical stack with spacing -->
<div class="flex flex-col space-y-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

<!-- Horizontal stack with spacing -->
<div class="flex items-center space-x-2">
  <button>Action 1</button>
  <button>Action 2</button>
</div>

<!-- Responsive flex direction -->
<div class="flex flex-col md:flex-row gap-4">
  <div>Mobile: Stack | Desktop: Side-by-side</div>
</div>
```

### Grid Patterns

```html
<!-- Auto-fit responsive grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  <div>Card 1</div>
  <div>Card 2</div>
  <div>Card 3</div>
  <div>Card 4</div>
</div>

<!-- Sidebar + Main layout -->
<div class="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-4">
  <aside>Sidebar</aside>
  <main>Main Content</main>
</div>

<!-- Holy Grail Layout -->
<div class="min-h-screen grid grid-rows-[auto_1fr_auto]">
  <header>Header</header>
  <main>Content</main>
  <footer>Footer</footer>
</div>
```

## Component Patterns

### Button Variants

```html
<!-- Primary Button -->
<button class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
  Primary
</button>

<!-- Secondary Button -->
<button class="bg-gray-200 text-gray-900 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors">
  Secondary
</button>

<!-- Danger Button -->
<button class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors">
  Delete
</button>

<!-- Ghost Button -->
<button class="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors">
  Cancel
</button>

<!-- Icon Button -->
<button class="p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Settings">
  <svg class="w-5 h-5">...</svg>
</button>
```

### Card Patterns

```html
<!-- Basic Card -->
<div class="bg-white rounded-lg shadow-md border p-6">
  <h3 class="text-lg font-semibold mb-2">Card Title</h3>
  <p class="text-gray-600">Card content goes here.</p>
</div>

<!-- Hoverable Card -->
<div class="bg-white rounded-lg shadow-md border p-6 hover:shadow-lg transition-shadow cursor-pointer">
  <h3 class="text-lg font-semibold mb-2">Clickable Card</h3>
  <p class="text-gray-600">Click to open</p>
</div>

<!-- Card with Image -->
<div class="bg-white rounded-lg shadow-md overflow-hidden">
  <img src="image.jpg" alt="Card image" class="w-full h-48 object-cover" />
  <div class="p-6">
    <h3 class="text-lg font-semibold mb-2">Image Card</h3>
    <p class="text-gray-600">Description</p>
  </div>
</div>

<!-- Card with Header and Footer -->
<div class="bg-white rounded-lg shadow-md border">
  <div class="px-6 py-4 border-b">
    <h3 class="text-lg font-semibold">Header</h3>
  </div>
  <div class="px-6 py-4">
    <p class="text-gray-600">Content</p>
  </div>
  <div class="px-6 py-4 border-t bg-gray-50">
    <button>Action</button>
  </div>
</div>
```

### Input Patterns

```html
<!-- Text Input -->
<div class="w-full">
  <label class="block text-sm font-medium text-gray-700 mb-1">
    Email
  </label>
  <input
    type="email"
    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    placeholder="you@example.com"
  />
</div>

<!-- Input with Error -->
<div class="w-full">
  <label class="block text-sm font-medium text-gray-700 mb-1">
    Password
  </label>
  <input
    type="password"
    class="w-full px-3 py-2 border border-red-500 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
  />
  <p class="mt-1 text-sm text-red-600">Password is required</p>
</div>

<!-- Input with Icon -->
<div class="relative">
  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
    <svg class="w-5 h-5 text-gray-400">...</svg>
  </div>
  <input
    type="text"
    class="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    placeholder="Search..."
  />
</div>
```

## Responsive Design

### Breakpoint Patterns

```html
<!-- Hide/Show at different screen sizes -->
<div class="hidden md:block">
  Desktop only
</div>

<div class="md:hidden">
  Mobile only
</div>

<!-- Responsive text sizes -->
<h1 class="text-2xl md:text-4xl lg:text-5xl font-bold">
  Responsive Heading
</h1>

<!-- Responsive padding/margin -->
<div class="px-4 md:px-8 lg:px-12">
  Responsive padding
</div>

<!-- Responsive columns -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  <!-- Content -->
</div>
```

### Container Patterns

```html
<!-- Centered container with max-width -->
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <div class="max-w-3xl mx-auto">
    <!-- Content is centered and limited in width -->
  </div>
</div>

<!-- Full-width sections with constrained content -->
<section class="bg-gray-100">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <!-- Content -->
  </div>
</section>
```

## Accessibility Patterns

### Focus States

```html
<!-- Visible focus ring -->
<button class="px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
  Button
</button>

<!-- Custom focus styles -->
<a href="#" class="text-blue-600 hover:text-blue-800 focus:outline-none focus:underline">
  Link
</a>
```

### Screen Reader Patterns

```html
<!-- Visually hidden but accessible to screen readers -->
<span class="sr-only">
  Loading...
</span>

<!-- Skip to main content -->
<a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0">
  Skip to main content
</a>
```

## Animation Patterns

### Transitions

```html
<!-- Smooth color transitions -->
<button class="bg-blue-600 hover:bg-blue-700 transition-colors duration-200">
  Hover me
</button>

<!-- Transform on hover -->
<div class="hover:scale-105 transition-transform duration-200">
  Scales on hover
</div>

<!-- Multiple transitions -->
<div class="opacity-0 hover:opacity-100 translate-y-4 hover:translate-y-0 transition-all duration-300">
  Fades and slides in
</div>
```

### Loading States

```html
<!-- Spinner -->
<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>

<!-- Pulse animation -->
<div class="animate-pulse bg-gray-200 h-4 w-full rounded"></div>

<!-- Skeleton loader -->
<div class="space-y-4 animate-pulse">
  <div class="h-4 bg-gray-200 rounded w-3/4"></div>
  <div class="h-4 bg-gray-200 rounded"></div>
  <div class="h-4 bg-gray-200 rounded w-5/6"></div>
</div>
```

## Dark Mode Patterns

```html
<!-- Background that adapts to dark mode -->
<div class="bg-white dark:bg-gray-900">
  <!-- Content -->
</div>

<!-- Text color in dark mode -->
<p class="text-gray-900 dark:text-gray-100">
  Text adapts to theme
</p>

<!-- Border in dark mode -->
<div class="border border-gray-200 dark:border-gray-700">
  <!-- Content -->
</div>

<!-- Complete dark mode component -->
<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
  <h3 class="text-gray-900 dark:text-gray-100 text-lg font-semibold">
    Dark Mode Ready
  </h3>
  <p class="text-gray-600 dark:text-gray-400">
    Description text
  </p>
</div>
```

## Common Utility Combinations

### Typography

```html
<!-- Heading -->
<h1 class="text-3xl font-bold text-gray-900 mb-4">
  Main Heading
</h1>

<!-- Body text -->
<p class="text-base text-gray-600 leading-relaxed">
  Body paragraph with comfortable line height.
</p>

<!-- Truncated text -->
<p class="truncate">
  This text will be truncated with ellipsis if too long
</p>

<!-- Multi-line clamp -->
<p class="line-clamp-3">
  This text will be clamped to 3 lines with ellipsis
</p>
```

### Shadows and Depth

```html
<!-- Small shadow -->
<div class="shadow-sm">Subtle shadow</div>

<!-- Medium shadow -->
<div class="shadow-md">Standard shadow</div>

<!-- Large shadow -->
<div class="shadow-lg">Prominent shadow</div>

<!-- Shadow on hover -->
<div class="shadow-md hover:shadow-lg transition-shadow">
  Hover for more shadow
</div>
```

These patterns represent the most commonly used Tailwind utilities in modern React applications.
