# Development Setup Guide

This guide will help you set up the React Calculator App development environment from scratch.

## System Requirements

### Required Software

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher (comes with Node.js)
- **Git**: For version control
- **Code Editor**: VS Code recommended

### Operating System Support

- ✅ macOS 10.15+
- ✅ Windows 10+
- ✅ Linux (Ubuntu 20.04+, similar distributions)

## Step-by-Step Setup

### 1. Install Node.js

#### Option A: Official Installer (Recommended)
1. Visit [nodejs.org](https://nodejs.org/)
2. Download the LTS version
3. Run the installer and follow instructions
4. Verify installation:
```bash
node --version  # Should show v18.0.0 or higher
npm --version   # Should show v8.0.0 or higher
```

#### Option B: Using Node Version Manager (Advanced)
```bash
# macOS/Linux
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts
nvm use --lts

# Windows (use nvm-windows)
# Download from: https://github.com/coreybutler/nvm-windows
```

### 2. Clone the Repository

```bash
# Clone the project
git clone <repository-url>
cd react-calculator-app

# Verify you're in the correct directory
ls -la  # Should see package.json, src/, etc.
```

### 3. Install Dependencies

```bash
# Install all project dependencies
npm install

# This will install:
# - React and React DOM
# - TypeScript
# - Vite (build tool)
# - Tailwind CSS
# - ESLint and Prettier
# - Testing utilities
```

### 4. Environment Configuration

Create a `.env.local` file in the project root:

```bash
# .env.local
VITE_APP_NAME=React Calculator
VITE_APP_VERSION=1.0.0
VITE_BUILD_MODE=development
```

### 5. Verify Setup

```bash
# Start development server
npm run dev

# Should output:
# ✅ Local:   http://localhost:5173/
# ✅ Network: use --host to expose
```

Open your browser to `http://localhost:5173` - you should see the calculator app.

## Development Tools Setup

### VS Code Configuration

#### Recommended Extensions

Install these VS Code extensions for the best development experience:

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "ms-vscode.vscode-json"
  ]
}
```

#### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

### Git Configuration

Set up Git hooks for code quality:

```bash
# Install husky for Git hooks
npm install --save-dev husky

# Set up pre-commit hooks
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run type-check"
npx husky add .husky/pre-push "npm run test"
```

## Project Scripts Explained

### Development Scripts

```bash
# Start development server with hot reload
npm run dev

# Start development server on specific port
npm run dev -- --port 3000

# Start development server and open browser
npm run dev -- --open
```

### Build Scripts

```bash
# Type check without building
npm run type-check

# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Code Quality Scripts

```bash
# Run ESLint
npm run lint

# Fix ESLint issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Check code formatting
npm run format:check
```

### Testing Scripts

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Error: Port 5173 is already in use
# Solution: Use a different port
npm run dev -- --port 3001

# Or kill the process using the port
lsof -ti :5173 | xargs kill -9
```

#### Node Version Issues

```bash
# Error: Node version not supported
# Check your Node version
node --version

# If too old, update Node.js
# Using nvm:
nvm install --lts
nvm use --lts
```

#### Permission Errors (Linux/macOS)

```bash
# Error: EACCES permission denied
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

#### TypeScript Errors

```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
npm run type-check
```

#### Build Failures

```bash
# Clear all caches and reinstall
rm -rf node_modules
rm package-lock.json
npm install
npm run build
```

### Performance Optimization

#### Development Performance

```bash
# Enable TypeScript incremental compilation
# Add to tsconfig.json:
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

#### Hot Reload Issues

```bash
# If hot reload stops working
rm -rf node_modules/.vite
npm run dev
```

## IDE Integration

### IntelliSense Setup

Ensure TypeScript is properly configured:

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### Debugging Setup

Create `.vscode/launch.json` for debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Chrome",
      "request": "launch",
      "type": "chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src",
      "sourceMaps": true
    }
  ]
}
```

## Advanced Configuration

### Custom Vite Configuration

Modify `vite.config.ts` for advanced needs:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@utils': resolve(__dirname, './src/utils'),
      '@types': resolve(__dirname, './src/types'),
    }
  },
  server: {
    port: 5173,
    open: true,
    cors: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom']
        }
      }
    }
  }
})
```

### Tailwind CSS Configuration

Customize `tailwind.config.js`:

```javascript
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        calculator: {
          dark: '#1e1e1e',
          light: '#f5f5f5',
          accent: '#007acc',
        }
      },
      fontFamily: {
        'calculator': ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
```

## Next Steps

After successful setup:

1. ✅ Read the [Architecture Guide](./ARCHITECTURE.md)
2. ✅ Review the [API Documentation](./API.md)
3. ✅ Run the test suite: `npm run test`
4. ✅ Start developing your first feature
5. ✅ Set up continuous integration (GitHub Actions, etc.)

## Getting Help

If you encounter issues:

1. Check this troubleshooting section
2. Search existing GitHub issues
3. Create a new issue with:
   - Your operating system
   - Node.js version
   - Error messages
   - Steps to reproduce

## Contributing to Setup

To improve this setup guide:

1. Test the setup on different operating systems
2. Document any additional issues you encounter
3. Submit pull requests with improvements
4. Update dependency versions as needed