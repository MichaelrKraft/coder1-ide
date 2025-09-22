# Setup Guide - React Calculator App

This guide will help you set up the React Calculator application from scratch, including all prerequisites, installation steps, and initial configuration.

## 📋 Prerequisites

### Required Software

#### Node.js (Version 16 or higher)
```bash
# Check if Node.js is installed
node --version
# Should show v16.0.0 or higher

# If not installed, download from:
# https://nodejs.org/en/download/
```

#### npm (Version 8 or higher) or Yarn
```bash
# Check npm version
npm --version
# Should show 8.0.0 or higher

# Alternative: Check Yarn version
yarn --version
# Should show 1.22.0 or higher
```

#### Git (for version control)
```bash
# Check Git installation
git --version
# Should show git version 2.30.0 or higher
```

### Recommended Tools

#### Code Editor
- **Visual Studio Code** (recommended)
  - Install React and TypeScript extensions
  - ESLint and Prettier extensions for code formatting
- **WebStorm** or **IntelliJ IDEA** with React plugin
- **Atom** with React packages

#### Browser Extensions
- **React Developer Tools** for Chrome/Firefox
- **Redux DevTools** (for future state management debugging)

## 🚀 Installation Steps

### 1. Clone or Create Project

#### Option A: Clone Existing Repository
```bash
# Clone the repository
git clone <repository-url>
cd react-calculator

# Install dependencies
npm install
```

#### Option B: Create from Scratch
```bash
# Create new React app with TypeScript
npx create-react-app react-calculator --template typescript
cd react-calculator

# Install additional dependencies (if needed)
npm install @types/react @types/react-dom
```

### 2. Project Structure Setup

If starting from scratch, create the following directory structure:

```bash
# Create component directories
mkdir -p src/components
mkdir -p src/context
mkdir -p src/hooks
mkdir -p src/types
mkdir -p src/utils
mkdir -p src/styles

# Create initial files
touch src/components/Calculator.tsx
touch src/components/Display.tsx
touch src/components/Button.tsx
touch src/components/ButtonGrid.tsx
touch src/components/ThemeToggle.tsx
touch src/context/CalculatorContext.tsx
touch src/context/ThemeContext.tsx
touch src/hooks/useCalculator.ts
touch src/types/calculator.ts
touch src/utils/calculator.ts
```

### 3. Package.json Configuration

Ensure your `package.json` includes these dependencies:

```json
{
  "name": "react-calculator",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@types/node": "^18.17.0",
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "typescript": "^4.9.5",
    "web-vitals": "^3.3.2"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^5.17.0",
    "@testing-library/react": "^13.4.0",
    "@testing-library/user-event": "^14.4.3"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write src/**/*.{ts,tsx,css}"
  }
}
```

## ⚙️ Development Environment Setup

### 1. TypeScript Configuration

Ensure `tsconfig.json` is properly configured:

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": [
      "dom",
      "dom.iterable",
      "esnext"
    ],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": "src",
    "paths": {
      "@/components/*": ["components/*"],
      "@/context/*": ["context/*"],
      "@/hooks/*": ["hooks/*"],
      "@/types/*": ["types/*"],
      "@/utils/*": ["utils/*"]
    }
  },
  "include": [
    "src"
  ]
}
```

### 2. ESLint Configuration (Optional)

Create `.eslintrc.json`:

```json
{
  "extends": [
    "react-app",
    "react-app/jest"
  ],
  "rules": {
    "no-unused-vars": "warn",
    "no-console": "warn",
    "prefer-const": "error"
  }
}
```

### 3. Prettier Configuration (Optional)

Create `.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
# Start the development server
npm start

# Or with Yarn
yarn start

# Open http://localhost:3000 in your browser
# The page will reload when you make edits
```

### Production Build
```bash
# Create optimized production build
npm run build

# Or with Yarn
yarn build

# Serve the build locally (optional)
npx serve -s build
```

### Testing
```bash
# Run test suite
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in CI mode
npm test -- --ci --coverage --watchAll=false
```

## 🔧 Environment Variables

Create a `.env` file in the root directory for environment-specific configuration:

```env
# React App Environment Variables
REACT_APP_VERSION=$npm_package_version
REACT_APP_NAME=React Calculator

# Development Settings
GENERATE_SOURCEMAP=true
FAST_REFRESH=true

# Build Settings
INLINE_RUNTIME_CHUNK=false
```

## 🎨 Theme and Styling Setup

### CSS Variables Setup

Add these CSS custom properties to `src/index.css`:

```css
:root {
  /* Light Theme Colors */
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --border-color: #dee2e6;
  --button-bg: #e9ecef;
  --button-hover: #dee2e6;
  --accent-color: #007bff;
  
  /* Calculator Specific */
  --display-bg: #f8f9fa;
  --display-text: #212529;
  --operator-bg: #007bff;
  --operator-text: #ffffff;
  --equals-bg: #28a745;
  --equals-text: #ffffff;
}

[data-theme="dark"] {
  /* Dark Theme Colors */
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #ffffff;
  --text-secondary: #adb5bd;
  --border-color: #495057;
  --button-bg: #495057;
  --button-hover: #6c757d;
  --accent-color: #0d6efd;
  
  /* Calculator Specific */
  --display-bg: #2d2d2d;
  --display-text: #ffffff;
  --operator-bg: #0d6efd;
  --operator-text: #ffffff;
  --equals-bg: #198754;
  --equals-text: #ffffff;
}
```

## 🔍 Troubleshooting

### Common Issues and Solutions

#### Port Already in Use
```bash
# Error: Something is already running on port 3000
# Solution: Use a different port
PORT=3001 npm start

# Or kill the process using port 3000
lsof -ti:3000 | xargs kill -9
```

#### TypeScript Compilation Errors
```bash
# Clear TypeScript cache
rm -rf node_modules/.cache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Module Not Found Errors
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules
npm install
```

#### React DevTools Not Working
1. Install React Developer Tools browser extension
2. Restart browser after installation
3. Open DevTools and look for "Components" and "Profiler" tabs

### Performance Issues

#### Slow Development Server
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm start
```

#### Build Size Too Large
```bash
# Analyze bundle size
npm install -g webpack-bundle-analyzer
npm run build
npx webpack-bundle-analyzer build/static/js/*.js
```

## 📱 Testing on Different Devices

### Mobile Testing
```bash
# Find your local IP address
ipconfig getifaddr en0  # macOS
ip route get 1.1.1.1 | awk '{print $7}'  # Linux

# Access app from mobile device
# http://YOUR_IP_ADDRESS:3000
```

### Browser Compatibility Testing
- **Chrome**: Latest version (recommended for development)
- **Firefox**: Latest version
- **Safari**: Latest version (macOS/iOS)
- **Edge**: Latest version (Windows)

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Application starts without errors (`npm start`)
- [ ] TypeScript compiles without issues
- [ ] All calculator functions work correctly
- [ ] Theme toggle switches between light/dark modes
- [ ] Responsive design works on different screen sizes
- [ ] Keyboard input functions properly
- [ ] All tests pass (`npm test`)
- [ ] Production build completes successfully (`npm run build`)

## 🆘 Getting Help

If you encounter issues:

1. **Check Console**: Browser Developer Tools → Console tab
2. **Check Terminal**: Look for error messages in the terminal
3. **Clear Cache**: Clear browser cache and npm cache
4. **Update Dependencies**: Ensure all packages are up to date
5. **Community Support**: React community forums and Stack Overflow

## 🚀 Next Steps

Once setup is complete:

1. Read the [Architecture Guide](./ARCHITECTURE.md) to understand the codebase
2. Follow the [Development Guide](./DEVELOPMENT.md) for best practices
3. Review the [Testing Guide](./TESTING.md) for testing strategies
4. Start building and customizing your calculator!

---

**Happy Coding! 🎉**