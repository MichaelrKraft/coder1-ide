# React Calculator App

A modern, responsive calculator built with React, TypeScript, and Tailwind CSS.

## Features

- ✨ Clean, intuitive interface
- 🔢 Basic arithmetic operations (addition, subtraction, multiplication, division)
- 📱 Responsive design for desktop and mobile
- ⌨️ Keyboard support
- 🎨 Modern UI with smooth animations
- ♿ Accessible design with proper ARIA labels
- 🔄 Clear and reset functionality
- 📊 Real-time calculation display

## Tech Stack

- **React 18+** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool and dev server
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd react-calculator-app

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # Run TypeScript checks
```

## Project Structure

```
src/
├── components/
│   ├── Calculator/
│   │   ├── Calculator.tsx
│   │   ├── Display.tsx
│   │   ├── Button.tsx
│   │   └── Keypad.tsx
│   └── ui/
│       └── Container.tsx
├── hooks/
│   └── useCalculator.ts
├── types/
│   └── calculator.ts
├── utils/
│   ├── calculator.ts
│   └── constants.ts
├── styles/
│   └── globals.css
├── App.tsx
└── main.tsx
```

## Usage

### Basic Operations

1. **Numbers**: Click number buttons (0-9) or use keyboard
2. **Operations**: Click +, -, ×, ÷ buttons or use keyboard (+, -, *, /)
3. **Equals**: Click = button or press Enter
4. **Clear**: Click C button or press Escape
5. **Clear Entry**: Click CE button or press Delete

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `0-9` | Enter numbers |
| `+` | Addition |
| `-` | Subtraction |
| `*` | Multiplication |
| `/` | Division |
| `Enter` or `=` | Calculate result |
| `Escape` | Clear all |
| `Delete` | Clear entry |
| `.` | Decimal point |

## Architecture

The calculator follows a clean component architecture with separation of concerns:

- **Calculator**: Main container component
- **Display**: Shows current input and results
- **Keypad**: Contains all calculator buttons
- **Button**: Reusable button component with different variants
- **useCalculator**: Custom hook for calculator logic

## Development Guidelines

### Code Style

- Use TypeScript for all components
- Follow React best practices
- Use functional components with hooks
- Implement proper error boundaries
- Add comprehensive prop validation

### Testing

```bash
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Design inspired by modern calculator apps
- Built with modern React patterns and best practices