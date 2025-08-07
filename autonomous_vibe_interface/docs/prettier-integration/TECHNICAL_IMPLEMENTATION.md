# Prettier Integration - Technical Implementation Guide

## 🏗️ Architecture Overview

### Browser-First Approach
The implementation uses a browser-compatible architecture rather than Node.js-based formatting, ensuring Prettier works directly in the client without server round-trips.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Monaco Editor  │────▶│ PrettierService  │────▶│ Prettier Module │
│   (CodeEditor)  │◀────│    (Browser)     │◀────│  (Standalone)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         ▲                        │
         │                        ▼
         │              ┌──────────────────┐
         └──────────────│  Claude Code     │
                        │  Integration     │
                        └──────────────────┘
```

## 📦 Key Components

### 1. PrettierServiceBrowser.ts
**Location**: `/src/services/PrettierServiceBrowser.ts`

**Key Features**:
- Dynamic module loading
- CDN fallback mechanism
- Browser-compatible formatting
- Auto-fix capabilities

**Implementation Details**:
```typescript
class PrettierServiceBrowser {
  // Dynamic loading strategy
  private async loadPrettier() {
    try {
      // Primary: Load from node_modules
      await import('prettier/standalone')
    } catch {
      // Fallback: Load from CDN
      await this.loadFromCDN()
    }
  }
  
  // Format with error handling
  async formatCode(code: string, fileName: string) {
    // Detect parser from file extension
    // Apply user configuration
    // Format with appropriate plugins
    // Handle errors with auto-fix
  }
}
```

### 2. Claude Code Integration Hook
**Location**: `/src/hooks/useClaudeCodeIntegration.ts`

**Event Handling**:
```typescript
// Listen for Claude events
window.addEventListener('claude-code-event', handler)
window.addEventListener('message', handler) // iframe support

// Event types handled:
- 'code-generated': New code from Claude
- 'file-modified': Claude edits existing file
- 'batch-refactor': Multiple file changes
```

### 3. Monaco Editor Integration
**Location**: `/src/components/CodeEditor.tsx`

**Keyboard Shortcut Registration**:
```typescript
editor.addAction({
  id: 'prettier.formatDocument',
  label: 'Format Document with Prettier',
  keybindings: [
    monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF
  ],
  run: async (editor) => {
    await formatDocument();
  }
});
```

## 🔧 Configuration Management

### Default Configuration
```javascript
{
  tabWidth: 2,
  useTabs: false,
  semi: true,              // Always use semicolons
  singleQuote: false,      // Use double quotes
  trailingComma: "es5",    // ES5 trailing commas
  bracketSpacing: true,
  arrowParens: "always",
  printWidth: 80,
  endOfLine: "lf"
}
```

### Server-Side Storage
**Endpoint**: `/api/user/prettier-config`
- GET: Retrieve user preferences
- POST: Save user preferences
- Storage: In-memory (production would use database)

## 🚀 Build Configuration

### Webpack Optimization (craco.config.js)
```javascript
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Node.js polyfills for Prettier
      webpackConfig.resolve.fallback = {
        "fs": false,
        "path": false,
        "os": false,
        "crypto": false
      };
      
      // Handle .mjs files
      webpackConfig.module.rules.push({
        test: /\.mjs$/,
        include: /node_modules/,
        type: "javascript/auto"
      });
    }
  }
};
```

### Package.json Changes
```json
{
  "scripts": {
    "start": "craco start",    // Changed from react-scripts
    "build": "craco build"      // Changed from react-scripts
  },
  "dependencies": {
    "@craco/craco": "^7.1.0",   // Added for webpack config
    "prettier": "^3.3.3"        // Core Prettier library
  }
}
```

## 🔄 Data Flow

### Format on User Action
```
1. User presses ⌥⇧F
2. Monaco editor triggers action
3. formatDocument() called
4. PrettierService formats code
5. Editor value updated
6. Success notification shown
```

### Format on Claude Generation
```
1. Claude generates code
2. Custom event dispatched
3. useClaudeCodeIntegration captures
4. formatOnClaudeGenerate() called
5. Formatted code returned
6. Editor updated automatically
```

## 🐛 Error Handling

### Auto-Fix Strategy
The service attempts to fix common syntax errors:

```typescript
private attemptAutoFix(code: string, error: string) {
  // Fix missing semicolons
  if (error.includes("Missing semicolon")) {
    code = code.replace(/([^;])\s*\n/g, "$1;\n");
  }
  
  // Fix unclosed strings
  const quoteCount = (code.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    code += '"';
  }
  
  // Fix unclosed braces/brackets
  // ... more auto-fix logic
}
```

### User Feedback
- Error banner displays at top of editor
- Auto-fix button when available
- Dismiss option for errors
- Console logging for debugging

## 📊 Performance Optimizations

### Code Splitting
- Prettier loaded on-demand
- Reduced initial bundle by 402KB
- Lazy loading of language plugins

### Caching Strategy
- Prettier instance cached after first load
- User config cached locally
- Parser detection cached per session

### Bundle Analysis
```
Before: 607.63 kB main bundle
After:  205.32 kB main + chunks
Reduction: 402.31 kB (66% smaller)
```

## 🔒 Security Considerations

1. **No arbitrary code execution** - Only formatting
2. **Server validation** - Config sanitization
3. **CDN integrity** - Using versioned URLs
4. **No file system access** - Browser sandbox

## 🧪 Testing Approach

### Test File Location
`/src/test-prettier.html`

### Test Coverage
1. Basic JavaScript formatting
2. TypeScript with JSX
3. CSS formatting
4. Error handling & auto-fix
5. Claude simulation
6. Batch formatting

## 🚦 Deployment Steps

```bash
# 1. Install dependencies
cd coder1-ide/coder1-ide-source
npm install --legacy-peer-deps

# 2. Build with optimizations
npm run build

# 3. Deploy to public directory
cp -r build/* ../../public/ide/

# 4. Access at
http://localhost:3000/ide
```

## 📋 Troubleshooting

### Issue: Prettier not loading
**Solution**: Check browser console for CDN fallback messages

### Issue: Formatting not working
**Solution**: Verify file extension is supported

### Issue: Keyboard shortcut not working
**Solution**: Check for conflicting shortcuts in OS/browser

### Issue: Bundle size too large
**Solution**: Ensure craco config is properly applied

## 🔮 Future Improvements

1. **Progressive Web App** - Offline formatting
2. **Web Worker** - Non-blocking formatting
3. **More Languages** - PHP, Python, Ruby plugins
4. **Team Sync** - Real-time config sharing
5. **Format History** - Undo/redo formatting

---
*This technical guide serves as the authoritative reference for the Prettier integration in Coder1 IDE v2.*