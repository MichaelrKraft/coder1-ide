# Calculator App Architecture

## Overview

The React Calculator App follows a modular, component-based architecture with clear separation of concerns, making it maintainable, testable, and scalable.

## Architecture Principles

- **Component Composition**: Small, focused components that compose together
- **Single Responsibility**: Each component has one clear purpose
- **Props Down, Events Up**: Unidirectional data flow
- **Custom Hooks**: Business logic abstracted into reusable hooks
- **TypeScript First**: Full type safety throughout the application

## Component Hierarchy

```
App
└── Calculator
    ├── Display
    └── Keypad
        └── Button (×16)
```

## Core Components

### Calculator (Container Component)

**Responsibility**: Main orchestrator that manages calculator state and coordinates between display and keypad.

```typescript
interface CalculatorProps {
  className?: string;
  theme?: 'light' | 'dark';
}
```

**Key Features**:
- Manages calculator state via `useCalculator` hook
- Handles keyboard events
- Provides context for child components
- Responsive layout management

### Display Component

**Responsibility**: Shows current input, operations, and results.

```typescript
interface DisplayProps {
  value: string;
  equation?: string;
  isError?: boolean;
  className?: string;
}
```

**Key Features**:
- Auto-sizing text for long numbers
- Error state visualization
- Equation history display
- Accessibility attributes

### Keypad Component

**Responsibility**: Grid layout for all calculator buttons.

```typescript
interface KeypadProps {
  onButtonClick: (value: string, type: ButtonType) => void;
  className?: string;
}
```

**Key Features**:
- CSS Grid layout for responsive design
- Button grouping and organization
- Event delegation for performance

### Button Component

**Responsibility**: Individual calculator button with variants for different types.

```typescript
interface ButtonProps {
  value: string;
  type: ButtonType;
  onClick: (value: string, type: ButtonType) => void;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

type ButtonType = 'number' | 'operator' | 'equals' | 'clear' | 'clearEntry' | 'decimal';
```

**Key Features**:
- Multiple visual variants (number, operator, action)
- Hover and active states
- Accessibility support
- Keyboard navigation

## Custom Hooks

### useCalculator Hook

**Responsibility**: Encapsulates all calculator business logic.

```typescript
interface UseCalculatorReturn {
  display: string;
  equation: string;
  isError: boolean;
  handleInput: (value: string, type: ButtonType) => void;
  handleKeyPress: (event: KeyboardEvent) => void;
  clear: () => void;
  clearEntry: () => void;
}
```

**State Management**:
- Current display value
- Operation in progress
- Previous operand
- Error states
- Calculation history

## State Management

### Calculator State

```typescript
interface CalculatorState {
  display: string;           // Current display value
  previousValue: string;     // Previous operand
  operation: string | null;  // Current operation (+, -, ×, ÷)
  isNewInput: boolean;      // Flag for new input
  isError: boolean;         // Error state
  equation: string;         // Full equation display
}
```

### State Transitions

1. **Number Input**: Updates display, manages new input flag
2. **Operator Input**: Stores current value, sets operation
3. **Equals**: Performs calculation, updates display
4. **Clear**: Resets entire state
5. **Clear Entry**: Clears current display only

## Utility Functions

### Calculator Logic (`utils/calculator.ts`)

```typescript
// Core calculation functions
export const add = (a: number, b: number): number;
export const subtract = (a: number, b: number): number;
export const multiply = (a: number, b: number): number;
export const divide = (a: number, b: number): number;

// Helper functions
export const formatNumber = (num: number): string;
export const parseDisplayValue = (value: string): number;
export const isValidOperation = (operation: string): boolean;
export const performCalculation = (
  prev: number, 
  current: number, 
  operation: string
): number;
```

### Constants (`utils/constants.ts`)

```typescript
export const BUTTON_LAYOUT = [
  [{ value: 'C', type: 'clear' }, { value: 'CE', type: 'clearEntry' }, /* ... */],
  // ... button configuration
];

export const KEYBOARD_MAP = {
  'Enter': 'equals',
  'Escape': 'clear',
  'Delete': 'clearEntry',
  // ... keyboard mappings
};

export const MAX_DISPLAY_LENGTH = 12;
export const DECIMAL_PLACES = 10;
```

## Error Handling

### Error States

- **Division by Zero**: Shows "Cannot divide by zero"
- **Invalid Operation**: Shows "Invalid operation"
- **Overflow**: Shows "Number too large"
- **Invalid Input**: Prevents invalid character entry

### Error Recovery

- Errors clear on next valid input
- Clear button always resets to clean state
- Error states don't crash the application

## Performance Considerations

### Optimization Strategies

1. **React.memo**: Prevent unnecessary re-renders of buttons
2. **useCallback**: Memoize event handlers
3. **Event Delegation**: Single event listener for keypad
4. **Lazy Loading**: Code splitting for large applications

### Memory Management

- Clean up event listeners on unmount
- Avoid memory leaks in calculator state
- Efficient string operations for display

## Accessibility

### ARIA Implementation

- `role="button"` for all calculator buttons
- `aria-label` for screen reader descriptions
- `aria-pressed` for operation state
- `aria-live` region for calculation announcements

### Keyboard Navigation

- Tab order follows logical flow
- Enter/Space activate focused buttons
- Arrow keys navigate between buttons
- Escape key provides quick clear

## Testing Strategy

### Unit Tests

- Calculator logic functions
- Individual component rendering
- State transitions
- Error handling

### Integration Tests

- Complete calculation workflows
- Keyboard interaction
- Error recovery scenarios

### E2E Tests

- Full user journeys
- Cross-browser compatibility
- Mobile responsiveness

## Styling Architecture

### CSS Organization

```
styles/
├── globals.css          # Global styles and CSS variables
├── components/
│   ├── calculator.css   # Calculator-specific styles
│   ├── display.css      # Display component styles
│   └── button.css       # Button variants and states
└── utilities/
    └── animations.css   # Reusable animations
```

### Design System

- CSS custom properties for theming
- Consistent spacing scale (4px base)
- Color palette with semantic meanings
- Typography scale for different contexts

## Browser Compatibility

### Target Support

- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- ES2020+ features
- CSS Grid and Flexbox
- CSS Custom Properties

### Fallbacks

- Graceful degradation for older browsers
- Polyfills for missing features
- Progressive enhancement approach

## Future Enhancements

### Planned Features

1. **Scientific Calculator Mode**
   - Advanced operations (sin, cos, tan, log, etc.)
   - Memory functions (M+, M-, MR, MC)
   - Parentheses support

2. **History Panel**
   - Calculation history
   - Copy/paste functionality
   - Export calculations

3. **Themes**
   - Multiple color themes
   - Custom theme builder
   - System theme detection

4. **Enhanced Accessibility**
   - Voice input support
   - High contrast mode
   - Sound feedback options

### Scalability Considerations

- Plugin architecture for new features
- State management library for complex state
- Component library extraction
- Internationalization support