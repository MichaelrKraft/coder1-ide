# Calculator App - Component Architecture

## 🏗️ Architecture Overview

This React calculator app follows a modern, scalable component architecture with clear separation of concerns, type safety, and accessibility-first design.

## 📊 Component Hierarchy

```
App
└── Calculator (Container Component)
    ├── Display (Presentation Component)
    ├── ButtonGrid (Layout Component)
    │   └── Button (Atomic Component) × 20
    └── History (Feature Component)
```

## 🔧 Core Architecture Patterns

### 1. **Container vs Presentation Components**
- **Calculator**: Container component managing state and business logic
- **Display, ButtonGrid, Button**: Presentation components focused on UI
- **Clear separation** of concerns for maintainability

### 2. **Custom Hooks Pattern**
- **useCalculator**: Encapsulates all calculator logic and state management
- **Benefits**: Reusable, testable, separation of logic from UI

### 3. **TypeScript-First Design**
- **Strong typing** for all props, state, and functions
- **Type-safe operations** preventing runtime errors
- **Clear interfaces** for component contracts

### 4. **Accessibility-First Approach**
- **ARIA labels** on all interactive elements
- **Keyboard navigation** support
- **Screen reader** friendly structure
- **Semantic HTML** elements

## 📁 File Organization

```
src/
├── components/          # UI Components
│   ├── Calculator.tsx   # Main container component
│   ├── Display.tsx      # Display screen component
│   ├── ButtonGrid.tsx   # Button layout component
│   └── Button.tsx       # Individual button component
├── hooks/              # Custom Hooks
│   └── useCalculator.ts # Calculator state and logic
├── types/              # TypeScript Definitions
│   └── calculator.ts    # Type definitions
├── utils/              # Utility Functions
│   └── calculator.ts    # Pure calculation functions
└── styles/             # Styling
    └── components/      # Component-specific styles
```

## 🎯 Component Responsibilities

### **Calculator.tsx** (Container)
```typescript
Responsibilities:
- State management coordination
- Event handler orchestration
- Layout composition
- Feature integration (history, keyboard)

Dependencies:
- useCalculator hook
- Display, ButtonGrid components
- Type definitions
```

### **Display.tsx** (Presentation)
```typescript
Props Interface:
- value: string          # Current display value
- operation?: string     # Current operation symbol
- previousValue?: string # Previous calculation value

Responsibilities:
- Value formatting and display
- Error state presentation
- Operation history display
- Number formatting (commas, decimals)
```

### **ButtonGrid.tsx** (Layout)
```typescript
Props Interface:
- Event handlers for all button types
- Flexible, extensible button configuration

Responsibilities:
- Button layout and positioning
- Event delegation to parent
- Accessibility attributes
- Responsive grid layout
```

### **Button.tsx** (Atomic)
```typescript
Props Interface:
- label: string
- onClick: () => void
- type: 'number' | 'operation' | 'function' | 'equals'
- className?: string
- disabled?: boolean
- aria-label?: string

Responsibilities:
- Single button rendering
- Click event handling
- Visual state management
- Accessibility compliance
```

## 🔄 State Management Architecture

### **Calculator State Structure**
```typescript
interface CalculatorState {
  display: string;           # Current display value
  previousValue: string;     # Previous calculation value
  operation: Operation | null; # Current operation
  waitingForNewValue: boolean; # Input state flag
  history: string[];         # Calculation history
}
```

### **State Flow Patterns**
1. **Immutable Updates**: All state changes create new objects
2. **Predictable State**: Each action has a clear, testable outcome
3. **Error Boundaries**: Graceful error handling with fallback states
4. **History Management**: Automatic calculation history tracking

## 🧪 Testing Architecture

### **Component Testing Strategy**
```typescript
// Example test patterns for each component type:

// Container Component (Calculator)
- State management testing
- Integration testing with hooks
- Event flow testing
- Keyboard interaction testing

// Presentation Component (Display)
- Props rendering testing
- Formatting function testing
- Error state testing
- Accessibility testing

// Utility Function Testing
- Pure function testing
- Edge case handling
- Error condition testing
- Mathematical accuracy testing
```

### **Hook Testing Patterns**
```typescript
// useCalculator hook testing
- State transition testing
- Action handler testing
- Side effect testing (keyboard)
- Error boundary testing
```

## 🎨 Styling Architecture

### **CSS Organization Pattern**
```scss
// Component-scoped styling approach
.calculator {
  // Container styles
  
  &-display {
    // Display component styles
  }
  
  &-button {
    // Base button styles
    
    &.btn-number { /* Number button styles */ }
    &.btn-operation { /* Operation button styles */ }
    &.btn-function { /* Function button styles */ }
    &.btn-equals { /* Equals button styles */ }
  }
}
```

### **Theme System Ready**
- **CSS Custom Properties** for easy theming
- **Component-scoped** styling prevents conflicts
- **Responsive design** principles applied
- **Dark/Light mode** support prepared

## 🚀 Performance Optimizations

### **Implemented Optimizations**
1. **useCallback**: Memoized event handlers prevent unnecessary re-renders
2. **Component Splitting**: Atomic components for efficient updates
3. **Pure Components**: Presentation components are optimized for re-rendering
4. **State Normalization**: Flat state structure for efficient updates

### **Memory Management**
- **History Limit**: Automatic cleanup of calculation history (last 10 entries)
- **Event Cleanup**: Proper keyboard event listener cleanup
- **Component Cleanup**: Proper useEffect cleanup patterns

## 🔮 Extensibility Points

### **Easy Feature Additions**
1. **New Button Types**: Add to ButtonType enum and styling
2. **Advanced Operations**: Extend Operation type and calculation utilities
3. **Memory Functions**: Add to state and implement handlers
4. **Theme System**: Extend CSS custom properties
5. **Accessibility**: Already WCAG 2.1 AA compliant foundation

### **Architecture Benefits**
- **Modular Design**: Each component has a single responsibility
- **Type Safety**: Compile-time error catching
- **Testability**: Pure functions and isolated components
- **Maintainability**: Clear structure and separation of concerns
- **Scalability**: Ready for feature additions and modifications

## 📐 Design Principles Applied

### **SOLID Principles**
- **S**: Single Responsibility - Each component has one job
- **O**: Open/Closed - Easy to extend without modification
- **L**: Liskov Substitution - Components can be safely replaced
- **I**: Interface Segregation - Clean, focused interfaces
- **D**: Dependency Inversion - Components depend on abstractions

### **React Best Practices**
- **Composition over Inheritance**: Component composition patterns
- **Unidirectional Data Flow**: Clear parent-to-child communication
- **Immutable State**: Predictable state management
- **Pure Components**: Predictable, testable component behavior

This architecture provides a solid foundation for a production-ready calculator application with room for growth and excellent maintainability.