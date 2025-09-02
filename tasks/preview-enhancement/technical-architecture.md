# Technical Architecture & Implementation Guide

## Current System Architecture

### Existing Codebase Structure
```
/coder1-ide/coder1-ide-source/src/
├── components/
│   ├── Preview.tsx                 # Target for enhancement (currently placeholder)
│   ├── Terminal.tsx                # Command parsing and execution
│   ├── layout/
│   │   └── ThreePanelLayout.tsx   # Panel container (left/center/right)
│   └── ErrorBoundary.tsx           # Error handling (if exists)
├── services/
│   └── fileSystem.ts              # File operations
├── hooks/
│   └── useFeatureFlag.ts          # Feature toggle system
└── App.tsx                        # Main app with Preview integration
```

### Current Preview Integration
```typescript
// In App.tsx (lines 319-331)
rightPanel={
  <div className="right-panel-content">
    <button 
      className="react-bits-button orange-glow"
      onClick={handleReactBitsClick}
    >
      ⚛️ React Bits
    </button>
    <div className="preview-section">
      <Preview />  // Currently shows placeholder content
    </div>
  </div>
}
```

## Phase 1: Technical Implementation Details

### 1. Enhanced Preview Component Architecture

```typescript
// /src/components/Preview.tsx - Complete rewrite
import React, { useState, useRef, useEffect } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { ComponentSandbox } from './ComponentSandbox';
import { PreviewControls } from './PreviewControls';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import './Preview.css';

interface PreviewState {
  mode: 'placeholder' | 'component' | 'error';
  currentComponent: ComponentBundle | null;
  isLoading: boolean;
  error: string | null;
}

interface ComponentBundle {
  id: string;
  name: string;
  code: string;
  props: Record<string, any>;
  dependencies: string[];
  generatedAt: number;
}

const Preview: React.FC = () => {
  const [state, setState] = useState<PreviewState>({
    mode: 'placeholder',
    currentComponent: null,
    isLoading: false,
    error: null
  });
  
  const previewEnabled = useFeatureFlag('PREVIEW_ENHANCED');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Component rendering logic
  const renderComponent = async (component: ComponentBundle) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Send component to iframe sandbox
      if (iframeRef.current) {
        iframeRef.current.contentWindow?.postMessage({
          type: 'RENDER_COMPONENT',
          component
        }, '*');
      }
      
      setState(prev => ({
        ...prev,
        mode: 'component',
        currentComponent: component,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        mode: 'error',
        error: error.message,
        isLoading: false
      }));
    }
  };
  
  // Listen for component updates from terminal
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'UI_COMPONENT_GENERATED') {
        renderComponent(event.data.component);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  if (!previewEnabled) {
    return <PlaceholderPreview />;
  }
  
  return (
    <div className="preview">
      <div className="preview-header">
        <h3>Live Preview</h3>
        <PreviewControls 
          onToggleMode={() => setState(prev => ({
            ...prev,
            mode: prev.mode === 'placeholder' ? 'component' : 'placeholder'
          }))}
          onRefresh={() => state.currentComponent && renderComponent(state.currentComponent)}
          isLoading={state.isLoading}
        />
      </div>
      
      <div className="preview-content">
        <ErrorBoundary fallback={<PreviewError />}>
          {state.mode === 'placeholder' && <PlaceholderContent />}
          {state.mode === 'component' && (
            <ComponentSandbox
              ref={iframeRef}
              component={state.currentComponent}
              onError={(error) => setState(prev => ({ ...prev, mode: 'error', error }))}
            />
          )}
          {state.mode === 'error' && <PreviewError error={state.error} />}
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default Preview;
```

### 2. Component Sandbox Implementation

```typescript
// /src/components/ComponentSandbox.tsx - New file
import React, { forwardRef, useEffect, useState } from 'react';

interface ComponentSandboxProps {
  component: ComponentBundle | null;
  onError: (error: string) => void;
}

const ComponentSandbox = forwardRef<HTMLIFrameElement, ComponentSandboxProps>(
  ({ component, onError }, ref) => {
    const [sandboxReady, setSandboxReady] = useState(false);
    
    useEffect(() => {
      // Listen for sandbox ready message
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'SANDBOX_READY') {
          setSandboxReady(true);
        } else if (event.data.type === 'SANDBOX_ERROR') {
          onError(event.data.error);
        }
      };
      
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, [onError]);
    
    const sandboxHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Component Preview</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { 
      margin: 0; 
      padding: 20px; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #root { 
      width: 100%; 
      height: 100%; 
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    // Notify parent that sandbox is ready
    window.parent.postMessage({ type: 'SANDBOX_READY' }, '*');
    
    // Listen for component rendering requests
    window.addEventListener('message', (event) => {
      if (event.data.type === 'RENDER_COMPONENT') {
        try {
          renderComponent(event.data.component);
        } catch (error) {
          window.parent.postMessage({ 
            type: 'SANDBOX_ERROR', 
            error: error.message 
          }, '*');
        }
      }
    });
    
    function renderComponent(component) {
      const { code, props = {} } = component;
      
      // Transform JSX code using Babel
      const transformedCode = Babel.transform(code, {
        presets: ['react']
      }).code;
      
      // Create component function
      const ComponentFunction = new Function('React', 'props', \`
        \${transformedCode}
        return \${component.name};
      \`);
      
      // Render component
      const ComponentElement = React.createElement(
        ComponentFunction(React, props), 
        props
      );
      
      ReactDOM.render(ComponentElement, document.getElementById('root'));
    }
  </script>
</body>
</html>
    `;
    
    return (
      <iframe
        ref={ref}
        className="component-sandbox"
        srcDoc={sandboxHTML}
        sandbox="allow-scripts allow-same-origin"
        width="100%"
        height="400px"
        style={{ border: '1px solid #e1e5e9', borderRadius: '6px' }}
      />
    );
  }
);

export default ComponentSandbox;
```

### 3. Terminal Integration for /ui Commands

```typescript
// Enhancement to /src/components/Terminal.tsx
// Add to existing handleCommand function

const handleUICommand = async (args: string[]) => {
  const [subcommand, ...params] = args;
  
  switch (subcommand) {
    case 'create':
      await handleUICreate(params.join(' '));
      break;
    case 'variant':
      await handleUIVariant(params.join(' '));
      break;
    case 'optimize':
      await handleUIOptimize();
      break;
    default:
      writeToTerminal(`Unknown /ui command: ${subcommand}\r\n`);
      writeToTerminal('Available commands: create, variant, optimize\r\n');
  }
};

const handleUICreate = async (description: string) => {
  if (!description.trim()) {
    writeToTerminal('Usage: /ui create <component description>\r\n');
    return;
  }
  
  writeToTerminal(`🎨 Generating component: "${description}"\r\n`);
  
  try {
    // Basic component generation (Phase 1)
    const component = await generateBasicComponent(description);
    
    // Send to preview component
    window.postMessage({
      type: 'UI_COMPONENT_GENERATED',
      component
    }, '*');
    
    writeToTerminal(`✅ Component generated successfully!\r\n`);
    writeToTerminal(`📁 Component: ${component.name}\r\n`);
    writeToTerminal(`🔧 Props: ${Object.keys(component.props).join(', ')}\r\n\r\n`);
  } catch (error) {
    writeToTerminal(`❌ Failed to generate component: ${error.message}\r\n\r\n`);
  }
};

// Add to existing command parsing in Terminal.tsx
if (command.startsWith('/ui')) {
  const args = command.slice(3).trim().split(' ');
  await handleUICommand(args);
  return;
}
```

### 4. Basic Component Generator Service

```typescript
// /src/services/ComponentGenerator.ts - New file
interface ComponentTemplate {
  name: string;
  code: string;
  props: Record<string, any>;
  dependencies: string[];
}

export class ComponentGenerator {
  private templates: Record<string, ComponentTemplate> = {
    button: {
      name: 'Button',
      code: `
        const Button = ({ children, onClick, variant = 'primary', ...props }) => {
          const baseStyles = {
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          };
          
          const variants = {
            primary: { backgroundColor: '#0066cc', color: 'white' },
            secondary: { backgroundColor: '#f5f5f5', color: '#333' },
            danger: { backgroundColor: '#dc3545', color: 'white' }
          };
          
          return React.createElement('button', {
            style: { ...baseStyles, ...variants[variant] },
            onClick,
            ...props
          }, children);
        };
      `,
      props: { children: 'Click me', variant: 'primary' },
      dependencies: []
    },
    card: {
      name: 'Card',
      code: `
        const Card = ({ title, content, footer, ...props }) => {
          const cardStyles = {
            border: '1px solid #e1e5e9',
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          };
          
          return React.createElement('div', { style: cardStyles, ...props }, [
            title && React.createElement('h3', { key: 'title', style: { margin: '0 0 12px 0' } }, title),
            content && React.createElement('div', { key: 'content', style: { marginBottom: '12px' } }, content),
            footer && React.createElement('div', { key: 'footer', style: { fontSize: '12px', color: '#666' } }, footer)
          ]);
        };
      `,
      props: { 
        title: 'Card Title', 
        content: 'This is the card content area.',
        footer: 'Card footer'
      },
      dependencies: []
    }
  };
  
  async generateBasicComponent(description: string): Promise<ComponentBundle> {
    // Simple keyword matching for Phase 1
    const keywords = description.toLowerCase();
    
    let template: ComponentTemplate;
    
    if (keywords.includes('button')) {
      template = this.templates.button;
    } else if (keywords.includes('card')) {
      template = this.templates.card;
    } else {
      // Default to button for unknown components
      template = this.templates.button;
    }
    
    return {
      id: `component_${Date.now()}`,
      name: template.name,
      code: template.code,
      props: { ...template.props },
      dependencies: template.dependencies,
      generatedAt: Date.now()
    };
  }
}

export const componentGenerator = new ComponentGenerator();

// Helper function for terminal integration
export const generateBasicComponent = (description: string) => 
  componentGenerator.generateBasicComponent(description);
```

### 5. Error Handling & Safety

```typescript
// /src/components/ErrorBoundary.tsx - Enhanced or new file
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Preview component error:', error, errorInfo);
    
    // Send error to parent window if in iframe
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'PREVIEW_ERROR',
        error: error.message,
        stack: error.stack
      }, '*');
    }
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    
    return this.props.children;
  }
}

// Error display components
export const PreviewError: React.FC<{ error?: string }> = ({ error }) => (
  <div className="preview-error">
    <h4>Preview Error</h4>
    <p>Something went wrong while rendering the component.</p>
    {error && (
      <details>
        <summary>Error Details</summary>
        <pre>{error}</pre>
      </details>
    )}
    <button onClick={() => window.location.reload()}>
      Reload Preview
    </button>
  </div>
);

export const PlaceholderContent: React.FC = () => (
  <div className="preview-placeholder">
    <div className="placeholder-icon">🎨</div>
    <h4>Component Preview</h4>
    <p>Use <code>/ui create &lt;description&gt;</code> in the terminal to generate components</p>
    <div className="example-commands">
      <p><strong>Examples:</strong></p>
      <ul>
        <li><code>/ui create button</code></li>
        <li><code>/ui create card with title</code></li>
        <li><code>/ui create modern pricing table</code></li>
      </ul>
    </div>
  </div>
);
```

### 6. Feature Flag Integration

```typescript
// Add to existing feature flag system or create new flags
// /src/hooks/useFeatureFlag.ts - Add new flags

const FEATURE_FLAGS = {
  // Existing flags...
  PREVIEW_ENHANCED: process.env.REACT_APP_PREVIEW_ENHANCED === 'true',
  PREVIEW_AI_GENERATION: process.env.REACT_APP_PREVIEW_AI === 'true',
  PREVIEW_MULTI_STATE: process.env.REACT_APP_PREVIEW_MULTI_STATE === 'true'
};
```

### 7. CSS Styling Structure

```css
/* /src/components/Preview.css - Enhanced styling */
.preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  border-radius: 6px;
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e1e5e9;
}

.preview-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #24292f;
}

.preview-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.component-sandbox {
  flex: 1;
  border: none;
  background: white;
}

.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 32px;
  color: #656d76;
}

.placeholder-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.preview-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 32px;
  text-align: center;
  background: #fff5f5;
  color: #d1242f;
}

.example-commands {
  margin-top: 16px;
  text-align: left;
}

.example-commands ul {
  list-style: none;
  padding: 0;
}

.example-commands li {
  margin: 4px 0;
  padding: 4px 8px;
  background: #f6f8fa;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
}
```

## File Modification Summary

### New Files to Create
1. `/src/components/ComponentSandbox.tsx` - Iframe-based component renderer
2. `/src/components/PreviewControls.tsx` - Preview control buttons
3. `/src/services/ComponentGenerator.ts` - Basic component generation
4. `/src/components/ErrorBoundary.tsx` - Enhanced error handling (if doesn't exist)

### Files to Modify
1. `/src/components/Preview.tsx` - Complete rewrite with new functionality
2. `/src/components/Terminal.tsx` - Add /ui command parsing
3. `/src/hooks/useFeatureFlag.ts` - Add preview feature flags
4. `/src/components/Preview.css` - Enhanced styling

### Environment Variables to Add
```bash
# .env.local
REACT_APP_PREVIEW_ENHANCED=true
REACT_APP_PREVIEW_AI=false
REACT_APP_PREVIEW_MULTI_STATE=false
```

This architecture provides a solid foundation for Phase 1 implementation while being extensible for future phases. The iframe sandboxing ensures safety, error boundaries prevent crashes, and feature flags allow for safe rollout.