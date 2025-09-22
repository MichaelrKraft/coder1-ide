# React Calculator App

A modern, feature-rich calculator application built with React, TypeScript, and modern UI/UX principles. This calculator provides all standard arithmetic operations plus advanced features like memory functions, history tracking, and a beautiful responsive design.

## 🌟 Features

### Core Calculator Functions
- ✅ **Basic Arithmetic**: Addition, subtraction, multiplication, division
- ✅ **Decimal Operations**: Support for floating-point calculations
- ✅ **Advanced Functions**: Clear, Clear Entry, Backspace, Sign toggle
- ✅ **Memory Functions**: Memory Add, Subtract, Recall, and Clear
- ✅ **Calculation History**: Track and review previous calculations
- ✅ **Keyboard Support**: Full keyboard input support for efficiency

### User Experience
- 🎨 **Dark/Light Theme**: Toggle between elegant themes
- 📱 **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- ♿ **Accessibility**: WCAG compliant with proper ARIA labels
- ⚡ **Performance**: Optimized React components with proper state management
- 🔧 **Error Handling**: Graceful handling of invalid operations

### Technical Excellence
- 🔷 **TypeScript**: Fully typed for better development experience
- 🏗️ **Component Architecture**: Clean, reusable component structure
- 🎯 **Context API**: Efficient state management with React Context
- 🧪 **Testing Ready**: Configured for unit and integration testing
- 🎨 **Modern CSS**: CSS Grid and Flexbox for responsive layouts

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Open http://localhost:3000 in your browser
```

## 📱 Screenshots

### Light Theme
```
┌─────────────────────────┐
│        123.45           │  ← Display
├─────────────────────────┤
│ MC  MR  M+  M-  C   CE  │  ← Memory & Clear Functions
├─────────────────────────┤
│  7   8   9   ÷          │  ← Number & Operation Grid
│  4   5   6   ×          │
│  1   2   3   -          │
│  ±   0   .   +          │
│       =                 │  ← Equals Button
└─────────────────────────┘
```

### Dark Theme
```
┌─────────────────────────┐
│        456.78           │  ← Display (Dark)
├─────────────────────────┤
│ MC  MR  M+  M-  C   CE  │  ← Memory Functions
├─────────────────────────┤
│  7   8   9   ÷          │  ← Elegant Dark Theme
│  4   5   6   ×          │
│  1   2   3   -          │
│  ±   0   .   +          │
│       =                 │
└─────────────────────────┘
```

## 🎯 Usage Examples

### Basic Calculations
```
Input: 15 + 25 =
Result: 40

Input: 100 - 25 =
Result: 75

Input: 12 × 8 =
Result: 96

Input: 144 ÷ 12 =
Result: 12
```

### Memory Functions
```
1. Calculate: 50 + 25 = 75
2. Press M+ (adds 75 to memory)
3. Calculate: 100 - 30 = 70
4. Press MR (recalls 75 from memory)
5. Result: 75 is displayed
```

### Advanced Operations
```
Input: 123.45
Press ± → Result: -123.45
Press ± → Result: 123.45

Input: 12345
Press ← → Result: 1234 (backspace)
Press CE → Result: 0 (clear entry)
```

## 🏗️ Project Structure

```
src/
├── components/           # React components
│   ├── Calculator.tsx   # Main calculator component
│   ├── Display.tsx      # Display screen component
│   ├── Button.tsx       # Individual button component
│   ├── ButtonGrid.tsx   # Button layout grid
│   └── ThemeToggle.tsx  # Dark/light theme switcher
├── context/             # React Context providers
│   ├── CalculatorContext.tsx  # Calculator state management
│   └── ThemeContext.tsx       # Theme state management
├── hooks/               # Custom React hooks
│   └── useCalculator.ts # Calculator logic hook
├── types/               # TypeScript type definitions
│   └── calculator.ts    # Calculator-specific types
├── utils/               # Utility functions
│   └── calculator.ts    # Calculator business logic
├── App.tsx             # Main application component
└── index.tsx           # Application entry point
```

## 🔧 Key Technologies

- **React 18**: Latest React with Concurrent Features
- **TypeScript 4.9**: Full type safety and IntelliSense
- **CSS Grid & Flexbox**: Modern responsive layouts
- **React Context API**: Efficient state management
- **Create React App**: Zero-config build setup
- **Testing Library**: Comprehensive testing utilities

## 📚 Documentation

- **[Setup Guide](./SETUP.md)**: Detailed installation and configuration
- **[Architecture Guide](./ARCHITECTURE.md)**: Component design and patterns
- **[Development Guide](./DEVELOPMENT.md)**: Development workflow and best practices
- **[Testing Guide](./TESTING.md)**: Testing strategies and examples

## 🎨 Design Principles

### User Interface
- **Minimalist Design**: Clean, uncluttered interface focused on functionality
- **Intuitive Layout**: Standard calculator layout familiar to all users
- **Visual Feedback**: Button press animations and hover effects
- **Responsive Grid**: Adapts beautifully to any screen size

### User Experience
- **Immediate Response**: Instant visual feedback for all interactions
- **Error Prevention**: Smart input validation prevents invalid operations
- **Keyboard Shortcuts**: Full keyboard support for power users
- **Accessibility**: Screen reader support and proper focus management

### Code Quality
- **Component Reusability**: Modular components for easy maintenance
- **Type Safety**: Comprehensive TypeScript integration
- **Performance**: Optimized rendering with React best practices
- **Maintainability**: Clear separation of concerns and clean architecture

## 🚀 Getting Started

1. **Prerequisites**: Node.js 16+ and npm 8+
2. **Installation**: Clone repository and run `npm install`
3. **Development**: Run `npm start` and open http://localhost:3000
4. **Building**: Run `npm run build` for production build
5. **Testing**: Run `npm test` for test suite

## 🤝 Contributing

We welcome contributions! Please see our development guides for:
- Code style guidelines
- Component design patterns
- Testing requirements
- Pull request process

## 📄 License

MIT License - see LICENSE file for details

---

**Built with ❤️ using React, TypeScript, and modern web standards**