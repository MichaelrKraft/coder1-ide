# API Documentation

This document provides comprehensive documentation for all components, hooks, utilities, and types used in the React Calculator App.

## Components API

### Calculator Component

The main container component that orchestrates the entire calculator functionality.

```typescript
interface CalculatorProps {
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'small' | 'medium' | 'large';
  onCalculation?: (result: number, equation: string) => void;
  precision?: number;
}

const Calculator: React.FC<CalculatorProps>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `undefined` | Additional CSS classes |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | Calculator theme |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Calculator size |
| `onCalculation` | `(result: number, equation: string) => void` | `undefined` | Callback when calculation completes |
| `precision` | `number` | `10` | Decimal precision for calculations |

#### Example Usage

```tsx
<Calculator 
  theme="dark"
  size="large"
  onCalculation={(result, equation) => {
    console.log(`${equation} = ${result}`);
  }}
  precision={2}
/>
```

---

### Display Component

Shows the current calculation state and results.

```typescript
interface DisplayProps {
  value: string;
  equation?: string;
  isError?: boolean;
  className?: string;
  showEquation?: boolean;
  animate?: boolean;
  'aria-live'?: 'polite' | 'assertive' | 'off';
}

const Display: React.FC<DisplayProps>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | **Required** | Current display value |
| `equation` | `string` | `undefined` | Full equation being calculated |
| `isError` | `boolean` | `false` | Whether display shows an error |
| `className` | `string` | `undefined` | Additional CSS classes |
| `showEquation` | `boolean` | `true` | Whether to show equation above result |
| `animate` | `boolean` | `true` | Enable/disable animations |
| `aria-live` | `'polite' \| 'assertive' \| 'off'` | `'polite'` | Screen reader announcement level |

#### Example Usage

```tsx
<Display 
  value="123.45"
  equation="100 + 23.45"
  showEquation={true}
  animate={true}
  aria-live="polite"
/>
```

---

### Keypad Component

Container for all calculator buttons with grid layout.

```typescript
interface KeypadProps {
  onButtonClick: (value: string, type: ButtonType) => void;
  className?: string;
  layout?: 'standard' | 'scientific';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

const Keypad: React.FC<KeypadProps>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onButtonClick` | `(value: string, type: ButtonType) => void` | **Required** | Button click handler |
| `className` | `string` | `undefined` | Additional CSS classes |
| `layout` | `'standard' \| 'scientific'` | `'standard'` | Button layout type |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Button size |
| `disabled` | `boolean` | `false` | Disable all buttons |

#### Example Usage

```tsx
<Keypad 
  onButtonClick={(value, type) => handleInput(value, type)}
  layout="standard"
  size="medium"
/>
```

---

### Button Component

Individual calculator button with multiple variants.

```typescript
interface ButtonProps {
  value: string;
  type: ButtonType;
  onClick: (value: string, type: ButtonType) => void;
  className?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  'aria-label'?: string;
  'aria-pressed'?: boolean;
  span?: 1 | 2;
}

const Button: React.FC<ButtonProps>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | **Required** | Button display value |
| `type` | `ButtonType` | **Required** | Button type for behavior |
| `onClick` | `(value: string, type: ButtonType) => void` | **Required** | Click handler |
| `className` | `string` | `undefined` | Additional CSS classes |
| `disabled` | `boolean` | `false` | Whether button is disabled |
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'success'` | `'primary'` | Button styling variant |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Button size |
| `aria-label` | `string` | `undefined` | Accessibility label |
| `aria-pressed` | `boolean` | `undefined` | Pressed state for toggle buttons |
| `span` | `1 \| 2` | `1` | Grid column span |

#### Example Usage

```tsx
<Button 
  value="+"
  type="operator"
  onClick={handleButtonClick}
  variant="secondary"
  aria-label="Addition"
/>
```

---

## Hooks API

### useCalculator Hook

Custom hook that encapsulates all calculator business logic.

```typescript
interface UseCalculatorOptions {
  precision?: number;
  maxDisplayLength?: number;
  onError?: (error: string) => void;
  onCalculation?: (result: number, equation: string) => void;
}

interface UseCalculatorReturn {
  // State
  display: string;
  equation: string;
  isError: boolean;
  isNewInput: boolean;
  
  // Actions
  handleInput: (value: string, type: ButtonType) => void;
  handleKeyPress: (event: KeyboardEvent) => void;
  clear: () => void;
  clearEntry: () => void;
  
  // Utilities
  canAddDecimal: boolean;
  lastOperation: string | null;
}

const useCalculator: (options?: UseCalculatorOptions) => UseCalculatorReturn
```

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `precision` | `number` | `10` | Decimal precision for calculations |
| `maxDisplayLength` | `number` | `12` | Maximum characters in display |
| `onError` | `(error: string) => void` | `undefined` | Error callback |
| `onCalculation` | `(result: number, equation: string) => void` | `undefined` | Calculation callback |

#### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `display` | `string` | Current display value |
| `equation` | `string` | Full equation string |
| `isError` | `boolean` | Whether calculator is in error state |
| `isNewInput` | `boolean` | Whether next input starts new number |
| `handleInput` | `function` | Handle button/keyboard input |
| `handleKeyPress` | `function` | Handle keyboard events |
| `clear` | `function` | Clear all calculator state |
| `clearEntry` | `function` | Clear current entry only |
| `canAddDecimal` | `boolean` | Whether decimal point can be added |
| `lastOperation` | `string \| null` | Last operation performed |

#### Example Usage

```tsx
const calculator = useCalculator({
  precision: 4,
  maxDisplayLength: 15,
  onError: (error) => console.error(error),
  onCalculation: (result, equation) => {
    // Log calculation
    console.log(`${equation} = ${result}`);
  }
});

// Use in component
const { display, equation, handleInput, clear } = calculator;
```

---

### useKeyboard Hook

Custom hook for handling keyboard interactions.

```typescript
interface UseKeyboardOptions {
  onKeyPress: (event: KeyboardEvent) => void;
  preventDefault?: boolean;
  capture?: boolean;
}

const useKeyboard: (options: UseKeyboardOptions) => void
```

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `onKeyPress` | `(event: KeyboardEvent) => void` | **Required** | Keyboard event handler |
| `preventDefault` | `boolean` | `true` | Prevent default browser behavior |
| `capture` | `boolean` | `false` | Use capture phase |

#### Example Usage

```tsx
useKeyboard({
  onKeyPress: calculator.handleKeyPress,
  preventDefault: true
});
```

---

## Types

### Core Types

```typescript
// Button type enumeration
type ButtonType = 
  | 'number' 
  | 'operator' 
  | 'equals' 
  | 'clear' 
  | 'clearEntry' 
  | 'decimal'
  | 'memory'
  | 'function';

// Calculator operation types
type Operation = '+' | '-' | '×' | '÷' | '=' | null;

// Calculator state interface
interface CalculatorState {
  display: string;
  previousValue: string;
  operation: Operation;
  isNewInput: boolean;
  isError: boolean;
  equation: string;
  memory: number;
}

// Button configuration
interface ButtonConfig {
  value: string;
  type: ButtonType;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  span?: 1 | 2;
  'aria-label'?: string;
}

// Theme configuration
interface ThemeConfig {
  name: string;
  colors: {
    background: string;
    display: string;
    button: {
      primary: string;
      secondary: string;
      danger: string;
      success: string;
    };
    text: {
      primary: string;
      secondary: string;
      inverse: string;
    };
  };
}
```

### Event Types

```typescript
// Button click event
interface ButtonClickEvent {
  value: string;
  type: ButtonType;
  timestamp: number;
}

// Calculation event
interface CalculationEvent {
  equation: string;
  result: number;
  timestamp: number;
  duration: number;
}

// Error event
interface ErrorEvent {
  message: string;
  type: 'division_by_zero' | 'overflow' | 'invalid_operation';
  timestamp: number;
}
```

---

## Utilities API

### Calculator Functions

```typescript
// Basic arithmetic operations
export const add = (a: number, b: number): number;
export const subtract = (a: number, b: number): number;
export const multiply = (a: number, b: number): number;
export const divide = (a: number, b: number): number;

// Advanced operations
export const percentage = (value: number, total: number): number;
export const power = (base: number, exponent: number): number;
export const squareRoot = (value: number): number;
export const factorial = (n: number): number;

// Utility functions
export const formatNumber = (
  num: number, 
  precision?: number,
  locale?: string
): string;

export const parseDisplayValue = (value: string): number;

export const performCalculation = (
  previousValue: number,
  currentValue: number,
  operation: Operation
): number;

export const isValidNumber = (value: string): boolean;
export const isValidOperation = (operation: string): boolean;
export const roundToPrecision = (num: number, precision: number): number;
```

### Validation Utilities

```typescript
// Input validation
export const validateInput = (input: string, type: ButtonType): boolean;
export const validateEquation = (equation: string): boolean;
export const sanitizeInput = (input: string): string;

// Range validation
export const isInRange = (value: number, min: number, max: number): boolean;
export const clampValue = (value: number, min: number, max: number): number;

// Error checking
export const checkDivisionByZero = (divisor: number): boolean;
export const checkOverflow = (value: number): boolean;
export const checkUnderflow = (value: number): boolean;
```

### Formatting Utilities

```typescript
// Number formatting
export const formatCurrency = (
  value: number, 
  currency: string,
  locale: string
): string;

export const formatPercentage = (value: number, decimals: number): string;
export const formatScientific = (value: number, precision: number): string;
export const formatEngineering = (value: number): string;

// Display formatting
export const autoFormatDisplay = (
  value: string, 
  maxLength: number
): string;

export const formatEquation = (equation: string): string;
export const highlightSyntax = (equation: string): string;
```

---

## Constants

### Configuration Constants

```typescript
// Display configuration
export const MAX_DISPLAY_LENGTH = 12;
export const MAX_EQUATION_LENGTH = 50;
export const DECIMAL_PLACES = 10;
export const ANIMATION_DURATION = 200;

// Mathematical constants
export const MATH_CONSTANTS = {
  PI: Math.PI,
  E: Math.E,
  PHI: 1.618033988749,
  SQRT2: Math.SQRT2,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  DIVISION_BY_ZERO: 'Cannot divide by zero',
  OVERFLOW: 'Number too large',
  UNDERFLOW: 'Number too small',
  INVALID_OPERATION: 'Invalid operation',
  SYNTAX_ERROR: 'Syntax error',
} as const;

// Keyboard mappings
export const KEYBOARD_MAP = {
  '0': { value: '0', type: 'number' },
  '1': { value: '1', type: 'number' },
  // ... more mappings
  'Enter': { value: '=', type: 'equals' },
  'Escape': { value: 'C', type: 'clear' },
} as const;
```

### Button Layout Configuration

```typescript
export const STANDARD_LAYOUT: ButtonConfig[][] = [
  [
    { value: 'C', type: 'clear', variant: 'danger' },
    { value: 'CE', type: 'clearEntry', variant: 'secondary' },
    { value: '⌫', type: 'backspace', variant: 'secondary' },
    { value: '÷', type: 'operator', variant: 'secondary' }
  ],
  [
    { value: '7', type: 'number' },
    { value: '8', type: 'number' },
    { value: '9', type: 'number' },
    { value: '×', type: 'operator', variant: 'secondary' }
  ],
  [
    { value: '4', type: 'number' },
    { value: '5', type: 'number' },
    { value: '6', type: 'number' },
    { value: '-', type: 'operator', variant: 'secondary' }
  ],
  [
    { value: '1', type: 'number' },
    { value: '2', type: 'number' },
    { value: '3', type: 'number' },
    { value: '+', type: 'operator', variant: 'secondary' }
  ],
  [
    { value: '0', type: 'number', span: 2 },
    { value: '.', type: 'decimal' },
    { value: '=', type: 'equals', variant: 'success' }
  ]
];
```

---

## Error Handling

### Error Types

All errors thrown by the calculator extend the base `CalculatorError`:

```typescript
class CalculatorError extends Error {
  type: string;
  timestamp: number;
  
  constructor(message: string, type: string) {
    super(message);
    this.name = 'CalculatorError';
    this.type = type;
    this.timestamp = Date.now();
  }
}

class DivisionByZeroError extends CalculatorError {
  constructor() {
    super('Cannot divide by zero', 'DIVISION_BY_ZERO');
  }
}

class OverflowError extends CalculatorError {
  constructor() {
    super('Number too large', 'OVERFLOW');
  }
}

class InvalidOperationError extends CalculatorError {
  constructor(operation: string) {
    super(`Invalid operation: ${operation}`, 'INVALID_OPERATION');
  }
}
```

### Error Recovery

The calculator provides automatic error recovery:

1. **Error Display**: Shows user-friendly error message
2. **State Reset**: Errors clear on next valid input
3. **Graceful Degradation**: Invalid operations are ignored
4. **User Feedback**: Visual and audio error indicators

---

## Testing API

### Test Utilities

```typescript
// Component testing helpers
export const renderCalculator = (props?: Partial<CalculatorProps>) => {
  return render(<Calculator {...props} />);
};

export const fireButtonClick = (button: string) => {
  const buttonElement = screen.getByText(button);
  fireEvent.click(buttonElement);
};

export const fireKeyPress = (key: string) => {
  fireEvent.keyDown(document, { key });
};

// Calculation testing
export const testCalculation = (
  sequence: string[], 
  expected: string
) => {
  const { getByTestId } = renderCalculator();
  
  sequence.forEach(input => {
    if (isNaN(Number(input))) {
      fireKeyPress(input);
    } else {
      fireButtonClick(input);
    }
  });
  
  expect(getByTestId('display')).toHaveTextContent(expected);
};
```

### Mock Implementations

```typescript
// Mock calculator hook for testing
export const mockUseCalculator = (overrides?: Partial<UseCalculatorReturn>) => {
  return {
    display: '0',
    equation: '',
    isError: false,
    isNewInput: true,
    handleInput: jest.fn(),
    handleKeyPress: jest.fn(),
    clear: jest.fn(),
    clearEntry: jest.fn(),
    canAddDecimal: true,
    lastOperation: null,
    ...overrides
  };
};
```

---

This API documentation provides comprehensive coverage of all public interfaces in the React Calculator App. For implementation details and examples, refer to the source code and test files.